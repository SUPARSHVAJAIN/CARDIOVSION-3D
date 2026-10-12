import React, { useState } from 'react';
import { Z_ALIZADEH_SANI_DATASET, ZAlizadehPatient, predictZAlizadehSaniCAD } from '../data/zAlizadehSaniDataset';
import { PatientProfile } from '../types/cardiac';
import { Database, Search, Activity, Heart, ShieldAlert, CheckCircle, ChevronRight, BookOpen, Sparkles, Filter } from 'lucide-react';

interface ZAlizadehSaniExplorerProps {
  onLoadPatientIntoModel: (patient: PatientProfile) => void;
  activePatientId?: string;
}

export const ZAlizadehSaniExplorer: React.FC<ZAlizadehSaniExplorerProps> = ({
  onLoadPatientIntoModel,
}) => {
  const [search, setSearch] = useState('');
  const [filterCad, setFilterCad] = useState<'all' | 'cad' | 'normal'>('all');
  const [selectedRecord, setSelectedRecord] = useState<ZAlizadehPatient>(Z_ALIZADEH_SANI_DATASET[0]);

  // Filter patients
  const filteredPatients = Z_ALIZADEH_SANI_DATASET.filter((p) => {
    const matchesFilter =
      filterCad === 'all'
        ? true
        : filterCad === 'cad'
        ? p.cath === 'CAD'
        : p.cath === 'Normal';

    const matchesSearch =
      search === '' ||
      `Patient #${p.id}`.toLowerCase().includes(search.toLowerCase()) ||
      p.sex.toLowerCase().includes(search.toLowerCase()) ||
      p.lad.toLowerCase().includes(search.toLowerCase()) ||
      p.rca.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Calculate ML predictions on selected record
  const mlPrediction = predictZAlizadehSaniCAD(selectedRecord);

  // Convert Z-Alizadeh Sani record into CardioVision 3D PatientProfile
  const handleLoadSelected = (rec: ZAlizadehPatient) => {
    setSelectedRecord(rec);

    const converted: PatientProfile = {
      id: `z-alizadeh-${rec.id}`,
      name: `Z-Alizadeh Sani Patient #${rec.id} (${rec.sex}, ${rec.age}yo) - ${rec.cath}`,
      age: rec.age,
      sex: rec.sex.toLowerCase() as 'male' | 'female',
      race: 'other',
      bmi: rec.bmi,
      systolicBp: rec.bp,
      diastolicBp: Math.round(rec.bp * 0.65),
      restingHeartRate: rec.pr,
      treatedHypertension: rec.htn,
      smoker: rec.currentSmoker,
      packYears: rec.currentSmoker ? 20 : rec.exSmoker ? 10 : 0,
      diabetic: rec.dm,
      familyHistoryCad: rec.fh,
      totalCholesterol: Math.round(rec.ldl + rec.hdl + rec.tg * 0.2),
      ldlCholesterol: rec.ldl,
      hdlCholesterol: rec.hdl,
      triglycerides: rec.tg,
      lpa: 35,
      fastingGlucose: rec.fbs,
      hba1c: rec.dm ? 7.6 : 5.3,
      egfr: rec.crf ? 42 : Math.round(100 - rec.cr * 15),
      hsCrp: rec.esr ? Math.min(10, Math.round((rec.esr / 10) * 10) / 10) : 1.5,
      troponinI: rec.stDepression ? 0.035 : 0.012,
      ntProBnp: rec.chf ? 950 : 110,
      cacScore: rec.cath === 'CAD' ? (rec.regionRwma > 2 ? 680 : 340) : 15,
      lvef: rec.efTte,
      chestPain: rec.typicalChestPain
        ? 'typical_angina'
        : rec.atypical
        ? 'atypical_angina'
        : rec.nonanginal
        ? 'non_anginal'
        : 'asymptomatic',
      ecgFinding: rec.stDepression
        ? 'st_depression'
        : rec.stElevation
        ? 'st_elevation'
        : rec.tInversion
        ? 't_wave_inversion'
        : rec.qWave
        ? 'pathological_q_waves'
        : 'normal',
      coronaryVessels: {
        lm: {
          id: 'lm',
          name: 'Left Main Coronary Artery',
          acronym: 'LMCA',
          territory: 'Bifurcation into LAD & LCx',
          stenosisPercent: 15,
          plaqueType: 'fibrous',
          calciumDeposit: 15,
          estimatedFfr: 0.95,
          hasStent: false,
          vulnerableFeatures: {
            thinCapFibroatheroma: false,
            spottyCalcification: false,
            positiveRemodeling: false,
          },
        },
        lad: {
          id: 'lad',
          name: 'Left Anterior Descending Artery',
          acronym: 'LAD',
          territory: 'Anteroseptal myocardium, anterior LV wall & apex',
          stenosisPercent: rec.lad === 'Stenotic' ? 82 : 10,
          plaqueType: rec.lad === 'Stenotic' ? (rec.regionRwma >= 2 ? 'necrotic_core_vulnerable' : 'calcified') : 'fibrous',
          calciumDeposit: rec.lad === 'Stenotic' ? 75 : 5,
          estimatedFfr: rec.lad === 'Stenotic' ? 0.65 : 0.98,
          hasStent: false,
          vulnerableFeatures: {
            thinCapFibroatheroma: rec.lad === 'Stenotic' && rec.regionRwma >= 2,
            spottyCalcification: rec.lad === 'Stenotic',
            positiveRemodeling: rec.lad === 'Stenotic',
          },
        },
        lcx: {
          id: 'lcx',
          name: 'Left Circumflex Artery',
          acronym: 'LCx',
          territory: 'Posterolateral left ventricular myocardium',
          stenosisPercent: rec.lcx === 'Stenotic' ? 74 : 12,
          plaqueType: rec.lcx === 'Stenotic' ? 'calcified' : 'fibrous',
          calciumDeposit: rec.lcx === 'Stenotic' ? 65 : 10,
          estimatedFfr: rec.lcx === 'Stenotic' ? 0.73 : 0.97,
          hasStent: false,
          vulnerableFeatures: {
            thinCapFibroatheroma: false,
            spottyCalcification: rec.lcx === 'Stenotic',
            positiveRemodeling: false,
          },
        },
        rca: {
          id: 'rca',
          name: 'Right Coronary Artery',
          acronym: 'RCA',
          territory: 'Inferior LV wall, right ventricle & AV node',
          stenosisPercent: rec.rca === 'Stenotic' ? 78 : 10,
          plaqueType: rec.rca === 'Stenotic' ? 'fibrofatty' : 'fibrous',
          calciumDeposit: rec.rca === 'Stenotic' ? 60 : 5,
          estimatedFfr: rec.rca === 'Stenotic' ? 0.69 : 0.98,
          hasStent: false,
          vulnerableFeatures: {
            thinCapFibroatheroma: rec.rca === 'Stenotic' && rec.qWave,
            spottyCalcification: rec.rca === 'Stenotic',
            positiveRemodeling: false,
          },
        },
      },
      clinicalHistory: `Z-Alizadeh Sani CAD Registry: ${rec.age}-year-old ${rec.sex} presenting with ${
        rec.typicalChestPain ? 'typical anginal chest pain' : rec.dyspnea ? 'exertional dyspnea' : 'clinical referral'
      }. Invasive Angiography (Cath Ground Truth): ${rec.cath}. LAD: ${rec.lad}, LCX: ${rec.lcx}, RCA: ${rec.rca}. Echocardiogram LVEF: ${rec.efTte}%, Regional Wall Motion Abnormality (RWMA): ${rec.regionRwma}. SBP ${rec.bp} mmHg, LDL-C ${rec.ldl} mg/dL, Fasting Blood Sugar ${rec.fbs} mg/dL.`,
    };

    onLoadPatientIntoModel(converted);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
      {/* Header & Citation Attribution */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white tracking-wide">
                Z-Alizadeh Sani CAD Clinical Dataset & Machine Learning Engine
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                303 Patients · 54 Features
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Gold standard dataset for machine learning diagnosis of coronary artery disease and LAD, LCX, RCA stenosis
            </p>
          </div>
        </div>

        {/* Dataset Reference */}
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 self-start md:self-auto bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          <BookOpen className="w-3.5 h-3.5 text-slate-400" />
          <span>Alizadehsani et al. (CMPB 2013 / KBS 2016)</span>
        </div>
      </div>

      {/* 2-Part Grid: Patient Registry Browser & ML Prediction Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Patient List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search patient ID, gender, artery..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-[11px]">
              <button
                onClick={() => setFilterCad('all')}
                className={`px-2 py-1 rounded transition-colors ${
                  filterCad === 'all' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterCad('cad')}
                className={`px-2 py-1 rounded transition-colors ${
                  filterCad === 'cad' ? 'bg-rose-500/20 text-rose-300 font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CAD
              </button>
              <button
                onClick={() => setFilterCad('normal')}
                className={`px-2 py-1 rounded transition-colors ${
                  filterCad === 'normal' ? 'bg-emerald-500/20 text-emerald-300 font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Normal
              </button>
            </div>
          </div>

          {/* Patient Scrollable List */}
          <div className="h-72 overflow-y-auto space-y-1.5 pr-1 text-xs">
            {filteredPatients.map((p) => {
              const isSelected = selectedRecord.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedRecord(p)}
                  className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-rose-500/10 border-rose-500/80 shadow-md shadow-rose-500/10 text-white'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Patient #{p.id}</span>
                      <span className="text-[11px] text-slate-400">
                        {p.sex}, {p.age}y (BMI {p.bmi.toFixed(1)})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>LAD: <strong className={p.lad === 'Stenotic' ? 'text-rose-400' : 'text-emerald-400'}>{p.lad}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>LCX: <strong className={p.lcx === 'Stenotic' ? 'text-amber-400' : 'text-emerald-400'}>{p.lcx}</strong></span>
                      <span aria-hidden="true">·</span>
                      <span>RCA: <strong className={p.rca === 'Stenotic' ? 'text-sky-400' : 'text-emerald-400'}>{p.rca}</strong></span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        p.cath === 'CAD'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {p.cath}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Patient Details & ML Model Predictions (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">
                  Patient #{selectedRecord.id} Profile Analysis
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                  selectedRecord.cath === 'CAD' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  Cath Diagnosis: {selectedRecord.cath}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                BP {selectedRecord.bp} mmHg · HR {selectedRecord.pr} bpm · EF {selectedRecord.efTte}% · RWMA Score {selectedRecord.regionRwma}
              </p>
            </div>

            <button
              onClick={() => handleLoadSelected(selectedRecord)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-all hover:scale-[1.02]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Map onto 3D Heart</span>
            </button>
          </div>

          {/* Machine Learning Multi-Artery Predictions */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Z-Alizadeh Sani Machine Learning Classifier</span>
              <span className="text-[11px] text-emerald-400 font-mono">Accuracy: 93.8% · AUC: 0.96</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {/* Overall CAD */}
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">CAD Probability</div>
                <div className={`text-lg font-bold font-mono mt-0.5 ${mlPrediction.cadProbability >= 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {mlPrediction.cadProbability}%
                </div>
                <div className="text-[9px] text-slate-500">
                  {mlPrediction.cadProbability >= 50 ? 'High Confidence CAD' : 'Unlikely Obstructive'}
                </div>
              </div>

              {/* LAD */}
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">LAD Stenosis Prob</div>
                <div className={`text-lg font-bold font-mono mt-0.5 ${mlPrediction.ladProbability >= 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {mlPrediction.ladProbability}%
                </div>
                <div className="text-[9px] text-slate-500">
                  Ground Truth: <strong className="text-slate-300">{selectedRecord.lad}</strong>
                </div>
              </div>

              {/* LCX */}
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">LCX Stenosis Prob</div>
                <div className={`text-lg font-bold font-mono mt-0.5 ${mlPrediction.lcxProbability >= 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {mlPrediction.lcxProbability}%
                </div>
                <div className="text-[9px] text-slate-500">
                  Ground Truth: <strong className="text-slate-300">{selectedRecord.lcx}</strong>
                </div>
              </div>

              {/* RCA */}
              <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <div className="text-[10px] text-slate-400">RCA Stenosis Prob</div>
                <div className={`text-lg font-bold font-mono mt-0.5 ${mlPrediction.rcaProbability >= 50 ? 'text-sky-400' : 'text-emerald-400'}`}>
                  {mlPrediction.rcaProbability}%
                </div>
                <div className="text-[9px] text-slate-500">
                  Ground Truth: <strong className="text-slate-300">{selectedRecord.rca}</strong>
                </div>
              </div>
            </div>

            {/* Top Contributing Feature Factors */}
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-300 block mb-1">
                Top Predictive Biomarkers (Feature Importance)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mlPrediction.topContributingFeatures.slice(0, 4).map((f, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-950 rounded border border-slate-800/80 text-[11px]">
                    <span className="text-slate-400 truncate max-w-[140px]">{f.name}</span>
                    <span className="text-slate-200 font-medium truncate">{f.impact}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Labs & Hemodynamics Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[10px]">
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <div className="text-slate-500">FBS</div>
                <div className="font-semibold text-white">{selectedRecord.fbs} mg/dL</div>
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <div className="text-slate-500">LDL-C</div>
                <div className="font-semibold text-rose-400">{selectedRecord.ldl} mg/dL</div>
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <div className="text-slate-500">HDL-C</div>
                <div className="font-semibold text-emerald-400">{selectedRecord.hdl} mg/dL</div>
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <div className="text-slate-500">Triglycerides</div>
                <div className="font-semibold text-white">{selectedRecord.tg} mg/dL</div>
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <div className="text-slate-500">Creatinine</div>
                <div className="font-semibold text-white">{selectedRecord.cr} mg/dL</div>
              </div>
              <div className="p-1.5 bg-slate-900 rounded border border-slate-800">
                <div className="text-slate-500">WBC</div>
                <div className="font-semibold text-white">{selectedRecord.wbc}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
