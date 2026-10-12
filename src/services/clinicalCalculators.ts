import { PatientProfile, RiskAssessment, InterventionPlan } from '../types/cardiac';

/**
 * ACC/AHA Pooled Cohort Equations for 10-Year ASCVD Risk
 * Reference: Goff DC Jr, et al. 2013 ACC/AHA Guideline on the Assessment of Cardiovascular Risk.
 */
export function calculateAscvdRisk(patient: PatientProfile): number {
  const age = Math.min(79, Math.max(40, patient.age));
  const totChol = Math.max(130, Math.min(320, patient.totalCholesterol));
  const hdl = Math.max(20, Math.min(100, patient.hdlCholesterol));
  const sbp = Math.max(90, Math.min(200, patient.systolicBp));
  const treated = patient.treatedHypertension ? 1 : 0;
  const smoker = patient.smoker ? 1 : 0;
  const diabetic = patient.diabetic ? 1 : 0;

  const lnAge = Math.log(age);
  const lnTotChol = Math.log(totChol);
  const lnHdl = Math.log(hdl);
  const lnSbp = Math.log(sbp);

  let indSum = 0;
  let s10 = 0.9665;
  let meanX = -29.18;

  if (patient.sex === 'female') {
    if (patient.race === 'african_american') {
      // African American Female
      indSum =
        17.114 * lnAge +
        0.940 * lnTotChol +
        -18.920 * lnHdl +
        4.475 * (lnAge * lnHdl) +
        (treated ? 29.291 * lnSbp - 6.432 * (lnAge * lnSbp) : 27.820 * lnSbp - 6.087 * (lnAge * lnSbp)) +
        0.691 * smoker +
        0.874 * diabetic;
      s10 = 0.9533;
      meanX = 86.61;
    } else {
      // White / Other Female
      indSum =
        -29.799 * lnAge +
        4.884 * (lnAge * lnAge) +
        13.540 * lnTotChol +
        -3.114 * (lnAge * lnTotChol) +
        -13.578 * lnHdl +
        3.149 * (lnAge * lnHdl) +
        (treated ? 2.019 * lnSbp : 1.957 * lnSbp) +
        7.574 * smoker +
        -1.665 * (lnAge * smoker) +
        0.661 * diabetic;
      s10 = 0.9665;
      meanX = -29.18;
    }
  } else {
    // Male
    if (patient.race === 'african_american') {
      // African American Male
      indSum =
        2.469 * lnAge +
        0.302 * lnTotChol +
        -0.307 * lnHdl +
        (treated ? 1.916 * lnSbp : 1.809 * lnSbp) +
        0.549 * smoker +
        0.645 * diabetic;
      s10 = 0.8954;
      meanX = 19.54;
    } else {
      // White / Other Male
      indSum =
        12.344 * lnAge +
        11.853 * lnTotChol +
        -2.664 * (lnAge * lnTotChol) +
        -7.990 * lnHdl +
        1.769 * (lnAge * lnHdl) +
        (treated ? 1.797 * lnSbp : 1.764 * lnSbp) +
        7.837 * smoker +
        -1.795 * (lnAge * smoker) +
        0.658 * diabetic;
      s10 = 0.9144;
      meanX = 61.18;
    }
  }

  // Risk = 1 - S10^(exp(indSum - meanX))
  const exponent = Math.exp(indSum - meanX);
  const rawRisk = (1 - Math.pow(s10, exponent)) * 100;
  return Math.min(85, Math.max(1, Math.round(rawRisk * 10) / 10));
}

/**
 * Framingham 10-Year Hard CHD risk calculation approximation
 */
