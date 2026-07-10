import { Router, type IRouter } from "express";
import { requirePersonalOpenAI } from "../lib/ai-providers";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/image", async (req, res) => {
  try {
    const body = req.body as {
      prompt?: string;
      size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
      quality?: "low" | "medium" | "high" | "auto";
      n?: number;
    };

    const prompt = (body.prompt ?? "").toString().trim();
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }
    if (prompt.length > 4000) {
      return res.status(400).json({ error: "prompt too long (max 4000 chars)" });
    }

    const size = body.size ?? "1024x1024";
    const quality = body.quality ?? "medium";
    const n = Math.min(Math.max(body.n ?? 1, 1), 4);

    const result = await requirePersonalOpenAI().images.generate({
      model: "gpt-image-1",
      prompt,
      size,
      quality,
      n,
    });

    const data = (result.data ?? []) as Array<{ b64_json?: string | null }>;
    const images = data
      .map((d) => d.b64_json)
      .filter((s: string | null | undefined): s is string => typeof s === "string" && s.length > 0)
      .map((b64: string) => `data:image/png;base64,${b64}`);

    if (images.length === 0) {
      return res.status(502).json({ error: "no images returned" });
    }

    return res.json({ images, prompt, size, quality });
  } catch (err) {
    logger.error({ err }, "image generation failed");
    const message = err instanceof Error ? err.message : "image generation failed";
    return res.status(500).json({ error: message });
  }
});

export default router;
