import React, { useState } from 'react';
import { PatientProfile, InterventionPlan } from '../types/cardiac';
import { simulateInterventionEffect } from '../services/clinicalCalculators';
import { X, Sparkles, TrendingDown, Check, ArrowRight, ShieldCheck, Heart, Pill } from 'lucide-react';
import confetti from 'canvas-confetti';

interface InterventionSimulatorProps {
  patient: PatientProfile;
  isOpen: boolean;
  onClose: () => void;
  onApplyPlanToPatient: (newPatient: PatientProfile) => void;
}

export const InterventionSimulator: React.FC<InterventionSimulatorProps> = ({
  patient,
  isOpen,
  onClose,
  onApplyPlanToPatient,
}) => {
  if (!isOpen) return null;

  const [plan, setPlan] = useState<InterventionPlan>({
    statinIntensity: 'high',
    addEzetimibe: patient.ldlCholesterol > 130,
    addPcsk9i: patient.ldlCholesterol > 180 || patient.lpa > 100,
    addSglt2i: patient.diabetic || patient.lvef < 50,
    antiplatelet: patient.coronaryVessels.lad.stenosisPercent >= 70 ? 'dapt' : 'aspirin',
    bpControlOptimized: patient.systolicBp > 130,
    cessationSmoking: patient.smoker,
    weightLossKg: patient.bmi > 28 ? 6 : 0,
    revascularizationTarget:
      patient.coronaryVessels.lad.stenosisPercent >= 70
        ? 'lad_stent'
        : patient.coronaryVessels.lcx.stenosisPercent >= 70
        ? 'lcx_stent'
        : 'none',
  });

  const simulation = simulateInterventionEffect(patient, plan);

  const handleApplyToLiveModel = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.5 },
      });
    } catch {
      // Fallback
    }

    const updatedPatient: PatientProfile = {
      ...patient,
      coronaryVessels: simulation.simulatedVessels,
      systolicBp: plan.bpControlOptimized ? Math.min(122, patient.systolicBp - 20) : patient.systolicBp,
      ldlCholesterol:
        plan.statinIntensity === 'high'
          ? Math.round(patient.ldlCholesterol * (plan.addPcsk9i ? 0.25 : plan.addEzetimibe ? 0.38 : 0.5))
          : patient.ldlCholesterol,
      smoker: plan.cessationSmoking ? false : patient.smoker,
    };

    onApplyPlanToPatient(updatedPatient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Cardiovascular Intervention & Revascularization Simulator
              </h2>
              <p className="text-xs text-slate-400">
                Predict multi-target pharmacotherapy & surgical/catheter intervention impact on 10-year MACE risk
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Real-Time Outcome Comparison Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <div className="text-xs text-slate-400">Current 10-Yr ASCVD Risk</div>
              <div className="text-2xl font-black text-rose-400 mt-1">
                {patient.coronaryVessels.lad.stenosisPercent >= 70 ? '28.4%' : '18.2%'}
              </div>
              <div className="text-[11px] text-slate-500">Uncontrolled Baseline</div>
            </div>

            <div className="border-l border-slate-800 pl-4">
              <div className="text-xs text-slate-400">Projected 10-Yr Risk Post-Treatment</div>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {simulation.projectedAscvd}%
              </div>
              <div className="text-[11px] text-emerald-400 font-medium">
                -{simulation.riskReductionPercent}% Relative Risk Reduction
              </div>
            </div>

            <div className="border-l border-slate-800 pl-4">
              <div className="text-xs text-slate-400">Myocardial Ischemic Burden</div>
              <div className="text-2xl font-black text-sky-400 mt-1">
                {simulation.projectedIschemicBurden}% <span className="text-xs font-normal text-slate-400">of LV</span>
              </div>
              <div className="text-[11px] text-slate-400">Revascularized coronary reserve</div>
            </div>
          </div>

          {/* Intervention Selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Pharmacotherapy Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-semibold text-slate-200 border-b border-slate-800 pb-2">
                <Pill className="w-4 h-4 text-rose-400" />
                <span>Guideline-Directed Medical Therapy (GDMT)</span>
              </div>

              {/* Statin Therapy */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Statin Regimen (HMG-CoA Reductase)</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['none', 'moderate', 'high'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setPlan({ ...plan, statinIntensity: lvl })}
                      className={`py-2 px-3 rounded-lg border capitalize transition-colors ${
                        plan.statinIntensity === lvl
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {lvl === 'high' ? 'High (Atorva 80)' : lvl === 'moderate' ? 'Moderate' : 'None'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ezetimibe & PCSK9i */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plan.addEzetimibe}
                    onChange={(e) => setPlan({ ...plan, addEzetimibe: e.target.checked })}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Add Ezetimibe 10mg daily (Niemann-Pick C1-Like 1 inhibitor)</span>
                </label>

                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plan.addPcsk9i}
                    onChange={(e) => setPlan({ ...plan, addPcsk9i: e.target.checked })}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Add PCSK9 Inhibitor (Evolocumab 140mg Q2W for extreme LDL/Lp(a))</span>
                </label>

                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plan.addSglt2i}
                    onChange={(e) => setPlan({ ...plan, addSglt2i: e.target.checked })}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Add SGLT2 Inhibitor (Empagliflozin 10mg: Cardiorenal protection)</span>
                </label>
              </div>

              {/* Antiplatelet */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Antiplatelet Regimen</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['none', 'aspirin', 'dapt'] as const).map((ap) => (
                    <button
                      key={ap}
                      onClick={() => setPlan({ ...plan, antiplatelet: ap })}
                      className={`py-2 px-3 rounded-lg border uppercase transition-colors ${
                        plan.antiplatelet === ap
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {ap === 'dapt' ? 'DAPT (Dual)' : ap === 'aspirin' ? 'ASA 81mg' : 'None'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interventional Revascularization & Lifestyle Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-semibold text-slate-200 border-b border-slate-800 pb-2">
                <Heart className="w-4 h-4 text-sky-400" />
                <span>Revascularization & Surgical Cath Lab Options</span>
              </div>

              {/* Revascularization selector */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Target Revascularization</label>
                <select
                  value={plan.revascularizationTarget}
                  onChange={(e) => setPlan({ ...plan, revascularizationTarget: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="none">Medical Therapy Only (No Stents / Conservative)</option>
                  <option value="lad_stent">PCI: LAD Drug-Eluting Stent (Everolimus DES)</option>
                  <option value="lcx_stent">PCI: LCx Drug-Eluting Stent</option>
                  <option value="rca_stent">PCI: RCA Drug-Eluting Stent</option>
                  <option value="multi_vessel_pci">Multi-vessel Complete PCI (All 3 Arteries)</option>
                  <option value="cabg">CABG: Coronary Artery Bypass Graft (LIMA to LAD + SVG)</option>
                </select>
              </div>

              {/* Lifestyle Modifiers */}
              <div className="space-y-2.5 pt-2">
                <span className="block font-medium text-slate-300">Lifestyle & Hemodynamics</span>

                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plan.bpControlOptimized}
                    onChange={(e) => setPlan({ ...plan, bpControlOptimized: e.target.checked })}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Intensive BP Target (&lt;120/80 mmHg via ACEi/ARB + CCB)</span>
                </label>

                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plan.cessationSmoking}
                    onChange={(e) => setPlan({ ...plan, cessationSmoking: e.target.checked })}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Complete Tobacco Cessation (Cessation Counseling + Varenicline)</span>
                </label>

                <label className="flex items-center gap-2.5 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={plan.weightLossKg >= 5}
                    onChange={(e) => setPlan({ ...plan, weightLossKg: e.target.checked ? 6 : 0 })}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Cardiometabolic Weight Reduction (&ge;5-7% Body Weight Loss)</span>
                </label>
              </div>

              {/* Clinical Takeaway Box */}
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                <span className="font-semibold text-white">Guideline Synthesis: </span>
                {simulation.clinicalTakeaway}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Applying this plan will remodel the 3D heart coronary arteries and restore ischemic myocardium.
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyToLiveModel}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.01]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Apply Simulated Plan to 3D Model</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
