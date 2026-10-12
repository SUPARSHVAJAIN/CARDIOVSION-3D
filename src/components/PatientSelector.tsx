import React from 'react';
import { PatientProfile } from '../types/cardiac';
import { PATIENT_COHORTS } from '../data/patientCohorts';
import { User, Users, ShieldAlert, Heart, Activity } from 'lucide-react';

interface PatientSelectorProps {
  currentPatientId: string;
  onSelectPatient: (patient: PatientProfile) => void;
}

export const PatientSelector: React.FC<PatientSelectorProps> = ({
  currentPatientId,
  onSelectPatient,
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-lg">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Users className="w-3.5 h-3.5 text-rose-500" />
          <span>Clinical Patient Cohorts & Personas</span>
        </div>
        <span className="text-[11px] text-slate-500">Select to load anatomical phenotype</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {PATIENT_COHORTS.map((p) => {
          const isSelected = p.id === currentPatientId;
          const maxStenosis = Math.max(
            p.coronaryVessels.lad.stenosisPercent,
            p.coronaryVessels.lcx.stenosisPercent,
            p.coronaryVessels.rca.stenosisPercent
          );

          return (
            <button
              key={p.id}
              onClick={() => onSelectPatient(p)}
              className={`text-left p-2.5 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-rose-500/10 border-rose-500/80 shadow-md shadow-rose-500/10'
                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                  {p.name.split(' - ')[0]}
                </span>
                {maxStenosis >= 70 ? (
                  <span className="text-[10px] font-bold text-rose-400 font-mono">{maxStenosis}%</span>
                ) : maxStenosis >= 50 ? (
                  <span className="text-[10px] font-bold text-amber-400 font-mono">{maxStenosis}%</span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-400 font-mono">{maxStenosis}%</span>
                )}
              </div>

              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                {p.name.split(' - ')[1] || 'Cardiovascular Profile'}
              </div>

              <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-500">
                <span>Age {p.age}</span>
                <span aria-hidden="true">·</span>
                <span>BP {p.systolicBp}/{p.diastolicBp}</span>
                <span aria-hidden="true">·</span>
                <span>CAC {p.cacScore}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
