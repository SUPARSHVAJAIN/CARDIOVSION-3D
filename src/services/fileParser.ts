import { PatientProfile } from '../types/cardiac';

export interface ParsedTableData {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

/**
 * Universal CSV/TSV/Text parser supporting varied delimiters (comma, tab, semicolon) and quotes
 */
export function parseDelimitedText(text: string): ParsedTableData {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  // Detect delimiter: comma, tab, or semicolon
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

  // Helper to split line respecting quotes
  const splitLine = (line: string): string[] => {
    const pattern = new RegExp(
      `(?:^|\\${delimiter})(?:"([^"]*(?:""[^"]*)*)"|([^"\\${delimiter}]*))`,
      'g'
    );
    const matches: string[] = [];
    let match;
    while ((match = pattern.exec(line)) !== null) {
      const val = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
      matches.push((val || '').trim());
      if (pattern.lastIndex >= line.length) break;
    }
    return matches.length > 0 ? matches : line.split(delimiter).map((s) => s.trim());
  };

  const headers = splitLine(lines[0]);
  const rows: Record<string, any>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;

    const rowObj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      const rawVal = values[idx] !== undefined ? values[idx] : '';
      // Parse numbers if numeric
      if (/^-?\d+(\.\d+)?$/.test(rawVal)) {
        rowObj[h] = parseFloat(rawVal);
      } else if (rawVal.toLowerCase() === 'true' || rawVal.toLowerCase() === 'y' || rawVal === '1') {
        rowObj[h] = true;
      } else if (rawVal.toLowerCase() === 'false' || rawVal.toLowerCase() === 'n' || rawVal === '0') {
        rowObj[h] = false;
      } else {
        rowObj[h] = rawVal;
      }
    });
    rows.push(rowObj);
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
  };
}

/**
 * Intelligent mapper from arbitrary CSV / JSON row to CardioVision 3D PatientProfile
 */
