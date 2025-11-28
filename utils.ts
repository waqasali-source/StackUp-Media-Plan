
import { ChannelConfig, GlobalConfig, ModelResult, MonthlyData } from './types';

export const computeCpc = (cpm: number, ctr: number): number => {
  if (ctr <= 0) return 0;
  return cpm / (1000.0 * ctr);
};

export const computeCpi = (cpc: number, installRate: number): number => {
  if (installRate <= 0) return 0;
  return cpc / installRate;
};

export const calculateMediaPlan = (
  globalConfig: GlobalConfig,
  channels: ChannelConfig[]
): ModelResult => {
  const { 
    targetOnboard, timeframeMonths, mode, fixedCPI, installsPerOnboard,
    pacingMode, monthlyGrowthRate, efficiencyRate, enableMonthlyAllocation
  } = globalConfig;
  
  // 1. Prepare Derived Metrics Baseline (Per Unit)
  const usingDerived = mode === 'derive_cpi';
  
  // Temporary storage for per-channel unit metrics
  const channelUnitMetrics: { [key: string]: { cpc: number; cpi: number } } = {};
  
  channels.forEach(ch => {
    let cpc = 0;
    let cpi = fixedCPI;

    if (usingDerived) {
      cpc = computeCpc(ch.cpm, ch.ctr);
      cpi = computeCpi(cpc, ch.installRate);
    }
    
    channelUnitMetrics[ch.name] = { cpc, cpi };
  });

  // 2. Pacing Logic (Targets per month)
  const monthlyOnboardTargets: number[] = [];
  
  if (pacingMode === 'growth' && monthlyGrowthRate !== 0) {
    const r = 1 + (monthlyGrowthRate / 100);
    // Formula for sum of geometric series: S = a * (1-r^n) / (1-r)
    // We need 'a' (firstMonth) such that S = targetOnboard
    // a = S * (1-r) / (1-r^n)
    const firstMonth = targetOnboard * (1 - r) / (1 - Math.pow(r, timeframeMonths));
    
    let currentTerm = firstMonth;
    for (let i = 0; i < timeframeMonths; i++) {
      monthlyOnboardTargets.push(currentTerm);
      currentTerm *= r;
    }
  } else {
    // Linear
    const val = targetOnboard / timeframeMonths;
    for (let i = 0; i < timeframeMonths; i++) {
      monthlyOnboardTargets.push(val);
    }
  }

  // 3. Monthly Data Generation
  const monthlyData: MonthlyData[] = [];
  
  let cumOnboard = 0;
  let cumInstalls = 0;
  let cumSpend = 0;
  
  let totalImpressions = 0;
  let totalClicks = 0;

  // Track spend per channel to calculate effective allocation later
  const channelTotalSpend: { [key: string]: number } = {};
  channels.forEach(ch => channelTotalSpend[ch.name] = 0);

  for (let i = 0; i < timeframeMonths; i++) {
    const monthIndex = i; // 0-based
    const monthNum = i + 1; // 1-based
    
    const mOnboardTarget = monthlyOnboardTargets[monthIndex];
    const mInstallsTarget = mOnboardTarget * installsPerOnboard;
    
    // Efficiency Factor: Reduces CPI over time
    // Efficiency Rate is % gain. So CPI becomes CPI * (1 - rate)^monthIndex
    const efficiencyMultiplier = Math.pow(1 - (efficiencyRate / 100), monthIndex);
    
    // Determine Allocations for this specific month
    let currentMonthAllocations: { channel: ChannelConfig, alloc: number }[] = [];
    
    if (enableMonthlyAllocation) {
        // Use overrides
        currentMonthAllocations = channels.map(ch => ({
            channel: ch,
            alloc: (ch.monthlyAllocations && ch.monthlyAllocations[i] !== undefined) 
                   ? ch.monthlyAllocations[i] 
                   : ch.allocation // Fallback if array not populated
        }));
    } else {
        // Use global
        currentMonthAllocations = channels.map(ch => ({
            channel: ch,
            alloc: ch.allocation
        }));
    }

    // Normalize allocations for this month
    const monthTotalAllocPoints = currentMonthAllocations.reduce((sum, item) => sum + item.alloc, 0);
    const normalizedMonthChannels = currentMonthAllocations.map(item => ({
        ...item.channel,
        effectiveAllocation: monthTotalAllocPoints > 0 ? item.alloc / monthTotalAllocPoints : 0
    }));

    // Calculate Spend required for this month
    // Formula: Total Spend = Total Installs / Sum(Allocation_i / CPI_i)
    // Derived from: Installs_i = (Spend * Allocation_i) / CPI_i
    // Total Installs = Spend * Sum(Allocation_i / CPI_i)
    
    let weightedEffCpiSumInv = 0; 
    
    normalizedMonthChannels.forEach(ch => {
      const baseCpi = usingDerived ? channelUnitMetrics[ch.name].cpi : fixedCPI;
      const efficientCpi = baseCpi * efficiencyMultiplier;
      
      if (efficientCpi > 0 && ch.effectiveAllocation > 0) {
        weightedEffCpiSumInv += ch.effectiveAllocation / efficientCpi;
      }
    });
    
    let mSpend = 0;
    if (weightedEffCpiSumInv > 0) {
      mSpend = mInstallsTarget / weightedEffCpiSumInv;
    } else {
      mSpend = 0; 
    }
    
    // Build Row Data
    const row: MonthlyData = {
      month: monthNum,
      monthLabel: `Mo ${monthNum}`,
      onboardTarget: mOnboardTarget,
      installsRequired: mInstallsTarget,
      monthlySpend: mSpend,
      cumulativeOnboard: 0, // set later
      cumulativeInstalls: 0, // set later
      cumulativeSpend: 0, // set later
    };

    // Calculate per-channel results
    normalizedMonthChannels.forEach(ch => {
      const chSpend = mSpend * ch.effectiveAllocation;
      const baseCpi = usingDerived ? channelUnitMetrics[ch.name].cpi : fixedCPI;
      const efficientCpi = baseCpi * efficiencyMultiplier;
      
      let chInstalls = 0;
      if (efficientCpi > 0) {
        chInstalls = chSpend / efficientCpi;
      }

      const chOnboard = installsPerOnboard > 0 ? chInstalls / installsPerOnboard : 0;
      const chClicks = ch.installRate > 0 ? chInstalls / ch.installRate : 0;
      const chImpressions = ch.ctr > 0 ? chClicks / ch.ctr : 0;

      row[`${ch.name}_Spend`] = chSpend;
      row[`${ch.name}_Installs`] = chInstalls;
      row[`${ch.name}_Onboard`] = chOnboard;
      row[`${ch.name}_Clicks`] = chClicks;
      row[`${ch.name}_Impressions`] = chImpressions;
      row[`${ch.name}_CPI`] = efficientCpi;
      
      // Accumulate totals
      totalClicks += chClicks;
      totalImpressions += chImpressions;
      channelTotalSpend[ch.name] += chSpend;
    });

    cumOnboard += mOnboardTarget;
    cumInstalls += mInstallsTarget;
    cumSpend += mSpend;
    
    row.cumulativeOnboard = cumOnboard;
    row.cumulativeInstalls = cumInstalls;
    row.cumulativeSpend = cumSpend;
    
    monthlyData.push(row);
  }

  // 4. Final Totals
  const totals = {
    spend: cumSpend,
    installs: cumInstalls,
    onboarded: cumOnboard,
    impressions: totalImpressions,
    clicks: totalClicks,
    avgCPI: cumInstalls > 0 ? cumSpend / cumInstalls : 0
  };

  // 5. Final Derived Metrics (With Effective Allocation)
  const derivedMetrics: { [key: string]: { cpc: number; cpi: number; effectiveAllocation: number } } = {};
  
  channels.forEach(ch => {
    const unit = channelUnitMetrics[ch.name];
    // Calculate the effective allocation based on share of wallet
    const actualShare = cumSpend > 0 ? (channelTotalSpend[ch.name] || 0) / cumSpend : 0;
    
    derivedMetrics[ch.name] = {
      cpc: unit.cpc,
      cpi: unit.cpi,
      effectiveAllocation: actualShare
    };
  });

  // 6. Overall Weighted CPI for Display
  // If we are in derived mode, the "True" weighted CPI is the Total Spend / Total Installs
  // This accounts for efficiency gains and monthly mix changes.
  let overallWeightedCPI = fixedCPI;
  if (usingDerived) {
    overallWeightedCPI = totals.avgCPI;
  }

  return {
    monthlyData,
    totals,
    derivedMetrics,
    overallWeightedCPI 
  };
};

