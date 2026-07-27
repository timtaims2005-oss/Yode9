import { Router, type IRouter } from "express";
import { tierRateLimit } from "../middlewares/tierRateLimit";
import healthRouter from "./health";
import councilRouter from "./council";
import godmodeRouter from "./godmode";
import autotuneRouter from "./autotune";
import imageRouter from "./image";
import visionRouter from "./vision";
import agentRouter from "./agent";
import contextRouter from "./context";
import osintRouter from "./osint";
import claudeCodeRouter from "./claude-code";
import filesRouter from "./files";
import shellRouter from "./shell";
import gitRouter from "./git";
import providersRouter from "./providers";
import localProxyRouter from "./local-proxy";
import agent4Router from "./agent4";
import ollamaRouter from "./ollama";
import localEnginesRouter from "./local-engines";
import loadBalancerRouter from "./load-balancer";

// ── Core System Routes ────────────────────────────────────────────────────────
import userAuthRouter from "./user-auth";
import adminRouter from "./admin";
import analyticsRouter from "./analytics";
import apiKeysRouter from "./api-keys";
import ragRouter from "./rag";
import memoryRouter from "./memory";
import notificationsRouter from "./notifications";
import organizationsRouter from "./organizations";
import reportsRouter from "./reports";
import monitoringRouter from "./monitoring";
import debateRouter from "./debate";
import chainOfThoughtRouter from "./chain-of-thought";
import codeScanRouter from "./code-scan";
import finetuneRouter from "./finetune";
import pluginsRouter from "./plugins";
import osintAdvancedRouter from "./osint-advanced";
import personalKeysRouter from "./personal-keys";
import billingRouter from "./billing";
import stripeRouter from "./stripe";
import securityComplianceRouter from "./security-compliance";
import securityDashboardRouter from "./security-dashboard";
import trainingRouter from "./training";
import agentV2Router from "./agent-v2";
import aiEngineRouter from "./ai-engine";
import autonomousAgentRouter from "./autonomous-agent";
import swarmAgentRouter from "./swarm-agent";
import agentMemoryRouter from "./agent-memory";

import swaggerRouter from "./swagger";
import subscriptionsRouter from "./subscriptions";
import { collabRouter } from "./collab";

// ── New Feature Routes ────────────────────────────────────────────────────────
import emailRouter from "./email";
import uploadRouter from "./upload";
import vectorRouter from "./vector";
import webhooksMgmtRouter from "./webhooks-mgmt";
import featuresRouter from "./features";
import backupRouter from "./backup";

// ── Additional Routes (merged from feature branches) ──────────────────────────
// osintFreeRouter → mounted directly in app.ts (public, before internalAuth)
import abTestsRouter from "./ab-tests";
import aiToolsRouter from "./ai-tools";
import blogRouter from "./blog";
import browserRouter from "./browser";
import customGptsRouter from "./custom-gpts";
import darkwebIntelligenceRouter from "./darkweb-intelligence";
import executeRouter from "./execute";
import invoicesRouter from "./invoices";
import orchestratorRouter from "./orchestrator";
import osintIntelRouter from "./osint-intel";
import referralsRouter from "./referrals";
import scheduledRouter from "./scheduled";
import ttsRouter from "./tts";
import threatTickerRouter from "./threat-ticker";

const router: IRouter = Router();

// ── Rate limiting — AI / heavy compute routes (already covered) ───────────────
router.use(["/chat", "/council", "/godmode", "/image", "/vision", "/agent", "/agent4", "/rag", "/finetune", "/training"], tierRateLimit);

// ── Rate limiting — additional user-facing routes (Priority 2 fix) ────────────
// These routes accept user-supplied input or trigger expensive operations and
// were previously unprotected. Adding the same tier-aware limiter closes that gap.
router.use([
  "/tts",          // text-to-speech — expensive per-char compute
  "/upload",       // file upload — storage + processing cost
  "/vector",       // vector search / embedding — DB + ML cost
  "/reports",      // report generation — DB writes + AI calls
  "/execute",      // code execution — sandbox cost
  "/browser",      // browser automation — CPU/memory cost
  "/orchestrate",  // orchestrator — chained AI calls
  "/custom-gpts",  // custom GPT calls
  "/email",        // email sending — external service
  "/backup",       // backup operations — disk + DB cost
  "/swarm-agent",  // swarm coordination — many AI calls
  "/autonomous-agent", // autonomous agent — long-running AI
], tierRateLimit);

// healthRouter is registered directly in app.ts as a public route — not here
// chatRouter is registered directly in app.ts as a public route — not here
router.use(councilRouter);
router.use(godmodeRouter);
router.use(autotuneRouter);
router.use(imageRouter);
router.use(visionRouter);
router.use(agentRouter);
router.use(contextRouter);
router.use(osintRouter);
router.use(claudeCodeRouter);
router.use(filesRouter);
router.use(shellRouter);
router.use(gitRouter);
router.use(providersRouter);
router.use(localProxyRouter);
router.use(agent4Router);
router.use(ollamaRouter);
router.use(localEnginesRouter);
router.use(loadBalancerRouter);

// ── Core System Routes ────────────────────────────────────────────────────────
router.use(userAuthRouter);
router.use(adminRouter);
router.use(analyticsRouter);
router.use(apiKeysRouter);
router.use(ragRouter);
router.use(memoryRouter);
router.use(notificationsRouter);
router.use(organizationsRouter);
router.use(reportsRouter);
router.use(monitoringRouter);
router.use(debateRouter);
router.use(chainOfThoughtRouter);
router.use(codeScanRouter);
router.use(finetuneRouter);
router.use(pluginsRouter);
router.use(osintAdvancedRouter);
router.use(personalKeysRouter);
router.use(billingRouter);
router.use(stripeRouter);
router.use(securityComplianceRouter);
router.use(securityDashboardRouter);
router.use(trainingRouter);
router.use(agentV2Router);
router.use(aiEngineRouter);
router.use(autonomousAgentRouter);
router.use(swarmAgentRouter);
router.use(agentMemoryRouter);

router.use(swaggerRouter);
router.use(subscriptionsRouter);
router.use(collabRouter);

// ── New Feature Routes ────────────────────────────────────────────────────────
router.use(emailRouter);
router.use(uploadRouter);
router.use(vectorRouter);
router.use(webhooksMgmtRouter);
router.use(featuresRouter);
router.use(backupRouter);

// ── Additional Routes (merged from feature branches) ──────────────────────────
router.use(abTestsRouter);
router.use(aiToolsRouter);
router.use(blogRouter);
router.use(browserRouter);
router.use(customGptsRouter);
router.use(darkwebIntelligenceRouter);
router.use(executeRouter);
router.use(invoicesRouter);
router.use(orchestratorRouter);
router.use(osintIntelRouter);
router.use(referralsRouter);
router.use(scheduledRouter);
router.use(ttsRouter);
router.use(threatTickerRouter);
router.use(filesRouter);

export default router;
