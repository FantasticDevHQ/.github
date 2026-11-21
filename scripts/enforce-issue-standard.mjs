// Runs in each repository's `Issue standard` workflow. Closes issues that skip
// the issue forms, but never silently: it first comments to the author with
// exactly what is missing and how to fix it, and reopens the issue
// automatically once the author edits it to conform.
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseForm, loadForms } from "./issue-forms.mjs";
import { validateIssue } from "./issue-standard.mjs";

export const MARKER = "<!-- fantasticdev-issue-standard -->";
export const LABEL = "needs-form";

export function closingComment({ issue, repo, form, errors, forms }) {
  const links = forms
    .map((f) => `[${f.name}](https://github.com/${repo}/issues/new?template=${f.file})`)
    .join(" · ");
  return `${MARKER}
@${issue.user.login}, thanks for opening this. I closed it because it does not follow ${
    form ? `the **${form.name}** form` : "one of this repository's issue forms"
  }, so maintainers cannot act on it yet.

**What is missing:**
${errors.map((e) => `- ${e}`).join("\n")}

**How to fix it:** edit this issue so it includes the sections above. It reopens automatically when it conforms. Or open a new issue from a form: ${links}.

Issues created with \`gh issue create\` or the API skip the forms, so copy the form's \`### Section\` headings into the body yourself.`;
}

export function reopenedComment({ issue }) {
  return `${MARKER}
@${issue.user.login}, thanks for updating this. It now follows the issue form, so it is open again.`;
}

export async function enforceIssue({ api, repo, issue, forms }) {
  if (issue.user?.type === "Bot" || issue.pull_request) return "skipped";
  const { form, errors } = validateIssue(issue, forms);
  const comments = await api("GET", `/issues/${issue.number}/comments?per_page=100`);
  const previous = comments.find(
    (c) => c.user?.login === "github-actions[bot]" && c.body?.startsWith(MARKER),
  );
  const labels = (issue.labels ?? []).map((l) => (typeof l === "string" ? l : l.name));
  const upsert = (body) =>
    previous
      ? api("PATCH", `/issues/comments/${previous.id}`, { body })
      : api("POST", `/issues/${issue.number}/comments`, { body });

  if (errors.length) {
    // Always explain before closing.
    await upsert(closingComment({ issue, repo, form, errors, forms }));
    if (!labels.includes(LABEL)) await api("POST", `/issues/${issue.number}/labels`, { labels: [LABEL] });
    if (issue.state === "open")
      await api("PATCH", `/issues/${issue.number}`, { state: "closed", state_reason: "not_planned" });
    return "closed";
  }
  if (labels.includes(LABEL)) {
    await api("DELETE", `/issues/${issue.number}/labels/${LABEL}`);
    if (issue.state === "closed") await api("PATCH", `/issues/${issue.number}`, { state: "open" });
    await upsert(reopenedComment({ issue }));
    return "reopened";
  }
  return "ok";
}

async function main() {
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
  const repo = process.env.GITHUB_REPOSITORY;
  const root = `${process.env.GITHUB_API_URL}/repos/${repo}`;
  const api = async (method, path, data) => {
    const response = await fetch(`${root}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (response.status === 404 && method === "GET") return undefined;
    if (!response.ok) throw new Error(`GitHub ${method} ${path} failed: ${response.status}`);
    return response.status === 204 ? undefined : response.json();
  };
  // A repository's own forms override the organization defaults, as on GitHub.
  let forms = [];
  const own = await api("GET", "/contents/.github/ISSUE_TEMPLATE");
  if (Array.isArray(own))
    for (const entry of own.filter((e) => /\.ya?ml$/.test(e.name) && e.name !== "config.yml")) {
      const file = await api("GET", `/contents/${entry.path}`);
      forms.push(parseForm(Buffer.from(file.content, "base64").toString("utf8"), entry.name));
    }
  if (!forms.length) forms = loadForms(new URL("../.github/ISSUE_TEMPLATE/", import.meta.url));
  const issue = await api("GET", `/issues/${event.issue.number}`);
  console.log(`Issue #${issue.number}: ${await enforceIssue({ api, repo, issue, forms })}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
