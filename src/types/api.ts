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
