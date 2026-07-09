/**
 * Text-to-Speech — POST /api/tts
 * Speech-to-Text — POST /api/stt (via OpenAI Whisper)
 */
import { Router, type Request, type Response } from "express";
import multer from "multer";
import { requirePersonalOpenAI } from "../lib/ai-providers";
import { logger } from "../lib/logger";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] as const;
type Voice = typeof VOICES[number];

// ─── POST /api/tts ────────────────────────────────────────────────────────────
router.post("/tts", async (req: Request, res: Response): Promise<void> => {
  const { text, voice = "nova", model = "tts-1", speed = 1.0, format = "mp3" } = req.body as {
    text?: string;
    voice?: Voice;
    model?: string;
    speed?: number;
    format?: "mp3" | "opus" | "aac" | "flac";
  };

  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "text is required" });
    return;
  }
  if (text.length > 4096) {
    res.status(400).json({ error: "Text too long (max 4096 chars)" });
    return;
  }

  const safeVoice: Voice = VOICES.includes(voice as Voice) ? (voice as Voice) : "nova";
  const safeSpeed = Math.min(Math.max(speed ?? 1.0, 0.25), 4.0);

  try {
    const openai = requirePersonalOpenAI();
    const response = await openai.audio.speech.create({
      model: model ?? "tts-1",
      voice: safeVoice,
      input: text.slice(0, 4096),
      speed: safeSpeed,
      response_format: (format ?? "mp3") as "mp3",
    });

    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeMap: Record<string, string> = {
      mp3: "audio/mpeg",
      opus: "audio/opus",
      aac: "audio/aac",
      flac: "audio/flac",
    };

    res.setHeader("Content-Type", mimeMap[format ?? "mp3"] ?? "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(buffer);
  } catch (err) {
    logger.error({ err }, "[tts] generation failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "TTS failed" });
  }
});

// ─── POST /api/stt ────────────────────────────────────────────────────────────
router.post("/stt", upload.single("audio"), async (req: Request, res: Response): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "audio file is required (field: audio)" });
    return;
  }

  const language = typeof req.body.language === "string" ? req.body.language : undefined;
  const prompt   = typeof req.body.prompt   === "string" ? req.body.prompt   : undefined;

  try {
    const openai = requirePersonalOpenAI();

    // Create a File-like object from Buffer for OpenAI SDK
    const audioFile = new File([req.file.buffer], req.file.originalname ?? "audio.webm", {
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
    res.status(500).json({ error: err instanceof Error ? err.message : "STT failed" });
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