export function calculateFraminghamRisk(patient: PatientProfile): number {
  let score = 0;
  if (patient.sex === 'male') {
    if (patient.age < 35) score += -9;
    else if (patient.age < 40) score += -4;
    else if (patient.age < 45) score += 0;
    else if (patient.age < 50) score += 3;
    else if (patient.age < 55) score += 6;
    else if (patient.age < 60) score += 8;
    else if (patient.age < 65) score += 10;
    else if (patient.age < 70) score += 11;
    else score += 12;

    if (patient.totalCholesterol >= 280) score += 9;
    else if (patient.totalCholesterol >= 240) score += 7;
    else if (patient.totalCholesterol >= 200) score += 5;
    else if (patient.totalCholesterol >= 160) score += 3;

    if (patient.smoker) score += 8;
    if (patient.hdlCholesterol < 35) score += 2;
    else if (patient.hdlCholesterol >= 60) score -= 1;

    if (patient.systolicBp >= 160) score += patient.treatedHypertension ? 3 : 2;
    else if (patient.systolicBp >= 140) score += patient.treatedHypertension ? 2 : 1;
    else if (patient.systolicBp >= 130) score += 1;
  } else {
    // Female
    if (patient.age < 35) score += -7;
    else if (patient.age < 40) score += -3;
    else if (patient.age < 45) score += 0;
    else if (patient.age < 50) score += 3;
    else if (patient.age < 55) score += 6;
    else if (patient.age < 60) score += 8;
    else if (patient.age < 65) score += 10;
    else if (patient.age < 70) score += 12;
    else score += 14;

    if (patient.totalCholesterol >= 280) score += 11;
    else if (patient.totalCholesterol >= 240) score += 8;
    else if (patient.totalCholesterol >= 200) score += 5;
    else if (patient.totalCholesterol >= 160) score += 2;

    if (patient.smoker) score += 9;
    if (patient.hdlCholesterol < 35) score += 2;
    else if (patient.hdlCholesterol >= 60) score -= 1;

    if (patient.systolicBp >= 160) score += patient.treatedHypertension ? 3 : 2;
    else if (patient.systolicBp >= 140) score += patient.treatedHypertension ? 2 : 1;
  }

  // Convert points roughly to 10-year risk %
  const estimated = 1 / (1 + Math.exp(-0.16 * score + 2.2)) * 100;
  return Math.min(80, Math.max(1, Math.round(estimated * 10) / 10));
}

/**
 * CAD-RADS (Coronary Artery Disease Reporting and Data System) 2.0
 */
export function determineCadRads(patient: PatientProfile): { grade: string; description: string } {
  const { lad, lcx, rca, lm } = patient.coronaryVessels;
  const maxStenosis = Math.max(
    lm.stenosisPercent * 1.4, // Left main stenosis is weighted more heavily
    lad.stenosisPercent,
    lcx.stenosisPercent,
    rca.stenosisPercent
  );

  let grade = 'CAD-RADS 0';
  let desc = 'Documented absence of CAD (0% stenosis)';

  if (maxStenosis >= 100) {
    grade = 'CAD-RADS 5';
    desc = 'Total coronary occlusion (100% stenosis in >= 1 vessel)';
  } else if (maxStenosis >= 70 || lm.stenosisPercent >= 50) {
    const severeVesselsCount = [lad, lcx, rca].filter(v => v.stenosisPercent >= 70).length;
    if (lm.stenosisPercent >= 50 || severeVesselsCount >= 3) {
      grade = 'CAD-RADS 4B';
      desc = 'Severe CAD: Left Main stenosis >=50% or 3-vessel stenosis >=70%';
    } else {
      grade = 'CAD-RADS 4A';
      desc = `Severe CAD: 1 or 2 vessels with 70-99% stenosis (${severeVesselsCount} vessel(s))`;
    }
  } else if (maxStenosis >= 50) {
    grade = 'CAD-RADS 3';
    desc = 'Moderate stenosis (50-69% luminal narrowing)';
  } else if (maxStenosis >= 25) {
    grade = 'CAD-RADS 2';
    desc = 'Mild non-obstructive CAD (25-49% luminal narrowing)';
  } else if (maxStenosis > 0) {
    grade = 'CAD-RADS 1';
    desc = 'Minimal non-obstructive CAD (1-24% luminal narrowing)';
  }

  // Modifiers
  const modifiers: string[] = [];
  const hasVulnerable = [lad, lcx, rca].some(
    v => v.vulnerableFeatures.thinCapFibroatheroma || v.vulnerableFeatures.positiveRemodeling
  );
  if (hasVulnerable) modifiers.push('V'); // Vulnerable Plaque
  if (patient.cacScore > 400) modifiers.push('C (Extensive)');
  else if (patient.cacScore > 100) modifiers.push('C (Moderate)');

  const anyStent = [lad, lcx, rca].some(v => v.hasStent);
  if (anyStent) modifiers.push('S');

  const fullGrade = modifiers.length > 0 ? `${grade} / ${modifiers.join(', ')}` : grade;
  return { grade: fullGrade, description: desc };
}

/**
 * Diamond-Forrester pre-test probability of CAD
 */
export function calculateDiamondForrester(age: number, sex: 'male' | 'female', chestPain: PatientProfile['chestPain']): number {
  if (chestPain === 'asymptomatic') return 5;
  if (sex === 'male') {
    if (chestPain === 'typical_angina') return age < 40 ? 59 : age < 50 ? 69 : age < 60 ? 87 : 93;
    if (chestPain === 'atypical_angina') return age < 40 ? 29 : age < 50 ? 38 : age < 60 ? 67 : 72;
    return age < 40 ? 18 : age < 50 ? 25 : age < 60 ? 30 : 40; // non-anginal
  } else {
    // Female
    if (chestPain === 'typical_angina') return age < 40 ? 28 : age < 50 ? 37 : age < 60 ? 55 : 79;
    if (chestPain === 'atypical_angina') return age < 40 ? 10 : age < 50 ? 14 : age < 60 ? 28 : 47;
    return age < 40 ? 2 : age < 50 ? 5 : age < 60 ? 10 : 20; // non-anginal
  }
}

