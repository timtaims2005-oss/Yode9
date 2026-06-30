-- ══════════════════════════════════════════════════════════
--  MR7.AI — ClickHouse AI Analytics Schema
--  High-performance time-series analytics for AI platform
-- ══════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS mr7_analytics
ON CLUSTER '{cluster}'
ENGINE = Replicated('/clickhouse/databases/mr7_analytics', '{shard}', '{replica}');

-- ── AI Requests Log ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mr7_analytics.ai_requests
(
    event_time       DateTime64(3, 'UTC')       CODEC(Delta, ZSTD),
    event_date       Date                        MATERIALIZED toDate(event_time),
    request_id       UUID                        DEFAULT generateUUIDv4(),
    session_id       String                      CODEC(ZSTD),
    user_id          String                      CODEC(ZSTD),
    device_id        String                      CODEC(ZSTD),
    provider         LowCardinality(String),
    model            LowCardinality(String),
    mode             LowCardinality(String)      DEFAULT 'chat',
    persona          LowCardinality(String)      DEFAULT 'kali',
    input_tokens     UInt32,
    output_tokens    UInt32,
    total_tokens     UInt32                      MATERIALIZED input_tokens + output_tokens,
    latency_ms       UInt32,
    ttfb_ms          UInt32,
    stream_duration_ms UInt32,
    status           LowCardinality(String)      DEFAULT 'success',
    error_code       Nullable(String),
    cost_usd         Float32                     DEFAULT 0.0,
    country          LowCardinality(String)      DEFAULT '',
    ip_hash          FixedString(32)             DEFAULT '',
    user_agent_hash  FixedString(32)             DEFAULT '',
    metadata         Map(String, String)
)
ENGINE = ReplicatedMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, provider, model, event_time)
TTL event_date + INTERVAL 1 YEAR
SETTINGS index_granularity = 8192, storage_policy = 'hot_warm';

-- ── Council Requests Log ──────────────────────────────────
CREATE TABLE IF NOT EXISTS mr7_analytics.council_requests
(
    event_time       DateTime64(3, 'UTC')        CODEC(Delta, ZSTD),
    event_date       Date                         MATERIALIZED toDate(event_time),
    request_id       UUID                         DEFAULT generateUUIDv4(),
    session_id       String                       CODEC(ZSTD),
    num_brains       UInt16,
    brains_completed UInt16,
    total_tokens     UInt32,
    total_latency_ms UInt32,
    concurrency      UInt8,
    mode             LowCardinality(String),
    synthesis_tokens UInt32,
    status           LowCardinality(String)
)
ENGINE = ReplicatedMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, event_time)
TTL event_date + INTERVAL 6 MONTH
SETTINGS index_granularity = 8192;

-- ── Token Usage Aggregation (hourly) ─────────────────────
CREATE TABLE IF NOT EXISTS mr7_analytics.token_usage_hourly
(
    hour             DateTime                     CODEC(Delta, ZSTD),
    provider         LowCardinality(String),
    model            LowCardinality(String),
    mode             LowCardinality(String),
    request_count    UInt64,
    input_tokens     UInt64,
    output_tokens    UInt64,
    total_tokens     UInt64,
    total_cost_usd   Float64,
    avg_latency_ms   Float32,
    p50_latency_ms   UInt32,
    p95_latency_ms   UInt32,
    p99_latency_ms   UInt32,
    error_count      UInt32,
    error_rate       Float32                      MATERIALIZED if(request_count > 0, error_count / request_count, 0)
)
ENGINE = ReplicatedSummingMergeTree((request_count, input_tokens, output_tokens, total_tokens, total_cost_usd, error_count))
PARTITION BY toYYYYMM(hour)
ORDER BY (hour, provider, model, mode)
TTL toDate(hour) + INTERVAL 1 YEAR
SETTINGS index_granularity = 8192;

