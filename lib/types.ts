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
  sales_this_month: number
}

export interface Pipeline {
  id: string
  amo_id: number
  name: string
  is_monitored: boolean
  target_conversion: number
  stages: PipelineStage[]
  created_this_month: number
  sales_this_month: number
  revenue_this_month: number
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
  revenue_last_month: number
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
