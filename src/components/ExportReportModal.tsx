import React from 'react';
import { PatientProfile, RiskAssessment } from '../types/cardiac';
import { X, Printer, ShieldCheck, Heart, Activity, FileCheck } from 'lucide-react';

interface ExportReportModalProps {
  patient: PatientProfile;
  riskAssessment: RiskAssessment;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  patient,
  riskAssessment,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-rose-500" />
            <h2 className="text-sm font-semibold text-white">
              Cardiovascular Risk & 3D CAD Consultation Report
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto space-y-6 text-xs text-slate-200 print:text-black print:p-0">
          {/* Clinic Branding */}
          <div className="border-b border-slate-700 print:border-black pb-4 flex justify-between items-start">
            <div>
              <div className="text-lg font-bold text-white print:text-black tracking-tight">
                CARDIOVISION 3D CLINICAL INSTITUTE
              </div>
              <div className="text-slate-400 print:text-gray-600 text-[11px]">
                Center for Multimodal Cardiovascular Risk Prediction & 3D Anatomic Modeling
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400 print:text-gray-600">
              <div>Date: {new Date().toLocaleDateString()}</div>
              <div>Report ID: CV3D-{patient.id.replace('patient-', '').toUpperCase()}-2026</div>
            </div>
          </div>

          {/* Patient Overview */}
          <div className="bg-slate-950 print:bg-gray-100 p-4 rounded-xl border border-slate-800 print:border-gray-300">
            <div className="text-xs font-bold text-white print:text-black uppercase tracking-wider mb-2">
              Patient Identification & Demographics
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
              <div>
                <span className="text-slate-400 print:text-gray-600">Name: </span>
                <strong className="text-white print:text-black">{patient.name.split(' - ')[0]}</strong>
              </div>
              <div>
                <span className="text-slate-400 print:text-gray-600">Age / Sex: </span>
                <strong className="text-white print:text-black">{patient.age} yo / {patient.sex.toUpperCase()}</strong>
              </div>
              <div>
                <span className="text-slate-400 print:text-gray-600">Blood Pressure: </span>
                <strong className="text-white print:text-black">{patient.systolicBp}/{patient.diastolicBp} mmHg</strong>
              </div>
              <div>
                <span className="text-slate-400 print:text-gray-600">Heart Rate: </span>
                <strong className="text-white print:text-black">{patient.restingHeartRate} bpm</strong>
              </div>
              <div>
                <span className="text-slate-400 print:text-gray-600">Total Chol / LDL-C: </span>
                <strong className="text-white print:text-black">{patient.totalCholesterol} / {patient.ldlCholesterol} mg/dL</strong>
              </div>
              <div>
                <span className="text-slate-400 print:text-gray-600">Agatston CAC: </span>
                <strong className="text-white print:text-black">{patient.cacScore}</strong>
              </div>
              <div>
                <span className="text-slate-400 print:text-gray-600">LVEF Ejection Frac: </span>
                <strong className="text-white print:text-black">{patient.lvef}%</strong>
              </div>
              <div>
                <span className="text-slate-400 print:text-gray-600">Symptoms: </span>
                <strong className="text-white print:text-black capitalize">{patient.chestPain.replace('_', ' ')}</strong>
              </div>
            </div>
          </div>

          {/* Clinical Risk Summary Scores */}
          <div>
            <div className="text-xs font-bold text-white print:text-black uppercase tracking-wider mb-2">
              Quantitative Cardiovascular Risk Stratification
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-slate-800 print:border-gray-300 p-3 rounded-lg">
                <div className="text-[10px] text-slate-400 print:text-gray-600">AHA/ACC 10-Year ASCVD Risk</div>
                <div className="text-xl font-bold text-rose-400 print:text-red-700">
                  {riskAssessment.ascvd10YearRisk}% ({riskAssessment.ascvdRiskCategory.toUpperCase()})
                </div>
              </div>

              <div className="border border-slate-800 print:border-gray-300 p-3 rounded-lg">
                <div className="text-[10px] text-slate-400 print:text-gray-600">SCCT CAD-RADS 2.0</div>
                <div className="text-xl font-bold text-white print:text-black font-mono">
                  {riskAssessment.cadRadsGrade}
                </div>
              </div>

