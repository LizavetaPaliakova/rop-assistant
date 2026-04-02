export interface Manager {
  id: string
  amo_id: number
  name: string
  email?: string
  is_tracked: boolean
  deals_count: number
  revenue: number
  plan: number
  plan_percent: number
  calls_count: number
  conversion: number
  avg_deal_days: number
  last_activity?: string
  stalled_deals: number
}

export interface Pipeline {
  id: string
  amo_id: number
  name: string
  is_monitored: boolean
  target_conversion: number
  stages: PipelineStage[]
}

export interface PipelineStage {
  id: string
  amo_id: number
  name: string
  deals_count: number
  revenue: number
  color?: string
  /** 0 = normal, 142 = won, 143 = lost */
  type?: number
}

export interface Deal {
  id: string
  amo_id: number
  pipeline_id: string
  manager_id: string
  stage_id: string
  stage_name: string
  title: string
  value: number
  status: "open" | "won" | "lost"
  created_at: string
  updated_at: string
  days_in_stage: number
  is_stalled: boolean
}

export interface ReportSchedule {
  id: string
  name: string
  cron_expression: string
  time: string
  days: string[]
  managers_filter: string[]
  pipelines_filter: string[]
  include_plan: boolean
  include_risks: boolean
  include_top: boolean
  include_ai: boolean
  tg_chat_id: string
  is_active: boolean
}

export interface AiAlert {
  type: "warning" | "danger" | "info"
  message: string
  manager?: string
  count?: number
}

export interface DashboardStats {
  total_deals: number
  total_revenue: number
  conversion: number
  avg_deal_days: number
  deals_delta: number
  revenue_delta: number
  conversion_delta: number
}

export interface Settings {
  amo_domain?: string
  amo_token?: string
  amo_connected: boolean
  tg_bot_token?: string
  tg_chat_id?: string
  tg_connected: boolean
  sync_interval: number
}

// =============================================
// Онбординг менеджеров
// =============================================

export interface OnboardingManager {
  id: string
  first_name: string
  last_name: string
  phone: string
  session_token: string
  attestation_passed: boolean
  attestation_passed_at?: string
  certificate_issued: boolean
  certificate_issued_at?: string
  created_at: string
}

export interface OnboardingDay {
  id: string
  day_number: number
  title: string
  description?: string
  is_active: boolean
  materials?: OnboardingMaterial[]
  test?: OnboardingTest
}

export type MaterialType = 'video' | 'text' | 'presentation' | 'link'

export interface OnboardingMaterial {
  id: string
  day_id: string
  type: MaterialType
  title: string
  content?: string
  url?: string
  sort: number
}

export interface OnboardingTest {
  id: string
  day_id: string
  title: string
  passing_score: number
  questions?: OnboardingQuestion[]
}

export interface OnboardingQuestion {
  id: string
  test_id: string
  question_text: string
  sort: number
  options?: OnboardingOption[]
}

export interface OnboardingOption {
  id: string
  question_id: string
  option_text: string
  is_correct: boolean
  sort: number
}

export type ProgressStatus = 'locked' | 'in_progress' | 'completed'

export interface OnboardingProgress {
  id: string
  manager_id: string
  day_id: string
  status: ProgressStatus
  materials_viewed: boolean
  test_passed: boolean
  homework_submitted: boolean
  completed_at?: string
}

export interface OnboardingAttempt {
  id: string
  manager_id: string
  test_id: string
  score: number
  passed: boolean
  answers: AttemptAnswer[]
  created_at: string
}

export interface AttemptAnswer {
  question_id: string
  selected_option_id: string
  is_correct: boolean
}

export interface OnboardingHomework {
  id: string
  manager_id: string
  day_id: string
  text: string
  status: 'submitted' | 'reviewed'
  rop_comment?: string
  submitted_at: string
  reviewed_at?: string
}

export interface ProductKnowledge {
  id: string
  category?: string
  question?: string
  answer?: string
  source_row?: number
  synced_at: string
}

export interface GoogleSyncConfig {
  id: string
  spreadsheet_id: string
  sheet_name: string
  category_column: string
  question_column: string
  answer_column: string
  last_synced_at?: string
  is_active: boolean
}

// Данные для отображения прогресса менеджера в админке
export interface ManagerProgressView {
  manager: OnboardingManager
  progress: (OnboardingProgress & { day: OnboardingDay })[]
  overall_percent: number
  days_completed: number
  last_activity?: string
}
