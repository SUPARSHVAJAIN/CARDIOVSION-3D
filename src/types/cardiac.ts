export type BiologicalSex = 'male' | 'female';
export type RaceEthnicity = 'white' | 'african_american' | 'hispanic' | 'asian' | 'other';
export type ChestPainType = 'typical_angina' | 'atypical_angina' | 'non_anginal' | 'asymptomatic';
export type ECGFinding = 'normal' | 'st_depression' | 'st_elevation' | 't_wave_inversion' | 'pathological_q_waves' | 'lbbb';
export type PlaqueType = 'fibrous' | 'fibrofatty' | 'calcified' | 'necrotic_core_vulnerable';

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  sex: BiologicalSex;
  race: RaceEthnicity;
  bmi: number;
  systolicBp: number;
  diastolicBp: number;
  restingHeartRate: number;
  treatedHypertension: boolean;
  smoker: boolean;
  packYears: number;
  diabetic: boolean;
  familyHistoryCad: boolean;

  // Lipid Panel (mg/dL)
  totalCholesterol: number;
  ldlCholesterol: number;
  hdlCholesterol: number;
  triglycerides: number;
  lpa: number; // Lipoprotein(a) in nmol/L

  // Metabolic & Renal
  fastingGlucose: number; // mg/dL
  hba1c: number; // %
  egfr: number; // mL/min/1.73m2

  // Cardiac Biomarkers
  hsCrp: number; // mg/L (<1 low, 1-3 average, >3 high)
  troponinI: number; // ng/mL (<0.04 normal)
  ntProBnp: number; // pg/mL (<125 normal)

  // Imaging & Functional
  cacScore: number; // Agatston score
  lvef: number; // % Left Ventricular Ejection Fraction (55-70% normal)
  chestPain: ChestPainType;
  ecgFinding: ECGFinding;

  // Coronary Lesion Profiles
  coronaryVessels: CoronaryVesselsState;

  // Clinical Summary Narrative
  clinicalHistory: string;
}

export interface VesselSegment {
  id: string;
  name: string;
  acronym: string;
  territory: string;
  stenosisPercent: number; // 0 - 100
  plaqueType: PlaqueType;
  calciumDeposit: number; // 0 - 100 relative
  estimatedFfr: number; // 0.40 - 1.00
  hasStent: boolean;
  vulnerableFeatures: {
    thinCapFibroatheroma: boolean;
    spottyCalcification: boolean;
    positiveRemodeling: boolean;
  };
}

export interface CoronaryVesselsState {
  lad: VesselSegment; // Left Anterior Descending
  lcx: VesselSegment; // Left Circumflex
  rca: VesselSegment; // Right Coronary Artery
  lm: VesselSegment;  // Left Main
}

export interface MyocardialZone {
  id: string;
  name: string;
  artery: 'lad' | 'lcx' | 'rca';
  perfusionScore: number; // 0.0 (severely ischemic/infarcted) to 1.0 (fully perfused)
  status: 'normal' | 'mild_ischemia' | 'moderate_ischemia' | 'severe_ischemia' | 'infarction';
}

export interface RiskAssessment {
  ascvd10YearRisk: number; // %
  ascvdRiskCategory: 'low' | 'borderline' | 'intermediate' | 'high';
  framingham10YearRisk: number; // %
  score2Risk: number; // %
  cadRadsGrade: string; // e.g. "CAD-RADS 4A / V"
  cadRadsDescription: string;
  lifetimeRisk: number; // %
  ischemicBurdenPercent: number; // % of left ventricular myocardium ischemic
  syntaxScoreEstimate: number; // Estimated coronary complexity
  diamondForresterPretest: number; // % pretest probability of CAD
  primaryRecommendation: string;
}

export interface InterventionPlan {
  statinIntensity: 'none' | 'moderate' | 'high';
  addEzetimibe: boolean;
  addPcsk9i: boolean;
  addSglt2i: boolean;
  antiplatelet: 'none' | 'aspirin' | 'dapt';
  bpControlOptimized: boolean;
  cessationSmoking: boolean;
  weightLossKg: number;
  revascularizationTarget: 'none' | 'lad_stent' | 'lcx_stent' | 'rca_stent' | 'multi_vessel_pci' | 'cabg';
}

export interface AIAnalysisResult {
  executiveSummary: string;
  pathophysiologicalMechanisms: string[];
  anatomicRiskBreakdown: {
    vessel: string;
    clinicalConcern: string;
    hemodynamicImpact: string;
  }[];
  lifestyleAndPharmacotherapy: {
    category: string;
    action: string;
    evidenceGrade: string;
  }[];
  guidelineCitations: string[];
  prognosticOutlook5Year: string;
}
