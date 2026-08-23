export type Direction = "BUY" | "SELL" | "WAIT" | "NO_TRADE";
export type SetupGrade = "A+" | "A" | "B" | "NO_TRADE";
export type SetupStatus = "SETUP_FORMING" | "ENTRY_ZONE_REACHED" | "CONFIRMED" | "INVALIDATED" | "COMPLETED";
export type MarketBias = "Strong Bullish" | "Weak Bullish" | "Ranging" | "Weak Bearish" | "Strong Bearish" | "Unclear";
export type MarketRegime =
  | "Strong Trend"
  | "Weak Trend"
  | "Range"
  | "High Volatility"
  | "Low Volatility"
  | "Breakout"
  | "Consolidation"
  | "Reversal Environment";

export interface EntryZone {
  min: number;
  max: number;
}

export interface ScoreBreakdown {
  market_structure: number;
  higher_timeframe_alignment: number;
  liquidity_confirmation: number;
  entry_zone_quality: number;
  momentum: number;
  risk_reward: number;
  news_and_conditions: number;
  reasons: Record<string, string>;
}

export interface ScenarioAnalysis {
  primary_scenario: string;
  alternative_scenario: string;
  confirmation_required: string;
  invalidation_condition: string;
}

export interface TradeSetup {
  instrument: string;
  direction: Direction;
  setup_type: string;
  entry_zone: EntryZone | null;
  stop_loss: number | null;
  take_profit_1: number | null;
  take_profit_2: number | null;
  risk_reward: number | null;
  confluence_score: number;
  score_breakdown: ScoreBreakdown;
  grade: SetupGrade;
  confidence_level: string;
  market_regime: MarketRegime;
  timeframe: string;
  higher_timeframe_bias: MarketBias;
  scenario: ScenarioAnalysis;
  status: SetupStatus;
  reasoning: string;
  generated_at: string;
}

export interface MarketSnapshot {
  instrument: string;
  current_price: { bid: number; ask: number; timestamp: string };
  market_bias: MarketBias;
  market_regime: MarketRegime;
  latest_structure_event: string | null;
}

export interface SignalRow {
  id: number;
  instrument: string;
  direction: string;
  timestamp: string;
  timeframe: string;
  confluence_score: number;
  grade: string;
  market_regime: string;
  status: string;
  reasoning: string;
  result: string | null;
}

export interface PerformanceSummary {
  total_signals: number;
  confirmed_setups: number;
  wins: number;
  losses: number;
  win_rate: number;
  profit_factor: number | null;
  average_score: number | null;
  by_instrument: Record<string, { total: number; wins: number; losses: number }>;
  by_grade: Record<string, { total: number; wins: number; losses: number }>;
}

export interface TradingControlStatus {
  global_mode: string;
  auto_trading_enabled: boolean;
  paper_trading_enabled: boolean;
  emergency_stop_active: boolean;
  instrument_modes: Record<string, string>;
  recent_audit_log: Array<{
    changed_by: string;
    timestamp: string;
    previous_mode: string;
    new_mode: string;
    ip_or_device: string | null;
  }>;
}

export interface WsAlertPayload {
  message: string;
  setup?: TradeSetup;
  event_type?: string;
}

export interface RiskCalculation {
  instrument: string;
  direction: string;
  entry: number;
  stop_loss: number;
  take_profit: number;
  capital: number;
  risk_pct: number;
  position_size_units: number;
  risk_amount: number;
  reward_amount: number;
  risk_reward_ratio: number;
  risk_pips: number;
  reward_pips: number;
}

export interface OpenPosition {
  id: number;
  signal_id: string;
  instrument: string;
  direction: string;
  entry: number;
  stop_loss: number;
  take_profit: number;
  position_size: number;
  confluence_score: number;
  result: string | null;
  profit_loss: number | null;
  r_multiple: number | null;
}

export interface ClosedTradeSummary {
  signal_id: string;
  instrument: string;
  direction: string;
  result: string;
  exit_price: number;
  profit_loss: number | null;
  r_multiple: number | null;
}

export interface PositionCheckResult {
  checked: number;
  closed: ClosedTradeSummary[];
  still_open: number;
}

export interface DailyReport {
  date: string;
  signals_generated: number;
  a_plus_setups: number;
  trades_executed: number;
  winning_trades: number;
  losing_trades: number;
  net_result_r: number;
  best_instrument: string | null;
  most_effective_strategy: string | null;
  auto_trading_status: string;
}

export interface AIProviderOption {
  id: string;
  default_model: string;
  available_models: string[];
  has_api_key: boolean;
}

export interface AISettings {
  provider: string;
  model: string | null;
  effective_model: string;
  analysis_enrichment_enabled: boolean;
  has_api_key: boolean;
  available_providers: AIProviderOption[];
}

export interface MarketHoursStatus {
  open: boolean;
  reason: string | null;
  ny_time: string;
  holidays: string[];
}

export interface AccountStatus {
  adapter: string;
  connected: boolean;
  broker_name?: string;
  account_id?: string | null;
  currency?: string;
  balance?: number;
  equity?: number;
  margin_used?: number | null;
  margin_free?: number | null;
  leverage?: number | null;
  server?: string | null;
  error?: string | null;
  open_positions_count?: number;
  emergency_stop_active?: boolean;
  auto_trading_enabled?: boolean;
}

export interface WeeklyReport {
  week_start: string;
  week_end: string;
  total_signals: number;
  confirmed_setups: number;
  executed_trades: number;
  win_rate: number;
  profit_factor: number | null;
  average_r: number | null;
  max_drawdown_pct: number | null;
  by_instrument: Record<string, { total: number; wins: number; losses: number }>;
  by_session: Record<string, { total: number; wins: number; losses: number }>;
  by_strategy: Record<string, { total: number; wins: number; losses: number }>;
}

export interface ExecutionValidationFailure {
  stage: string;
  reason: string;
}

export interface ExecutionResult {
  signal_id: string;
  executed: boolean;
  execution_source: string;
  broker_order_id: string | null;
  failure: ExecutionValidationFailure | null;
  position_size: number | null;
  executed_at: string;
}

export interface ManualEnterResponse {
  setup: TradeSetup;
  execution: ExecutionResult | null;
  confirmation_required: boolean;
  message?: string;
}

export interface ManualCloseResultItem {
  signal_id: string;
  instrument?: string;
  closed: boolean;
  partial?: boolean;
  reason?: string;
  closed_by?: string;
  exit_price?: number;
  result?: string;
  profit_loss?: number | null;
  realized_profit_loss?: number | null;
  r_multiple?: number | null;
  closed_size?: number;
  remaining_size?: number;
}

export interface OpenPositionPreview {
  signal_id: string;
  direction: string;
  entry: number;
  stop_loss: number;
  take_profit: number;
}

export interface ManualCloseResponse {
  instrument: string;
  closed: ManualCloseResultItem[];
  confirmation_required: boolean;
  open_positions?: OpenPositionPreview[];
  message?: string;
}

export interface ManualModifyResultItem {
  signal_id?: string;
  instrument?: string;
  modified: boolean;
  modified_by?: string;
  stop_loss?: number;
  take_profit?: number;
  reason?: string;
}

export interface ManualModifyResponse {
  instrument: string;
  modified: ManualModifyResultItem[];
}

export interface ManualPreviewResponse {
  setup: TradeSetup;
  tradeable: boolean;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatToolAction {
  tool: string;
  input: Record<string, unknown>;
  summary: string;
}

export interface ChatResponse {
  reply: string;
  actions: ChatToolAction[];
}