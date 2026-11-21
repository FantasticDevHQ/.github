// GitHub does not run ruleset-required workflows when only a pull request's
// title or description changes, so the required `Org PR standard` check would
// keep a stale result after an edit. Each repository's `PR standard re-run`
// workflow calls this on `edited` and re-runs that check, which then reads the
// PR's current metadata. It never checks out or runs pull request code.
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const CHECK = "Org PR standard";

export function metadataChanged(event) {
  return Boolean(event.changes?.title || event.changes?.body);
}

// The newest run of the org check for this head, or undefined.
export function latestRun(runs, headSha) {
  return runs
    .filter((run) => run.name === CHECK && run.head_sha === headSha)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
}

export async function rerunAfterEdit({ api, event, sleep, attempts = 40 }) {
  if (!event.pull_request || event.action !== "edited") return "not an edit";
  if (!metadataChanged(event)) return "title and description unchanged";
  const headSha = event.pull_request.head.sha;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const { workflow_runs: runs = [] } = await api(
      "GET",
      `/actions/runs?head_sha=${headSha}&event=pull_request&per_page=100`,
    );
    const run = latestRun(runs, headSha);
    if (!run) return `no ${CHECK} run for ${headSha.slice(0, 7)} yet; it will check the current metadata when it starts`;
    // A run in progress may have read the metadata before this edit, so let it
    // finish and then re-run it.
    if (run.status === "completed") {
      await api("POST", `/actions/runs/${run.id}/rerun`);
      return `re-ran ${CHECK} run ${run.id}`;
    }
    await sleep(6000);
  }
  throw new Error(`${CHECK} did not finish in time; re-run it from the Checks tab`);
}

async function main() {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
  const root = `${process.env.GITHUB_API_URL}/repos/${process.env.GITHUB_REPOSITORY}`;
  const api = async (method, path) => {
    const response = await fetch(`${root}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!response.ok) throw new Error(`GitHub ${method} ${path} failed: ${response.status}`);
    return response.status === 201 || response.status === 204 ? undefined : response.json();
  };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  console.log(await rerunAfterEdit({ api, event, sleep }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