-- ── User Sessions ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mr7_analytics.user_sessions
(
    session_id       String                       CODEC(ZSTD),
    user_id          String                       CODEC(ZSTD),
    device_id        String                       CODEC(ZSTD),
    start_time       DateTime64(3, 'UTC')         CODEC(Delta, ZSTD),
    end_time         Nullable(DateTime64(3, 'UTC')),
    duration_sec     UInt32,
    request_count    UInt32,
    total_tokens     UInt64,
    primary_model    LowCardinality(String),
    primary_persona  LowCardinality(String),
    country          LowCardinality(String),
    subscription_tier LowCardinality(String),
    features_used    Array(LowCardinality(String))
)
ENGINE = ReplicatedReplacingMergeTree(end_time)
PARTITION BY toYYYYMM(toDate(start_time))
ORDER BY (session_id, start_time)
TTL toDate(start_time) + INTERVAL 2 YEAR
SETTINGS index_granularity = 8192;

-- ── Performance Metrics ───────────────────────────────────
CREATE TABLE IF NOT EXISTS mr7_analytics.performance_metrics
(
    event_time       DateTime64(3, 'UTC')         CODEC(Delta, ZSTD),
    event_date       Date                          MATERIALIZED toDate(event_time),
    metric_name      LowCardinality(String),
    metric_value     Float64,
    labels           Map(String, String),
    host             LowCardinality(String),
    service          LowCardinality(String)
)
ENGINE = ReplicatedMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, metric_name, event_time)
TTL event_date + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

-- ── Security Events ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mr7_analytics.security_events
(
    event_time       DateTime64(3, 'UTC')         CODEC(Delta, ZSTD),
    event_date       Date                          MATERIALIZED toDate(event_time),
    event_type       LowCardinality(String),
    severity         LowCardinality(String),
    source_ip        String,
    target_endpoint  String,
    description      String,
    blocked          UInt8                         DEFAULT 0,
    rule_id          Nullable(String),
    metadata         Map(String, String)
)
ENGINE = ReplicatedMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, severity, event_time)
TTL event_date + INTERVAL 1 YEAR
SETTINGS index_granularity = 8192;

-- ── Arsenal Hub Usage ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS mr7_analytics.arsenal_usage
(
    event_time       DateTime64(3, 'UTC')         CODEC(Delta, ZSTD),
    event_date       Date                          MATERIALIZED toDate(event_time),
    module_id        LowCardinality(String),
    module_name      LowCardinality(String),
    session_id       String,
    user_id          String,
    action           LowCardinality(String),
    duration_sec     UInt32,
    success          UInt8
)
ENGINE = ReplicatedMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, module_id, event_time)
TTL event_date + INTERVAL 6 MONTH
SETTINGS index_granularity = 8192;

-- ── Materialized Views ────────────────────────────────────

-- Hourly aggregation MV
CREATE MATERIALIZED VIEW IF NOT EXISTS mr7_analytics.mv_token_usage_hourly
TO mr7_analytics.token_usage_hourly
AS SELECT
    toStartOfHour(event_time)                        AS hour,
    provider,
    model,
    mode,
    count()                                          AS request_count,
    sum(input_tokens)                                AS input_tokens,
    sum(output_tokens)                               AS output_tokens,
    sum(total_tokens)                                AS total_tokens,
    sum(cost_usd)                                    AS total_cost_usd,
    avg(latency_ms)                                  AS avg_latency_ms,
    quantile(0.50)(latency_ms)                       AS p50_latency_ms,
    quantile(0.95)(latency_ms)                       AS p95_latency_ms,
    quantile(0.99)(latency_ms)                       AS p99_latency_ms,
    countIf(status != 'success')                     AS error_count
FROM mr7_analytics.ai_requests
GROUP BY hour, provider, model, mode;

-- ── Useful Queries ────────────────────────────────────────

-- Top models by usage (last 7 days):
-- SELECT model, sum(total_tokens) AS tokens, count() AS requests
-- FROM mr7_analytics.ai_requests
-- WHERE event_date >= today() - 7
-- GROUP BY model ORDER BY tokens DESC LIMIT 10;

-- Hourly request rate:
-- SELECT toStartOfHour(event_time) AS hour, count() AS requests, avg(latency_ms) AS avg_ms
-- FROM mr7_analytics.ai_requests
-- WHERE event_date = today()
-- GROUP BY hour ORDER BY hour;

-- Security events summary:
-- SELECT event_type, severity, count() AS count
-- FROM mr7_analytics.security_events
-- WHERE event_date >= today() - 1
-- GROUP BY event_type, severity ORDER BY count DESC;