export function mapRowToPatientProfile(
  row: Record<string, any>,
  rowIndex: number,
  sourceName?: string
): PatientProfile {
  // Key matcher helper
  const findVal = (keys: string[], defaultVal: any) => {
    for (const k of keys) {
      for (const rowKey of Object.keys(row)) {
        if (rowKey.toLowerCase() === k.toLowerCase()) {
          return row[rowKey];
        }
      }
    }
    return defaultVal;
  };

  const age = Number(findVal(['age', 'age_years', 'patient_age'], 58)) || 58;
  const rawSex = String(findVal(['sex', 'gender', 'biological_sex'], 'male')).toLowerCase();
  const sex = rawSex.startsWith('f') || rawSex === '0' ? 'female' : 'male';
  const bmi = Number(findVal(['bmi', 'body_mass_index'], 27.5)) || 27.5;
  const sbp = Number(findVal(['bp', 'systolicbp', 'restingbp', 'trestbps', 'sbp', 'systolic_bp'], 140)) || 140;
  const dbp = Number(findVal(['diastolicbp', 'dbp', 'diastolic_bp'], Math.round(sbp * 0.65))) || 85;
  const hr = Number(findVal(['pr', 'hr', 'pulse', 'restingheartrate', 'thalach'], 74)) || 74;

  const dm = Boolean(findVal(['dm', 'diabetes', 'diabetic', 't2dm'], false));
  const htn = Boolean(findVal(['htn', 'hypertension', 'treatedhypertension'], false));
  const smoker = Boolean(findVal(['smoker', 'currentsmoker', 'tobacco'], false));
  const fh = Boolean(findVal(['fh', 'familyhistory', 'family_history'], false));

  const totChol = Number(findVal(['tot_chol', 'chol', 'cholesterol', 'totalcholesterol'], 220)) || 220;
  const ldl = Number(findVal(['ldl', 'ldl_c', 'ldlcholesterol'], 140)) || 140;
  const hdl = Number(findVal(['hdl', 'hdl_c', 'hdlcholesterol'], 42)) || 42;
  const tg = Number(findVal(['tg', 'triglycerides'], 175)) || 175;
  const fbs = Number(findVal(['fbs', 'glucose', 'fastingglucose', 'fasting_blood_sugar'], 105)) || 105;

  const ef = Number(findVal(['ef', 'ef_tte', 'lvef', 'ejectionfraction'], 52)) || 52;
  const cac = Number(findVal(['cac', 'cacscore', 'agatston'], 250)) || 250;
  const rwma = Number(findVal(['regionrwma', 'rwma'], 0)) || 0;

  // Coronary status
  const rawLad = String(findVal(['lad', 'lad_stenosis', 'lad_status'], '')).toLowerCase();
  const rawLcx = String(findVal(['lcx', 'lcx_stenosis', 'lcx_status'], '')).toLowerCase();
  const rawRca = String(findVal(['rca', 'rca_stenosis', 'rca_status'], '')).toLowerCase();
  const rawCad = String(findVal(['cad', 'cath', 'target', 'num', 'heartdisease'], '')).toLowerCase();

  const isLadSten = rawLad.includes('sten') || rawLad === '1' || rawLad === 'true' || Number(rawLad) >= 50;
  const isLcxSten = rawLcx.includes('sten') || rawLcx === '1' || rawLcx === 'true' || Number(rawLcx) >= 50;
  const isRcaSten = rawRca.includes('sten') || rawRca === '1' || rawRca === 'true' || Number(rawRca) >= 50;
  const isCad = rawCad.includes('cad') || rawCad === '1' || rawCad === 'true' || isLadSten || isLcxSten || isRcaSten;

  const ladStenosis = isLadSten ? (Number(rawLad) >= 50 ? Number(rawLad) : 80) : isCad ? 70 : 15;
  const lcxStenosis = isLcxSten ? (Number(rawLcx) >= 50 ? Number(rawLcx) : 72) : 20;
  const rcaStenosis = isRcaSten ? (Number(rawRca) >= 50 ? Number(rawRca) : 65) : 15;

  return {
    id: `upload-patient-${rowIndex + 1}`,
    name: `Patient #${rowIndex + 1} (${sourceName || 'Uploaded File'})`,
    age,
    sex,
    race: 'other',
    bmi,
    systolicBp: sbp,
    diastolicBp: dbp,
    restingHeartRate: hr,
    treatedHypertension: htn,
    smoker,
    packYears: smoker ? 18 : 0,
    diabetic: dm,
    familyHistoryCad: fh,
    totalCholesterol: totChol,
    ldlCholesterol: ldl,
    hdlCholesterol: hdl,
    triglycerides: tg,
    lpa: 30,
    fastingGlucose: fbs,
    hba1c: dm ? 7.8 : 5.4,
    egfr: 75,
    hsCrp: 2.4,
    troponinI: isCad ? 0.03 : 0.01,
    ntProBnp: 120,
    cacScore: cac,
    lvef: ef,
    chestPain: isCad ? 'typical_angina' : 'asymptomatic',
    ecgFinding: isCad ? 'st_depression' : 'normal',
    coronaryVessels: {
      lm: {
        id: 'lm',
        name: 'Left Main Coronary Artery',
        acronym: 'LMCA',
        territory: 'Bifurcation into LAD & LCx',
        stenosisPercent: 10,
        plaqueType: 'fibrous',
        calciumDeposit: 15,
        estimatedFfr: 0.96,
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
        stenosisPercent: ladStenosis,
        plaqueType: ladStenosis >= 70 ? 'necrotic_core_vulnerable' : 'fibrous',
        calciumDeposit: ladStenosis >= 70 ? 70 : 10,
        estimatedFfr: Math.max(0.42, Math.round((1.0 - Math.pow(ladStenosis / 100, 2) * 0.65) * 100) / 100),
        hasStent: false,
        vulnerableFeatures: {
          thinCapFibroatheroma: ladStenosis >= 70,
          spottyCalcification: ladStenosis >= 50,
          positiveRemodeling: ladStenosis >= 70,
        },
      },
      lcx: {
        id: 'lcx',
        name: 'Left Circumflex Artery',
        acronym: 'LCx',
        territory: 'Posterolateral left ventricular myocardium',
        stenosisPercent: lcxStenosis,
        plaqueType: lcxStenosis >= 70 ? 'calcified' : 'fibrofatty',
        calciumDeposit: lcxStenosis >= 70 ? 60 : 15,
        estimatedFfr: Math.max(0.42, Math.round((1.0 - Math.pow(lcxStenosis / 100, 2) * 0.65) * 100) / 100),
        hasStent: false,
        vulnerableFeatures: {
          thinCapFibroatheroma: false,
          spottyCalcification: lcxStenosis >= 50,
          positiveRemodeling: false,
        },
      },
      rca: {
        id: 'rca',
        name: 'Right Coronary Artery',
        acronym: 'RCA',
        territory: 'Inferior LV wall, right ventricle & AV node',
        stenosisPercent: rcaStenosis,
        plaqueType: rcaStenosis >= 70 ? 'calcified' : 'fibrofatty',
        calciumDeposit: rcaStenosis >= 70 ? 60 : 10,
        estimatedFfr: Math.max(0.42, Math.round((1.0 - Math.pow(rcaStenosis / 100, 2) * 0.65) * 100) / 100),
        hasStent: false,
        vulnerableFeatures: {
          thinCapFibroatheroma: false,
          spottyCalcification: rcaStenosis >= 50,
          positiveRemodeling: false,
        },
      },
    },
    clinicalHistory: `Uploaded dataset record: ${age}-year-old ${sex} with SBP ${sbp} mmHg, LDL-C ${ldl} mg/dL, Fasting Glucose ${fbs} mg/dL, LVEF ${ef}%. Predicted CAD status: ${
      isCad ? 'Positive (Stenotic lesions present)' : 'Negative / Non-obstructive'
    }.`,
  };
}
