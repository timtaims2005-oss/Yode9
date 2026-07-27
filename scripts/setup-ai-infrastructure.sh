#!/bin/bash
# setup-ai-infrastructure.sh
# ==========================
# سكربت إعداد كامل للبنية التحتية AI - Yode9 / MR7.AI

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "${BLUE}[STEP]${NC} $1"; }

echo ""
echo "🚀 Yode9 / MR7.AI — AI Infrastructure Setup"
echo "============================================="
echo ""

# --- Check prerequisites ---
check_prerequisites() {
    log_step "Checking prerequisites..."

    command -v node >/dev/null 2>&1 || { log_error "Node.js is required. Install from https://nodejs.org"; exit 1; }
    command -v pnpm >/dev/null 2>&1 || { log_warn "pnpm not found. Installing..."; npm install -g pnpm; }

    if command -v docker >/dev/null 2>&1; then
        log_info "Docker found ✓"
    else
        log_warn "Docker not found. Some services (Ollama, vLLM) require Docker."
    fi

    log_info "Prerequisites check passed ✓"
}

# --- Setup directories ---
setup_directories() {
    log_step "Creating AI infrastructure directories..."

    mkdir -p \
        infrastructure/docker \
        infrastructure/monitoring/prometheus \
        infrastructure/monitoring/grafana \
        infrastructure/security \
        ai-models/cache \
        ai-models/configs \
        logs/ai \
        logs/security

    log_info "Directories created ✓"
}

# --- Create Docker Compose for AI Services ---
create_docker_compose() {
    log_step "Creating Docker Compose for AI services..."

    cat > infrastructure/docker/docker-compose.ai.yml << 'EOF'
version: '3.8'

services:
  # Ollama - Local LLM Server
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
    restart: unless-stopped
    networks:
      - ai-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Qdrant - Vector Database
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant-data:/qdrant/storage
    restart: unless-stopped
    networks:
      - ai-network
    environment:
      - QDRANT__SERVICE__HTTP_PORT=6333
      - QDRANT__SERVICE__GRPC_PORT=6334

  # Redis - Caching & Session Store
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    restart: unless-stopped
    networks:
      - ai-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  ollama-data:
  qdrant-data:
  redis-data:

networks:
  ai-network:
    driver: bridge
EOF

    log_info "Docker Compose created at infrastructure/docker/docker-compose.ai.yml ✓"
}

# --- Setup Monitoring Stack ---
setup_monitoring() {
    log_step "Setting up monitoring stack..."

    cat > infrastructure/monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'yode9-ai-api'
    static_configs:
      - targets: ['host.docker.internal:5000']
    metrics_path: /api/ai-tools/health

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'qdrant'
    static_configs:
      - targets: ['qdrant:6333']
    metrics_path: /metrics
EOF

    cat > infrastructure/docker/docker-compose.monitoring.yml << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ../monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=15d'
    restart: unless-stopped
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-admin123}
      - GF_INSTALL_PLUGINS=grafana-clock-panel
    restart: unless-stopped
    networks:
      - monitoring

volumes:
  prometheus-data:
  grafana-data:

networks:
  monitoring:
    driver: bridge
EOF

    log_info "Monitoring stack configured ✓"
}

# --- Create environment file ---
create_env_file() {
    log_step "Creating AI environment configuration..."

    if [ -f ".env.ai" ]; then
        log_warn ".env.ai already exists. Skipping creation."
        return
    fi

    cat > .env.ai << 'EOF'
# ============================================
# Yode9 / MR7.AI — AI Infrastructure Config
# ============================================

# AI API Keys (set the ones you have)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GROQ_API_KEY=
TOGETHER_API_KEY=
FIREWORKS_API_KEY=

# Self-Hosted AI
OLLAMA_URL=http://localhost:11434
VLLM_URL=http://localhost:8000/v1

# Vector Database
QDRANT_URL=http://localhost:6333

# Redis Cache
REDIS_URL=redis://localhost:6379

# Monitoring
GRAFANA_PASSWORD=admin123
EOF

    log_info ".env.ai created ✓"
    log_warn "Don't forget to add your API keys to .env.ai"
}

# --- Pull Ollama models ---
pull_ollama_models() {
    log_step "Checking for Ollama..."

    if ! command -v ollama >/dev/null 2>&1; then
        log_warn "Ollama CLI not found. Skipping model pull."
        return
    fi

    if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        log_warn "Ollama server not running. Start it first with: ollama serve"
        return
    fi

    log_info "Pulling recommended models..."

    local models=("llama3.1" "qwen2.5" "mistral")
    for model in "${models[@]}"; do
        log_info "Pulling $model..."
        ollama pull "$model" || log_warn "Failed to pull $model — skipping"
    done

    log_info "Models pulled ✓"
}

# --- Run migrations ---
run_migrations() {
    log_step "Preparing AI database migrations..."

    if [ -f "migrations/009_ai_optimized_schema.sql" ]; then
        log_info "Migration 009_ai_optimized_schema.sql found ✓"
        log_warn "Run manually: psql \$DATABASE_URL -f migrations/009_ai_optimized_schema.sql"
    fi
}

# --- Create Makefile ---
create_makefile() {
    cat > infrastructure/Makefile << 'EOF'
.PHONY: start stop restart logs status clean help

help:
	@echo "Yode9 / MR7.AI Infrastructure Commands"
	@echo "========================================"
	@echo "  make start    — Start all AI services"
	@echo "  make stop     — Stop all AI services"
	@echo "  make restart  — Restart all services"
	@echo "  make logs     — Tail logs"
	@echo "  make status   — Show service status"
	@echo "  make clean    — Stop and remove volumes"

start:
	docker compose -f docker/docker-compose.ai.yml up -d
	@echo "✅ AI services started!"
	@echo "   Ollama:  http://localhost:11434"
	@echo "   Qdrant:  http://localhost:6333"
	@echo "   Redis:   localhost:6379"

stop:
	docker compose -f docker/docker-compose.ai.yml down

restart: stop start

logs:
	docker compose -f docker/docker-compose.ai.yml logs -f

status:
	docker compose -f docker/docker-compose.ai.yml ps

monitoring-start:
	docker compose -f docker/docker-compose.monitoring.yml up -d
	@echo "✅ Monitoring started!"
	@echo "   Prometheus: http://localhost:9090"
	@echo "   Grafana:    http://localhost:3001"

clean:
	docker compose -f docker/docker-compose.ai.yml down -v
	docker compose -f docker/docker-compose.monitoring.yml down -v
	docker volume prune -f
EOF

    log_info "Makefile created at infrastructure/Makefile ✓"
}

# --- Main ---
main() {
    check_prerequisites
    setup_directories
    create_docker_compose
    setup_monitoring
    create_env_file
    run_migrations
    create_makefile

    echo ""
    log_info "Setup complete! 🎉"
    echo ""
    echo "Next steps:"
    echo "  1. Add your API keys to .env.ai"
    echo "  2. cd infrastructure && make start"
    echo "  3. Run DB migration: psql \$DATABASE_URL -f migrations/009_ai_optimized_schema.sql"
    echo "  4. Access Grafana at http://localhost:3001 (admin/admin123)"
    echo ""
    echo "For help: cd infrastructure && make help"
}

main "$@"
