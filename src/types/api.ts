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
// ---------------------------------------------------------------- Scalper
export interface ScalperConfig {
  entry_style: "momentum" | "breakout" | "spike_fade" | "range_reversal";
  backend: "mt5" | "simulation";
  allow_live_account: boolean;
  instruments: string[];
  loop_interval_ms: number;
  max_concurrent_positions: number;
  max_positions_per_instrument: number;
  entries_per_signal: number;
  cooldown_seconds: number;
  max_trades_per_hour: number;
  min_signal_score: number;
  max_spread_pips: number;
  min_tp_to_spread_ratio: number;
  lot_mode: "fixed" | "risk_pct";
  fixed_lot: number;
  risk_per_trade_pct: number;
  max_lot_per_trade: number;
  max_total_risk_pct: number;
  exit_mode: "atr" | "fixed";
  tp_atr_mult: number;
  sl_atr_mult: number;
  take_profit_pips: number;
  stop_loss_pips: number;
  stagger_targets: boolean;
  trade_profit_target_money: number;
  breakeven_after_pips: number;
  trailing_enabled: boolean;
  trailing_start_pips: number;
  trailing_distance_pips: number;
  trailing_step_pips: number;
  max_hold_seconds: number;
  basket_take_profit_money: number;
  session_profit_target_money: number;
  session_max_loss_money: number;
  session_max_loss_pct: number;
  max_consecutive_losses: number;
  flatten_on_halt: boolean;
}

export interface EntryStyleInfo {
  label: string;
  hint: string;
  suggested_min_score: number;
}

export interface ScalperConfigResponse {
  config: ScalperConfig;
  entry_styles: Record<string, EntryStyleInfo>;
  allowed_instruments: string[];
  running: boolean;
}

export interface ScalperPosition {
  ticket: string;
  instrument: string;
  side: "BUY" | "SELL";
  volume: number;
  price_open: number;
  sl: number;
  tp: number;
  profit: number;
  age_seconds: number;
}

export interface ScalperSignalInfo {
  side?: "BUY" | "SELL" | null;
  score?: number;
  spread_pips?: number;
  atr_pips?: number;
  reasons?: string[];
  blocked?: string | null;
}

export interface ScalperEvent {
  ts: number;
  kind: string;
  level: string;
  message: string;
}

export interface ScalperStatus {
  state: "STOPPED" | "RUNNING" | "HALTED";
  halt_reason: string | null;
  last_error: string | null;
  started_at: number | null;
  account: {
    backend: string;
    login: string | null;
    server: string | null;
    currency: string;
    balance: number;
    equity: number;
    is_demo: boolean;
    hedging: boolean;
    algo_trading_enabled: boolean;
  } | null;
  session: {
    start_equity: number | null;
    realized: number;
    floating: number;
    net: number;
    trades_opened: number;
    closed_trades: number;
    wins: number;
    losses: number;
    consecutive_losses: number;
    trades_last_hour: number;
  };
  positions: ScalperPosition[];
  signals: Record<string, ScalperSignalInfo>;
  events: ScalperEvent[];
}

export interface ScalperDiagnostics {
  ready: boolean;
  backend: string;
  checks: { name: string; ok: boolean; detail: string; severity: "ok" | "warning" | "error" }[];
}

// ---------------------------------------------------------------- Scalper backtest
export interface BtStats {
  n: number;
  net: number;
  win_rate: number | null;
  expectancy: number | null;
  profit_factor: number | null;
  avg_win: number | null;
  avg_loss: number | null;
  ci95: [number, number] | null;
  se: number | null;
}

export interface BtGroup {
  n: number;
  net: number;
  win_rate: number;
  expectancy: number;
}

export interface BtSummary extends BtStats {
  variant: string;
  start: string;
  end: string;
  bars: number;
  instruments: string[];
  start_balance: number;
  gross_before_costs: number;
  costs: number;
  costs_pct_of_gross: number | null;
  net_pct: number;
  max_drawdown: number;
  max_drawdown_pct: number;
  longest_losing_streak: number;
  avg_hold_seconds: number | null;
  trades_per_day: number;
  profitable_days_pct: number | null;
  best_trade: number | null;
  worst_trade: number | null;
  by_exit_reason: Record<string, BtGroup>;
  by_instrument: Record<string, BtGroup>;
  by_score_band: Record<string, BtGroup>;
  in_sample: BtStats;
  out_of_sample: BtStats;
  days_halted: number;
  equity: [number, number][];
  errors: string[];
}

export interface HoldoutSummary {
  n: number | null;
  net: number | null;
  net_pct: number | null;
  expectancy: number | null;
  win_rate: number | null;
  profit_factor: number | null;
  max_drawdown_pct: number | null;
}

export interface HoldoutRecord {
  job_id: string;
  at: number;
  summary: HoldoutSummary;
  overall: string;
}

export interface HoldoutState {
  locked: boolean;
  lock_id?: number;
  split_ts?: number;
  split_iso?: string;
  fraction?: number;
  created_at?: number;
  last_explore?: HoldoutRecord | null;
  confirmed?: HoldoutRecord | null;
  history: { lock_id: number; split_iso: string; was_confirmed: boolean; confirmed_net_pct: number | null }[];
}

export interface BacktestResult {
  holdout?: { mode: "explore" | "confirm"; split_iso: string; warnings: string[]; explore?: HoldoutSummary | null };
  summaries: Record<string, BtSummary>;
  verdict: { overall: "promising" | "inconclusive" | "not_viable"; points: { level: "good" | "warn" | "bad" | "info"; text: string }[] };
  notes: string[];
}

export interface BacktestJob {
  job_id: string;
  state: "running" | "done" | "failed" | "cancelled" | "interrupted";
  created: number | null;
  request: Record<string, unknown> | null;
  variants: Record<string, { state: string; progress: number; error?: string }>;
  progress: number;
  result: BacktestResult | null;
  error: string | null;
  config?: { entry_style?: string; min_signal_score?: number; exit_mode?: string; tp_atr_mult?: number; sl_atr_mult?: number;
             take_profit_pips?: number; stop_loss_pips?: number; max_concurrent_positions?: number };
}

export interface BacktestListItem {
  job_id: string;
  state: string;
  created: number | null;
  source: string | null;
  days: number | null;
  overall: string | null;
  net: number | null;
  trades: number | null;
  holdout?: string | null;
  entry_style?: string | null;
}
