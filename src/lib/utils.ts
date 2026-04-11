import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function parseGithubUrl(url: string) {
  try {
    const regex = /github\.com\/([^/]+)\/([^/]+)/;
    const match = url.match(regex);

    if (!match) return null;

    return {
      owner: match[1],
      repo: match[2].replace(".git", ""),
    };
  } catch {
    return null;
  }
}