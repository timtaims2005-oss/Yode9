/**
 * Task 2 — Version History REST API
 * GET  /api/projects/:projectId/files/:filename/versions            → list versions (newest first)
 * GET  /api/projects/:projectId/files/:filename/versions/:version   → get full content of one version
 * GET  /api/projects/:projectId/files/:filename/diff?from=&to=       → line diff between two versions
 * POST /api/projects/:projectId/files/:filename/restore              → { versionNumber } restore as new version
 *
 * `filename` is URL-encoded by the client since it may contain "/" and ".".
 */
import { Router, type Request, type Response } from "express";
import {
  listVersions,
  getVersion,
  diffVersions,
  restoreVersion,
} from "../lib/version-history";
import { setVirtualProjectFile } from "./orchestrate";

const router = Router();

function decodedFilename(req: Request): string {
  return decodeURIComponent(String(req.params.filename));
}

function projectIdOf(req: Request): string {
  return String(req.params.projectId);
}

router.get(
  "/projects/:projectId/files/:filename/versions",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const versions = await listVersions(projectIdOf(req), decodedFilename(req));
      res.json({ versions });
    } catch (err) {
      res.status(500).json({ error: "Failed to list file versions. Please try again." });
    }
  },
);

router.get(
  "/projects/:projectId/files/:filename/versions/:version",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const versionNumber = Number(req.params.version);
      if (!Number.isFinite(versionNumber)) {
        res.status(400).json({ error: "رقم نسخة غير صالح" });
        return;
      }
      const version = await getVersion(projectIdOf(req), decodedFilename(req), versionNumber);
      if (!version) {
        res.status(404).json({ error: "النسخة غير موجودة" });
        return;
      }
      res.json({ version });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch version content. Please try again." });
    }
  },
);

router.get(
  "/projects/:projectId/files/:filename/diff",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const from = Number(req.query.from);
      const to = Number(req.query.to);
      if (!Number.isFinite(from) || !Number.isFinite(to)) {
        res.status(400).json({ error: "يجب تحديد from و to كأرقام نسخ صالحة" });
        return;
      }
      const diff = await diffVersions(projectIdOf(req), decodedFilename(req), from, to);
      if (!diff) {
        res.status(404).json({ error: "نسخة واحدة أو أكثر غير موجودة" });
        return;
      }
      res.json(diff);
    } catch (err) {
      res.status(500).json({ error: "Failed to compute diff. Please try again." });
    }
  },
);

router.post(
  "/projects/:projectId/files/:filename/restore",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const versionNumber = Number((req.body as { versionNumber?: number })?.versionNumber);
      if (!Number.isFinite(versionNumber)) {
        res.status(400).json({ error: "يجب تحديد versionNumber صالح في جسم الطلب" });
        return;
      }
      const result = await restoreVersion(projectIdOf(req), decodedFilename(req), versionNumber);
      if (!result) {
        res.status(404).json({ error: "النسخة المطلوب استعادتها غير موجودة" });
        return;
      }
      // Keep the in-memory "current" view (used by read/list/write tools) in sync.
      setVirtualProjectFile(projectIdOf(req), decodedFilename(req), result.content);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Failed to restore version. Please try again." });
    }
  },
);

export default router;
