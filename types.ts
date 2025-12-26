
export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum PipelineStatus {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  ANALYZING = 'ANALYZING',
  VERDICT = 'VERDICT',
  HEALING = 'HEALING',
  PASSED = 'PASSED',
  FAILED = 'FAILED'
}

export interface Vulnerability {
  id: string;
  type: 'SECRET' | 'SAST' | 'DAST' | 'IAC' | 'DEP' | 'SUPPLY_CHAIN' | 'QUANTUM' | 'CHAOS';
  title: string;
  description: string;
  severity: RiskLevel;
  file?: string;
  line?: number;
  riskScore: number;
  remediation?: string;
  exploitPath?: string[];
}

export interface SecurityVerdict {
  result: 'PASS' | 'WARN' | 'FAIL' | 'AUTO_FIX';
  action: string;
  confidence: number;
  explanation: string;
}

export interface PipelineStage {
  id: string;
  label: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'ERROR';
  progress: number;
}