/**
 * Fractional Flow Reserve (FFR) Estimation
 */
export function estimateVesselFfr(stenosisPercent: number, hasStent: boolean): number {
  if (hasStent) return 0.94;
  if (stenosisPercent <= 20) return 0.98;
  if (stenosisPercent <= 40) return 0.92;
  if (stenosisPercent <= 50) return 0.88;
  if (stenosisPercent <= 60) return 0.83;
  if (stenosisPercent <= 70) return 0.77;
  if (stenosisPercent <= 80) return 0.68;
  if (stenosisPercent <= 90) return 0.54;
  return 0.42;
}

/**
 * Left Ventricle Myocardial Ischemic Burden Calculation (17-segment model representation)
 */
export function calculateIschemicBurden(patient: PatientProfile): number {
  const { lad, lcx, rca } = patient.coronaryVessels;
  // LAD supplies ~45-50% of LV (Anteroseptal, anterior, apical)
  // LCx supplies ~25-30% of LV (Lateral, posterolateral)
  // RCA supplies ~25-30% of LV (Inferior, inferoseptal)
  let ladDeficit = 0;
  if (lad.stenosisPercent >= 50 && !lad.hasStent) {
    ladDeficit = (lad.stenosisPercent - 40) * 0.75;
  }
  let lcxDeficit = 0;
  if (lcx.stenosisPercent >= 50 && !lcx.hasStent) {
    lcxDeficit = (lcx.stenosisPercent - 40) * 0.45;
  }
  let rcaDeficit = 0;
  if (rca.stenosisPercent >= 50 && !rca.hasStent) {
    rcaDeficit = (rca.stenosisPercent - 40) * 0.45;
  }

  const rawBurden = ladDeficit + lcxDeficit + rcaDeficit;
  return Math.min(85, Math.max(0, Math.round(rawBurden)));
}

/**
 * Overall Comprehensive Risk Engine
 */
export function computeCompleteRiskAssessment(patient: PatientProfile): RiskAssessment {
  const ascvd = calculateAscvdRisk(patient);
  const framingham = calculateFraminghamRisk(patient);
  const score2 = Math.min(60, Math.round(ascvd * 0.88));
  const cadRads = determineCadRads(patient);
  const pretest = calculateDiamondForrester(patient.age, patient.sex, patient.chestPain);
  const ischemicBurden = calculateIschemicBurden(patient);

  let category: RiskAssessment['ascvdRiskCategory'] = 'low';
  if (ascvd >= 20 || patient.coronaryVessels.lad.stenosisPercent >= 70 || patient.cacScore >= 400) {
    category = 'high';
  } else if (ascvd >= 7.5) {
    category = 'intermediate';
  } else if (ascvd >= 5.0) {
    category = 'borderline';
  }

  // Estimate SYNTAX score
  let syntax = 0;
  if (patient.coronaryVessels.lad.stenosisPercent >= 50) syntax += patient.coronaryVessels.lad.stenosisPercent > 75 ? 12 : 7;
  if (patient.coronaryVessels.lcx.stenosisPercent >= 50) syntax += patient.coronaryVessels.lcx.stenosisPercent > 75 ? 8 : 4;
  if (patient.coronaryVessels.rca.stenosisPercent >= 50) syntax += patient.coronaryVessels.rca.stenosisPercent > 75 ? 8 : 4;
  if (patient.cacScore > 300) syntax += 4;

  let primaryRec = 'Lifestyle optimization and primary prevention monitoring.';
  if (category === 'high' || cadRads.grade.includes('4') || cadRads.grade.includes('5')) {
    primaryRec = 'Urgent Cardiology Consultation: High-intensity statin, DAPT, and invasive coronary angiography evaluation.';
  } else if (category === 'intermediate') {
    primaryRec = 'Moderate-to-high intensity statin initiation, blood pressure goal < 130/80 mmHg, functional ischemia testing.';
  } else if (category === 'borderline') {
    primaryRec = 'Shared decision-making on moderate statin therapy; coronary calcium scoring (CAC) for risk reclassification.';
  }

  return {
    ascvd10YearRisk: ascvd,
    ascvdRiskCategory: category,
    framingham10YearRisk: framingham,
    score2Risk: score2,
    cadRadsGrade: cadRads.grade,
    cadRadsDescription: cadRads.description,
    lifetimeRisk: Math.min(80, Math.round(ascvd * 1.6 + 15)),
    ischemicBurdenPercent: ischemicBurden,
    syntaxScoreEstimate: syntax,
    diamondForresterPretest: pretest,
    primaryRecommendation: primaryRec
  };
}

