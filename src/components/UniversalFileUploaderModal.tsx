import React, { useState, useRef } from 'react';
import { PatientProfile } from '../types/cardiac';
import { parseDelimitedText, mapRowToPatientProfile, ParsedTableData } from '../services/fileParser';
import {
  Upload,
  FileText,
  Table,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Database,
  Activity,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface UniversalFileUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPatient: (patient: PatientProfile) => void;
  onPatchPatient: (patch: Partial<PatientProfile>) => void;
  currentPatient: PatientProfile;
}

export const UniversalFileUploaderModal: React.FC<UniversalFileUploaderModalProps> = ({
  isOpen,
  onClose,
  onApplyPatient,
  onPatchPatient,
  currentPatient,
}) => {
  if (!isOpen) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileTypeCategory, setFileTypeCategory] = useState<'tabular' | 'document' | 'image' | 'json' | 'other' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tabular state (CSV, TSV, TXT table)
  const [parsedTable, setParsedTable] = useState<ParsedTableData | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number>(0);

  // Document / Image multimodal state (PDF, PNG, JPG)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string>('');
  const [extractedSummary, setExtractedSummary] = useState<string | null>(null);
  const [extractedUpdates, setExtractedUpdates] = useState<any>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (uploadedFile: File) => {
    setFile(uploadedFile);
    setError(null);
    setParsedTable(null);
    setPreviewUrl(null);
    setExtractedSummary(null);
    setExtractedUpdates(null);
    setTextContent('');

    const fileName = uploadedFile.name.toLowerCase();
    const mime = uploadedFile.type || '';

    // 1. Tabular Files: CSV, TSV, TXT spreadsheet
    if (fileName.endsWith('.csv') || fileName.endsWith('.tsv') || mime.includes('csv') || fileName.endsWith('.dat')) {
      setFileTypeCategory('tabular');
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) || '';
        setTextContent(text);
        const parsed = parseDelimitedText(text);
        if (parsed.rows.length === 0) {
          setError('No valid rows found in the tabular file.');
        } else {
          setParsedTable(parsed);
          setSelectedRowIndex(0);
        }
      };
      reader.readAsText(uploadedFile);
      return;
    }

    // 2. JSON Files
    if (fileName.endsWith('.json') || mime.includes('json')) {
      setFileTypeCategory('json');
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = (e.target?.result as string) || '';
          setTextContent(raw);
          const data = JSON.parse(raw);
          if (Array.isArray(data)) {
            // Table of objects
            const headers = Object.keys(data[0] || {});
            setParsedTable({ headers, rows: data, totalRows: data.length });
            setSelectedRowIndex(0);
            setFileTypeCategory('tabular');
          } else {
            // Single patient object
            setParsedTable({
              headers: Object.keys(data),
              rows: [data],
              totalRows: 1,
            });
            setSelectedRowIndex(0);
            setFileTypeCategory('tabular');
          }
        } catch {
          setError('Could not parse JSON format. Please verify file syntax.');
        }
      };
      reader.readAsText(uploadedFile);
      return;
    }

    // 3. Images: PNG, JPG, JPEG, WEBP, GIF, SVG
    if (mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(fileName)) {
      setFileTypeCategory('image');
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(uploadedFile);
      return;
    }

    // 4. PDF Documents
    if (mime === 'application/pdf' || fileName.endsWith('.pdf')) {
      setFileTypeCategory('document');
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(uploadedFile);
      return;
    }

    // 5. Plain Text / Notes / Medical Logs
    setFileTypeCategory('other');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      setTextContent(text);
      // Attempt delimited parse
      if (text.includes(',') || text.includes('\t')) {
        const parsed = parseDelimitedText(text);
        if (parsed.rows.length > 1) {
          setParsedTable(parsed);
          setFileTypeCategory('tabular');
        }
      }
    };
    reader.readAsText(uploadedFile);
  };

  // Run AI Multimodal Extraction on Document/Image/Text
  const runAIExtraction = async () => {
    if (!file && !textContent) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/multimodal-report-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file?.name || 'Uploaded File',
          mimeType: file?.type || 'application/pdf',
          fileBase64: previewUrl,
          textNote: textContent,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setExtractedSummary(data.extractedSummary);
        setExtractedUpdates(data.suggestedUpdates);
      } else {
        throw new Error(data.error || 'Failed to extract biomarkers');
      }
    } catch (err: any) {
      setError(err.message || 'Error processing multimodal file');
    } finally {
      setLoading(false);
    }
  };

  // Load a chosen patient row from a CSV / Table into the 3D model
  const handleImportTableRow = (rowIdx: number) => {
    if (!parsedTable || !parsedTable.rows[rowIdx]) return;
    const row = parsedTable.rows[rowIdx];
    const newProfile = mapRowToPatientProfile(row, rowIdx, file?.name || 'Dataset Table');
    onApplyPatient(newProfile);
    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
    } catch {}
    onClose();
  };

  // Apply AI multimodal extracted findings to current active patient
  const handleApplyExtractedToModel = () => {
    if (!extractedUpdates) return;
    const patch: Partial<PatientProfile> = {};
    if (extractedUpdates.systolicBp) patch.systolicBp = extractedUpdates.systolicBp;
    if (extractedUpdates.diastolicBp) patch.diastolicBp = extractedUpdates.diastolicBp;
    if (extractedUpdates.totalCholesterol) patch.totalCholesterol = extractedUpdates.totalCholesterol;
    if (extractedUpdates.ldlCholesterol) patch.ldlCholesterol = extractedUpdates.ldlCholesterol;
    if (extractedUpdates.hdlCholesterol) patch.hdlCholesterol = extractedUpdates.hdlCholesterol;
    if (extractedUpdates.hsCrp) patch.hsCrp = extractedUpdates.hsCrp;
    if (extractedUpdates.cacScore) patch.cacScore = extractedUpdates.cacScore;
    if (extractedUpdates.lvef) patch.lvef = extractedUpdates.lvef;
    if (extractedUpdates.chestPain) patch.chestPain = extractedUpdates.chestPain;
    if (extractedUpdates.ecgFinding) patch.ecgFinding = extractedUpdates.ecgFinding;

    if (extractedUpdates.ladStenosis !== undefined && extractedUpdates.ladStenosis !== null) {
      patch.coronaryVessels = {
        ...currentPatient.coronaryVessels,
        lad: {
          ...currentPatient.coronaryVessels.lad,
          stenosisPercent: extractedUpdates.ladStenosis,
          estimatedFfr: Math.max(0.42, Math.round((1.0 - Math.pow(extractedUpdates.ladStenosis / 100, 2) * 0.65) * 100) / 100),
        },
      };
    }
    if (extractedUpdates.lcxStenosis !== undefined && extractedUpdates.lcxStenosis !== null) {
      patch.coronaryVessels = {
        ...(patch.coronaryVessels || currentPatient.coronaryVessels),
        lcx: {
          ...currentPatient.coronaryVessels.lcx,
          stenosisPercent: extractedUpdates.lcxStenosis,
          estimatedFfr: Math.max(0.42, Math.round((1.0 - Math.pow(extractedUpdates.lcxStenosis / 100, 2) * 0.65) * 100) / 100),
        },
      };
    }
    if (extractedUpdates.rcaStenosis !== undefined && extractedUpdates.rcaStenosis !== null) {
      patch.coronaryVessels = {
        ...(patch.coronaryVessels || currentPatient.coronaryVessels),
        rca: {
          ...currentPatient.coronaryVessels.rca,
          stenosisPercent: extractedUpdates.rcaStenosis,
          estimatedFfr: Math.max(0.42, Math.round((1.0 - Math.pow(extractedUpdates.rcaStenosis / 100, 2) * 0.65) * 100) / 100),
        },
      };
    }

    onPatchPatient(patch);
    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
    } catch {}
    onClose();
  };

  // Sample quick file presets for instant 1-click test
  const loadQuickSample = (type: 'csv' | 'report' | 'ecg' | 'json') => {
    if (type === 'csv') {
      const sampleCsv = `Age,Sex,BP,Chol,LDL,HDL,FBS,EF,LAD,LCX,RCA,Cath
58,Male,154,248,168,38,142,50,Stenotic,Normal,Stenotic,CAD
64,Female,148,224,144,42,158,54,Normal,Stenotic,Normal,CAD
42,Male,136,310,232,41,94,62,Normal,Normal,Stenotic,CAD
72,Male,162,215,135,34,164,36,Stenotic,Stenotic,Stenotic,CAD
34,Female,112,165,88,62,82,65,Normal,Normal,Normal,Normal`;
      const blob = new File([sampleCsv], 'cardiac_cohort_sample.csv', { type: 'text/csv' });
      processSelectedFile(blob);
    } else if (type === 'report') {
      const sampleNote = `CARDIOLOGY CCTA & ANGIOGRAPHY CONSULTATION
Patient: 63-year-old male with progressive exertional angina
Computed Tomography Coronary Angiography (CCTA):
- Left Main: Mild 20% wall thickening.
- LAD: Severe 82% proximal stenosis with thin-cap fibroatheroma (TCFA) features and spotty calcification.
- LCX: Moderate 55% mid-vessel lesion.
- RCA: Mild 35% non-obstructive plaque.
Agatston Calcium Score: 485.
Vitals: SBP 154 mmHg, DBP 92 mmHg, Pulse 76 bpm.
Lipids: Total Cholesterol 246 mg/dL, LDL-C 165 mg/dL, HDL-C 40 mg/dL.
hs-CRP: 4.1 mg/L, HbA1c: 7.4%.
Echocardiogram: LVEF 52% with anteroseptal hypokinesis.`;
      const blob = new File([sampleNote], 'ccta_angiography_summary.txt', { type: 'text/plain' });
      processSelectedFile(blob);
    } else if (type === 'json') {
      const sampleJson = JSON.stringify({
        age: 61,
        sex: 'male',
        systolicBp: 156,
        diastolicBp: 94,
        totalCholesterol: 255,
        ldlCholesterol: 175,
        hdlCholesterol: 39,
        cacScore: 610,
        lvef: 48,
        ladStenosis: 85,
        lcxStenosis: 60,
        rcaStenosis: 40,
        chestPain: 'typical_angina',
        ecgFinding: 'st_depression'
      }, null, 2);
      const blob = new File([sampleJson], 'patient_record.json', { type: 'application/json' });
      processSelectedFile(blob);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/10 rounded-lg border border-rose-500/20 text-rose-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Universal File Ingestion & Multimodal Analyzer
              </h2>
              <p className="text-xs text-slate-400">
                Upload ANY clinical file format: CSV, Excel/TSV, PDF Reports, DICOM/Images, JSON, or EHR Clinical Notes
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

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Drag & Drop Universal Dropzone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-rose-500 bg-rose-500/10 scale-[1.01]'
                : 'border-slate-700 bg-slate-950/60 hover:border-slate-600 hover:bg-slate-950'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="p-3 bg-slate-900 rounded-full border border-slate-700 mb-3 text-rose-500 shadow-md">
              <Upload className="w-6 h-6 animate-bounce" />
            </div>
            <h3 className="text-sm font-semibold text-white">
              {file ? file.name : 'Drop any file here, or click to browse'}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Accepts spreadsheets (.csv, .tsv), PDF medical records, clinical image scans (.png, .jpg), patient JSON, or raw text progress notes.
            </p>
            {file && (
              <div className="mt-3 flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{(file.size / 1024).toFixed(1)} KB · {file.type || 'Universal Document'}</span>
              </div>
            )}
          </div>

          {/* Quick Preset Buttons for Instant Test */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Quick Test Presets:</span>
            <button
              onClick={() => loadQuickSample('csv')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Patient CSV</span>
            </button>
            <button
              onClick={() => loadQuickSample('report')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>CCTA Angiography Report</span>
            </button>
            <button
              onClick={() => loadQuickSample('json')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <FileCode className="w-3.5 h-3.5 text-amber-400" />
              <span>Patient JSON</span>
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TABULAR VIEW: CSV / TSV / JSON Table Viewer */}
          {parsedTable && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Table className="w-4 h-4 text-emerald-400" />
                  <span>Parsed Dataset: {parsedTable.totalRows} Patient Records Found</span>
                </div>
                <span className="text-[11px] text-slate-400">Click a patient row to load into 3D heart</span>
              </div>

              {/* Data Table Preview */}
              <div className="max-h-64 overflow-x-auto overflow-y-auto border border-slate-800 rounded-lg text-xs">
                <table className="w-full text-left divide-y divide-slate-800">
                  <thead className="bg-slate-900 text-slate-400 sticky top-0">
                    <tr>
                      <th className="p-2.5 text-[11px]">#</th>
                      {parsedTable.headers.slice(0, 8).map((h, idx) => (
                        <th key={idx} className="p-2.5 text-[11px] font-semibold whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                      <th className="p-2.5 text-[11px] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300">
                    {parsedTable.rows.map((row, idx) => {
                      const isSelected = selectedRowIndex === idx;
                      return (
                        <tr
                          key={idx}
                          onClick={() => setSelectedRowIndex(idx)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-rose-500/10 text-white' : 'hover:bg-slate-900/60'
                          }`}
                        >
                          <td className="p-2.5 font-mono text-[11px] text-slate-500">{idx + 1}</td>
                          {parsedTable.headers.slice(0, 8).map((h, colIdx) => (
                            <td key={colIdx} className="p-2.5 whitespace-nowrap font-mono text-[11px]">
                              {String(row[h] !== undefined ? row[h] : '')}
                            </td>
                          ))}
                          <td className="p-2.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleImportTableRow(idx);
                              }}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold rounded shadow-sm transition-all"
                            >
                              Load 3D
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MULTIMODAL VIEW: PDF Document / Image / Medical Text Analysis */}
          {(fileTypeCategory === 'document' || fileTypeCategory === 'image' || fileTypeCategory === 'other') && (
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  {fileTypeCategory === 'image' ? (
                    <ImageIcon className="w-4 h-4 text-sky-400" />
                  ) : (
                    <FileText className="w-4 h-4 text-rose-400" />
                  )}
                  <span>Multimodal AI Document Analysis: {file?.name || 'Uploaded File'}</span>
                </div>

                <button
                  onClick={runAIExtraction}
                  disabled={loading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-md shadow-sky-600/30 transition-all"
                >
                  {loading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Extract Cardiovascular Biomarkers</span>
                </button>
              </div>

              {/* Preview Box */}
              {previewUrl && fileTypeCategory === 'image' && (
                <div className="max-h-48 overflow-hidden rounded-lg border border-slate-800 flex justify-center bg-black/40 p-2">
                  <img src={previewUrl} alt="Preview" className="max-h-44 object-contain rounded" />
                </div>
              )}

              {previewUrl && fileTypeCategory === 'document' && (
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-center gap-3">
                  <FileText className="w-6 h-6 text-rose-500 shrink-0" />
                  <div>
                    <span className="font-semibold text-white">{file?.name}</span>
                    <p className="text-[11px] text-slate-400">
                      PDF Document parsed ready for multimodal visual & textual clinical reasoning.
                    </p>
                  </div>
                </div>
              )}

              {textContent && (
                <div className="max-h-36 overflow-y-auto bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {textContent}
                </div>
              )}

              {/* Extracted Biomarkers Feedback */}
              {extractedSummary && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-3">
                  <div className="flex items-start gap-2.5 text-xs text-emerald-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-emerald-200">Extracted Findings:</span>
                      <p className="mt-0.5 text-emerald-300/90 text-xs leading-relaxed">{extractedSummary}</p>
                    </div>
                  </div>

                  {extractedUpdates && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-500/20 text-xs">
                      {extractedUpdates.systolicBp && (
                        <div className="bg-slate-900 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Blood Pressure</span>
                          <span className="font-bold text-white">{extractedUpdates.systolicBp} mmHg</span>
                        </div>
                      )}
                      {extractedUpdates.ldlCholesterol && (
                        <div className="bg-slate-900 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">LDL Cholesterol</span>
                          <span className="font-bold text-rose-400">{extractedUpdates.ldlCholesterol} mg/dL</span>
                        </div>
                      )}
                      {extractedUpdates.ladStenosis && (
                        <div className="bg-slate-900 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">LAD Stenosis</span>
                          <span className="font-bold text-rose-400">{extractedUpdates.ladStenosis}%</span>
                        </div>
                      )}
                      {extractedUpdates.cacScore && (
                        <div className="bg-slate-900 p-2 rounded border border-slate-800">
                          <span className="text-[10px] text-slate-400 block">Agatston CAC</span>
                          <span className="font-bold text-white">{extractedUpdates.cacScore}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={handleApplyExtractedToModel}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all hover:scale-[1.02]"
                    >
                      <span>Apply to 3D Anatomical Heart</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-850 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>CardioVision 3D Universal Ingestion Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
