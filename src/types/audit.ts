export interface AuditData {
  overallScore: number;
  professionalismScore: number;
  documentationScore: number;
  technicalScore: number;
  summary: string;
  improvements: string[];
  verdict: string;
  // Optional metrics to might add later
  performance?: number;
  accessibility?: number;

  [key: string]: string | number | string[] | undefined;
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
}

// export interface AuditResult {
//   success?: boolean;
//   error?: string;
//   metadata?: {
//     owner: string;
//     repo: string;
//     url: string;
//     focus?: string;
//   };
//   audit?: {
//     overallScore: number;
//     professionalismScore: number;
//     documentationScore: number;
//     technicalScore: number;
//     summary: string;
//     improvements: string[];
//     verdict: string;
//   };
//   warnings?: string[];
// }

// export interface AuditData {
//   [key: string]: number | string | undefined;
//   performance?: number;
//   accessibility?: number;
// }


// export interface ScoreCardProps {
//     label: string;
//     score: number;
// }