              <div className="border border-slate-800 print:border-gray-300 p-3 rounded-lg">
                <div className="text-[10px] text-slate-400 print:text-gray-600">Myocardial Ischemic Burden</div>
                <div className="text-xl font-bold text-amber-400 print:text-amber-700">
                  {riskAssessment.ischemicBurdenPercent}% of LV
                </div>
              </div>
            </div>
          </div>

          {/* Coronary Artery Anatomical Findings */}
          <div>
            <div className="text-xs font-bold text-white print:text-black uppercase tracking-wider mb-2">
              3D Coronary Artery Anatomical Lesion Map
            </div>
            <table className="w-full text-left border border-slate-800 print:border-gray-300 rounded-lg overflow-hidden text-[11px]">
              <thead className="bg-slate-950 print:bg-gray-100 text-slate-400 print:text-gray-700">
                <tr>
                  <th className="p-2.5">Artery Segment</th>
                  <th className="p-2.5">Territory</th>
                  <th className="p-2.5">Stenosis %</th>
                  <th className="p-2.5">Estimated FFR</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 print:divide-gray-200">
                <tr>
                  <td className="p-2.5 font-semibold text-white print:text-black">Left Anterior Descending (LAD)</td>
                  <td className="p-2.5">Anteroseptal / Apex</td>
                  <td className="p-2.5 font-mono">{patient.coronaryVessels.lad.stenosisPercent}%</td>
                  <td className="p-2.5 font-mono">{patient.coronaryVessels.lad.estimatedFfr}</td>
                  <td className="p-2.5">
                    {patient.coronaryVessels.lad.hasStent ? 'Stented (Patent)' : patient.coronaryVessels.lad.stenosisPercent >= 70 ? 'Obstructive Ischemia' : 'Patent'}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-white print:text-black">Left Circumflex (LCx)</td>
                  <td className="p-2.5">Posterolateral LV</td>
                  <td className="p-2.5 font-mono">{patient.coronaryVessels.lcx.stenosisPercent}%</td>
                  <td className="p-2.5 font-mono">{patient.coronaryVessels.lcx.estimatedFfr}</td>
                  <td className="p-2.5">
                    {patient.coronaryVessels.lcx.hasStent ? 'Stented (Patent)' : patient.coronaryVessels.lcx.stenosisPercent >= 70 ? 'Obstructive Ischemia' : 'Patent'}
                  </td>
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-white print:text-black">Right Coronary Artery (RCA)</td>
                  <td className="p-2.5">Inferior LV / RV</td>
                  <td className="p-2.5 font-mono">{patient.coronaryVessels.rca.stenosisPercent}%</td>
                  <td className="p-2.5 font-mono">{patient.coronaryVessels.rca.estimatedFfr}</td>
                  <td className="p-2.5">
                    {patient.coronaryVessels.rca.hasStent ? 'Stented (Patent)' : patient.coronaryVessels.rca.stenosisPercent >= 70 ? 'Obstructive Ischemia' : 'Patent'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Guideline Recommendations */}
          <div className="border-t border-slate-800 print:border-gray-300 pt-4">
            <div className="text-xs font-bold text-white print:text-black uppercase tracking-wider mb-1.5">
              Cardiology Treatment Plan & Clinical Recommendations
            </div>
            <p className="text-slate-300 print:text-gray-800 leading-relaxed text-[11px]">
              {riskAssessment.primaryRecommendation}
            </p>
          </div>

          {/* Signature Block */}
          <div className="pt-6 border-t border-slate-800 print:border-gray-300 flex justify-between items-end text-[10px] text-slate-500 print:text-gray-600">
            <div>
              Certified by AI Cardiovascular Analysis Model & AHA/ACC Quantitative Guidelines.
            </div>
            <div className="text-right">
              <div className="font-semibold text-slate-400 print:text-black">Cardiovascular Heart Team Review</div>
              <div>Digital Electronic Authentication</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