/**
 * Calculates simulated outcome when interventions are applied
 */
export function simulateInterventionEffect(patient: PatientProfile, plan: InterventionPlan): {
  projectedAscvd: number;
  projectedIschemicBurden: number;
  riskReductionPercent: number;
  simulatedVessels: PatientProfile['coronaryVessels'];
  clinicalTakeaway: string;
} {
  const currentRisk = calculateAscvdRisk(patient);
  let relativeReduction = 0;

  // Statin effect (30-50% relative risk reduction)
  if (plan.statinIntensity === 'high') relativeReduction += 0.35;
  else if (plan.statinIntensity === 'moderate') relativeReduction += 0.22;

  // Ezetimibe adds ~15% further LDL and CVD risk reduction
  if (plan.addEzetimibe) relativeReduction += 0.12;

  // PCSK9i adds ~20% further CV risk reduction
  if (plan.addPcsk9i) relativeReduction += 0.18;

  // SGLT2i adds CV death / HF reduction ~14%
  if (plan.addSglt2i) relativeReduction += 0.14;

  // BP control
  if (plan.bpControlOptimized && patient.systolicBp > 130) relativeReduction += 0.15;

  // Smoking cessation
  if (plan.cessationSmoking && patient.smoker) relativeReduction += 0.30;

  // Weight loss
  if (plan.weightLossKg >= 5) relativeReduction += 0.08;

  // Cap total medical relative reduction
  const medicalRRR = Math.min(0.72, relativeReduction);
  const projectedAscvd = Math.max(1.5, Math.round(currentRisk * (1 - medicalRRR) * 10) / 10);

  // Clone vessels for simulation
  const simulatedVessels = JSON.parse(JSON.stringify(patient.coronaryVessels)) as PatientProfile['coronaryVessels'];

  if (plan.revascularizationTarget === 'lad_stent' || plan.revascularizationTarget === 'multi_vessel_pci') {
    simulatedVessels.lad.stenosisPercent = 5;
    simulatedVessels.lad.hasStent = true;
    simulatedVessels.lad.estimatedFfr = 0.95;
  }
  if (plan.revascularizationTarget === 'lcx_stent' || plan.revascularizationTarget === 'multi_vessel_pci') {
    simulatedVessels.lcx.stenosisPercent = 5;
    simulatedVessels.lcx.hasStent = true;
    simulatedVessels.lcx.estimatedFfr = 0.94;
  }
  if (plan.revascularizationTarget === 'rca_stent' || plan.revascularizationTarget === 'multi_vessel_pci') {
    simulatedVessels.rca.stenosisPercent = 5;
    simulatedVessels.rca.hasStent = true;
    simulatedVessels.rca.estimatedFfr = 0.95;
  }
  if (plan.revascularizationTarget === 'cabg') {
    simulatedVessels.lad.stenosisPercent = 0;
    simulatedVessels.lad.estimatedFfr = 0.98;
    simulatedVessels.lcx.stenosisPercent = 0;
    simulatedVessels.lcx.estimatedFfr = 0.97;
    simulatedVessels.rca.stenosisPercent = 0;
    simulatedVessels.rca.estimatedFfr = 0.97;
  }

  // Calculate new ischemic burden
  const dummyPatient: PatientProfile = { ...patient, coronaryVessels: simulatedVessels };
  const projectedIschemicBurden = calculateIschemicBurden(dummyPatient);
  const netAbsoluteRiskReduction = Math.round((currentRisk - projectedAscvd) * 10) / 10;

  const clinicalTakeaway = plan.revascularizationTarget !== 'none'
    ? `Virtual revascularization successfully restored coronary perfusion, reducing myocardial ischemic burden from ${calculateIschemicBurden(patient)}% to ${projectedIschemicBurden}%. Concomitant lipid-lowering and hemodynamic therapy projected 10-year risk drop of ${netAbsoluteRiskReduction}% points.`
    : `Optimal Medical Therapy (OMT) without invasive revascularization projected to achieve a ${Math.round(medicalRRR * 100)}% relative reduction in 10-year hard atherosclerotic events.`;

  return {
    projectedAscvd,
    projectedIschemicBurden,
    riskReductionPercent: Math.round(medicalRRR * 100),
    simulatedVessels,
    clinicalTakeaway
  };
}
