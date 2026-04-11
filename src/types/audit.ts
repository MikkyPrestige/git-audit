export type AuditMetric = {
  score: number;
  insight: string;
};

export interface AuditData {
  analyzedAt: string;
  overallScore: number;
  summary: string;
  verdict: string;
  improvements: string[];
  technical: AuditMetric;
  maintainability: AuditMetric;
  modularity: AuditMetric;
  documentation: AuditMetric;
  community: AuditMetric;
  longevity: AuditMetric;
  security: AuditMetric;
  performance: AuditMetric;
  professionalism: AuditMetric;

  [key: string]: AuditMetric | number | string | string[] | undefined;
}

export interface AuditResult {
  success?: boolean;
  error?: string;
  metadata?: {
    owner: string;
    repo: string;
    url: string;
    focus?: string;
  };
  audit?: AuditData;
  warnings?: string[];
}

export interface ScoreCardProps {
  label: string;
  score: number;
  insight: string;
  icon?: React.ElementType;
}