import { Router, type IRouter } from "express";
import { requirePersonalOpenAI, PERSONAL_DEFAULT_MODEL } from "../lib/ai-providers";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/vision", async (req, res) => {
  try {
    const body = req.body as { image?: string; prompt?: string };
    const image = (body.image ?? "").toString();
    const prompt = (body.prompt ?? "Describe this image in detail.").toString().trim();

    if (!image || !image.startsWith("data:image/")) {
      return res.status(400).json({ error: "image (data URL) is required" });
    }
    if (image.length > 8 * 1024 * 1024) {
      return res.status(413).json({ error: "image too large (max ~8MB encoded)" });
    }
    if (prompt.length > 4000) {
      return res.status(400).json({ error: "prompt too long (max 4000 chars)" });
    }

    const completion = await requirePersonalOpenAI().chat.completions.create({
      model: PERSONAL_DEFAULT_MODEL,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: image } },
          ],
        },
      ],
      max_tokens: 1200,
    });

    const text = completion.choices?.[0]?.message?.content ?? "";
    return res.json({ text });
  } catch (err) {
    logger.error({ err }, "vision request failed");
    const message = err instanceof Error ? err.message : "vision request failed";
    return res.status(500).json({ error: message });
  }
});

export default router;
