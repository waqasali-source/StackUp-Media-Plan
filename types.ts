export interface ChannelConfig {
  id: string;
  name: string;
  allocation: number; // 0.0 to 1.0
  ctr: number; // 0.013 = 1.3%
  installRate: number; // 0.20 = 20%
  cpm: number; // Dollars
}

export type CalculationMode = 'fixed_cpi' | 'derive_cpi';

export interface GlobalConfig {
  targetOnboard: number;
  timeframeMonths: number;
  mode: CalculationMode;
  fixedCPI: number;
  installsPerOnboard: number;
}

export interface MonthlyData {
  month: number;
  monthLabel: string;
  onboardTarget: number;
  installsRequired: number;
  monthlySpend: number;
  cumulativeOnboard: number;
  cumulativeInstalls: number;
  cumulativeSpend: number;
  [key: string]: any; // Dynamic keys for channel specific data
}

export interface ModelResult {
  monthlyData: MonthlyData[];
  totals: {
    spend: number;
    installs: number;
    onboarded: number;
    impressions: number;
    clicks: number;
    avgCPI: number;
  };
  derivedMetrics: {
    [channelName: string]: {
      cpc: number;
      cpi: number;
    };
  };
  overallWeightedCPI: number;
}