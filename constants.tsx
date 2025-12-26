
import { RiskLevel } from './types';

export const COLORS = {
  bgBase: '#FDFBF7',
  bgCard: '#F5EFDF',
  primaryGold: '#B8860B',
  accentWarm: '#D2B48C',
  successSage: '#4A5D23',
  errorRust: '#8B0000',
  textDeep: '#2C2621',
  textMuted: '#7A7267',
};

export const INITIAL_PIPELINE_STAGES: any[] = [
  { id: 'secret_ml', label: 'Secret Prediction (XGBoost)', status: 'PENDING', progress: 0 },
  { id: 'sast_risk', label: 'Contextual SAST (Ensemble)', status: 'PENDING', progress: 0 },
  { id: 'attack_gnn', label: 'Attack Path GNN', status: 'PENDING', progress: 0 },
  { id: 'dast_sim', label: 'DAST Runtime Likelihood', status: 'PENDING', progress: 0 },
  { id: 'sec_memory', label: 'Security Memory Graph', status: 'PENDING', progress: 0 },
  { id: 'verdict_ai', label: 'Decision Intelligence', status: 'PENDING', progress: 0 },
  { id: 'xai_layer', label: 'XAI Attribution (SHAP)', status: 'PENDING', progress: 0 },
  { id: 'self_heal', label: 'Patch Synthesis', status: 'PENDING', progress: 0 },
];

export const MOCK_TIMELINE = [
  { date: "10:05:12 AM", event: "Commit detected in enterprise-main", status: "CLEAN" },
  { date: "10:05:14 AM", event: "XGBoost Entropy Analysis triggered", status: "WARNING" },
  { date: "10:05:30 AM", event: "GraphSAGE: Multi-step exploit path identified", status: "CRITICAL" },
  { date: "10:06:05 AM", event: "SHAP: Feature attribution complete", status: "HEALED" },
];

export const MOCK_VULNS: any[] = [
  {
    id: 'FORT-9102',
    type: 'SECRET',
    title: 'Secret Prediction Anomaly',
    description: 'XGBoost classifier predicts a 98% likelihood of a GCP Service Account key exposure based on variable naming vectors and Shannon entropy analysis.',
    severity: RiskLevel.CRITICAL,
    file: 'infra/deployment/secrets.json',
    line: 8,
    riskScore: 0.98,
    exploitPath: ['Public Repo Access', 'Secret Exfiltration', 'Cloud Resource Hijacking'],
    remediation: 'Rotate the service account key and move to JIT credential injection.'
  }
];
