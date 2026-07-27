/**
 * NOTE: Despite the historical class name "FirecrackerSandbox", this module uses
 * Docker container isolation — NOT Firecracker microVMs.
 *
 * Enforced controls per execution:
 *  - Network:  --network=none  (kernel-level, blocks all egress/ingress)
 *  - Memory:   --memory + --memory-swap (both equal, disables swap) via cgroups
 *  - CPU:      --cpus (cgroup CPU quota)
 *  - PIDs:     --pids-limit (cgroup pid subsystem)
 *  - Disk:     --read-only rootfs + --tmpfs /workspace:rw,size=<N>m (writable tmpfs capped)
 *  - User:     --user 1000:1000 (non-root inside container)
 *  - Cleanup:  named container (no --rm) so we can read cgroup peak, then explicit docker rm
 *  - Timeout:  wall-clock timer kills the container via `docker kill` if exceeded
 *
 * outputFiles: after execution, files written to /workspace are copied to a host-side
 *   temp dir (mounted as /output at run time) and read back as base64.
 *
 * memoryPeakMb: polled via `docker stats --no-stream` during execution at 250ms intervals;
 *   the highest observed value is returned. cgroup memory.peak is not used because it
 *   disappears from /sys/fs/cgroup the instant the container exits (even before docker rm).
 *
 * If Docker is unavailable at runtime this module throws explicitly — there is NO silent
 * fallback to unprotected child_process.spawn.
 */

import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';
import { mkdir, writeFile, rm, readFile, readdir } from 'fs/promises';
import { tmpdir } from 'os';
import { logger } from '../../lib/logger.js';

const execFileAsync = promisify(execFile);

// ── Types ────────────────────────────────────────────────────────────────────
export interface ExecutionConstraints {
  cpuQuota: number;       // fractional CPUs (e.g. 1.0 = 1 core)
  memoryLimitMb: number;  // Memory in MB (enforced by cgroup)
  diskLimitMb: number;    // Writable tmpfs size in MB
  networkDisabled: boolean;
  maxPids: number;
  timeoutMs: number;      // Wall-clock execution timeout
}

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  memoryPeakMb: number;
  outputFiles: Record<string, string>; // filename → base64
  timedOut: boolean;
  oomKilled: boolean;
}

type SupportedLang = 'javascript' | 'python' | 'typescript';

const DEFAULT_CONSTRAINTS: ExecutionConstraints = {
  cpuQuota: 1.0,
  memoryLimitMb: 128,
  diskLimitMb: 64,
  networkDisabled: true,
  maxPids: 50,
  timeoutMs: 10_000,
};

// ── Docker availability check ────────────────────────────────────────────────
let dockerAvailableCache: boolean | null = null;

