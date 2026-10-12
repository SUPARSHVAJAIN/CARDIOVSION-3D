import React from 'react';
import { Heart, Activity, FileText, Sparkles, RotateCcw, Upload } from 'lucide-react';
import { PatientProfile } from '../types/cardiac';

interface HeaderProps {
  currentPatient: PatientProfile;
  activeTab: 'workbench' | 'dataset';
  onSelectTab: (tab: 'workbench' | 'dataset') => void;
  onOpenUniversalUpload: () => void;
  onOpenInterventions: () => void;
  onOpenExportReport: () => void;
  onResetPatient: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPatient,
  activeTab,
  onSelectTab,
  onOpenUniversalUpload,
  onOpenInterventions,
  onOpenExportReport,
  onResetPatient,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-rose-600 to-rose-400 rounded-xl shadow-lg shadow-rose-600/20 text-white">
            <Heart className="w-5 h-5 fill-white/20" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-white tracking-tight">
                CardioVision <span className="text-rose-500 font-extrabold">3D</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                Z-Alizadeh CAD
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Multimodal 3D Anatomical Human Model & Coronary Artery Disease Prediction
            </p>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => onSelectTab('workbench')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'workbench'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>3D Workbench</span>
          </button>

          <button
            onClick={() => onSelectTab('dataset')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'dataset'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span>Z-Alizadeh Sani Dataset</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Universal File Upload Button */}
          <button
            onClick={onOpenUniversalUpload}
            className="px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-sky-500/40 transition-colors"
            title="Upload Any Clinical File (CSV, PDF, Image, JSON, Text)"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Upload File</span>
            <span className="sm:hidden">Upload</span>
          </button>

          <button
            onClick={onResetPatient}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Reset Active Patient to Baseline"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenInterventions}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Intervention Lab</span>
            <span className="sm:hidden">Intervene</span>
          </button>

          <button
            onClick={onOpenExportReport}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-rose-600/30 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clinical Report</span>
            <span className="sm:hidden">Report</span>
          </button>
        </div>
      </div>
    </header>
  );
};
