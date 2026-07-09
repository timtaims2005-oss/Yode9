# 3D Features & Components

The MR7.AI / KaliGPT platform features an extensive collection of 3D and holographic UI components built with React Three Fiber, Three.js, and custom CSS/Canvas animations.

---

## Core 3D Infrastructure

### CyberneticBackground (`components/3d/CyberneticBackground.tsx`)
A pulsating neural network background rendered with Three.js. Features interconnected nodes with animated data flow lines, creating a living cybernetic mesh that responds to system state.

### FuturisticBackground3D (`components/FuturisticBackground3D.tsx`)
Full-screen 3D background with particle systems, volumetric lighting, and depth-of-field effects. Serves as the base layer for the entire application.

### QuantumVoidBackground3D (`components/QuantumVoidBackground3D.tsx`)
Deep-space void effect with quantum particle simulations and gravitational lensing distortions.

### Cyber3DGrid (`components/Cyber3DGrid.tsx`)
Perspective-projected 3D grid with animated scan lines and data flow visualization.

---

## Holographic UI Elements

### HoloChatBubble (`components/chat/HoloChatBubble.tsx`)
Holographic chat message bubbles with glass-morphism effects, animated borders, and glow effects. Each message appears as a floating hologram panel.

### HoloCoreOrb (`components/HoloCoreOrb.tsx`)
Central holographic orb representing the AI core. Features rotating energy rings, particle emissions, and state-reactive color changes.

### HoloDataStream (`components/HoloDataStream.tsx`)
Animated data stream visualization showing real-time information flow between system components.

### HoloPulseRing (`components/HoloPulseRing.tsx`)
Concentric pulse rings that expand outward from focal points, indicating system activity and data propagation.

### HolographicPanel (`components/HolographicPanel.tsx`)
Reusable panel component with holographic frame borders, corner accents, and scan-line overlays.

---

## HUD (Heads-Up Display) Components

### ThreatRadar (`components/hud/ThreatRadar.tsx`)
Circular radar display with rotating sweep line, threat blips, and range rings. Visualizes active security threats in real-time.

### TokenGauge (`components/hud/TokenGauge.tsx`)
Circular gauge showing token usage with animated fill, color-coded thresholds (green/yellow/red), and numerical readout.

### ProviderStatusOrbs (`components/hud/ProviderStatusOrbs.tsx`)
Floating orbs representing each AI provider (OpenAI, Anthropic, Groq, etc.) with color-coded status indicators (online/degraded/offline).

### SystemHealthMatrix (`components/hud/SystemHealthMatrix.tsx`)
Grid-based health display showing CPU, memory, network, and database status with animated bar charts and trend indicators.

### CyberHeatmapHUD (`components/CyberHeatmapHUD.tsx`)
Heat map overlay showing activity intensity across different system zones.

### IntelligenceHUDOverlay (`components/IntelligenceHUDOverlay.tsx`)
Full-screen HUD overlay with targeting reticles, data readouts, and tactical information display.

### NeuralStreamHUD (`components/NeuralStreamHUD.tsx`)
Real-time neural network activity visualization showing layer activations and data flow through the AI pipeline.

### PipelineHUD (`components/PipelineHUD.tsx`)
Pipeline processing visualization showing task stages, progress, and throughput metrics.

---

## Dashboard 3D Components

### SecurityDashboard3D (`components/SecurityDashboard3D.tsx`)
3D security operations dashboard with threat maps, vulnerability graphs, and incident timelines.

### CostDashboard3D (`components/CostDashboard3D.tsx`)
3D cost tracking dashboard with animated bar charts, trend lines, and provider cost breakdowns.

### PerformanceDashboard3D (`components/PerformanceDashboard3D.tsx`)
System performance monitoring with 3D graphs for latency, throughput, and error rates.

### LiveOpsDashboard3D (`components/LiveOpsDashboard3D.tsx`)
Live operations dashboard showing real-time system metrics, active sessions, and request volumes.

