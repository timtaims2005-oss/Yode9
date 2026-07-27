/**
 * Text-to-Speech — POST /api/tts
 * Speech-to-Text — POST /api/stt (via OpenAI Whisper)
 */
import { Router, type Request, type Response } from "express";
import multer from "multer";
import { z } from "zod";
import { requirePersonalOpenAI } from "../lib/ai-providers";
import { logger } from "../lib/logger";
import { validateBody } from "../middlewares/validateBody.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type Voice = typeof VOICES[number];

// ── Zod schema — TTS request body ─────────────────────────────────────────────
const ttsSchema = z.object({
  text:   z.string({ required_error: "text is required" }).min(1, "text cannot be empty").max(4096, "Text too long (max 4096 chars)"),
  voice:  z.enum(VOICES).default("nova"),
  model:  z.enum(["tts-1", "tts-1-hd"]).default("tts-1"),
  speed:  z.number().min(0.25).max(4.0).default(1.0),
  format: z.enum(["mp3", "opus", "aac", "flac"]).default("mp3"),
});

// ─── POST /api/tts ────────────────────────────────────────────────────────────
router.post("/tts", validateBody(ttsSchema), async (req: Request, res: Response): Promise<void> => {
  // Body is already validated and typed by the middleware
  const { text, voice, model, speed, format } = req.body as z.infer<typeof ttsSchema>;

  try {
    const openai = requirePersonalOpenAI();
    const response = await openai.audio.speech.create({
      model,
      voice,
      input: text,
      speed,
      response_format: format as "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeMap: Record<string, string> = {
      mp3: "audio/mpeg",
      opus: "audio/opus",
      aac: "audio/aac",
      flac: "audio/flac",
    };

    res.setHeader("Content-Type", mimeMap[format] ?? "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(buffer);
  } catch (err) {
    logger.error({ err }, "[tts] generation failed");
    // Return a safe generic message — never relay the upstream provider error
    res.status(500).json({ error: "TTS generation failed. Please try again." });
  }
});

// ─── POST /api/stt ────────────────────────────────────────────────────────────
router.post("/stt", upload.single("audio"), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "audio file is required (field: audio)" });
    return;
  }

  // Allow only audio MIME types
  if (!req.file.mimetype.startsWith("audio/")) {
    res.status(400).json({ error: "Only audio files are accepted for speech-to-text." });
    return;
  }

  const language = typeof req.body.language === "string" ? req.body.language.slice(0, 10) : undefined;
  const prompt   = typeof req.body.prompt   === "string" ? req.body.prompt.slice(0, 500)  : undefined;

  try {
    const openai = requirePersonalOpenAI();

    // Create a File-like object from Buffer for OpenAI SDK
    const audioFile = new File([new Uint8Array(req.file.buffer)], req.file.originalname ?? "audio.webm", {
      type: req.file.mimetype ?? "audio/webm",
    });

    const transcript = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language,
      prompt,
      response_format: "verbose_json",
    });

    res.json({
      ok: true,
      text: transcript.text,
      language: (transcript as unknown as { language?: string }).language,
      duration: (transcript as unknown as { duration?: number }).duration,
    });
  } catch (err) {
    logger.error({ err }, "[stt] transcription failed");
    // Return a safe generic message — never relay the upstream provider error
    res.status(500).json({ error: "Speech-to-text failed. Please try again." });
  }
});

// ─── GET /api/tts/voices ─────────────────────────────────────────────────────
router.get("/tts/voices", (_req: Request, res: Response) => {
  res.json({
    voices: [
      { id: "alloy",   name: "Alloy",   description: "Neutral, balanced" },
      { id: "echo",    name: "Echo",    description: "Male, crisp" },
      { id: "fable",   name: "Fable",   description: "British accent, warm" },
      { id: "onyx",    name: "Onyx",    description: "Deep, authoritative" },
      { id: "nova",    name: "Nova",    description: "Female, friendly" },
      { id: "shimmer", name: "Shimmer", description: "Female, soft" },
    ],
    models: ["tts-1", "tts-1-hd"],
  });
});

export default router;
