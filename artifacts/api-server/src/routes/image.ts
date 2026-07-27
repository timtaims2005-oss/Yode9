import { Router, type IRouter } from "express";
import { z } from "zod";
import { requirePersonalOpenAI } from "../lib/ai-providers";
import { logger } from "../lib/logger";
import { validateBody } from "../middlewares/validateBody.js";

const router: IRouter = Router();

// ── Zod schema — image generation request body ────────────────────────────────
const imageSchema = z.object({
  prompt:  z.string({ required_error: "prompt is required" }).min(1, "prompt cannot be empty").max(4000, "prompt too long (max 4000 chars)"),
  size:    z.enum(["1024x1024", "1024x1536", "1536x1024", "auto"]).default("1024x1024"),
  quality: z.enum(["low", "medium", "high", "auto"]).default("medium"),
  n:       z.number().int().min(1).max(4).default(1),
});

router.post("/image", validateBody(imageSchema), async (req, res) => {
  // Body is already validated and typed by the middleware
  const { prompt, size, quality, n } = req.body as z.infer<typeof imageSchema>;

  try {
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
      return res.status(502).json({ error: "Image generation returned no results. Please try again." });
    }

    return res.json({ images, prompt, size, quality });
  } catch (err) {
    logger.error({ err }, "image generation failed");
    // Return a safe generic message — never relay upstream provider errors
    return res.status(500).json({ error: "Image generation failed. Please try again." });
  }
});

export default router;
