-- ROP Assistant — Supabase Schema
-- Запустите этот SQL в Supabase Dashboard → SQL Editor

-- Настройки пользователя
CREATE TABLE IF NOT EXISTS settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amo_domain text,
  amo_access_token text,
  amo_refresh_token text,
  amo_token_expires_at timestamptz,
  amo_connected boolean DEFAULT false,
  tg_bot_token text,
  tg_chat_id text,
  tg_connected boolean DEFAULT false,
  anthropic_api_key text,
  sync_interval integer DEFAULT 30,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Воронки AmoCRM
CREATE TABLE IF NOT EXISTS pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amo_id bigint UNIQUE NOT NULL,
  name text NOT NULL,
  is_monitored boolean DEFAULT true,
  target_conversion numeric DEFAULT 15,
  sort integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Этапы воронок
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid REFERENCES pipelines(id) ON DELETE CASCADE,
  amo_id bigint NOT NULL,
  name text NOT NULL,
  sort integer DEFAULT 0,
  color text
);

-- Менеджеры
CREATE TABLE IF NOT EXISTS managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amo_id bigint UNIQUE NOT NULL,
  name text NOT NULL,
  email text,
  is_tracked boolean DEFAULT true,
  plan numeric DEFAULT 3000000,
  created_at timestamptz DEFAULT now()
);

-- Сделки
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amo_id bigint UNIQUE NOT NULL,
  pipeline_id uuid REFERENCES pipelines(id),
  manager_id uuid REFERENCES managers(id),
  stage_id uuid REFERENCES pipeline_stages(id),
  stage_name text,
  title text,
  value numeric DEFAULT 0,
  status text DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost')),
  days_in_stage integer DEFAULT 0,
  is_stalled boolean DEFAULT false,
  amo_created_at timestamptz,
  amo_updated_at timestamptz,
  synced_at timestamptz DEFAULT now()
);

-- Снапшоты статистики (история)
CREATE TABLE IF NOT EXISTS stats_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  pipeline_id uuid REFERENCES pipelines(id),
  manager_id uuid REFERENCES managers(id),
  deals_count integer DEFAULT 0,
  revenue numeric DEFAULT 0,
  calls_count integer DEFAULT 0,
  conversion numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Расписания отчётов
CREATE TABLE IF NOT EXISTS report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cron_expression text NOT NULL,
  report_time time NOT NULL DEFAULT '09:00',
  days text[] DEFAULT '{"MON","TUE","WED","THU","FRI"}',
  managers_filter uuid[] DEFAULT '{}',
  pipelines_filter uuid[] DEFAULT '{}',
  include_plan boolean DEFAULT true,
  include_risks boolean DEFAULT true,
  include_top boolean DEFAULT true,
  include_ai boolean DEFAULT false,
  tg_chat_id text,
  is_active boolean DEFAULT true,
  last_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- История отправленных отчётов
CREATE TABLE IF NOT EXISTS report_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES report_schedules(id),
  message text,
  sent_at timestamptz DEFAULT now(),
  success boolean DEFAULT true,
  error text
);

-- Индексы
CREATE INDEX IF NOT EXISTS deals_pipeline_idx ON deals(pipeline_id);
CREATE INDEX IF NOT EXISTS deals_manager_idx ON deals(manager_id);
CREATE INDEX IF NOT EXISTS deals_status_idx ON deals(status);
CREATE INDEX IF NOT EXISTS snapshots_date_idx ON stats_snapshots(snapshot_date);

-- Row Level Security (опционально, если используете Supabase Auth)
-- ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
