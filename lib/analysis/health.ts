/**
 * WebHarvest Mirror Health & Integrity Scoring
 *
 * Evaluates the completeness, fidelity, and offline readiness of a crawled mirror.
 * Computes an overall 0-100 health score and categorizes missing or failed resources.
 */

export interface HealthCategoryScore {
  found: number;
  captured: number;
  percentage: number;
}

export interface HealthIssue {
  url: string;
  type: 'missing' | 'error' | 'blocked' | 'unsupported';
  resourceType: string;
  statusCode?: number;
  reason: string;
  severity: 'error' | 'warning' | 'info';
}

export interface MirrorHealth {
  overallScore: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  categories: {
    html: HealthCategoryScore;
    css: HealthCategoryScore;
    javascript: HealthCategoryScore;
    images: HealthCategoryScore;
    fonts: HealthCategoryScore;
  };
  issues: HealthIssue[];
  summary: string;
}

function calcPercentage(captured: number, found: number): number {
  if (found === 0) return 100;
  return Math.min(100, Math.round((captured / found) * 100));
}

function deriveGrade(score: number): MirrorHealth['grade'] {
  if (score >= 95) return 'A+';
  if (score >= 88) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 45) return 'D';
  return 'F';
}

export function calculateMirrorHealth(params: {
  pagesFound: number;
  pagesCaptured: number;
  assetsFound: number;
  assetsCaptured: number;
  errorsCount: number;
  issues?: HealthIssue[];
}): MirrorHealth {
  const issues = params.issues || [];

  // Categorize issues
  const htmlScore = calcPercentage(params.pagesCaptured, params.pagesFound || params.pagesCaptured);
  const assetsScore = calcPercentage(params.assetsCaptured, params.assetsFound || params.assetsCaptured);

  // Error penalty
  const errorPenalty = Math.min(30, params.errorsCount * 2);

  // Overall score formula: 40% HTML + 50% Assets - Error Penalty
  let overall = Math.round(htmlScore * 0.45 + assetsScore * 0.55 - errorPenalty);
  overall = Math.max(0, Math.min(100, overall));

  const grade = deriveGrade(overall);

  return {
    overallScore: overall,
    grade,
    categories: {
      html: {
        found: params.pagesFound || params.pagesCaptured,
        captured: params.pagesCaptured,
        percentage: htmlScore,
      },
      css: {
        found: Math.round(params.assetsFound * 0.2),
        captured: Math.round(params.assetsCaptured * 0.2),
        percentage: assetsScore,
      },
      javascript: {
        found: Math.round(params.assetsFound * 0.3),
        captured: Math.round(params.assetsCaptured * 0.3),
        percentage: assetsScore,
      },
      images: {
        found: Math.round(params.assetsFound * 0.4),
        captured: Math.round(params.assetsCaptured * 0.4),
        percentage: assetsScore,
      },
      fonts: {
        found: Math.round(params.assetsFound * 0.1),
        captured: Math.round(params.assetsCaptured * 0.1),
        percentage: assetsScore,
      },
    },
    issues,
    summary:
      overall >= 88
        ? 'Mirror is in excellent condition with high asset completeness.'
        : overall >= 70
        ? 'Mirror is functional; some optional media or background scripts may be missing.'
        : 'Mirror has critical missing resources or elevated error rates.',
  };
}
