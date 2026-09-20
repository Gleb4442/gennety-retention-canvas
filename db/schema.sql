-- ==============================================================================
-- Gennety Retention Canvas Database Schema
-- Compatible with PostgreSQL 14+, Supabase, and Neon Serverless Postgres
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Workspaces: Multi-project user workspace state (keyed by accessKey)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canvas_workspaces (
    access_key VARCHAR(128) PRIMARY KEY,
    active_project_id VARCHAR(128),
    projects JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canvas_workspaces_updated ON canvas_workspaces(updated_at DESC);

-- ------------------------------------------------------------------------------
-- 2. Projects: Individual projects synced for real-time collaboration & sharing
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canvas_projects (
    id VARCHAR(128) PRIMARY KEY,
    owner_key VARCHAR(128) NOT NULL DEFAULT 'anonymous',
    title VARCHAR(255) NOT NULL DEFAULT 'Canvas Project',
    description TEXT DEFAULT '',
    nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
    edges JSONB NOT NULL DEFAULT '[]'::jsonb,
    drawings JSONB NOT NULL DEFAULT '[]'::jsonb,
    layout_mode VARCHAR(64) NOT NULL DEFAULT 'freeform',
    theme VARCHAR(64) NOT NULL DEFAULT 'dark',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canvas_projects_owner ON canvas_projects(owner_key);
CREATE INDEX IF NOT EXISTS idx_canvas_projects_updated ON canvas_projects(updated_at DESC);

-- ------------------------------------------------------------------------------
-- 3. Project Shares: Shareable links for viewer or editor collaboration
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canvas_project_shares (
    id VARCHAR(128) PRIMARY KEY DEFAULT ('sh_' || md5(random()::text || clock_timestamp()::text)),
    project_id VARCHAR(128) NOT NULL REFERENCES canvas_projects(id) ON DELETE CASCADE,
    share_token VARCHAR(128) UNIQUE NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'editor',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canvas_shares_token ON canvas_project_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_canvas_shares_project ON canvas_project_shares(project_id);

-- ------------------------------------------------------------------------------
-- 4. Project Versions: Version history snapshots and manual checkpoints
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canvas_project_versions (
    id VARCHAR(128) PRIMARY KEY DEFAULT ('ver_' || md5(random()::text || clock_timestamp()::text)),
    project_id VARCHAR(128) NOT NULL REFERENCES canvas_projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    label VARCHAR(255),
    is_manual BOOLEAN NOT NULL DEFAULT FALSE,
    snapshot JSONB NOT NULL,
    created_by_name VARCHAR(128) NOT NULL DEFAULT 'Пользователь',
    created_by_id VARCHAR(128) NOT NULL DEFAULT 'anonymous',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canvas_versions_project ON canvas_project_versions(project_id, version_number DESC);

-- ------------------------------------------------------------------------------
-- 5. Audit Logs: Real-time user action logs, mutations, diffs, and summaries
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canvas_audit_logs (
    id VARCHAR(128) PRIMARY KEY DEFAULT ('log_' || md5(random()::text || clock_timestamp()::text)),
    project_id VARCHAR(128) NOT NULL REFERENCES canvas_projects(id) ON DELETE CASCADE,
    user_id VARCHAR(128) NOT NULL DEFAULT 'anonymous',
    user_name VARCHAR(128) NOT NULL DEFAULT 'Пользователь',
    user_color VARCHAR(32) NOT NULL DEFAULT '#3B82F6',
    action_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(128),
    summary TEXT NOT NULL,
    diff JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_canvas_audit_project ON canvas_audit_logs(project_id, created_at DESC);
