import { Octokit } from "octokit";

const octokit = new Octokit({
  auth: process.env.GITHUB_PAT,
});

export async function fetchRepoFiles(owner: string, repo: string, customFocus?: string) {
  try {
    const [readmeRes, packageRes, contentsRes] = await Promise.allSettled([
      octokit.rest.repos.getReadme({ owner, repo, mediaType: { format: "raw" } }),
      octokit.rest.repos.getContent({ owner, repo, path: "package.json", mediaType: { format: "raw" } }),
      octokit.rest.repos.getContent({ owner, repo, path: "" }),
    ]);

    const readme = readmeRes.status === "fulfilled" ? (readmeRes.value.data as unknown as string) : "";
    const packageJson = packageRes.status === "fulfilled" ? (packageRes.value.data as unknown as string) : "";

    let fileTree = "";
    if (contentsRes.status === "fulfilled" && Array.isArray(contentsRes.value.data)) {
      fileTree = contentsRes.value.data
        .map((item) => `${item.type === "dir" ? "📁" : "📄"} ${item.path}`)
        .join("\n");
    }

    let focusedFileContent = "";
    let focusError = false;

if (customFocus && customFocus.includes('.') && !customFocus.includes(' ')) {
      try {
        const cleanPath = customFocus.replace(/^(\.\/|\/)/, '');
        const res = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: cleanPath,
          mediaType: { format: "raw" }
        });
        focusedFileContent = res.data as unknown as string;
      } catch (err: unknown) {
        if (err && typeof err === "object" && "status" in err) {
          const status = (err as { status: number }).status;
          if (status === 404) {
            focusError = true;
          }
        } else {
          focusError = true;
        }
        console.warn("Focus file fetch failed, proceeding with general audit.");
      }
    }

    if (!readme && !packageJson && !fileTree) {
      throw new Error("Repository appears to be empty or private.");
    }

    return { readme, packageJson, fileTree, focusedFileContent, focusError};
  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    throw new Error(message);
  }
}