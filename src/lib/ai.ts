import { Mistral } from "@mistralai/mistralai";
import { AuditData , AuditMetric} from "@/types/audit";

const apiKey = process.env.MISTRAL_API_KEY;

const client = new Mistral({ apiKey: apiKey });

const METRIC_WEIGHTS: Record<string, number> = {
  technical: 3,
  security: 3,
  maintainability: 2.5,
  modularity: 2,
  performance: 2,
  documentation: 1.5,
  professionalism: 1.5,
  community: 1,
  longevity: 1,
};

const getCalculatedScore = (audit: AuditData): number => {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  Object.entries(METRIC_WEIGHTS).forEach(([key, weight]) => {
    const metric = audit[key];

    if (metric && typeof metric === 'object' && 'score' in metric) {
      totalWeightedScore += (metric as AuditMetric).score * weight;
      totalWeight += weight;
    }
  });

  return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
};

const getVerdict = (score: number): string => {
  if (score >= 90) return "EXCELLENT";
  if (score >= 75) return "GOOD";
  if (score >= 50) return "FAIR";
  return "POOR";
};

export async function analyzeRepo(
  readme: string,
  packageJson: string,
  fileTree: string,
  customFocus?: string,
  focusedFileContent?: string
) {
  const prompt = `
    You are a Senior Software Architect auditing a GitHub repository.

  REPOSITORY CONTEXT:
    README: ${readme.substring(0, 3000) || "Missing"}
    package.json: ${packageJson || "Missing"}
    ROOT FILE STRUCTURE: \n${fileTree || "Not available"}

${focusedFileContent ? `
    CRITICAL: THE USER REQUESTED AN AUDIT OF THIS SPECIFIC FILE
    FILE PATH: ${customFocus}
    CODE:
    ${focusedFileContent.substring(0, 4000)}
    ` : ""}

  INSTRUCTIONS:
    1. Deduce the Project Archetype using the ROOT FILE STRUCTURE and package.json.
    ${customFocus ? `2. USER FOCUS: The user requested you focus on: "${customFocus}". You MUST heavily weight your summary and improvements around this request.` : "2. Analyze the overall repository health."}
    3. Be punchy, honest, and human. Avoid generic AI fluff. Act like a Senior Dev doing a code review.

  SCORING GUIDELINES (0-100):
    - Modularity: Score closer to 0 if it looks like a massive Monolith. Score closer to 100 if it is highly decoupled/modular.
    - Longevity/Community: Infer this from the package.json versioning, dependencies, and README badges.
    - Security: Look for obvious red flags in the file tree (e.g., exposed .env files) or outdated/risky dependencies.

    Return EXACTLY this JSON structure. Do not deviate.
    {
      "overallScore": number,
      "summary": "3 sentences max. Address the user's custom focus directly if one was provided.",
      "verdict": "POOR, FAIR, GOOD, or EXCELLENT",
      "improvements": ["Actionable step 1", "Actionable step 2", "Actionable step 3"],

      "technical": { "score": number, "insight": "1 punchy sentence explaining the score" },
      "maintainability": { "score": number, "insight": "1 punchy sentence explaining the score" },
      "modularity": { "score": number, "insight": "1 punchy sentence explaining the score" },

      "documentation": { "score": number, "insight": "1 punchy sentence explaining the score" },
      "community": { "score": number, "insight": "1 punchy sentence explaining the score" },
      "longevity": { "score": number, "insight": "1 punchy sentence explaining the score" },

      "security": { "score": number, "insight": "1 punchy sentence explaining the score" },
      "performance": { "score": number, "insight": "1 punchy sentence explaining the score" },
      "professionalism": { "score": number, "insight": "1 punchy sentence explaining the score" }
    }
  `;

 try {
    const result = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
      responseFormat: { type: "json_object" }
    });

    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI returned an empty response.");

    const parsedData = (typeof content === "string" ? JSON.parse(content) : content) as AuditData;
    const finalScore = getCalculatedScore(parsedData);

    return {
      ...parsedData,
      overallScore: finalScore,
      verdict: getVerdict(finalScore)
    };

 } catch (error: unknown) {
    let errorMessage = "The AI auditor is currently unavailable.";

    if (error instanceof Error) {
      console.error("Mistral Error Detail:", error.message);
      errorMessage = error.message;
    } else {
      console.error("An unexpected error occurred:", error);
    }

    throw new Error(errorMessage);
  }
}