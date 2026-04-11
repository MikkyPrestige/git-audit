"use server";

import { parseGithubUrl } from "@/lib/utils";
import { fetchRepoFiles } from "@/lib/github";
import { analyzeRepo } from "@/lib/ai";
import { AuditResult } from "@/types/audit";


const auditCache = new Map<string, { timestamp: number; data: AuditResult }>();

const CACHE_DURATION = 1000 * 60 * 60; // 1 Hour

export async function auditRepository(url: string, customFocus?: string): Promise<AuditResult> {
  const parsed = parseGithubUrl(url);

  if (!parsed || !parsed.owner || !parsed.repo) {
    return { error: "Please provide a valid GitHub URL. Use format: github.com/user/repo" };
  }

  const cacheKey = `${parsed.owner}/${parsed.repo}${customFocus ? '-' + customFocus : ''}`.toLowerCase();


const cached = auditCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[CACHE HIT] Returning saved audit for ${cacheKey}`);
    return cached.data;
  }

  try {
    const files = await fetchRepoFiles(parsed.owner, parsed.repo, customFocus);

    const warnings: string[] = [];
    if (files.focusError && customFocus) {
      warnings.push(`File "${customFocus}" not found. Running general audit.`);
    }

    const audit = await analyzeRepo(
      files.readme,
      files.packageJson,
      files.fileTree,
      customFocus,
      files.focusedFileContent
    )

  const finalResult: AuditResult = {
      success: true,
      metadata: {
        owner: parsed.owner,
        repo: parsed.repo,
        url: url,
        focus: customFocus
      },
      audit,
      warnings
    };

    auditCache.set(cacheKey, { timestamp: Date.now(), data: finalResult });

    return finalResult;
} catch (err: unknown) {
    let errorMessage = "Audit failed.";

    if (err && typeof err === "object") {
      if ("status" in err && (err as { status: number }).status === 404) {
        errorMessage = "Repository not found. It might be private or deleted.";
      } else if ("message" in err) {
        errorMessage = String((err as { message: unknown }).message);
      }
    }

    return { error: errorMessage };
  }
}