import React, { useState } from 'react';
import { PatientProfile, AIAnalysisResult } from '../types/cardiac';
import { Sparkles, Brain, FileText, Upload, RefreshCw, CheckCircle, Shield, BookOpen, AlertCircle } from 'lucide-react';

interface AIConsultantPanelProps {
  patient: PatientProfile;
  onApplyExtractedPatient: (extracted: Partial<PatientProfile>) => void;
}

export const AIConsultantPanel: React.FC<AIConsultantPanelProps> = ({
  patient,
  onApplyExtractedPatient,
}) => {
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Multimodal file extraction state
  const [textNote, setTextNote] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [extractedFeedback, setExtractedFeedback] = useState<string | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);

  const fetchAIAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/clinical-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient }),
      });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to AI consultant service.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const runMultimodalExtraction = async () => {
    if (!textNote && !uploadedImagePreview) {
      setError('Please enter a clinical note or upload an ECG / CCTA scan.');
      return;
    }
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch('/api/multimodal-report-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          textNote: textNote,
          imageBase64: uploadedImagePreview,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExtractedFeedback(data.extractedSummary);
        if (data.suggestedUpdates) {
          const patch: Partial<PatientProfile> = {};
          if (data.suggestedUpdates.systolicBp) patch.systolicBp = data.suggestedUpdates.systolicBp;
          if (data.suggestedUpdates.ldlCholesterol) patch.ldlCholesterol = data.suggestedUpdates.ldlCholesterol;
          if (data.suggestedUpdates.totalCholesterol) patch.totalCholesterol = data.suggestedUpdates.totalCholesterol;
          if (data.suggestedUpdates.hsCrp) patch.hsCrp = data.suggestedUpdates.hsCrp;
          if (data.suggestedUpdates.cacScore) patch.cacScore = data.suggestedUpdates.cacScore;
          if (data.suggestedUpdates.chestPain) patch.chestPain = data.suggestedUpdates.chestPain;
          if (data.suggestedUpdates.ecgFinding) patch.ecgFinding = data.suggestedUpdates.ecgFinding;

          if (data.suggestedUpdates.ladStenosis) {
            patch.coronaryVessels = {
              ...patient.coronaryVessels,
              lad: {
                ...patient.coronaryVessels.lad,
                stenosisPercent: data.suggestedUpdates.ladStenosis,
                estimatedFfr: Math.max(0.42, Math.round((1.0 - Math.pow(data.suggestedUpdates.ladStenosis / 100, 2) * 0.65) * 100) / 100),
              },
            };
          }
          onApplyExtractedPatient(patch);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze multimodal document.');
    } finally {
      setExtracting(false);
    }
  };

  const loadSampleClinicalReport = () => {
    setTextNote(
      `CCTA & STRESS TESTING REPORT:
Patient: 61yo Male with progressive exertional angina.
Coronary CT Angiography:
- LM: Normal calibre, no plaque.
- LAD: Severe 82% proximal stenosis with low attenuation plaque (<30 HU) consistent with necrotic core and positive remodeling.
- LCx: 55% mid-vessel stenosis, calcified plaque.
- RCA: 40% non-obstructive fibrofatty plaque.
Agatston Calcium Score: 520 (Extensive).
Lipid Panel: Total Chol 242 mg/dL, LDL-C 168 mg/dL, HDL-C 42 mg/dL.
hs-CRP: 3.9 mg/L. SBP: 154 mmHg. ECG: 1.5mm ST-segment depression in V4-V6.`
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide flex items-center gap-2">
              <span>CardioVision AI Clinical Reasoning Copilot</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-medium">
                Gemini 3.8 Multimodal
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Correlates hemodynamic calculations, 3D anatomical coronary lesions, and ACC/AHA guidelines
            </p>
          </div>
        </div>

        <button
          onClick={fetchAIAnalysis}
          disabled={loading}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-md shadow-sky-600/30 transition-all"
        >
          {loading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          <span>{analysis ? 'Regenerate Clinical Assessment' : 'Generate Full AI Consultation'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* AI Reasoning Output */}
      {analysis && (
        <div className="space-y-4 animate-fade-in text-xs">
          {/* Executive Summary */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
            <div className="font-semibold text-sky-300 mb-1 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-sky-400" />
              <span>Cardiology Executive Summary</span>
            </div>
            <p className="text-slate-200 leading-relaxed">{analysis.executiveSummary}</p>
          </div>

          {/* Anatomic Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {analysis.anatomicRiskBreakdown.map((item, idx) => (
              <div key={idx} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="font-semibold text-rose-400 block mb-1">{item.vessel}</span>
                <p className="text-slate-300 mb-2 leading-tight">{item.clinicalConcern}</p>
                <div className="text-[11px] text-slate-500 border-t border-slate-800 pt-1.5">
                  <strong className="text-slate-400">Hemodynamics:</strong> {item.hemodynamicImpact}
                </div>
              </div>
            ))}
          </div>

          {/* Pharmacotherapy & Interventions */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <span className="font-semibold text-emerald-400 block mb-2">
              Guideline-Directed Medical Recommendations
            </span>
            <div className="space-y-2">
              {analysis.lifestyleAndPharmacotherapy.map((rx, idx) => (
                <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-1 p-2 bg-slate-900 rounded-lg border border-slate-800/80">
                  <div>
                    <span className="font-medium text-white">{rx.category}: </span>
                    <span className="text-slate-300">{rx.action}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 self-start md:self-auto font-mono">
                    {rx.evidenceGrade}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Guidelines Citations */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-medium text-slate-400">Grounded in:</span>
            {analysis.guidelineCitations.map((cite, idx) => (
              <span key={idx} className="text-slate-300">
                {cite}{idx < analysis.guidelineCitations.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Multimodal Report / ECG Analysis Section */}
      <div className="pt-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <FileText className="w-4 h-4 text-rose-400" />
            <span>Multimodal Input: Interpret ECG / Angiography / Clinical Notes</span>
          </div>
          <button
            onClick={loadSampleClinicalReport}
            className="text-[11px] text-sky-400 hover:text-sky-300 underline transition-colors"
          >
            Load Sample CCTA & Stress Report
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <textarea
              rows={4}
              value={textNote}
              onChange={(e) => setTextNote(e.target.value)}
              placeholder="Paste physician progress notes, CCTA coronary angiography report, or stress test results here..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex flex-col justify-between bg-slate-950 border border-slate-800 border-dashed rounded-lg p-3">
            <div className="flex items-center justify-center flex-1 flex-col gap-2">
              {uploadedImagePreview ? (
                <div className="relative max-h-24 overflow-hidden rounded">
                  <img src={uploadedImagePreview} alt="Uploaded scan" className="object-cover max-h-24 rounded" />
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-slate-500" />
                  <span className="text-xs text-slate-400 text-center">
                    Upload ECG Rhythm Strip or CCTA DICOM Image
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                id="file-upload"
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition-colors"
              >
                Choose File
              </label>

              <button
                onClick={runMultimodalExtraction}
                disabled={extracting}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-[11px] font-semibold rounded flex items-center gap-1.5 shadow-sm transition-colors"
              >
                {extracting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>Extract & Update Model</span>
              </button>
            </div>
          </div>
        </div>

        {extractedFeedback && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs text-emerald-300 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-200">Multimodal Parameters Extracted:</span>
              <p className="mt-0.5 text-emerald-300/90 text-[11px]">{extractedFeedback}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
