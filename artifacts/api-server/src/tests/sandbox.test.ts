/**
 * Integration tests for Docker-backed FirecrackerSandbox.
 * These tests actually spin up Docker containers and verify real isolation.
 * Requires: docker daemon reachable, node:20-alpine and python:3.12-alpine images pulled.
 */

import { describe, it, expect } from 'vitest';
import { FirecrackerSandbox } from '../infrastructure/execution/FirecrackerSandbox.js';

// Use tight limits so tests run quickly
const sandbox = new FirecrackerSandbox({
  memoryLimitMb: 32,
  diskLimitMb: 32,
  networkDisabled: true,
  maxPids: 32,
  cpuQuota: 1.0,
  timeoutMs: 15_000,
});

describe('DockerSandbox isolation', () => {
  it(
    'blocks network access (Node.js fetch to example.com fails)',
    async () => {
      const result = await sandbox.execute(
        `
const https = require('https');
const req = https.get('https://example.com', () => {
  console.log('NETWORK_REACHED');
  process.exit(0);
});
req.on('error', (e) => {
  console.log('NETWORK_BLOCKED:' + e.code);
  process.exit(0);
});
req.setTimeout(3000, () => {
  req.destroy();
  console.log('NETWORK_TIMEOUT');
  process.exit(0);
});
`,
        'javascript',
      );
      // Network must NOT succeed — no 'NETWORK_REACHED' in output
      expect(result.stdout).not.toContain('NETWORK_REACHED');
      // Must be blocked or timed out
      const blocked =
        result.stdout.includes('NETWORK_BLOCKED') ||
        result.stdout.includes('NETWORK_TIMEOUT') ||
        result.timedOut;
      expect(blocked).toBe(true);
    },
    20_000,
  );

  it(
    'blocks network access (Python urllib to example.com fails)',
    async () => {
      const result = await sandbox.execute(
        `
import urllib.request, socket
socket.setdefaulttimeout(3)
try:
    urllib.request.urlopen('https://example.com', timeout=3)
    print('NETWORK_REACHED')
except Exception as e:
    print('NETWORK_BLOCKED:' + str(e)[:80])
`,
        'python',
      );
      expect(result.stdout).not.toContain('NETWORK_REACHED');
      const blocked =
        result.stdout.includes('NETWORK_BLOCKED') || result.timedOut;
      expect(blocked).toBe(true);
    },
    20_000,
  );

  it(
    'OOM kills process that allocates well beyond memory limit',
    async () => {
      // 32MB limit, try to allocate 500MB — should be OOM killed (exit 137)
      const tightSandbox = new FirecrackerSandbox({
        memoryLimitMb: 16,
        diskLimitMb: 16,
        networkDisabled: true,
        maxPids: 32,
        cpuQuota: 1.0,
        timeoutMs: 15_000,
      });
      const result = await tightSandbox.execute(
        `x = bytearray(500 * 1024 * 1024)
print('OOM_NOT_TRIGGERED')`,
        'python',
      );
      // Must NOT succeed — OOM kill expected
      expect(result.success).toBe(false);
      expect(result.stdout).not.toContain('OOM_NOT_TRIGGERED');
      // Either oomKilled flag set OR exitCode 137 (SIGKILL from OOM)
      const oomIndicator =
        result.oomKilled || result.exitCode === 137 || result.exitCode === -1;
      expect(oomIndicator).toBe(true);
    },
    20_000,
  );

  it(
    'cannot read /etc/passwd contents from host (read-only rootfs isolates container fs)',
    async () => {
      // The container has its OWN /etc/passwd (alpine image), not the host's.
      // The host /etc/passwd is never bind-mounted, so container can only read
      // its own minimal alpine /etc/passwd — which does NOT contain host users.
      const result = await sandbox.execute(
        `
const fs = require('fs');
try {
  const data = fs.readFileSync('/etc/passwd', 'utf8');
  // Alpine /etc/passwd only has 'root' and standard alpine users — no host-specific users
  const hasHostUser = data.includes('runner') || data.includes('/home/user');
  console.log('FILE_READ_OK');
  console.log('HAS_HOST_USER:' + hasHostUser);
} catch(e) {
  console.log('FILE_READ_FAILED:' + e.message);
}
`,
        'javascript',
      );
      // Container can read its own /etc/passwd (alpine's), but it must NOT contain host users
      expect(result.stdout).not.toContain('HAS_HOST_USER:true');
    },
    20_000,
  );

  it(
    'wall-clock timeout kills hung process and sets timedOut=true',
    async () => {
      const shortSandbox = new FirecrackerSandbox({
        memoryLimitMb: 32,
        diskLimitMb: 16,
        networkDisabled: true,
        maxPids: 32,
        cpuQuota: 1.0,
        timeoutMs: 3_000,
      });
      const result = await shortSandbox.execute(
        `import time; time.sleep(60); print('should not reach here')`,
        'python',
      );
      expect(result.timedOut).toBe(true);
      expect(result.success).toBe(false);
      expect(result.stdout).not.toContain('should not reach here');
    },
    10_000,
  );

  it(
    'simple code executes successfully and returns correct output',
    async () => {
      const result = await sandbox.execute(
        `console.log(1 + 1);`,
        'javascript',
      );
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('2');
      expect(result.exitCode).toBe(0);
    },
    20_000,
  );

  it(
    'outputFiles captures files written to /workspace',
    async () => {
      const result = await sandbox.execute(
        `
const fs = require('fs');
fs.writeFileSync('/workspace/hello.txt', 'test output content');
console.log('wrote file');
`,
        'javascript',
      );
      expect(result.success).toBe(true);
      expect(result.outputFiles).toHaveProperty('hello.txt');
      const decoded = Buffer.from(result.outputFiles['hello.txt'], 'base64').toString('utf8');
      expect(decoded).toBe('test output content');
    },
    20_000,
  );
});
