import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  CircleDollarSign, 
  Info, 
  TrendingUp, 
  CheckCircle2, 
  HelpCircle,
  Award,
  Layers
} from 'lucide-react';
import { motion } from 'motion/react';
import { formatMoney, STAND_UNIT_PRICE, MAGNET_UNIT_PRICE } from '../../utils/calculations';

export default function IncentiveSimulator() {
  // Test inputs for simulator
  const [testDailyStand, setTestDailyStand] = useState<number>(600);
  const [testDailyMagnet, setTestDailyMagnet] = useState<number>(500);
  const [testDailyFrame, setTestDailyFrame] = useState<number>(300);
  const [testWorkingDays, setTestWorkingDays] = useState<number>(26);
  const [testBaseSalary, setTestBaseSalary] = useState<number>(17000);
  const [testTargetBonus, setTestTargetBonus] = useState<number>(2000);

  // Compute live estimated payout
  const simResults = useMemo(() => {
    const dailyStandMagTotal = testDailyStand + testDailyMagnet;
    const totalDailySales = testDailyStand + testDailyMagnet + testDailyFrame;
    const isTierMet = totalDailySales >= 500;

    // Daily Incentive (10% on Stand+Magnet if total 3-item sales >= 500, + 7% on Frame)
    const dailyIncentive = (isTierMet ? dailyStandMagTotal * 0.10 : 0) + (testDailyFrame * 0.07);

    // Monthly totals
    const monthlyGrossSales = totalDailySales * testWorkingDays;
    const monthlyIncentive = dailyIncentive * testWorkingDays;

    const estimatedStandUnits = Math.round((testDailyStand * testWorkingDays) / STAND_UNIT_PRICE);
    const estimatedMagnetUnits = Math.round((testDailyMagnet * testWorkingDays) / MAGNET_UNIT_PRICE);

    const netPayout = testBaseSalary + monthlyIncentive + testTargetBonus;

    return {
      dailyStandMagTotal,
      totalDailySales,
      isTierMet,
      dailyIncentive,
      monthlyGrossSales,
      monthlyIncentive,
      estimatedStandUnits,
      estimatedMagnetUnits,
      totalUnits: estimatedStandUnits + estimatedMagnetUnits,
      netPayout
    };
  }, [testDailyStand, testDailyMagnet, testDailyFrame, testWorkingDays, testBaseSalary, testTargetBonus]);

  return (
    <div className="space-y-8">
      
      {/* Active Rules Policy Card */}
      <div className="bg-[#0f1535]/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-[#262d63] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#080d2a] rounded-[14px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Keopic Photobooth Official Incentive & Commission Policy</h3>
            <p className="text-xs text-slate-400 mt-0.5">Transparent formula used across all counter staff accounts</p>
          </div>
        </div>

        {/* 4 Rule Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-[#090e2e] p-4 rounded-2xl border border-[#1e2858]">
            <div className="flex items-center gap-2 text-cyan-400 font-extrabold text-xs mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Stand Item Sales</span>
            </div>
            <p className="text-sm font-black text-white font-mono">₹200 / Stand</p>
            <p className="text-[11px] text-slate-400 mt-1">Qualifies for 10% daily commission when daily total (Stand+Magnet+Frame) ≥ ₹500</p>
          </div>

          <div className="bg-[#090e2e] p-4 rounded-2xl border border-[#1e2858]">
            <div className="flex items-center gap-2 text-purple-400 font-extrabold text-xs mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Magnet Item Sales</span>
            </div>
            <p className="text-sm font-black text-white font-mono">₹250 / Magnet</p>
            <p className="text-[11px] text-slate-400 mt-1">Qualifies for 10% daily commission when daily total (Stand+Magnet+Frame) ≥ ₹500</p>
          </div>

          <div className="bg-[#090e2e] p-4 rounded-2xl border border-[#1e2858]">
            <div className="flex items-center gap-2 text-pink-400 font-extrabold text-xs mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Frame Sales</span>
            </div>
            <p className="text-sm font-black text-white font-mono">7% Flat Commission</p>
            <p className="text-[11px] text-slate-400 mt-1">7% incentive applied on all Frame sales logged on Present days</p>
          </div>

          <div className="bg-[#090e2e] p-4 rounded-2xl border border-[#1e2858]">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Target Bonuses</span>
            </div>
            <p className="text-sm font-black text-white font-mono">+100% Additive</p>
            <p className="text-[11px] text-slate-400 mt-1">All achieved milestone target bonuses added directly to final net payout</p>
          </div>

        </div>
      </div>

      {/* Interactive Live Simulator */}
      <div className="bg-[#0f1535]/80 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-[#262d63] shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 p-0.5 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <div className="w-full h-full bg-[#080d2a] rounded-[14px] flex items-center justify-center">
              <Calculator className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-black text-white tracking-tight">Interactive Staff Earnings Simulator</h3>
            <p className="text-xs text-slate-400 mt-0.5">Adjust average daily sales numbers to simulate estimated staff commissions and total payout</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Daily Stand Sales */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Avg Daily Stand Sales (₹)
                </label>
                <input
                  type="number"
                  value={testDailyStand}
                  onChange={(e) => setTestDailyStand(Number(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-[#090e2e] border border-[#202a5c] rounded-2xl text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              {/* Daily Magnet Sales */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Avg Daily Magnet Sales (₹)
                </label>
                <input
                  type="number"
                  value={testDailyMagnet}
                  onChange={(e) => setTestDailyMagnet(Number(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-[#090e2e] border border-[#202a5c] rounded-2xl text-xs font-mono font-bold text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>

              {/* Daily Frame Sales */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Avg Daily Frame Sales (₹)
                </label>
                <input
                  type="number"
                  value={testDailyFrame}
                  onChange={(e) => setTestDailyFrame(Number(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-[#090e2e] border border-[#202a5c] rounded-2xl text-xs font-mono font-bold text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                />
              </div>

              {/* Days Present */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Working Days Present in Month
                </label>
                <input
                  type="number"
                  value={testWorkingDays}
                  onChange={(e) => setTestWorkingDays(Number(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-[#090e2e] border border-[#202a5c] rounded-2xl text-xs font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {/* Base Salary */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Monthly Base Salary (₹)
                </label>
                <input
                  type="number"
                  value={testBaseSalary}
                  onChange={(e) => setTestBaseSalary(Number(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-[#090e2e] border border-[#202a5c] rounded-2xl text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Target Bonus */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Target Milestone Bonuses (₹)
                </label>
                <input
                  type="number"
                  value={testTargetBonus}
                  onChange={(e) => setTestTargetBonus(Number(e.target.value) || 0)}
                  className="w-full px-4 py-2.5 bg-[#090e2e] border border-[#202a5c] rounded-2xl text-xs font-mono font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

            </div>

            {/* Daily Threshold Status Indicator */}
            <div className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
              simResults.isTierMet
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>
                  Daily Stand+Magnet Total: <strong>₹{simResults.dailyStandMagTotal}</strong> ({simResults.isTierMet ? '≥ ₹500 Threshold Qualified!' : 'Below ₹500 Threshold'})
                </span>
              </div>
              <span className="font-mono font-black">{simResults.isTierMet ? '10% Commission Active' : '0% Stand Commission'}</span>
            </div>

          </div>

          {/* Results Summary Column */}
          <div className="lg:col-span-5 bg-[#090e2e] p-6 rounded-3xl border border-[#1e2858] space-y-5 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <CircleDollarSign className="w-4 h-4 text-cyan-400" />
                <span>Simulated Monthly Payout Summary</span>
              </h4>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#182352]">
                  <span className="text-slate-400">Total Monthly Gross Sales:</span>
                  <span className="font-mono font-bold text-white">₹{formatMoney(simResults.monthlyGrossSales)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-[#182352]">
                  <span className="text-slate-400">Estimated Stand & Magnet Units:</span>
                  <span className="font-mono font-bold text-cyan-300">{simResults.totalUnits} items</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-[#182352]">
                  <span className="text-slate-400">Fixed Base Salary:</span>
                  <span className="font-mono font-bold text-slate-200">₹{formatMoney(testBaseSalary)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-[#182352]">
                  <span className="text-slate-400">Monthly Commission Earned:</span>
                  <span className="font-mono font-bold text-emerald-400">+₹{formatMoney(simResults.monthlyIncentive, 2)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-[#182352]">
                  <span className="text-slate-400">Milestone Target Bonus:</span>
                  <span className="font-mono font-bold text-purple-400">+₹{formatMoney(testTargetBonus)}</span>
                </div>
              </div>
            </div>

            {/* Total Highlight */}
            <div className="pt-4 border-t border-[#1e2858] bg-[#10183f] p-4 rounded-2xl border border-[#1d2757]">
              <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-300 block">ESTIMATED NET PAYABLE SALARY</span>
              <span className="text-2xl font-black text-amber-300 font-mono">₹{formatMoney(simResults.netPayout, 2)}</span>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