### ThreatIntelDashboard3D (`components/ThreatIntelDashboard3D.tsx`)
Threat intelligence dashboard with CVE feeds, attack patterns, and mitigation status.

### ProviderHealthDashboard3D (`components/ProviderHealthDashboard3D.tsx`)
AI provider health monitoring with latency graphs, error rates, and availability status.

---

## Network & Threat Visualization

### NetworkTopology3D (`components/NetworkTopology3D.tsx`)
3D network topology graph with nodes, connections, and traffic flow animation.

### LiveAttackGlobe3D (`components/LiveAttackGlobe3D.tsx`)
Rotating 3D globe showing live attack origins and targets with animated arc trajectories.

### ThreatWorldMap3D (`components/ThreatWorldMap3D.tsx`)
World map with threat overlay, showing geographic distribution of security events.

### ThreatFeed3D (`components/ThreatFeed3D.tsx`)
3D scrolling threat feed with severity-coded entries and real-time updates.

### FloatingNetworkPanel (`components/FloatingNetworkPanel.tsx`)
Floating panel with network traffic visualization, packet inspection, and connection tracking.

### NetworkPacketInspector (`components/NetworkPacketInspector.tsx`)
Detailed packet-level network inspection with protocol decoding and payload visualization.

---

## AI & Neural Components

### NeuralActivityMonitor3D (`components/NeuralActivityMonitor3D.tsx`)
3D visualization of neural network activity showing neuron firing patterns and layer activations.

### NeuralParticleBackground (`components/NeuralParticleBackground.tsx`)
Particle system background simulating neural connections with synaptic firing animations.

### NeuralPulseBackground (`components/NeuralPulseBackground.tsx`)
Pulsing neural network background with wave propagation and node activation effects.

### PersonaSwitcher3D (`components/PersonaSwitcher3D.tsx`)
3D persona selection interface with rotating character models and ability displays.

### QuantumPersona3D (`components/QuantumPersona3D.tsx`)
Quantum-themed persona switcher with superposition effects and entanglement visualization.

### LocalAIModelNexus (`components/LocalAIModelNexus.tsx`)
3D nexus display for local AI models showing model relationships and capability overlaps.

### OllamaHub3D (`components/OllamaHub3D.tsx`)
3D hub for Ollama local model management with model cards and performance metrics.

---

## Command Center & Control

### CyberCommandCenter3D (`components/CyberCommandCenter3D.tsx`)
Full 3D command center interface with multiple display panels, tactical maps, and control interfaces.

### SystemMasterHUD3D (`components/SystemMasterHUD3D.tsx`)
Master HUD overlay providing system-wide status, alerts, and quick-action controls.

### QuickDock3D (`components/QuickDock3D.tsx`)
3D quick-access dock with floating tool icons and animated hover effects.

### CyberWidgetsDock (`components/CyberWidgetsDock.tsx`)
Widget dock with cyberpunk-styled containers for mini-applications and status displays.

---

## Sidebar & Layout

### NeuralSidebar (`components/sidebar/NeuralSidebar.tsx`)
Sidebar with neon glow effects, animated borders, and neural network-inspired design. Features chat history, bookmarks, and quick navigation.

### AmbientLayer (`components/layout/AmbientLayer.tsx`)
Ambient background layer combining multiple particle systems, gradient overlays, and subtle animations. Lazy-loaded for performance.

### AmbientParticleField (`components/AmbientParticleField.tsx`)
Floating particle field with depth-based parallax and interactive mouse tracking.

---

## Specialized Visualization

### AnomalyLog3D (`components/AnomalyLog3D.tsx`)
3D anomaly log with severity-coded entries, timeline visualization, and drill-down capability.

### BenchmarkHistory3D (`components/BenchmarkHistory3D.tsx`)
3D benchmark history with comparative bar charts and trend analysis.

