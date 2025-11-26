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
  const { targetOnboard, timeframeMonths, mode, fixedCPI, installsPerOnboard } = globalConfig;
  
  // Normalize allocations
  const totalAlloc = channels.reduce((sum, ch) => sum + ch.allocation, 0);
  const normalizedChannels = channels.map(ch => ({
    ...ch,
    effectiveAllocation: totalAlloc > 0 ? ch.allocation / totalAlloc : 1 / channels.length
  }));

  const usingDerived = mode === 'derive_cpi';
  const derivedMetrics: { [key: string]: { cpc: number; cpi: number } } = {};
  
  // Calculate per-channel metrics
  normalizedChannels.forEach(ch => {
    let cpc = 0;
    let cpi = fixedCPI;

    if (usingDerived) {
      cpc = computeCpc(ch.cpm, ch.ctr);
      cpi = computeCpi(cpc, ch.installRate);
    }
    
    derivedMetrics[ch.name] = { cpc, cpi };
  });

  // Calculate Weighted CPI
  let overallCPI = fixedCPI;
  if (usingDerived) {
    const weightedSum = normalizedChannels.reduce((sum, ch) => {
      return sum + (ch.effectiveAllocation * derivedMetrics[ch.name].cpi);
    }, 0);
    overallCPI = weightedSum;
  }

  // Totals
  const totalInstallsNeeded = Math.ceil(targetOnboard * installsPerOnboard);
  const cac = overallCPI * installsPerOnboard;
  // const totalSpendNeeded = totalInstallsNeeded * overallCPI;

  // Monthly breakdown
  const monthlyData: MonthlyData[] = [];
  const monthlyOnboardTarget = targetOnboard / timeframeMonths;
  const monthlyInstallsTarget = monthlyOnboardTarget * installsPerOnboard;
  const monthlySpendTarget = monthlyOnboardTarget * cac;

  let cumOnboard = 0;
  let cumInstalls = 0;
  let cumSpend = 0;

  for (let i = 1; i <= timeframeMonths; i++) {
    cumOnboard += monthlyOnboardTarget;
    cumInstalls += monthlyInstallsTarget;
    cumSpend += monthlySpendTarget;

    const row: MonthlyData = {
      month: i,
      monthLabel: `Mo ${i}`,
      onboardTarget: monthlyOnboardTarget,
      installsRequired: monthlyInstallsTarget,
      monthlySpend: monthlySpendTarget,
      cumulativeOnboard: cumOnboard,
      cumulativeInstalls: cumInstalls,
      cumulativeSpend: cumSpend,
    };

    // Per channel breakdown for this month
    normalizedChannels.forEach(ch => {
      const chSpend = monthlySpendTarget * ch.effectiveAllocation;
      const chCpi = usingDerived ? derivedMetrics[ch.name].cpi : fixedCPI;
      
      let chInstalls = 0;
      if (chCpi > 0) {
        chInstalls = chSpend / chCpi;
      }

      const chOnboard = installsPerOnboard > 0 ? chInstalls / installsPerOnboard : 0;
      
      // Reverse calc clicks and impressions
      const chClicks = ch.installRate > 0 ? chInstalls / ch.installRate : 0;
      const chImpressions = ch.ctr > 0 ? chClicks / ch.ctr : 0;

      row[`${ch.name}_Spend`] = chSpend;
      row[`${ch.name}_Installs`] = chInstalls;
      row[`${ch.name}_Onboard`] = chOnboard;
      row[`${ch.name}_Clicks`] = chClicks;
      row[`${ch.name}_Impressions`] = chImpressions;
      row[`${ch.name}_CPI`] = chCpi;
    });

    monthlyData.push(row);
  }

  // Totals for summary
  const totals = {
    spend: monthlyData[monthlyData.length - 1].cumulativeSpend,
    installs: monthlyData[monthlyData.length - 1].cumulativeInstalls,
    onboarded: monthlyData[monthlyData.length - 1].cumulativeOnboard,
    impressions: monthlyData.reduce((acc, row) => {
        return acc + normalizedChannels.reduce((chAcc, ch) => chAcc + (row[`${ch.name}_Impressions`] || 0), 0);
    }, 0),
    clicks: monthlyData.reduce((acc, row) => {
        return acc + normalizedChannels.reduce((chAcc, ch) => chAcc + (row[`${ch.name}_Clicks`] || 0), 0);
    }, 0),
    avgCPI: overallCPI
  };

  return {
    monthlyData,
    totals,
    derivedMetrics,
    overallWeightedCPI: overallCPI
  };
};

