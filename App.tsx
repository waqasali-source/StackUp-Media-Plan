import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Settings, Users, DollarSign, Activity, Download, LayoutDashboard, Plus, Trash2, ArrowRight, Calculator, Target, TrendingUp, Calendar, AlertCircle } from 'lucide-react';

import { ChannelConfig, GlobalConfig, ModelResult } from './types';
import { DEFAULT_CHANNELS, EXPLANATIONS, COLORS } from './constants';
import { calculateMediaPlan, exportToCsv } from './utils';
import { InfoIcon } from './components/InfoIcon';

// --- Sub-components for cleaner App structure ---

const MetricCard: React.FC<{ 
  label: string; 
  value: string | number; 
  subValue?: string;
  icon?: React.ReactNode;
  trend?: string;
}> = ({ label, value, subValue, icon }) => (
  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start justify-between min-w-0">
    <div className="min-w-0">
      <p className="text-slate-500 text-sm font-medium mb-1 truncate">{label}</p>
      <h3 className="text-2xl font-bold text-slate-800 truncate">{value}</h3>
      {subValue && <p className="text-slate-400 text-xs mt-1 truncate">{subValue}</p>}
    </div>
    {icon && <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 flex-shrink-0">{icon}</div>}
  </div>
);

const DerivedCPIDashboard: React.FC<{ 
  results: ModelResult, 
  channels: ChannelConfig[], 
  formatCurrency: (n:number)=>string 
}> = ({ results, channels, formatCurrency }) => {
  return (
    <div className="bg-white rounded-xl border border-indigo-100 shadow-sm relative w-full">
      {/* Background Icon Container - Isolated to prevent overflow issues */}
      <div className="absolute inset-0 overflow-hidden rounded-xl pointer-events-none">
        <div className="absolute -top-4 -right-4 p-3 opacity-5 text-slate-900">
          <Calculator size={140} />
        </div>
      </div>
      
      <div className="relative z-10 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg flex-shrink-0"><Calculator size={18}/></span>
              <span className="truncate">Derived CPI Analysis</span>
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Calculating acquisition costs based on channel efficiency metrics.
            </p>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white p-4 rounded-xl shadow-lg min-w-[200px] flex-shrink-0">
             <div className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">Overall Weighted CPI</div>
             <div className="text-3xl font-bold truncate">{formatCurrency(results.overallWeightedCPI)}</div>
             <div className="text-indigo-200 text-xs mt-1">Baseline (Month 1)</div>
          </div>
        </div>

        {/* Calculation Flow */}
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 mb-6 w-full overflow-x-auto">
           <div className="flex items-center min-w-max gap-2 sm:gap-3 text-sm justify-between md:justify-center">
              <div className="flex flex-col items-center p-3 bg-white rounded border border-slate-200 shadow-sm w-24 sm:w-28">
                 <span className="font-bold text-slate-700">CPM</span>
                 <span className="text-[10px] text-slate-400">Cost / 1k Impr</span>
              </div>
              
              <div className="text-slate-400 flex flex-col items-center px-1 sm:px-2">
                 <ArrowRight size={16} />
                 <span className="text-[10px] whitespace-nowrap mt-1 text-slate-500 font-medium">÷ (1000 × CTR)</span>
              </div>

              <div className="flex flex-col items-center p-3 bg-white rounded border border-slate-200 shadow-sm w-24 sm:w-28">
                 <span className="font-bold text-slate-700">CPC</span>
                 <span className="text-[10px] text-slate-400">Cost Per Click</span>
              </div>

              <div className="text-slate-400 flex flex-col items-center px-1 sm:px-2">
                 <ArrowRight size={16} />
                 <span className="text-[10px] whitespace-nowrap mt-1 text-slate-500 font-medium">÷ Install Rate</span>
              </div>

              <div className="flex flex-col items-center p-3 bg-indigo-50 border border-indigo-200 shadow-sm w-24 sm:w-28">
                 <span className="font-bold text-indigo-700">CPI</span>
                 <span className="text-[10px] text-indigo-400">Cost Per Install</span>
              </div>
           </div>
        </div>

        {/* Per Channel Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
           {channels.map(ch => {
              const metrics = results.derivedMetrics[ch.name];
              if (!metrics) return null;
              return (
                <div key={ch.id} className="bg-white border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-all hover:shadow-md w-full">
                   <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-50">
                      <span className="font-bold text-slate-700 truncate mr-2 max-w-[100px]" title={ch.name}>{ch.name}</span>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full whitespace-nowrap">{(ch.allocation * 100).toFixed(0)}% Avg</span>
                   </div>
                   
                   <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                         <div className="bg-slate-50 p-2 rounded text-center">
                            <span className="block text-slate-400 text-[10px] uppercase mb-0.5">CPM</span>
                            <span className="font-semibold text-slate-700">${ch.cpm}</span>
                         </div>
                         <div className="bg-slate-50 p-2 rounded text-center">
                            <span className="block text-slate-400 text-[10px] uppercase mb-0.5">CTR</span>
                            <span className="font-semibold text-slate-700">{(ch.ctr * 100).toFixed(2)}%</span>
                         </div>
                      </div>
                      
                      <div className="flex items-center justify-center text-slate-300 py-1">
                         <ArrowRight size={14} className="rotate-90 text-slate-300" />
                      </div>

                      <div className="flex justify-between items-center text-sm px-1">
                        <span className="text-slate-500 text-xs">Derived CPC</span>
                        <span className="font-mono font-medium text-slate-700">${metrics.cpc.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center bg-indigo-50 p-2 rounded text-sm">
                        <span className="text-indigo-600 text-xs font-bold">Derived CPI</span>
                        <span className="font-bold text-indigo-700">${metrics.cpi.toFixed(2)}</span>
                      </div>
                   </div>
                </div>
              );
           })}
        </div>
      </div>
    </div>
  )
}

const App: React.FC = () => {
  // --- State ---
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
    targetOnboard: 10000,
    timeframeMonths: 12,
    mode: 'fixed_cpi',
    fixedCPI: 5.36,
    installsPerOnboard: 10,
    pacingMode: 'linear',
    monthlyGrowthRate: 0,
    efficiencyRate: 0,
    enableMonthlyAllocation: false
  });

  const [channels, setChannels] = useState<ChannelConfig[]>(DEFAULT_CHANNELS);

  // Initialize monthly allocations if missing
  useEffect(() => {
    setChannels(prev => prev.map(ch => {
      if (!ch.monthlyAllocations || ch.monthlyAllocations.length !== globalConfig.timeframeMonths) {
        // Prefill with current global allocation if monthly not set
        return {
          ...ch,
          monthlyAllocations: new Array(globalConfig.timeframeMonths).fill(ch.allocation)
        };
      }
      return ch;
    }));
  }, [globalConfig.timeframeMonths, globalConfig.enableMonthlyAllocation]);

  // --- Derived State (Calculation) ---
  const results = useMemo(() => {
    return calculateMediaPlan(globalConfig, channels);
  }, [globalConfig, channels]);

  // --- Handlers ---
  const updateChannel = (id: string, field: keyof ChannelConfig, value: number | string) => {
    setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, [field]: value } : ch));
  };

  const updateMonthlyAllocation = (channelId: string, monthIndex: number, value: number) => {
    setChannels(prev => prev.map(ch => {
      if (ch.id === channelId) {
        const newAlloc = [...(ch.monthlyAllocations || [])];
        newAlloc[monthIndex] = value;
        return { ...ch, monthlyAllocations: newAlloc };
      }
      return ch;
    }));
  };

  const handleAddChannel = () => {
    const newId = `custom-${Date.now()}`;
    const newChannel: ChannelConfig = {
      id: newId,
      name: `New Channel ${channels.length + 1}`,
      allocation: 0,
      monthlyAllocations: new Array(globalConfig.timeframeMonths).fill(0),
      ctr: 0.01,
      installRate: 0.1,
      cpm: 10
    };
    setChannels([...channels, newChannel]);
  };

  const handleRemoveChannel = (id: string) => {
    if (channels.length <= 1) {
      alert("You must have at least one channel.");
      return;
    }
    setChannels(channels.filter(ch => ch.id !== id));
  };

  const totalAllocation = channels.reduce((acc, ch) => acc + ch.allocation, 0);

  // --- Formatter ---
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('en-US').format(Math.round(val));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg flex-shrink-0">
              <LayoutDashboard size={20} className="text-white" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 truncate">
              Media Plan Modeler
            </h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-sm text-slate-500 hidden md:block">
               Projected Spend: <span className="font-semibold text-slate-900">{formatCurrency(results.totals.spend)}</span>
             </div>
             <button
               onClick={() => exportToCsv(globalConfig, channels, results)}
               className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium whitespace-nowrap"
             >
               <Download size={16} />
               Export CSV
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <MetricCard 
            label="Total Spend" 
            value={formatCurrency(results.totals.spend)} 
            subValue={`Avg CPI: ${formatCurrency(results.totals.avgCPI)}`}
            icon={<DollarSign size={20} />} 
          />
          <MetricCard 
            label="CAC" 
            value={formatCurrency(results.totals.spend / results.totals.onboarded)}
            subValue="Cost Per Onboarded"
            icon={<Target size={20} />} 
          />
          <MetricCard 
            label="Total Onboarded" 
            value={formatNumber(results.totals.onboarded)}
            subValue={`Target: ${formatNumber(globalConfig.targetOnboard)}`}
            icon={<Users size={20} />} 
          />
          <MetricCard 
            label="Required Installs" 
            value={formatNumber(results.totals.installs)}
            subValue={`Ratio: ${globalConfig.installsPerOnboard}:1`}
            icon={<Download size={20} />} 
          />
           <MetricCard 
            label="Impressions Needed" 
            value={(results.totals.impressions / 1000000).toFixed(1) + 'M'}
            subValue={`CTR Est: ${results.totals.impressions > 0 ? ((results.totals.clicks / results.totals.impressions) * 100).toFixed(2) : 0}%`}
            icon={<Activity size={20} />} 
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Controls */}
          <div className="xl:col-span-4 space-y-6">
            
            {/* Global Settings */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                <Settings className="text-slate-400" size={18} />
                <h2 className="font-semibold text-lg">Model Settings</h2>
              </div>

              <div className="space-y-5">
                {/* Target & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Target Onboard <InfoIcon text={EXPLANATIONS.targetOnboard} />
                    </label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                      value={globalConfig.targetOnboard}
                      onChange={(e) => setGlobalConfig({...globalConfig, targetOnboard: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      Months <InfoIcon text={EXPLANATIONS.timeframeMonths} />
                    </label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                      value={globalConfig.timeframeMonths}
                      onChange={(e) => setGlobalConfig({...globalConfig, timeframeMonths: Number(e.target.value)})}
                    />
                  </div>
                </div>

                {/* Ratio */}
                <div>
                  <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Installs / Onboard <InfoIcon text={EXPLANATIONS.installsPerOnboard} />
                  </label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    value={globalConfig.installsPerOnboard}
                    onChange={(e) => setGlobalConfig({...globalConfig, installsPerOnboard: Number(e.target.value)})}
                  />
                </div>

                {/* Pacing & Efficiency */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={16} className="text-indigo-500" />
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Adv. Pacing & Efficiency</label>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Pacing Toggle */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center">
                        Pacing Style <InfoIcon text={EXPLANATIONS.pacingMode} />
                      </label>
                      <div className="flex bg-white p-1 rounded-lg border border-slate-200">
                         <button 
                            onClick={() => setGlobalConfig({...globalConfig, pacingMode: 'linear'})}
                            className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${globalConfig.pacingMode === 'linear' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                         >
                           Linear
                         </button>
                         <button 
                            onClick={() => setGlobalConfig({...globalConfig, pacingMode: 'growth'})}
                            className={`flex-1 py-1 text-xs font-medium rounded-md transition-all ${globalConfig.pacingMode === 'growth' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                         >
                           Growth
                         </button>
                      </div>
                    </div>

                    {/* Growth Rate */}
                    {globalConfig.pacingMode === 'growth' && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                        <label className="flex items-center text-xs font-medium text-slate-600 mb-1">
                          MoM Growth (%) <InfoIcon text={EXPLANATIONS.monthlyGrowthRate} />
                        </label>
                        <div className="flex items-center">
                           <input 
                             type="number" 
                             min="0"
                             className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-sm"
                             value={globalConfig.monthlyGrowthRate}
                             onChange={(e) => setGlobalConfig({...globalConfig, monthlyGrowthRate: Number(e.target.value)})}
                           />
                           <span className="ml-2 text-sm text-slate-400">%</span>
                        </div>
                      </div>
                    )}

                    {/* Efficiency Gain */}
                    <div>
                      <label className="flex items-center text-xs font-medium text-slate-600 mb-1">
                         Efficiency Gain (MoM) <InfoIcon text={EXPLANATIONS.efficiencyRate} />
                      </label>
                      <div className="flex items-center">
                        <input 
                          type="number" 
                          min="0" max="100" step="0.5"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all text-sm"
                          value={globalConfig.efficiencyRate}
                          onChange={(e) => setGlobalConfig({...globalConfig, efficiencyRate: Number(e.target.value)})}
                        />
                         <span className="ml-2 text-sm text-slate-400">%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Reduces CPI by this % each month</p>
                    </div>
                  </div>
                </div>

                {/* Calculation Mode */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                   <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Cost Calculation Mode</label>
                   <div className="flex bg-white p-1 rounded-lg border border-slate-200 mb-4">
                     <button 
                        onClick={() => setGlobalConfig({...globalConfig, mode: 'fixed_cpi'})}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${globalConfig.mode === 'fixed_cpi' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                       Fixed CPI
                     </button>
                     <button 
                        onClick={() => setGlobalConfig({...globalConfig, mode: 'derive_cpi'})}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${globalConfig.mode === 'derive_cpi' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                       Derive CPI
                     </button>
                   </div>

                   {globalConfig.mode === 'fixed_cpi' ? (
                     <div>
                        <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Global Fixed CPI ($) <InfoIcon text={EXPLANATIONS.cpi} />
                        </label>
                        <input 
                          type="number" 
                          step="0.01"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                          value={globalConfig.fixedCPI}
                          onChange={(e) => setGlobalConfig({...globalConfig, fixedCPI: Number(e.target.value)})}
                        />
                     </div>
                   ) : (
                     <div className="text-sm text-slate-600 bg-blue-50 p-3 rounded border border-blue-100">
                       <p className="flex items-start gap-2">
                         <span className="mt-0.5 text-blue-500">ⓘ</span>
                         <span>CPI is calculated per channel based on CPM, CTR, and Install Rate. <br/><span className="font-semibold text-slate-800">Weighted Avg: {formatCurrency(results.overallWeightedCPI)}</span></span>
                       </p>
                     </div>
                   )}
                </div>
              </div>
            </div>

            {/* Channels */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col gap-4 mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                    <Activity className="text-slate-400" size={18} />
                    <h2 className="font-semibold text-lg">Channel Mix</h2>
                    </div>
                    <div className="flex items-center gap-3">
                    <button 
                        onClick={handleAddChannel}
                        className="p-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                        title="Add Channel"
                    >
                        <Plus size={16} />
                    </button>
                    </div>
                </div>

                {/* Monthly Allocation Toggle */}
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-500" />
                        <span className="text-sm font-medium text-slate-700">Enable Monthly Overrides</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={globalConfig.enableMonthlyAllocation}
                            onChange={(e) => setGlobalConfig({...globalConfig, enableMonthlyAllocation: e.target.checked})}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
              </div>

              {globalConfig.enableMonthlyAllocation ? (
                /* MATRIX VIEW */
                <div className="space-y-4 animate-in fade-in duration-300">
                    <p className="text-xs text-slate-500 italic mb-2">
                        Define allocation percentages (0-1) for each channel per month. Values are normalized per month automatically.
                    </p>
                    
                    <div className="overflow-x-auto pb-2 custom-scrollbar">
                        <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-3 py-2 font-medium sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Channel</th>
                                    {Array.from({ length: globalConfig.timeframeMonths }).map((_, i) => (
                                        <th key={i} className="px-2 py-2 font-medium text-center min-w-[50px]">
                                            Mo {i + 1}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {channels.map((ch) => (
                                    <tr key={ch.id} className="border-b border-slate-100">
                                        <td className="px-3 py-2 font-medium text-slate-700 sticky left-0 bg-white border-r border-slate-200 max-w-[140px] group">
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="truncate" title={ch.name}>{ch.name}</span>
                                                <button 
                                                    onClick={() => handleRemoveChannel(ch.id)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded hover:bg-red-50"
                                                    title="Remove Channel"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                        {Array.from({ length: globalConfig.timeframeMonths }).map((_, i) => (
                                            <td key={i} className="px-1 py-1">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.1"
                                                    value={ch.monthlyAllocations?.[i] !== undefined ? ch.monthlyAllocations[i] : ch.allocation}
                                                    onChange={(e) => updateMonthlyAllocation(ch.id, i, parseFloat(e.target.value) || 0)}
                                                    className="w-full px-1 py-1 text-center bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {/* Total Row Check */}
                                <tr className="bg-slate-50 font-medium">
                                    <td className="px-3 py-2 text-slate-500 sticky left-0 bg-slate-50 border-r border-slate-200">
                                        Total
                                    </td>
                                    {Array.from({ length: globalConfig.timeframeMonths }).map((_, i) => {
                                        const total = channels.reduce((sum, ch) => sum + ((ch.monthlyAllocations?.[i] !== undefined) ? ch.monthlyAllocations[i] : ch.allocation), 0);
                                        const isMismatch = Math.abs(total - 1) > 0.01 && Math.abs(total - 100) > 0.1; // Check for ~1.0 or ~100
                                        return (
                                            <td key={i} className={`px-2 py-2 text-center ${isMismatch ? 'text-amber-600' : 'text-green-600'}`}>
                                                {total.toFixed(1)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-start gap-2 mt-2">
                        <AlertCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                        <p className="text-xs text-blue-700">
                            <strong>Note:</strong> You can enter values as decimals (0.5) or whole numbers (50). The system normalizes each month column to 100% automatically during calculation.
                        </p>
                    </div>
                </div>
              ) : (
                /* SLIDER VIEW (Standard) */
                <div className="space-y-6 animate-in fade-in duration-300">
                    <div className="flex items-center justify-end mb-2">
                         <div className={`text-xs px-2 py-1 rounded font-mono font-medium ${Math.abs(totalAllocation - 1) < 0.001 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            Global Mix: {Math.round(totalAllocation * 100)}%
                        </div>
                    </div>
                    {channels.map((ch) => (
                    <div key={ch.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md hover:border-indigo-100 transition-all duration-200 group">
                        {/* Header: Name + Allocation */}
                        <div className="flex items-center justify-between mb-3">
                        <input
                            type="text"
                            value={ch.name}
                            onChange={(e) => updateChannel(ch.id, 'name', e.target.value)}
                            className="bg-transparent border-b border-dashed border-slate-400 focus:border-indigo-600 focus:outline-none px-1 py-0.5 w-28 sm:w-32 font-bold text-slate-700 hover:border-slate-600 transition-colors"
                        />
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => handleRemoveChannel(ch.id)}
                                className="text-slate-300 hover:text-red-500 transition-colors mr-1 opacity-0 group-hover:opacity-100"
                                title="Remove Channel"
                            >
                                <Trash2 size={14} />
                            </button>
                            <input 
                            type="range" 
                            min="0" max="1" step="0.01"
                            value={ch.allocation}
                            onChange={(e) => updateChannel(ch.id, 'allocation', parseFloat(e.target.value))}
                            className="w-16 sm:w-20 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <span className="text-sm font-mono text-slate-600 w-9 text-right">{(ch.allocation * 100).toFixed(0)}%</span>
                        </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="flex items-center text-[10px] uppercase font-bold text-slate-400 mb-1">
                            CTR <InfoIcon text={EXPLANATIONS.ctr} size={10} />
                            </label>
                            <input 
                                type="number" step="0.001"
                                value={ch.ctr}
                                onChange={(e) => updateChannel(ch.id, 'ctr', parseFloat(e.target.value))}
                                className="w-full p-1.5 text-sm border border-slate-200 rounded bg-white focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="flex items-center text-[10px] uppercase font-bold text-slate-400 mb-1">
                            Inst. Rate <InfoIcon text={EXPLANATIONS.installRate} size={10} />
                            </label>
                            <input 
                                type="number" step="0.01"
                                value={ch.installRate}
                                onChange={(e) => updateChannel(ch.id, 'installRate', parseFloat(e.target.value))}
                                className="w-full p-1.5 text-sm border border-slate-200 rounded bg-white focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                        <div className={globalConfig.mode === 'fixed_cpi' ? 'opacity-50 grayscale' : ''}>
                            <label className="flex items-center text-[10px] uppercase font-bold text-slate-400 mb-1">
                            CPM ($) <InfoIcon text={EXPLANATIONS.cpm} size={10} />
                            </label>
                            <input 
                                type="number" step="0.5"
                                value={ch.cpm}
                                onChange={(e) => updateChannel(ch.id, 'cpm', parseFloat(e.target.value))}
                                className="w-full p-1.5 text-sm border border-slate-200 rounded bg-white focus:border-indigo-500 focus:outline-none"
                            />
                        </div>
                        </div>
                        
                        {/* Derived Info Preview */}
                        {globalConfig.mode === 'derive_cpi' && (
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                            <span>CPC: <b>{formatCurrency(results.derivedMetrics[ch.name].cpc)}</b></span>
                            <span className="flex items-center">CPI: <b className="ml-1">{formatCurrency(results.derivedMetrics[ch.name].cpi)}</b> <InfoIcon text={EXPLANATIONS.derivedCPI} size={10} /></span>
                        </div>
                        )}
                    </div>
                    ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Visuals */}
          <div className="xl:col-span-8 space-y-8 min-w-0">
            
            {/* Derived CPI Dashboard */}
            {globalConfig.mode === 'derive_cpi' && (
              <DerivedCPIDashboard results={results} channels={channels} formatCurrency={formatCurrency} />
            )}

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Chart 1: Cumulative Onboard */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 min-w-0">
                <h3 className="font-semibold text-slate-700 mb-4">Cumulative Onboarded Users</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={results.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="monthLabel" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val} />
                    <RechartsTooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      formatter={(val: number) => [Math.round(val), 'Users']}
                    />
                    <Line type="monotone" dataKey="cumulativeOnboard" stroke="#4f46e5" strokeWidth={3} dot={{r: 4, fill: '#4f46e5'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Chart 2: Stacked Spend */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-80 min-w-0">
                <h3 className="font-semibold text-slate-700 mb-4">Monthly Spend by Channel</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={results.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="monthLabel" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} />
                    <RechartsTooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      formatter={(val: number) => [formatCurrency(val), 'Spend']}
                    />
                    {channels.map((ch, idx) => (
                      <Bar 
                        key={ch.name} 
                        dataKey={`${ch.name}_Spend`} 
                        stackId="a" 
                        fill={Object.values(COLORS)[idx % Object.values(COLORS).length]} 
                        name={ch.name} 
                        radius={idx === channels.length - 1 ? [4, 4, 0, 0] : [0,0,0,0]}
                      />
                    ))}
                    <Legend iconType="circle" wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
              <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="font-semibold text-slate-700">Monthly Breakdown</h3>
                <span className="text-xs text-slate-500 italic">Values generated based on current inputs</span>
              </div>
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap sticky left-0 bg-slate-50 z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Month</th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">
                        <div className="flex items-center justify-end">
                           Total Spend <InfoIcon text={EXPLANATIONS.totalSpend} />
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">
                        <div className="flex items-center justify-end">
                           Total Installs <InfoIcon text={EXPLANATIONS.totalInstalls} />
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">
                        <div className="flex items-center justify-end">
                           Total Onboard <InfoIcon text={EXPLANATIONS.totalOnboard} />
                        </div>
                      </th>
                      <th className="px-4 py-3 font-semibold whitespace-nowrap text-right text-indigo-600">
                        <div className="flex items-center justify-end">
                           Cum. Onboard <InfoIcon text={EXPLANATIONS.cumOnboard} />
                        </div>
                      </th>
                      {channels.map(ch => (
                        <React.Fragment key={ch.id}>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap text-right text-slate-700 bg-slate-100 border-l-2 border-slate-300">
                             <div className="flex items-center justify-end">
                                {ch.name} Spend <InfoIcon text={EXPLANATIONS.chSpend} />
                             </div>
                          </th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap text-right text-slate-500 font-normal bg-slate-50">
                             <div className="flex items-center justify-end">
                                CPI <InfoIcon text={EXPLANATIONS.chCPI} />
                             </div>
                          </th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap text-right text-slate-500 font-normal bg-slate-50">
                             <div className="flex items-center justify-end">
                                Installs <InfoIcon text={EXPLANATIONS.chInstalls} />
                             </div>
                          </th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap text-right text-slate-500 font-normal bg-slate-50">
                             <div className="flex items-center justify-end">
                                Onboard <InfoIcon text={EXPLANATIONS.chOnboard} />
                             </div>
                          </th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.monthlyData.map((row) => (
                      <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap sticky left-0 bg-white border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{row.monthLabel}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap font-medium text-slate-900">{formatCurrency(row.monthlySpend)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{formatNumber(row.installsRequired)}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">{formatNumber(row.onboardTarget)}</td>
                        <td className="px-4 py-3 text-right font-medium text-indigo-600 whitespace-nowrap">{formatNumber(row.cumulativeOnboard)}</td>
                         {channels.map(ch => (
                           <React.Fragment key={ch.id}>
                             <td className="px-4 py-3 text-right text-slate-600 font-medium border-l-2 border-slate-200 whitespace-nowrap bg-slate-50/30">
                               {formatCurrency(row[`${ch.name}_Spend`])}
                             </td>
                             <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                               {formatCurrency(row[`${ch.name}_CPI`])}
                             </td>
                             <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                               {formatNumber(row[`${ch.name}_Installs`])}
                             </td>
                             <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                               {formatNumber(row[`${ch.name}_Onboard`])}
                             </td>
                           </React.Fragment>
                         ))}
                      </tr>
                    ))}
                    {/* Totals Row */}
                    <tr className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-200">
                      <td className="px-4 py-3 sticky left-0 bg-slate-100 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">TOTAL</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(results.totals.spend)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(results.totals.installs)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(results.totals.onboarded)}</td>
                      <td className="px-4 py-3 text-right text-indigo-600">-</td>
                      {channels.map(ch => (
                        <React.Fragment key={ch.id}>
                          <td className="px-4 py-3 text-right border-l-2 border-slate-300 text-slate-700">
                            {formatCurrency(results.monthlyData.reduce((sum, r) => sum + (r[`${ch.name}_Spend`] || 0), 0))}
                          </td>
                           <td className="px-4 py-3 text-right text-slate-500 font-normal">
                             {formatCurrency(results.monthlyData[0]?.[`${ch.name}_CPI`] || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatNumber(results.monthlyData.reduce((sum, r) => sum + (r[`${ch.name}_Installs`] || 0), 0))}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600">
                            {formatNumber(results.monthlyData.reduce((sum, r) => sum + (r[`${ch.name}_Onboard`] || 0), 0))}
                          </td>
                        </React.Fragment>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default App;