export const exportToCsv = (
  globalConfig: GlobalConfig,
  channels: ChannelConfig[],
  results: ModelResult
) => {
  const { monthlyData, totals, derivedMetrics, overallWeightedCPI } = results;

  const escape = (val: any) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  let csvContent = "MEDIA PLAN MODELER REPORT\n\n";

  // 1. Global Settings
  csvContent += "GLOBAL SETTINGS\n";
  csvContent += `Target Onboard,${globalConfig.targetOnboard}\n`;
  csvContent += `Timeframe (Months),${globalConfig.timeframeMonths}\n`;
  csvContent += `Mode,${globalConfig.mode}\n`;
  csvContent += `Monthly Allocation Mode,${globalConfig.enableMonthlyAllocation ? 'Enabled' : 'Disabled'}\n\n`;

  // 2. Channel Configuration
  csvContent += "CHANNEL CONFIGURATION (Global Metrics)\n";
  csvContent += "Channel,Allocation (Effective Avg),CTR,Install Rate,CPM,Derived CPI\n";
  channels.forEach(ch => {
    const metrics = derivedMetrics[ch.name] || { cpc: 0, cpi: globalConfig.fixedCPI, effectiveAllocation: 0 };
    csvContent += `${escape(ch.name)},${(metrics.effectiveAllocation * 100).toFixed(1)}%,${(ch.ctr * 100).toFixed(2)}%,${(ch.installRate * 100).toFixed(1)}%,$${ch.cpm.toFixed(2)},$${metrics.cpi.toFixed(2)}\n`;
  });
  csvContent += "\n";

  // 4. Monthly Breakdown
  csvContent += "MONTHLY BREAKDOWN\n";
  let headerRow = ["Month", "Total Spend", "Total Installs", "Total Onboard"];
  channels.forEach(ch => {
    headerRow.push(`${ch.name} Spend`, `${ch.name} CPI`, `${ch.name} Installs`);
  });
  csvContent += headerRow.map(escape).join(",") + "\n";

  monthlyData.forEach(row => {
    let rowData = [
      row.monthLabel,
      row.monthlySpend.toFixed(2),
      row.installsRequired.toFixed(0),
      row.onboardTarget.toFixed(0),
    ];
    channels.forEach(ch => {
      rowData.push(
        (row[`${ch.name}_Spend`] || 0).toFixed(2),
        (row[`${ch.name}_CPI`] || 0).toFixed(2),
        (row[`${ch.name}_Installs`] || 0).toFixed(0),
      );
    });
    csvContent += rowData.map(escape).join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "media_plan_report.csv");
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
