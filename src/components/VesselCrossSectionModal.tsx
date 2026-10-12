import React, { useState } from 'react';
import { VesselSegment, PlaqueType } from '../types/cardiac';
import { X, CheckCircle, ShieldAlert, Sparkles, Activity, Layers, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface VesselCrossSectionModalProps {
  vessel: VesselSegment | null;
  onClose: () => void;
  onUpdateVessel: (updatedVessel: VesselSegment) => void;
}

export const VesselCrossSectionModal: React.FC<VesselCrossSectionModalProps> = ({
  vessel,
  onClose,
  onUpdateVessel,
}) => {
  if (!vessel) return null;

  const [stenosis, setStenosis] = useState(vessel.stenosisPercent);
  const [hasStent, setHasStent] = useState(vessel.hasStent);
  const [plaqueType, setPlaqueType] = useState<PlaqueType>(vessel.plaqueType);
  const [tcfa, setTcfa] = useState(vessel.vulnerableFeatures.thinCapFibroatheroma);

  // Recalculate lumen metrics
  const normalLumenDiameterMm = 3.5; // typical coronary diameter in mm
  const effectiveNarrowing = hasStent ? 0.05 : stenosis / 100;
  const currentDiameterMm = Math.max(0.6, normalLumenDiameterMm * (1 - effectiveNarrowing * 0.75));
  const normalAreaMm2 = Math.PI * Math.pow(normalLumenDiameterMm / 2, 2);
  const currentAreaMm2 = Math.PI * Math.pow(currentDiameterMm / 2, 2);
  const plaqueBurdenPercent = Math.min(95, Math.round((1 - currentAreaMm2 / normalAreaMm2) * 100));

  // Fractional Flow Reserve (FFR)
  const calcFfr = hasStent ? 0.95 : Math.max(0.42, Math.round((1.0 - Math.pow(stenosis / 100, 2) * 0.65) * 100) / 100);

  const handleDeployStent = () => {
    setHasStent(true);
    setStenosis(5);
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Confetti fallback
    }

    const updated: VesselSegment = {
      ...vessel,
      stenosisPercent: 5,
      hasStent: true,
      estimatedFfr: 0.95,
      vulnerableFeatures: {
        ...vessel.vulnerableFeatures,
        thinCapFibroatheroma: false,
      },
    };
    onUpdateVessel(updated);
  };

  const handleRemoveStent = () => {
    setHasStent(false);
    setStenosis(vessel.stenosisPercent > 20 ? vessel.stenosisPercent : 70);
    const updated: VesselSegment = {
      ...vessel,
      stenosisPercent: vessel.stenosisPercent > 20 ? vessel.stenosisPercent : 70,
      hasStent: false,
      estimatedFfr: calcFfr,
    };
    onUpdateVessel(updated);
  };

  const handleApplyChanges = () => {
    const updated: VesselSegment = {
      ...vessel,
      stenosisPercent: stenosis,
      hasStent,
      plaqueType,
      estimatedFfr: calcFfr,
      vulnerableFeatures: {
        ...vessel.vulnerableFeatures,
        thinCapFibroatheroma: tcfa,
      },
    };
    onUpdateVessel(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20 text-rose-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Virtual IVUS & Angiographic Cross-Section: {vessel.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>Territory: {vessel.territory}</span>
                <span aria-hidden="true">·</span>
                <span className={hasStent ? 'text-sky-400 font-medium' : calcFfr < 0.8 ? 'text-rose-400 font-medium' : 'text-emerald-400'}>
                  FFR: {calcFfr.toFixed(2)} ({calcFfr < 0.8 && !hasStent ? 'Ischemic / Flow-Limiting' : 'Hemodynamically Preserved'})
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Visual Cross-Section Diagram */}
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 flex flex-col items-center justify-center relative">
              <div className="text-xs font-medium text-slate-400 mb-3 tracking-wider uppercase">
                Intravascular Lumen & Plaque Architecture
              </div>

              {/* SVG Cross-Section Anatomy */}
              <div className="relative w-56 h-56 flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {/* Outer Vessel Wall (Tunica Adventitia / External Elastic Lamina) */}
                  <circle cx="100" cy="100" r="92" fill="#1e293b" stroke="#475569" strokeWidth="3" />

                  {/* Tunica Media layer */}
                  <circle cx="100" cy="100" r="84" fill="#334155" stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" />

                  {/* Atherosclerotic Plaque Crescent */}
                  {!hasStent && stenosis > 15 && (
                    <path
                      d={`M 25 100 A 75 75 0 0 1 ${175} 100 Q 100 ${100 + (stenosis / 100) * 80} 25 100 Z`}
                      fill={
                        plaqueType === 'calcified'
                          ? '#fef08a'
                          : plaqueType === 'necrotic_core_vulnerable'
                          ? '#f97316'
                          : '#eab308'
                      }
                      opacity={0.85}
                    />
                  )}

                  {/* Stent metallic strut ring */}
                  {hasStent && (
                    <circle
                      cx="100"
                      cy="100"
                      r="78"
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="5"
                      strokeDasharray="4 4"
                      className="animate-pulse"
                    />
                  )}

                  {/* Patent Blood Lumen */}
                  <circle
                    cx="100"
                    cy="100"
                    r={Math.max(12, 75 * (1 - effectiveNarrowing * 0.72))}
                    fill="#e11d48"
                    stroke={hasStent ? '#38bdf8' : '#fda4af'}
                    strokeWidth="2"
                  />

                  {/* Centered blood flow text */}
                  <text
                    x="100"
                    y="104"
                    fill="#ffffff"
                    fontSize="11"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {hasStent ? 'PATENT DES' : `${stenosis}% STENOSIS`}
                  </text>
                </svg>
              </div>

              {/* Legend underneath */}
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 inline-block" /> Blood Lumen
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Atheroma Plaque
                </span>
                {hasStent && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" /> Cobalt Stent
                  </span>
                )}
              </div>
            </div>

            {/* Quantitative Hemodynamics & Lesion Stats */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Minimum Lumen Area (MLA)</div>
                  <div className="text-xl font-bold text-white mt-1">
                    {currentAreaMm2.toFixed(1)} <span className="text-xs font-normal text-slate-400">mm²</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Normal reference: {normalAreaMm2.toFixed(1)} mm²</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Plaque Burden</div>
                  <div className={`text-xl font-bold mt-1 ${plaqueBurdenPercent >= 70 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {hasStent ? '5%' : `${plaqueBurdenPercent}%`}
                  </div>
                  <div className="text-[10px] text-slate-500">&gt;70% is guideline threshold</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Fractional Flow Reserve (FFR)</div>
                  <div className={`text-xl font-bold mt-1 ${calcFfr < 0.8 && !hasStent ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {calcFfr.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500">&le;0.80 = Hemodynamically significant</div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Lumen Diameter</div>
                  <div className="text-xl font-bold text-white mt-1">
                    {currentDiameterMm.toFixed(2)} <span className="text-xs font-normal text-slate-400">mm</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Ref: {normalLumenDiameterMm} mm</div>
                </div>
              </div>

              {/* Vulnerable Plaque Warning */}
              {tcfa && !hasStent && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-lg flex items-start gap-2.5 text-xs text-rose-300">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-rose-200">High-Risk Vulnerable Plaque (TCFA):</span>
                    <p className="mt-0.5 text-rose-300/90 text-[11px]">
                      Thin fibrous cap (&lt;65 &mu;m) with large necrotic core and macrophage infiltration. Elevated propensity for plaque rupture and acute coronary syndrome (ACS).
                    </p>
                  </div>
                </div>
              )}

              {/* Stent Intervention Actions */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="text-xs font-semibold text-slate-200 mb-2">Interventional Cardiology Simulator</div>
                {hasStent ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-sky-400 font-medium">
                      <CheckCircle className="w-4 h-4" />
                      <span>Drug-Eluting Stent (DES) Successfully Implanted</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Coronary lumen expanded from {stenosis}% to 5% residual. Hemodynamics restored with FFR {calcFfr.toFixed(2)}.
                    </p>
                    <button
                      onClick={handleRemoveStent}
                      className="mt-2 text-xs text-slate-400 hover:text-slate-200 underline transition-colors"
                    >
                      Undo Stent Deployment (Revert to Native Lesion)
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs text-slate-400 mb-3">
                      Simulate Percutaneous Coronary Intervention (PCI) with an Everolimus-eluting cobalt-chromium stent:
                    </p>
                    <button
                      onClick={handleDeployStent}
                      className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 transition-all hover:scale-[1.01]"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Deploy Drug-Eluting Stent (DES)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Sliders for Custom Lesion Tuning */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">Adjust Stenosis Severity</span>
              <span className="text-xs font-mono font-bold text-rose-400">{stenosis}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="99"
              value={stenosis}
              disabled={hasStent}
              onChange={(e) => setStenosis(parseInt(e.target.value))}
              className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Plaque Morphology</label>
                <select
                  value={plaqueType}
                  onChange={(e) => setPlaqueType(e.target.value as PlaqueType)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="fibrofatty">Fibrofatty (Moderate lipid, stable)</option>
                  <option value="necrotic_core_vulnerable">Necrotic Core (High rupture risk)</option>
                  <option value="calcified">Calcified (Heavy Agatston calcium)</option>
                  <option value="fibrous">Fibrous (Intact thick cap)</option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tcfa}
                    onChange={(e) => setTcfa(e.target.checked)}
                    className="accent-rose-500 rounded"
                  />
                  <span>Thin-Cap Fibroatheroma (TCFA)</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApplyChanges}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-colors"
          >
            <span>Update Anatomical Model</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