async function assertDockerAvailable(): Promise<void> {
  if (dockerAvailableCache === true) return;
  if (dockerAvailableCache === false) {
    throw new Error(
      '[DockerSandbox] Docker is not available in this environment. ' +
      'Code execution requires Docker. There is no insecure fallback.',
    );
  }
  try {
    await execFileAsync('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 5000 });
    dockerAvailableCache = true;
  } catch (err) {
    dockerAvailableCache = false;
    throw new Error(
      `[DockerSandbox] Docker daemon is unreachable. Code execution is disabled. ` +
      `Original error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ── Image selection ──────────────────────────────────────────────────────────
function imageForLanguage(language: SupportedLang): string {
  if (language === 'python') return 'python:3.12-alpine';
  return 'node:20-alpine'; // javascript + typescript
}

function runCommandForLanguage(language: SupportedLang): string {
  if (language === 'python') return 'python3 /workspace/script.py';
  return 'node /workspace/script.js';
}

function scriptFilename(language: SupportedLang): string {
  return language === 'python' ? 'script.py' : 'script.js';
}

// ── Main sandbox class ────────────────────────────────────────────────────────
export class FirecrackerSandbox {
  private readonly constraints: ExecutionConstraints;

  constructor(constraints: Partial<ExecutionConstraints> = {}) {
    this.constraints = { ...DEFAULT_CONSTRAINTS, ...constraints };
  }

  async execute(code: string, language: SupportedLang): Promise<ExecutionResult> {
    await assertDockerAvailable();

    const startTime = Date.now();
    const runId = `sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const hostTmpDir = join(tmpdir(), runId);
    const hostOutputDir = join(hostTmpDir, 'output');

    try {
      await mkdir(hostTmpDir, { recursive: true });
      await mkdir(hostOutputDir, { recursive: true });
      // chmod 777 so uid 1000 inside container can write
      await execFileAsync('chmod', ['777', hostOutputDir]);

      // Write user code to host temp dir; will be bind-mounted read-only
      const filename = scriptFilename(language);
      await writeFile(join(hostTmpDir, filename), code, 'utf8');

      return await this.runInDocker(runId, language, hostTmpDir, hostOutputDir, startTime);
    } catch (err) {
      logger.error({ err, runId }, '[DockerSandbox] execution error');
      return {
        success: false,
        stdout: '',
        stderr: err instanceof Error ? err.message : String(err),
        exitCode: 1,
        executionTimeMs: Date.now() - startTime,
        memoryPeakMb: 0,
        outputFiles: {},
        timedOut: false,
        oomKilled: false,
      };
    } finally {
      // Always clean up host temp dir
      await rm(hostTmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private async runInDocker(
    containerName: string,
    language: SupportedLang,
    hostTmpDir: string,
    hostOutputDir: string,
    startTime: number,
  ): Promise<ExecutionResult> {
    const { memoryLimitMb, diskLimitMb, maxPids, timeoutMs } = this.constraints;
    const cpus = String(this.constraints.cpuQuota);
    const memFlag = `${memoryLimitMb}m`;
    const filename = scriptFilename(language);
    const runCmd = runCommandForLanguage(language);

    // Build docker run arguments
    const dockerArgs = [
      'run',
      '--name', containerName,
      // Resource limits enforced by cgroups
      '--memory', memFlag,
      '--memory-swap', memFlag,   // equal to --memory disables swap
      '--cpus', cpus,
      '--pids-limit', String(maxPids),
      // Network isolation
      '--network', 'none',
      // Filesystem isolation
      '--read-only',
      `--tmpfs=/workspace:rw,size=${diskLimitMb}m,mode=1777`,
      `--tmpfs=/tmp:rw,size=16m,mode=1777`,
      // Bind-mount code (read-only) and output dir (writable)
      '-v', `${hostTmpDir}/${filename}:/code/${filename}:ro`,
      '-v', `${hostOutputDir}:/output:rw`,
      // Non-root user
      '--user', '1000:1000',
      // No TTY, no interactive
      '--rm=false',
      // Image and command
      imageForLanguage(language),
      'sh', '-c',
      // Copy code from read-only /code to writable /workspace, run it,
      // then copy any files from /workspace to /output (for outputFiles capture)
      `cp /code/${filename} /workspace/${filename} && ${runCmd}; ` +
      `_ec=$?; find /workspace -maxdepth 1 -type f ! -name '${filename}' -exec cp {} /output/ \\; 2>/dev/null; exit $_ec`,
    ];

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let memoryPeakMb = 0;

    // Start memory polling in background
    const pollInterval = this.startMemoryPolling(containerName, (mb) => {
      if (mb > memoryPeakMb) memoryPeakMb = mb;
    });

    const exitCode = await new Promise<number>((resolve) => {
      const child = spawn('docker', dockerArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

      child.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

      // Wall-clock timeout: kill the container
      const timer = setTimeout(async () => {
        timedOut = true;
        logger.warn({ containerName }, '[DockerSandbox] timeout — killing container');
        try {
          await execFileAsync('docker', ['kill', containerName], { timeout: 5000 });
        } catch { /* already exited */ }
      }, timeoutMs);

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve(code ?? 1);
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        stderr += `\n[DockerSandbox spawn error] ${err.message}`;
        resolve(1);
      });
    });

    clearInterval(pollInterval);

    // Inspect for OOM kill status
    let oomKilled = false;
    try {
      const { stdout: inspectOut } = await execFileAsync(
        'docker', ['inspect', containerName, '--format', '{{.State.OOMKilled}}'],
        { timeout: 5000 },
      );
      oomKilled = inspectOut.trim() === 'true';
    } catch { /* container may be gone */ }

    // Remove container (we ran without --rm so we could inspect it)
    try {
      await execFileAsync('docker', ['rm', '-f', containerName], { timeout: 5000 });
    } catch { /* ignore */ }

    // Collect output files
    const outputFiles = await this.collectOutputFiles(hostOutputDir);

    const executionTimeMs = Date.now() - startTime;

    return {
      success: !timedOut && !oomKilled && exitCode === 0,
      stdout: stdout.trimEnd(),
      stderr: stderr.trimEnd(),
      exitCode: timedOut ? -1 : exitCode,
      executionTimeMs,
      memoryPeakMb,
      outputFiles,
      timedOut,
      oomKilled,
    };
  }

  /**
   * Poll `docker stats --no-stream` every 250ms during container execution.
   * Returns an interval handle; caller must call clearInterval() when done.
   * The peak value callback is invoked with the observed MiB each poll cycle.
   */
  private startMemoryPolling(containerName: string, onSample: (mb: number) => void): ReturnType<typeof setInterval> {
    return setInterval(() => {
      execFileAsync(
        'docker',
        ['stats', '--no-stream', '--format', '{{.MemUsage}}', containerName],
        { timeout: 3000 },
      ).then(({ stdout }) => {
        // Format: "9.551MiB / 32MiB"
        const match = stdout.trim().match(/^([\d.]+)\s*(MiB|GiB|KiB|B)/i);
        if (!match) return;
        const value = parseFloat(match[1]);
        const unit = match[2].toLowerCase();
        let mb = value;
        if (unit === 'gib') mb = value * 1024;
        else if (unit === 'kib') mb = value / 1024;
        else if (unit === 'b') mb = value / (1024 * 1024);
        onSample(Math.round(mb * 10) / 10);
      }).catch(() => { /* container may have exited */ });
    }, 250);
  }

  private async collectOutputFiles(outputDir: string): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    try {
      const files = await readdir(outputDir);
      for (const file of files) {
        const filePath = join(outputDir, file);
        const content = await readFile(filePath);
        result[file] = content.toString('base64');
      }
    } catch { /* no output files */ }
    return result;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
export const globalSandbox = new FirecrackerSandbox({
  memoryLimitMb: 128,
  diskLimitMb: 64,
  networkDisabled: true,
  maxPids: 50,
  cpuQuota: 1.0,
  timeoutMs: 10_000,
});
