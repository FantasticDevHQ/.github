// Read-only PR standard check that an organization ruleset requires on every
// repository. It runs this repository's trusted validator against the PR's
// current metadata, explains every problem in the job summary, and fails the
// check so GitHub blocks the merge. It never writes to the repository.
import { appendFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { validatePullRequest } from "./pr-standard.mjs";

const STANDARD =
  "https://github.com/FantasticDevHQ/.github/blob/main/docs/pull-request-standard.md";

export async function checkPullRequest({ api, number }) {
  const pr = await api(`/pulls/${number}`);
  const files = [];
  for (let page = 1; ; page++) {
    const batch = await api(`/pulls/${number}/files?per_page=100&page=${page}`);
    files.push(...batch.map((file) => file.filename));
    if (batch.length < 100) break;
    if (page === 30)
      throw new Error("PR file listing reached GitHub's 3,000-file limit; split the PR");
  }
  const commits = [];
  for (let page = 1; ; page++) {
    const batch = await api(`/pulls/${number}/commits?per_page=100&page=${page}`);
    commits.push(
      ...batch.map((item) => ({
        sha: item.sha,
        message: item.commit?.message ?? "",
        merge: (item.parents?.length ?? 0) > 1,
      })),
    );
    if (batch.length < 100) break;
    if (page === 3)
      throw new Error("PR commit listing reached GitHub's 250-commit limit; split the PR");
  }
  return { pr, errors: validatePullRequest(pr, files, commits) };
}

export function report({ pr, errors }) {
  if (!errors.length)
    return `## PR standard passed\n\nThe title, required sections, evidence, and commit ticket references meet the [PR standard](${STANDARD}).\n`;
  return `## PR standard failed\n\n@${pr.user?.login ?? "author"}, this pull request cannot merge until these items are fixed:\n\n${errors
    .map((error) => `- ${error}`)
    .join("\n")}\n\nEdit the PR title or description (this check re-runs within a minute or two), or reword and push commits. See the [PR standard](${STANDARD}) and use the repository's PR template.\n`;
}

async function main() {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
  if (!event.pull_request) {
    console.log("Not a pull request event (for example a merge queue run); nothing to check.");
    return;
  }
  const root = `${process.env.GITHUB_API_URL}/repos/${process.env.GITHUB_REPOSITORY}`;
  const api = async (path) => {
    const response = await fetch(`${root}${path}`, {
      headers: {
        authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!response.ok) throw new Error(`GitHub GET ${path} failed: ${response.status}`);
    return response.json();
  };
  const result = await checkPullRequest({ api, number: event.pull_request.number });
  const text = report(result);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, text);
  for (const error of result.errors) console.log(`::error title=PR standard::${error.replace(/\n/g, " ")}`);
  console.log(text);
  if (result.errors.length) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
