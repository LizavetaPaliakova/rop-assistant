-- =============================================
-- Онбординг менеджеров — Supabase Schema
-- =============================================

-- Менеджеры на онбординге (регистрируются сами)
CREATE TABLE IF NOT EXISTS onboarding_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  session_token text UNIQUE NOT NULL,
  attestation_passed boolean DEFAULT false,
  attestation_passed_at timestamptz,
  certificate_issued boolean DEFAULT false,
  certificate_issued_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Дни онбординга (настраивает РОП)
CREATE TABLE IF NOT EXISTS onboarding_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number integer UNIQUE NOT NULL, -- 1, 2, 3, 4
  title text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Материалы дня (видео, текст, презентация, ссылка)
CREATE TABLE IF NOT EXISTS onboarding_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid REFERENCES onboarding_days(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('video', 'text', 'presentation', 'link')),
  title text NOT NULL,
  content text, -- текст или embed-код
  url text,     -- ссылка на Google Drive / YouTube
  sort integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Тесты (один тест на день)
CREATE TABLE IF NOT EXISTS onboarding_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid REFERENCES onboarding_days(id) ON DELETE CASCADE UNIQUE,
  title text NOT NULL,
  passing_score integer DEFAULT 70, -- минимальный % для прохождения
  created_at timestamptz DEFAULT now()
);

-- Вопросы теста
CREATE TABLE IF NOT EXISTS onboarding_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid REFERENCES onboarding_tests(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  sort integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Варианты ответов
CREATE TABLE IF NOT EXISTS onboarding_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES onboarding_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean DEFAULT false,
  sort integer DEFAULT 0
);

-- Прогресс менеджера по дням
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES onboarding_managers(id) ON DELETE CASCADE,
  day_id uuid REFERENCES onboarding_days(id) ON DELETE CASCADE,
  status text DEFAULT 'locked' CHECK (status IN ('locked', 'in_progress', 'completed')),
  materials_viewed boolean DEFAULT false,
  test_passed boolean DEFAULT false,
  homework_submitted boolean DEFAULT false,
  completed_at timestamptz,
  UNIQUE(manager_id, day_id)
);

-- Попытки прохождения тестов
CREATE TABLE IF NOT EXISTS onboarding_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES onboarding_managers(id) ON DELETE CASCADE,
  test_id uuid REFERENCES onboarding_tests(id) ON DELETE CASCADE,
  score integer NOT NULL, -- процент правильных ответов
  passed boolean NOT NULL,
  answers jsonb DEFAULT '[]', -- [{question_id, selected_option_id, is_correct}]
  created_at timestamptz DEFAULT now()
);

-- Домашние задания
CREATE TABLE IF NOT EXISTS onboarding_homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid REFERENCES onboarding_managers(id) ON DELETE CASCADE,
  day_id uuid REFERENCES onboarding_days(id) ON DELETE CASCADE,
  text text NOT NULL,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed')),
  rop_comment text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE(manager_id, day_id)
);

-- Знания о продукте (синхронизируются из Google Sheets)
CREATE TABLE IF NOT EXISTS product_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text,         -- колонка "Категория" из таблицы
  question text,         -- часто задаваемый вопрос / тема
  answer text,           -- ответ / описание
  source_row integer,    -- номер строки в Google Sheets
  synced_at timestamptz DEFAULT now()
);

-- Настройки Google Sheets для синхронизации
CREATE TABLE IF NOT EXISTS google_sync_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spreadsheet_id text NOT NULL,          -- ID таблицы из URL
  sheet_name text DEFAULT 'Sheet1',      -- название листа
  category_column text DEFAULT 'A',      -- колонка с категорией
  question_column text DEFAULT 'B',      -- колонка с вопросом
  answer_column text DEFAULT 'C',        -- колонка с ответом
  last_synced_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Индексы
CREATE INDEX IF NOT EXISTS ob_progress_manager_idx ON onboarding_progress(manager_id);
CREATE INDEX IF NOT EXISTS ob_progress_day_idx ON onboarding_progress(day_id);
CREATE INDEX IF NOT EXISTS ob_attempts_manager_idx ON onboarding_attempts(manager_id);
CREATE INDEX IF NOT EXISTS ob_attempts_test_idx ON onboarding_attempts(test_id);
CREATE INDEX IF NOT EXISTS ob_questions_test_idx ON onboarding_questions(test_id);
CREATE INDEX IF NOT EXISTS ob_options_question_idx ON onboarding_options(question_id);
CREATE INDEX IF NOT EXISTS ob_materials_day_idx ON onboarding_materials(day_id);
CREATE INDEX IF NOT EXISTS product_knowledge_category_idx ON product_knowledge(category);

-- =============================================
-- Начальные данные: 4 дня онбординга
-- =============================================
INSERT INTO onboarding_days (day_number, title, description) VALUES
  (1, 'Знакомство с компанией', 'Узнай о нашей компании, команде, миссии и карьерных возможностях'),
  (2, 'Изучение продукта', 'Глубокое погружение в продукт: характеристики, преимущества, кейсы'),
  (3, 'Инструменты продаж и аудитория', 'Скрипты, техники продаж, портрет клиента'),
  (4, 'Аттестация', 'Финальная проверка знаний и ролевая игра с РОПом')
ON CONFLICT (day_number) DO NOTHING;
