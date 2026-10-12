import React, { useState } from 'react';
import { PatientProfile, BiologicalSex, RaceEthnicity, ChestPainType, ECGFinding } from '../types/cardiac';
import { Sliders, Activity, Droplets, HeartHandshake, Stethoscope } from 'lucide-react';

interface ClinicalDataFormProps {
  patient: PatientProfile;
  onUpdatePatient: (updated: PatientProfile) => void;
}

export const ClinicalDataForm: React.FC<ClinicalDataFormProps> = ({
  patient,
  onUpdatePatient,
}) => {
  const [activeTab, setActiveTab] = useState<'vitals' | 'lipids' | 'biomarkers' | 'vessels'>('vitals');

  const update = (patch: Partial<PatientProfile>) => {
    onUpdatePatient({ ...patient, ...patch });
  };

  const updateVessel = (vesselKey: 'lad' | 'lcx' | 'rca', stenosis: number) => {
    const updatedVessels = {
      ...patient.coronaryVessels,
      [vesselKey]: {
        ...patient.coronaryVessels[vesselKey],
        stenosisPercent: stenosis,
        estimatedFfr: Math.max(0.42, Math.round((1.0 - Math.pow(stenosis / 100, 2) * 0.65) * 100) / 100),
      },
    };
    onUpdatePatient({ ...patient, coronaryVessels: updatedVessels });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('vitals')}
          className={`flex items-center gap-1.5 px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'vitals'
              ? 'border-rose-500 text-rose-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Vitals & Vitals Risk</span>
        </button>

        <button
          onClick={() => setActiveTab('lipids')}
          className={`flex items-center gap-1.5 px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'lipids'
              ? 'border-rose-500 text-rose-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Droplets className="w-3.5 h-3.5" />
          <span>Lipids & Metabolic</span>
        </button>

        <button
          onClick={() => setActiveTab('biomarkers')}
          className={`flex items-center gap-1.5 px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'biomarkers'
              ? 'border-rose-500 text-rose-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Biomarkers & CAC</span>
        </button>

        <button
          onClick={() => setActiveTab('vessels')}
          className={`flex items-center gap-1.5 px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'vessels'
              ? 'border-rose-500 text-rose-400 bg-slate-900/60'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Coronary Vessels (3D Map)</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="p-4 text-xs space-y-4">
        {activeTab === 'vitals' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Age & Sex */}
            <div>
              <label className="block text-slate-400 mb-1">Age (years)</label>
              <input
                type="number"
                min="20"
                max="95"
                value={patient.age}
                onChange={(e) => update({ age: parseInt(e.target.value) || 20 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Biological Sex</label>
              <select
                value={patient.sex}
                onChange={(e) => update({ sex: e.target.value as BiologicalSex })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Race / Ethnicity</label>
              <select
                value={patient.race}
                onChange={(e) => update({ race: e.target.value as RaceEthnicity })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              >
                <option value="white">White / Other</option>
                <option value="african_american">African American</option>
                <option value="hispanic">Hispanic</option>
                <option value="asian">Asian / South Asian</option>
              </select>
            </div>

            {/* Blood Pressure */}
            <div>
              <label className="block text-slate-400 mb-1">
                Systolic BP: <span className="text-white font-mono">{patient.systolicBp} mmHg</span>
              </label>
              <input
                type="range"
                min="90"
                max="210"
                value={patient.systolicBp}
                onChange={(e) => update({ systolicBp: parseInt(e.target.value) })}
                className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Diastolic BP: <span className="text-white font-mono">{patient.diastolicBp} mmHg</span>
              </label>
              <input
                type="range"
                min="50"
                max="130"
                value={patient.diastolicBp}
                onChange={(e) => update({ diastolicBp: parseInt(e.target.value) })}
                className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Resting Heart Rate (BPM)</label>
              <input
                type="number"
                min="40"
                max="140"
                value={patient.restingHeartRate}
                onChange={(e) => update({ restingHeartRate: parseInt(e.target.value) || 70 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* History checkboxes */}
            <div className="md:col-span-3 flex flex-wrap gap-6 pt-2">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={patient.treatedHypertension}
                  onChange={(e) => update({ treatedHypertension: e.target.checked })}
                  className="accent-rose-500 rounded"
                />
                <span>Antihypertensive Medication</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={patient.smoker}
                  onChange={(e) => update({ smoker: e.target.checked })}
                  className="accent-rose-500 rounded"
                />
                <span>Active Smoker ({patient.packYears} pack-years)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={patient.diabetic}
                  onChange={(e) => update({ diabetic: e.target.checked })}
                  className="accent-rose-500 rounded"
                />
                <span>Type 2 Diabetes Mellitus</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={patient.familyHistoryCad}
                  onChange={(e) => update({ familyHistoryCad: e.target.checked })}
                  className="accent-rose-500 rounded"
                />
                <span>Family History of Premature CAD</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'lipids' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">
                Total Cholesterol: <span className="text-white font-mono">{patient.totalCholesterol} mg/dL</span>
              </label>
              <input
                type="range"
                min="120"
                max="360"
                value={patient.totalCholesterol}
                onChange={(e) => update({ totalCholesterol: parseInt(e.target.value) })}
                className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                LDL-C (Atherogenic): <span className="text-rose-400 font-mono font-bold">{patient.ldlCholesterol} mg/dL</span>
              </label>
              <input
                type="range"
                min="40"
                max="260"
                value={patient.ldlCholesterol}
                onChange={(e) => update({ ldlCholesterol: parseInt(e.target.value) })}
                className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                HDL-C (Protective): <span className="text-emerald-400 font-mono font-bold">{patient.hdlCholesterol} mg/dL</span>
              </label>
              <input
                type="range"
                min="20"
                max="100"
                value={patient.hdlCholesterol}
                onChange={(e) => update({ hdlCholesterol: parseInt(e.target.value) })}
                className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Triglycerides (mg/dL)</label>
              <input
                type="number"
                min="40"
                max="800"
                value={patient.triglycerides}
                onChange={(e) => update({ triglycerides: parseInt(e.target.value) || 100 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Lipoprotein(a) [Lp(a)] (nmol/L)</label>
              <input
                type="number"
                min="5"
                max="350"
                value={patient.lpa}
                onChange={(e) => update({ lpa: parseInt(e.target.value) || 20 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              />
              <span className="text-[10px] text-slate-500">&gt;125 nmol/L conveys independent genetic CAD risk</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">HbA1c (%)</label>
              <input
                type="number"
                step="0.1"
                min="4.0"
                max="14.0"
                value={patient.hba1c}
                onChange={(e) => update({ hba1c: parseFloat(e.target.value) || 5.5 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'biomarkers' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">
                Agatston CAC Score: <span className="text-white font-mono font-bold">{patient.cacScore}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1400"
                value={patient.cacScore}
                onChange={(e) => update({ cacScore: parseInt(e.target.value) })}
                className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded"
              />
              <span className="text-[10px] text-slate-500">0=None, 1-99=Mild, 100-399=Mod, &ge;400=Extensive</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                hs-CRP (Inflammation): <span className="text-amber-400 font-mono font-bold">{patient.hsCrp} mg/L</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="25"
                value={patient.hsCrp}
                onChange={(e) => update({ hsCrp: parseFloat(e.target.value) || 1.0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                LVEF Ejection Fraction: <span className="text-emerald-400 font-mono font-bold">{patient.lvef}%</span>
              </label>
              <input
                type="range"
                min="20"
                max="75"
                value={patient.lvef}
                onChange={(e) => update({ lvef: parseInt(e.target.value) })}
                className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Chest Pain Presentation</label>
              <select
                value={patient.chestPain}
                onChange={(e) => update({ chestPain: e.target.value as ChestPainType })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              >
                <option value="asymptomatic">Asymptomatic</option>
                <option value="typical_angina">Typical Angina (Exertional, substernal, relieved by rest)</option>
                <option value="atypical_angina">Atypical Angina (Dyspnea, upper back, fatigue)</option>
                <option value="non_anginal">Non-anginal chest pain</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">12-Lead ECG Findings</label>
              <select
                value={patient.ecgFinding}
                onChange={(e) => update({ ecgFinding: e.target.value as ECGFinding })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              >
                <option value="normal">Normal Sinus Rhythm</option>
                <option value="st_depression">ST-Segment Depression (&ge;1mm horizontal/downsloping)</option>
                <option value="st_elevation">ST-Segment Elevation (STEMI equivalent)</option>
                <option value="t_wave_inversion">Symmetric T-Wave Inversion</option>
                <option value="pathological_q_waves">Pathological Q-Waves (Prior Infarction)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Troponin-I (ng/mL)</label>
              <input
                type="number"
                step="0.005"
                min="0.001"
                max="2.0"
                value={patient.troponinI}
                onChange={(e) => update({ troponinI: parseFloat(e.target.value) || 0.01 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>
        )}

        {activeTab === 'vessels' && (
          <div className="space-y-4">
            <p className="text-slate-400 text-xs">
              Directly manipulate coronary luminal stenosis. Dynamic 3D anatomical heart geometry and myocardial ischemia heatmap update instantly:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* LAD */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-rose-400">LAD (Left Anterior Descending)</span>
                  <span className="font-mono font-bold text-white">
                    {patient.coronaryVessels.lad.hasStent ? 'STENTED (5%)' : `${patient.coronaryVessels.lad.stenosisPercent}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="99"
                  disabled={patient.coronaryVessels.lad.hasStent}
                  value={patient.coronaryVessels.lad.stenosisPercent}
                  onChange={(e) => updateVessel('lad', parseInt(e.target.value))}
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>Anteroseptal territory</span>
                  <span>FFR: {patient.coronaryVessels.lad.estimatedFfr}</span>
                </div>
              </div>

              {/* LCx */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-amber-400">LCx (Left Circumflex)</span>
                  <span className="font-mono font-bold text-white">
                    {patient.coronaryVessels.lcx.hasStent ? 'STENTED (5%)' : `${patient.coronaryVessels.lcx.stenosisPercent}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="99"
                  disabled={patient.coronaryVessels.lcx.hasStent}
                  value={patient.coronaryVessels.lcx.stenosisPercent}
                  onChange={(e) => updateVessel('lcx', parseInt(e.target.value))}
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>Posterolateral wall</span>
                  <span>FFR: {patient.coronaryVessels.lcx.estimatedFfr}</span>
                </div>
              </div>

              {/* RCA */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-emerald-400">RCA (Right Coronary)</span>
                  <span className="font-mono font-bold text-white">
                    {patient.coronaryVessels.rca.hasStent ? 'STENTED (5%)' : `${patient.coronaryVessels.rca.stenosisPercent}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="99"
                  disabled={patient.coronaryVessels.rca.hasStent}
                  value={patient.coronaryVessels.rca.stenosisPercent}
                  onChange={(e) => updateVessel('rca', parseInt(e.target.value))}
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                  <span>Inferior LV & RV</span>
                  <span>FFR: {patient.coronaryVessels.rca.estimatedFfr}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
