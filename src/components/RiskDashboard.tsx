import React from 'react';
import { PatientProfile, RiskAssessment } from '../types/cardiac';
import { ShieldAlert, AlertTriangle, CheckCircle, TrendingDown, Activity, Heart, Info, ArrowUpRight } from 'lucide-react';

interface RiskDashboardProps {
  patient: PatientProfile;
  riskAssessment: RiskAssessment;
  onOpenIntervention: () => void;
}

export const RiskDashboard: React.FC<RiskDashboardProps> = ({
  patient,
  riskAssessment,
  onOpenIntervention,
}) => {
  const {
    ascvd10YearRisk,
    ascvdRiskCategory,
    framingham10YearRisk,
    cadRadsGrade,
    cadRadsDescription,
    ischemicBurdenPercent,
    syntaxScoreEstimate,
    diamondForresterPretest,
    primaryRecommendation,
  } = riskAssessment;

  // Category styling
  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'high':
        return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
      case 'intermediate':
        return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
      case 'borderline':
        return { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' };
      default:
        return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    }
  };

  const style = getCategoryColor(ascvdRiskCategory);

  // Survival curve data points over 10 years
  const years = [0, 2, 4, 6, 8, 10];
  const untreatedSurvival = years.map((yr) =>
    Math.max(40, Math.round(100 - (ascvd10YearRisk / 10) * yr))
  );
  const treatedSurvival = years.map((yr) =>
    Math.max(55, Math.round(100 - (ascvd10YearRisk / 10) * yr * 0.48))
  );

  return (
    <div className="space-y-4">
      {/* Primary Risk Banner */}
      <div className={`p-4 rounded-xl border ${style.bg} ${style.border} flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-lg bg-slate-900 border border-slate-700/60 shrink-0 ${style.text}`}>
            {ascvdRiskCategory === 'high' ? (
              <ShieldAlert className="w-6 h-6" />
            ) : ascvdRiskCategory === 'intermediate' ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <CheckCircle className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">
                AHA/ACC 10-Year ASCVD Risk
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${style.text} ${style.bg} border ${style.border}`}>
                {ascvdRiskCategory} Risk
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-3xl font-black ${style.text}`}>{ascvd10YearRisk}%</span>
              <span className="text-xs text-slate-400">
                10-Year Probability of Myocardial Infarction or Stroke
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {primaryRecommendation}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenIntervention}
          className="self-start md:self-center px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-600/30 transition-all hover:scale-[1.02] shrink-0"
        >
          <TrendingDown className="w-4 h-4" />
          <span>Simulate Interventions & Stents</span>
        </button>
      </div>

      {/* 4 Quantitative Biomarker & Clinical Score Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* CAD-RADS Score */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>CAD-RADS™ 2.0</span>
            <Activity className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono tracking-tight">{cadRadsGrade}</div>
          <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-tight">
            {cadRadsDescription}
          </p>
        </div>

        {/* Framingham Risk Score */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Framingham CHD</span>
            <Heart className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono">{framingham10YearRisk}%</div>
          <p className="text-[11px] text-slate-400 mt-1 leading-tight">
            10-year hard coronary heart disease event probability
          </p>
        </div>

        {/* Myocardial Ischemic Burden */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Ischemic Burden</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className={`text-lg font-bold font-mono ${ischemicBurdenPercent >= 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {ischemicBurdenPercent}% <span className="text-xs font-normal text-slate-400">of LV</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-tight">
            {ischemicBurdenPercent >= 10 ? 'Critical high risk (threshold \u226510% for revasc)' : 'Non-flow-limiting burden'}
          </p>
        </div>

        {/* SYNTAX Score Estimate */}
        <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>SYNTAX / Pretest</span>
            <Info className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {syntaxScoreEstimate} <span className="text-xs font-normal text-slate-400">pts</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-tight">
            Diamond-Forrester pre-test CAD: <strong className="text-slate-300">{diamondForresterPretest}%</strong>
          </p>
        </div>
      </div>

      {/* 10-Year Event-Free Survival Forecast SVG Chart */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold text-white tracking-wide uppercase">
              10-Year Event-Free Survival Forecast (MACE Trajectory)
            </h3>
            <p className="text-[11px] text-slate-400">
              Comparing natural disease progression vs. aggressive guideline-directed medical therapy & revascularization
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-rose-400 font-medium">
              <span className="w-3 h-0.5 bg-rose-500 inline-block" /> Current Baseline Trajectory
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-3 h-0.5 bg-emerald-500 inline-block" /> With Optimal Interventions
            </span>
          </div>
        </div>

        {/* SVG Survival Trajectory Chart */}
        <div className="w-full h-36 relative">
          <svg viewBox="0 0 500 120" className="w-full h-full overflow-visible">
            {/* Grid lines */}
            {[20, 50, 80, 110].map((y, idx) => (
              <line
                key={idx}
                x1="40"
                y1={y}
                x2="490"
                y2={y}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            ))}

            {/* Y axis labels */}
            <text x="32" y="24" fill="#64748b" fontSize="10" textAnchor="end">100%</text>
            <text x="32" y="54" fill="#64748b" fontSize="10" textAnchor="end">80%</text>
            <text x="32" y="84" fill="#64748b" fontSize="10" textAnchor="end">60%</text>
            <text x="32" y="114" fill="#64748b" fontSize="10" textAnchor="end">40%</text>

            {/* X axis labels */}
            {years.map((yr, idx) => {
              const x = 50 + idx * 85;
              return (
                <text key={idx} x={x} y="130" fill="#64748b" fontSize="10" textAnchor="middle">
                  Year {yr}
                </text>
              );
            })}

            {/* Line: Current Baseline (Untreated / natural history) */}
            <path
              d={years
                .map((yr, idx) => {
                  const x = 50 + idx * 85;
                  const surv = untreatedSurvival[idx];
                  const y = 20 + ((100 - surv) / 60) * 90;
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
            />

            {/* Points for Current */}
            {years.map((yr, idx) => {
              const x = 50 + idx * 85;
              const surv = untreatedSurvival[idx];
              const y = 20 + ((100 - surv) / 60) * 90;
              return (
                <circle key={`u-${idx}`} cx={x} cy={y} r="3.5" fill="#ef4444" stroke="#0f172a" strokeWidth="1.5" />
              );
            })}

            {/* Line: Treated (Intervention) */}
            <path
              d={years
                .map((yr, idx) => {
                  const x = 50 + idx * 85;
                  const surv = treatedSurvival[idx];
                  const y = 20 + ((100 - surv) / 60) * 90;
                  return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeDasharray="4 2"
            />

            {/* Points for Treated */}
            {years.map((yr, idx) => {
              const x = 50 + idx * 85;
              const surv = treatedSurvival[idx];
              const y = 20 + ((100 - surv) / 60) * 90;
              return (
                <circle key={`t-${idx}`} cx={x} cy={y} r="3.5" fill="#10b981" stroke="#0f172a" strokeWidth="1.5" />
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
