/**
 * Task 2 — Version History for virtual project files.
 *
 * Every `write_project_file` call persists a new immutable row in
 * `project_file_versions` instead of overwriting anything. The in-memory
 * `virtualProjects` map (orchestrate.ts) still holds the "current" content
 * for fast reads inside a running process, but the durable, browsable, and
 * restorable history lives here.
 *
 * At most MAX_VERSIONS_PER_FILE rows are kept per (project_id, filename);
 * the oldest rows are pruned automatically after each write.
 */
import { diffLines, type Change } from "diff";
import { pool } from "../db";

export const MAX_VERSIONS_PER_FILE = 50;

export interface VersionRow {
  id: number;
  projectId: string;
  filename: string;
  versionNumber: number;
  content: string;
  createdAt: string;
}

export interface VersionSummary {
  id: number;
  versionNumber: number;
  createdAt: string;
  size: number;
  lines: number;
  preview: string; // first ~120 chars, for list views
}

/** Persist a new version and prune anything beyond MAX_VERSIONS_PER_FILE. */
export async function saveVersion(
  projectId: string,
  filename: string,
  content: string,
): Promise<number> {
  const { rows } = await pool.query<{ max: number | null }>(
    `SELECT MAX(version_number) AS max FROM project_file_versions WHERE project_id = $1 AND filename = $2`,
    [projectId, filename],
  );
  const nextVersion = (rows[0]?.max ?? 0) + 1;

  await pool.query(
    `INSERT INTO project_file_versions (project_id, filename, version_number, content) VALUES ($1, $2, $3, $4)`,
    [projectId, filename, nextVersion, content],
  );

  // Prune oldest versions beyond the cap.
  await pool.query(
    `DELETE FROM project_file_versions
     WHERE project_id = $1 AND filename = $2
       AND id NOT IN (
         SELECT id FROM project_file_versions
         WHERE project_id = $1 AND filename = $2
         ORDER BY version_number DESC
         LIMIT $3
       )`,
    [projectId, filename, MAX_VERSIONS_PER_FILE],
  );

  return nextVersion;
}

/** List version metadata (newest first), without full content. */
export async function listVersions(
  projectId: string,
  filename: string,
): Promise<VersionSummary[]> {
  const { rows } = await pool.query<{
    id: number;
    version_number: number;
    created_at: string;
    content: string;
  }>(
    `SELECT id, version_number, created_at, content FROM project_file_versions
     WHERE project_id = $1 AND filename = $2
     ORDER BY version_number DESC`,
    [projectId, filename],
  );
  return rows.map((r) => ({
    id: r.id,
    versionNumber: r.version_number,
    createdAt: r.created_at,
    size: r.content.length,
    lines: r.content.split("\n").length,
    preview: r.content.slice(0, 120),
  }));
}

/** Fetch full content of a specific version. */
export async function getVersion(
  projectId: string,
  filename: string,
  versionNumber: number,
): Promise<VersionRow | null> {
  const { rows } = await pool.query(
    `SELECT id, project_id, filename, version_number, content, created_at
     FROM project_file_versions WHERE project_id = $1 AND filename = $2 AND version_number = $3`,
    [projectId, filename, versionNumber],
  );
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: r.id,
    projectId: r.project_id,
    filename: r.filename,
    versionNumber: r.version_number,
    content: r.content,
    createdAt: r.created_at,
  };
}

/** Compute a line-level diff between two versions of the same file. */
export async function diffVersions(
  projectId: string,
  filename: string,
  fromVersion: number,
  toVersion: number,
): Promise<{ from: number; to: number; changes: Change[] } | null> {
  const [from, to] = await Promise.all([
    getVersion(projectId, filename, fromVersion),
    getVersion(projectId, filename, toVersion),
  ]);
  if (!from || !to) return null;
  const changes = diffLines(from.content, to.content);
  return { from: fromVersion, to: toVersion, changes };
}

/**
 * Restore a prior version as a NEW version (append-only — never destroys
 * history). Returns the restored content and the new version number it was
 * saved under.
 */
export async function restoreVersion(
  projectId: string,
  filename: string,
  versionNumber: number,
): Promise<{ content: string; newVersionNumber: number } | null> {
  const target = await getVersion(projectId, filename, versionNumber);
  if (!target) return null;
  const newVersionNumber = await saveVersion(projectId, filename, target.content);
  return { content: target.content, newVersionNumber };
}
