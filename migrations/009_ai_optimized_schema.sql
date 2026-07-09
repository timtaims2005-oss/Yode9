-- ============================================
-- Migration: 009_ai_optimized_schema.sql
-- قاعدة بيانات محسّنة للذكاء الاصطناعي
-- AI-Optimized Database Schema for Yode9 / MR7.AI
-- ============================================

-- جدول المحادثات المُحسَّن
CREATE TABLE IF NOT EXISTS ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    model_id VARCHAR(100) NOT NULL,
    model_provider VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    context_window INTEGER DEFAULT 4096,
    temperature DECIMAL(3,2) DEFAULT 0.7,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE,
    is_archived BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'
);

-- جدول الرسائل مع التوكنز والتكلفة
CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES ai_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
    content TEXT NOT NULL,
    tokens_input INTEGER,
    tokens_output INTEGER,
    latency_ms INTEGER,
    cost_usd DECIMAL(10,6),
    model_version VARCHAR(100),
    finish_reason VARCHAR(50),
    tool_calls JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول الكاش الذكي للردود
CREATE TABLE IF NOT EXISTS ai_response_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cache_key VARCHAR(64) NOT NULL UNIQUE,
    message_hash VARCHAR(64) NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    response TEXT NOT NULL,
    tokens_used INTEGER,
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours',
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول تتبع أمان الطلبات
CREATE TABLE IF NOT EXISTS ai_security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    request_id VARCHAR(64),
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('prompt_injection', 'rate_limit', 'dangerous_keyword', 'length_exceeded', 'blocked')),
    risk_score INTEGER DEFAULT 0,
    threat_details JSONB DEFAULT '[]',
    ip_address INET,
    user_agent TEXT,
    blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- جدول مقاييس الأداء
CREATE TABLE IF NOT EXISTS ai_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    request_count INTEGER DEFAULT 1,
    total_tokens INTEGER DEFAULT 0,
    total_latency_ms INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    date DATE DEFAULT CURRENT_DATE,
    hour INTEGER DEFAULT EXTRACT(HOUR FROM NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(model_id, provider, date, hour)
);

-- جدول إعدادات نماذج المستخدم
CREATE TABLE IF NOT EXISTS user_ai_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL UNIQUE,
    default_model VARCHAR(100) DEFAULT 'gpt-4o-mini',
    default_provider VARCHAR(50) DEFAULT 'openai',
    temperature DECIMAL(3,2) DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2048,
    stream_enabled BOOLEAN DEFAULT TRUE,
    system_prompt TEXT,
    language_preference VARCHAR(10) DEFAULT 'ar',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON ai_conversations(user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_archived ON ai_conversations(is_archived, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON ai_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_role ON ai_messages(role, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_key ON ai_response_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_response_cache_expires ON ai_response_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_security_events_user ON ai_security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_security_events_type ON ai_security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_performance_model ON ai_performance_metrics(model_id, provider, date DESC);

-- Trigger: تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION update_ai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_conversations_updated_at
    BEFORE UPDATE ON ai_conversations
    FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at();

CREATE TRIGGER trg_user_ai_preferences_updated_at
    BEFORE UPDATE ON user_ai_preferences
    FOR EACH ROW EXECUTE FUNCTION update_ai_updated_at();

-- Function: تنظيف الكاش المنتهي الصلاحية
CREATE OR REPLACE FUNCTION cleanup_expired_ai_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM ai_response_cache WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: تحديث مقاييس الأداء
CREATE OR REPLACE FUNCTION update_ai_performance_metric(
    p_model_id VARCHAR,
    p_provider VARCHAR,
    p_tokens INTEGER,
    p_latency_ms INTEGER,
    p_is_error BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
BEGIN
    INSERT INTO ai_performance_metrics (model_id, provider, request_count, total_tokens, total_latency_ms, error_count, date, hour)
    VALUES (p_model_id, p_provider, 1, p_tokens, p_latency_ms, CASE WHEN p_is_error THEN 1 ELSE 0 END, CURRENT_DATE, EXTRACT(HOUR FROM NOW()))
    ON CONFLICT (model_id, provider, date, hour) DO UPDATE SET
        request_count = ai_performance_metrics.request_count + 1,
        total_tokens = ai_performance_metrics.total_tokens + p_tokens,
        total_latency_ms = ai_performance_metrics.total_latency_ms + p_latency_ms,
        error_count = ai_performance_metrics.error_count + CASE WHEN p_is_error THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;
