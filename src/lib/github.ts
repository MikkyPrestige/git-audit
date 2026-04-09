import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_PAT,
});

export async function fetchRepoData(owner: string, repo: string) {
  try {
    // 1. Fetch README.md
    const readme = await octokit.rest.repos.getReadme({
      owner,
      repo,
      mediaType: { format: "raw" },
    });

    // 2. Fetch package.json
    const packageJson = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: "package.json",
      mediaType: { format: "raw" },
    });

    return {
      readme: readme.data as unknown as string,
      packageJson: packageJson.data as unknown as string,
    };
  } catch (error) {
    console.error("GitHub Fetch Error:", error);
    throw new Error("Could not find repository or required files.");
  }
}