import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { PatientSelector } from './components/PatientSelector';
import { ThreeCanvas } from './components/ThreeCanvas';
import { RiskDashboard } from './components/RiskDashboard';
import { ClinicalDataForm } from './components/ClinicalDataForm';
import { AIConsultantPanel } from './components/AIConsultantPanel';
import { ZAlizadehSaniExplorer } from './components/ZAlizadehSaniExplorer';
import { UniversalFileUploaderModal } from './components/UniversalFileUploaderModal';
import { VesselCrossSectionModal } from './components/VesselCrossSectionModal';
import { InterventionSimulator } from './components/InterventionSimulator';
import { ExportReportModal } from './components/ExportReportModal';
import { PATIENT_COHORTS } from './data/patientCohorts';
import { PatientProfile, VesselSegment } from './types/cardiac';
import { computeCompleteRiskAssessment } from './services/clinicalCalculators';

export default function App() {
  // Navigation tab: 'workbench' vs 'dataset'
  const [activeTab, setActiveTab] = useState<'workbench' | 'dataset'>('workbench');

  // Current patient state (starts with Marcus Vance - 58M severe LAD lesion)
  const [patient, setPatient] = useState<PatientProfile>(() => {
    return JSON.parse(JSON.stringify(PATIENT_COHORTS[0]));
  });

  // Modal states
  const [selectedVessel, setSelectedVessel] = useState<VesselSegment | null>(null);
  const [isInterventionsOpen, setIsInterventionsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Compute live real-time cardiovascular risk metrics
  const riskAssessment = useMemo(() => {
    return computeCompleteRiskAssessment(patient);
  }, [patient]);

  // Handlers
  const handleSelectCohort = (cohort: PatientProfile) => {
    setPatient(JSON.parse(JSON.stringify(cohort)));
    setSelectedVessel(null);
  };

  const handleLoadZAlizadehPatient = (datasetPatient: PatientProfile) => {
    setPatient(datasetPatient);
    setSelectedVessel(null);
    setActiveTab('workbench'); // Switch to 3D workbench so the user sees the 3D heart mapped immediately
  };

  const handleResetCurrentPatient = () => {
    const original = PATIENT_COHORTS.find((p) => p.id === patient.id) || PATIENT_COHORTS[0];
    setPatient(JSON.parse(JSON.stringify(original)));
    setSelectedVessel(null);
  };

  const handleUpdatePatient = (updated: PatientProfile) => {
    setPatient(updated);
  };

  const handlePatchPatient = (patch: Partial<PatientProfile>) => {
    setPatient((prev) => ({ ...prev, ...patch }));
  };

  const handleUpdateVessel = (updatedVessel: VesselSegment) => {
    const vesselKey = updatedVessel.id as 'lad' | 'lcx' | 'rca' | 'lm';
    if (vesselKey && patient.coronaryVessels[vesselKey]) {
      setPatient((prev) => ({
        ...prev,
        coronaryVessels: {
          ...prev.coronaryVessels,
          [vesselKey]: updatedVessel,
        },
      }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* Top Professional Header */}
      <Header
        currentPatient={patient}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenUniversalUpload={() => setIsUploadModalOpen(true)}
        onOpenInterventions={() => setIsInterventionsOpen(true)}
        onOpenExportReport={() => setIsReportOpen(true)}
        onResetPatient={handleResetCurrentPatient}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === 'dataset' ? (
          /* Z-Alizadeh Sani Dataset Exploration View */
          <div className="space-y-6 animate-fade-in">
            <ZAlizadehSaniExplorer
              activePatientId={patient.id}
              onLoadPatientIntoModel={handleLoadZAlizadehPatient}
            />
          </div>
        ) : (
          /* 3D Anatomical Workbench View */
          <div className="space-y-6 animate-fade-in">
            {/* Active Patient Indicator Banner with Dataset & Upload Links */}
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-slate-400">Active Anatomical Subject:</span>
                <strong className="text-white font-semibold">{patient.name}</strong>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="text-sky-400 hover:text-sky-300 font-medium underline flex items-center gap-1 transition-colors"
                >
                  <span>Upload Any Medical File (CSV/PDF/Image)</span>
                </button>
                <span className="text-slate-600">·</span>
                <button
                  onClick={() => setActiveTab('dataset')}
                  className="text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1 transition-colors"
                >
                  <span>Z-Alizadeh Sani Cohort</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </div>

            {/* Patient Personas Switcher */}
            <PatientSelector
              currentPatientId={patient.id}
              onSelectPatient={handleSelectCohort}
            />

            {/* 2-Column Split: 3D Anatomical Heart & Visualizer + Clinical Input & AI Reasoning */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: 3D Visualization & Quantitative Risk Gauges (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* 3D Anatomical Heart Viewport */}
                <div className="h-[520px] w-full">
                  <ThreeCanvas
                    patient={patient}
                    selectedVessel={selectedVessel}
                    onSelectVessel={(vessel) => setSelectedVessel(vessel)}
                  />
                </div>

                {/* Comprehensive Quantitative Risk Dashboard */}
                <RiskDashboard
                  patient={patient}
                  riskAssessment={riskAssessment}
                  onOpenIntervention={() => setIsInterventionsOpen(true)}
                />
              </div>

              {/* Right Column: Clinical Parameter Modifiers & AI Copilot (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Clinical Parameter Tabs */}
                <ClinicalDataForm
                  patient={patient}
                  onUpdatePatient={handleUpdatePatient}
                />

                {/* AI Clinical Reasoning & Multimodal Report Extractor */}
                <AIConsultantPanel
                  patient={patient}
                  onApplyExtractedPatient={handlePatchPatient}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>
          CardioVision 3D · Multimodal AI Cardiovascular Risk Visualization System
        </p>
        <p className="mt-1 text-[11px] text-slate-600">
          Grounded in ACC/AHA ASCVD Pooled Cohort Equations, SCCT CAD-RADS 2.0 & Three.js Anatomical Modeling.
        </p>
      </footer>

      {/* Modal: Virtual IVUS & Angiography Cross Section */}
      {selectedVessel && (
        <VesselCrossSectionModal
          vessel={selectedVessel}
          onClose={() => setSelectedVessel(null)}
          onUpdateVessel={handleUpdateVessel}
        />
      )}

      {/* Modal: Intervention & Stent Simulator */}
      <InterventionSimulator
        patient={patient}
        isOpen={isInterventionsOpen}
        onClose={() => setIsInterventionsOpen(false)}
        onApplyPlanToPatient={handleUpdatePatient}
      />

      {/* Modal: Printable Clinical Consultation Report */}
      <ExportReportModal
        patient={patient}
        riskAssessment={riskAssessment}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />

      {/* Modal: Universal File Ingestion (Any file format) */}
      <UniversalFileUploaderModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onApplyPatient={(newProfile) => {
          setPatient(newProfile);
          setActiveTab('workbench');
        }}
        onPatchPatient={handlePatchPatient}
        currentPatient={patient}
      />
    </div>
  );
}
