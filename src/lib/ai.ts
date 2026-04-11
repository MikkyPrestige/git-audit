import { Mistral } from "@mistralai/mistralai";

const apiKey = process.env.MISTRAL_API_KEY;

const client = new Mistral({ apiKey: apiKey });

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
    1. Deduce the Project Archetype. Use the ROOT FILE STRUCTURE to help you figure this out.
    ${customFocus ? `2. USER FOCUS: The user specifically requested you focus on: "${customFocus}". You MUST heavily weight your summary and improvements around this request.` : "2. Analyze the overall repository health."}
    3. Be punchy, honest, and human. Avoid generic AI fluff.

    Return ONLY JSON:
{
      "overallScore": number,
      "professionalismScore": number,
      "documentationScore": number,
      "technicalScore": number,
      "summary": "3 sentences max. Address the user's custom focus directly if one was provided.",
      "improvements": ["Actionable step 1", "Actionable step 2", "Actionable step 3"],
      "verdict": "POOR, FAIR, GOOD, or EXCELLENT"
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

return typeof content === "string" ? JSON.parse(content) : content;
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