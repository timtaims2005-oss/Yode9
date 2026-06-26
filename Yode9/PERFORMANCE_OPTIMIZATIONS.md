# Performance Optimizations

Performance improvements applied to the MR7.AI / KaliGPT frontend and backend.

---

## 1. Lazy Loading of 3D Components

**Problem:** All 3D components (Three.js, React Three Fiber) were bundled into the initial page load, resulting in a large JavaScript bundle and slow Time to Interactive (TTI).

**Fix:** All heavy 3D components are now lazy-loaded using React's `lazy()` and `Suspense`:

```tsx
const AmbientLayer = lazy(() => import("./components/layout/AmbientLayer").then(m => ({ default: m.AmbientLayer })));
const CyberneticBackground = lazy(() => import("./components/3d/CyberneticBackground").then(m => ({ default: m.CyberneticBackground })));
```

**Impact:**
- Initial bundle size reduced significantly
- First Contentful Paint (FCP) improved
- 3D scenes only load when the user navigates to features that need them

**Files:**
- `/artifacts/mr7-ai/src/App.tsx` (150+ lazy imports)

---

## 2. Lazy Loading of Modal Components

**Problem:** The application has 100+ modal dialogs, each importing heavy dependencies. Loading all at startup was wasteful.

**Fix:** Every modal is now lazy-loaded:

```tsx
const SettingsModal = lazy(() => import("./components/modals/SettingsModal").then(m => ({ default: m.SettingsModal })));
const AdminPanel = lazy(() => import("./components/modals/AdminPanel").then(m => ({ default: m.AdminPanel })));
// ... 100+ more modals
```

**Impact:**
- Only the visible UI is loaded initially
- Each modal's code is fetched on-demand when opened
- Dramatic reduction in initial JavaScript parsing time

**Files:**
- `/artifacts/mr7-ai/src/App.tsx`

---

## 3. Component File Splitting

**Problem:** Large monolithic component files made code splitting ineffective.

**Fix:** Components were split into smaller, focused files organized by domain:
- `components/3d/` - Core 3D building blocks (CyberneticBackground)
- `components/hud/` - HUD elements (ThreatRadar, TokenGauge, ProviderStatusOrbs, SystemHealthMatrix)
- `components/chat/` - Chat-specific components (ChatInput, HoloChatBubble, ChatTypingIndicator)
- `components/layout/` - Layout components (AmbientLayer)
- `components/sidebar/` - Sidebar components (NeuralSidebar)
- `components/modals/` - All modal dialogs

**Impact:**
- Better tree-shaking by bundlers
- Each file can be independently code-split
- Easier maintenance and parallel development

---

## 4. Display Capability Detection

**Problem:** 3D animations and effects ran at full intensity on all devices, including low-end hardware.

**Fix:** `initDisplayCapabilities()` runs at startup to detect:
- Display refresh rate (60Hz vs 120Hz+)
- WebGL 2.0 support
- OffscreenCanvas availability
- Device memory and CPU cores

Components use these capabilities to adjust their rendering quality:
- Lower particle counts on low-end devices
- Reduced animation frame rates
- Simplified shaders when WebGL 2.0 is unavailable

**Files:**
- `/artifacts/mr7-ai/src/lib/adaptive-quality.ts`
- `/artifacts/mr7-ai/src/App.tsx`

---

## 5. Tab Visibility Optimization

**Problem:** Animations and background processes continued running when the browser tab was hidden, wasting CPU and battery.

**Fix:** A `visibilitychange` listener adds a `tab-hidden` CSS class to `<body>` when the tab is not visible:

```tsx
useEffect(() => {
  function onVisibility() {
    if (document.hidden) { document.body.classList.add('tab-hidden'); }
    else { document.body.classList.remove('tab-hidden'); }
  }
  document.addEventListener("visibilitychange", onVisibility);
  return () => document.removeEventListener("visibilitychange", onVisibility);
}, []);
```

CSS animations can use `.tab-hidden * { animation-play-state: paused; }` to pause when hidden.

**Files:**
- `/artifacts/mr7-ai/src/App.tsx`

---

## 6. Debounced Context Memory & Prefetch

**Problem:** Context memory analysis and prefetch engine ran on every message change, causing excessive CPU usage during rapid typing/streaming.

**Fix:** Both operations are now debounced:
- Context memory: 500ms debounce after message changes
- Prefetch engine: 1000ms debounce after assistant responses

```tsx
debounceMemRef.current = setTimeout(() => {
  contextMemory.addMessage(last.role, last.content);
}, 500);

debouncePrefRef.current = setTimeout(() => {
  prefetchEngine.analyze(prev.content, last.content);
}, 1000);
```

**Impact:**
- Reduced CPU usage during streaming
- Fewer unnecessary re-renders
- Smoother user experience during rapid interactions

**Files:**
- `/artifacts/mr7-ai/src/App.tsx`

---

## 7. Database Connection Pooling

**Problem:** Each database query created a new connection, causing overhead and potential connection exhaustion.

**Fix:** PostgreSQL connection pool with configurable limits:

```ts
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
});
```

**Impact:**
- Connections are reused across queries
- Maximum 10 concurrent connections prevents resource exhaustion
- SSL in production, plain in development

**Files:**
- `/artifacts/api-server/src/db.ts`

---

## 8. Auto-Init Provider Selection

**Problem:** Users had to manually configure AI providers on first launch, creating friction.

**Fix:** Silent auto-initialization checks available server-side providers in priority order and automatically selects the first available one:

```
groq > openai > anthropic > gemini > openrouter > deepseek > xai > mistral
```

Falls back to localStorage-stored keys if no server provider is available.

**Impact:**
- Zero-config first launch for most users
- Reduced time-to-first-message
- Automatic fallback chain ensures reliability

**Files:**
- `/artifacts/mr7-ai/src/App.tsx`

---

## 9. React Query for Server State

**Problem:** Manual fetch calls with no caching, deduplication, or background refresh.

**Fix:** `@tanstack/react-query` is used for all server state management:

```tsx
const queryClient = new QueryClient();
// ...
<QueryClientProvider client={queryClient}>
```

**Impact:**
- Automatic request deduplication
- Background refetching of stale data
- Cache-first strategy reduces network requests
- Built-in loading/error states

**Files:**
- `/artifacts/mr7-ai/src/App.tsx`

---

## 10. Subscription State Caching

**Problem:** Every page load required a server round-trip to check subscription status.

**Fix:** Client-side caching with 1-hour TTL:
- Subscription state persisted to localStorage
- Cache invalidated after 1 hour
- Automatic expiry check on cached data
- Falls back to "free" tier if cache is stale or unavailable

**Impact:**
- Instant subscription state on page load
- Reduced server load
- Graceful degradation when server is unreachable

**Files:**
- `/artifacts/mr7-ai/src/lib/subscription.ts`

---

## Summary Table

| # | Optimization | Category | Impact |
|---|-------------|----------|--------|
| 1 | Lazy-loaded 3D components | Bundle size | High |
| 2 | Lazy-loaded modals (100+) | Bundle size | High |
| 3 | Component file splitting | Code splitting | Medium |
| 4 | Display capability detection | Rendering | Medium |
| 5 | Tab visibility optimization | CPU/Battery | Medium |
| 6 | Debounced context/prefetch | CPU usage | Medium |
| 7 | Database connection pooling | Backend | High |
| 8 | Auto-init provider selection | UX/Startup | Medium |
| 9 | React Query integration | Network | Medium |
| 10 | Subscription state caching | Startup | Low |
