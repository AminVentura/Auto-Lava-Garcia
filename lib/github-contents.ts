type GithubPutInput = {
  message: string;
  content: string;
  branch: string;
  sha?: string | null;
};

type GithubPutBody = {
  message: string;
  content: string;
  branch: string;
  sha?: string;
};

export function buildGithubContentsPutBody(input: GithubPutInput): GithubPutBody {
  return {
    message: input.message,
    content: input.content,
    branch: input.branch,
    ...(input.sha ? { sha: input.sha } : {}),
  };
}
