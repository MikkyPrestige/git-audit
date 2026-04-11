import {
  ShieldCheck,
  Gauge,
  BookOpen,
  Activity,
  History,
  Puzzle,
  Code2,
  Users2,
  Star
} from "lucide-react";
import { AuditData } from "@/types/audit";

export type MetricGroup = 'quality' | 'vitality' | 'risk';

export interface MetricConfig {
  key: keyof AuditData;
  label: string;
  icon: React.ElementType;
  group: MetricGroup;
  description: string;
}

export const METRIC_CONFIG: MetricConfig[] = [
  // 1. Code Quality Group
  {
    key: 'technical',
    label: 'Technical',
    icon: Code2,
    group: 'quality',
    description: 'Code standards, syntax, and logic quality.'
  },
  {
    key: 'maintainability',
    label: 'Maintainability',
    icon: Activity,
    group: 'quality',
    description: 'How easily the code can be updated or fixed.'
  },
  {
    key: 'modularity',
    label: 'Modularity',
    icon: Puzzle,
    group: 'quality',
    description: 'Monolith vs. Decoupled architecture.'
  },

  // 2. Project Vitality Group
  {
    key: 'documentation',
    label: 'Documentation',
    icon: BookOpen,
    group: 'vitality',
    description: 'Clarity of README, comments, and setup guides.'
  },
  {
    key: 'community',
    label: 'Community',
    icon: Users2,
    group: 'vitality',
    description: 'Issue activity, PRs, and contributor health.'
  },
  {
    key: 'longevity',
    label: 'Longevity',
    icon: History,
    group: 'vitality',
    description: 'Commit frequency and project age/activity.'
  },

  // 3. Risk & Performance Group
  {
    key: 'security',
    label: 'Security',
    icon: ShieldCheck,
    group: 'risk',
    description: 'Vulnerabilities, leak checks, and best practices.'
  },
  {
    key: 'performance',
    label: 'Performance',
    icon: Gauge,
    group: 'risk',
    description: 'Efficiency, dependency bloat, and speed.'
  },
  {
    key: 'professionalism',
    label: 'Professionalism',
    icon: Star,
    group: 'risk',
    description: 'Naming conventions and repository etiquette.'
  },
];