### CisaLivePanel3D (`components/CisaLivePanel3D.tsx`)
Live CISA KEV (Known Exploited Vulnerabilities) panel with real-time alerts and vulnerability details.

### ContextMemoryPanel3D (`components/ContextMemoryPanel3D.tsx`)
3D context memory visualization showing conversation history, entity relationships, and recall patterns.

### DedupVisualizer3D (`components/DedupVisualizer3D.tsx`)
3D deduplication visualizer showing content similarity graphs and duplicate detection.

### PrefetchIntelligence3D (`components/PrefetchIntelligence3D.tsx`)
3D prefetch intelligence display showing predicted user actions and cached results.

### ProviderHealthBadge3D (`components/ProviderHealthBadge3D.tsx`)
3D health badges for each AI provider with status indicators and latency metrics.

### StreamMetrics3D (`components/StreamMetrics3D.tsx`)
3D streaming metrics display showing tokens/sec, latency, and throughput.

### TokenCounter3D (`components/TokenCounter3D.tsx`)
3D token counter with animated digit rolls and usage visualization.

---

## Interactive Widgets

### CyberGlobeWidget (`components/CyberGlobeWidget.tsx`)
Interactive 3D globe with threat markers, connection lines, and rotation controls.

### InteractiveGlobeWidget (`components/InteractiveGlobeWidget.tsx`)
Full interactive globe with zoom, pan, and click-to-inspect functionality.

### CyberIntelCenter (`components/CyberIntelCenter.tsx`)
Intelligence center with multi-source data aggregation and correlation visualization.

### DarkWebMonitor (`components/DarkWebMonitor.tsx`)
Dark web monitoring panel with threat feeds, marketplace tracking, and alert configuration.

### SessionRecorderWidget (`components/SessionRecorderWidget.tsx`)
Session recording widget with timeline, playback controls, and export functionality.

### IdleWidget (`components/IdleWidget.tsx`)
Idle state widget with animated screensaver effects and quick-wake functionality.

---

## Matrix & Rain Effects

### MatrixRain (`components/MatrixRain.tsx`)
Classic Matrix-style digital rain with customizable characters, colors, and speed.

### MatrixRainBackground (`components/MatrixRainBackground.tsx`)
Full-screen Matrix rain background with depth layers and fade effects.

---

## Chat & Input Effects

### ChatInputParticles (`components/ChatInputParticles.tsx`)
Particle effects emanating from the chat input during typing, with intensity based on message length.

### ChatEmptyState (`components/ChatEmptyState.tsx`)
Animated empty state for chat with floating 3D elements and suggested prompts.

### ThinkingIndicator (`components/ThinkingIndicator.tsx`)
AI thinking indicator with 3D neural activity visualization and progress animation.

---

## Component Count Summary

| Category | Count |
|----------|-------|
| Core 3D Infrastructure | 4 |
| Holographic UI Elements | 5 |
| HUD Components | 8 |
| Dashboard 3D | 6 |
| Network & Threat Viz | 5 |
| AI & Neural | 7 |
| Command Center | 4 |
| Sidebar & Layout | 4 |
| Specialized Visualization | 9 |
| Interactive Widgets | 5 |
| Matrix & Rain Effects | 2 |
| Chat & Input Effects | 3 |
| **Total 3D/Visual Components** | **~62** |

Additionally, there are **80+ modal dialogs** with 3D elements, bringing the total visual component count to **150+** files that reference 3D/Canvas/WebGL technologies.

---

## Technology Stack

- **React Three Fiber** - React renderer for Three.js
- **Three.js** - 3D graphics library
- **@react-three/drei** - Useful helpers for R3F
- **Framer Motion** - Animation library for 2D transitions
- **CSS Animations** - Keyframe animations for HUD elements
- **Canvas 2D** - 2D rendering for particle systems and effects
- **WebGL 2.0** - Hardware-accelerated 3D rendering (with fallback)