export const exportToCsv = (
  globalConfig: GlobalConfig,
  channels: ChannelConfig[],
  results: ModelResult
) => {
  const { monthlyData, totals, derivedMetrics, overallWeightedCPI } = results;

  // Helper to escape CSV fields
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
  csvContent += `Installs per Onboard,${globalConfig.installsPerOnboard}\n`;
  csvContent += `Calculation Mode,${globalConfig.mode === 'derive_cpi' ? 'Derive CPI' : 'Fixed CPI'}\n`;
  csvContent += `CPI Basis,${globalConfig.mode === 'derive_cpi' ? `Weighted Avg: $${overallWeightedCPI.toFixed(2)}` : `Fixed: $${globalConfig.fixedCPI.toFixed(2)}`}\n\n`;

  // 2. Channel Configuration
  csvContent += "CHANNEL CONFIGURATION\n";
  csvContent += "Channel,Allocation,CTR,Install Rate,CPM,Derived CPC,Derived CPI\n";
  channels.forEach(ch => {
    const metrics = derivedMetrics[ch.name] || { cpc: 0, cpi: globalConfig.fixedCPI };
    csvContent += `${escape(ch.name)},${(ch.allocation * 100).toFixed(1)}%,${(ch.ctr * 100).toFixed(2)}%,${(ch.installRate * 100).toFixed(1)}%,$${ch.cpm.toFixed(2)},$${metrics.cpc.toFixed(2)},$${metrics.cpi.toFixed(2)}\n`;
  });
  csvContent += "\n";

  // 3. Overall Totals
  csvContent += "OVERALL TOTALS\n";
  csvContent += `Total Spend,$${totals.spend.toFixed(2)}\n`;
  csvContent += `Total Installs,${totals.installs.toFixed(0)}\n`;
  csvContent += `Total Onboarded,${totals.onboarded.toFixed(0)}\n`;
  csvContent += `CAC,$${(totals.spend / totals.onboarded).toFixed(2)}\n`;
  csvContent += `Total Impressions,${totals.impressions.toFixed(0)}\n\n`;

  // 4. Monthly Breakdown
  csvContent += "MONTHLY BREAKDOWN\n";
  // Header Row
  let headerRow = ["Month", "Total Spend", "Total Installs", "Total Onboard", "Cumulative Onboard"];
  channels.forEach(ch => {
    headerRow.push(`${ch.name} Spend`, `${ch.name} CPI`, `${ch.name} Installs`, `${ch.name} Onboard`);
  });
  csvContent += headerRow.map(escape).join(",") + "\n";

  // Data Rows
  monthlyData.forEach(row => {
    let rowData = [
      row.monthLabel,
      row.monthlySpend.toFixed(2),
      row.installsRequired.toFixed(0),
      row.onboardTarget.toFixed(0),
      row.cumulativeOnboard.toFixed(0)
    ];
    channels.forEach(ch => {
      rowData.push(
        (row[`${ch.name}_Spend`] || 0).toFixed(2),
        (row[`${ch.name}_CPI`] || 0).toFixed(2),
        (row[`${ch.name}_Installs`] || 0).toFixed(0),
        (row[`${ch.name}_Onboard`] || 0).toFixed(0)
      );
    });
    csvContent += rowData.map(escape).join(",") + "\n";
  });

  // Download
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