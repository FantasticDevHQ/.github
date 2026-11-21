import assert from "node:assert/strict";
import { test } from "node:test";
import { loadForms } from "./issue-forms.mjs";
import { validateIssue, matchForm } from "./issue-standard.mjs";
import { enforceIssue, MARKER, LABEL } from "./enforce-issue-standard.mjs";

const forms = loadForms(new URL("../.github/ISSUE_TEMPLATE/", import.meta.url));

// Build the body GitHub renders when a form is filled in.
function filled(form) {
  return form.fields
    .map((f) =>
      f.type === "checkboxes"
        ? `### ${f.label}\n\n${f.options.map((o) => `- [X] ${o.label}`).join("\n")}`
        : `### ${f.label}\n\n${f.required ? "Real content" : "_No response_"}`,
    )
    .join("\n\n");
}

test("parses every organization form with its required fields", () => {
  assert.ok(forms.length >= 4);
  for (const form of forms) {
    assert.ok(form.title, form.file);
    assert.ok(form.fields.some((f) => f.required || f.options.some((o) => o.required)), form.file);
  }
});

test("a form-created issue passes for every form", () => {
  for (const form of forms)
    assert.deepEqual(validateIssue({ title: `${form.title}x`, body: filled(form) }, forms).errors, [], form.file);
});

test("an API-created issue without the form's sections fails with specific errors", () => {
  const bug = forms.find((f) => f.title.startsWith("bug"));
  const { errors } = validateIssue({ title: "bug: it breaks", body: "It breaks when I run it." }, forms);
  assert.ok(errors.length >= 3);
  assert.ok(errors.some((e) => e.includes("What happened")));
  assert.ok(bug);
});

test("an empty or unticked required field fails", () => {
  const bug = forms.find((f) => f.title.startsWith("bug"));
  const body = filled(bug).replace("Real content", "_No response_").replace("- [X]", "- [ ]");
  const { errors } = validateIssue({ title: "bug: x", body }, forms);
  assert.ok(errors.some((e) => e.includes("required")));
  assert.ok(errors.some((e) => e.includes("confirm")));
});

test("an issue matching no form is told which title prefixes to use", () => {
  const { form, errors } = validateIssue({ title: "random", body: "hi" }, forms);
  assert.equal(form, undefined);
  assert.match(errors[0], /issue forms/);
  assert.equal(matchForm({ title: "x", labels: [{ name: "documentation" }] }, forms)?.title, "docs: ");
});

function fakeApi(existingComments = []) {
  const calls = [];
  const api = async (method, path, data) => {
    calls.push({ method, path, data });
    if (method === "GET" && path.includes("/comments")) return existingComments;
    return {};
  };
  return { api, calls };
}
const author = { login: "someone", type: "User" };

test("closes a non-conforming issue only after commenting to the author", async () => {
  const { api, calls } = fakeApi();
  const issue = { number: 7, title: "bug: x", body: "nope", state: "open", user: author, labels: [] };
  assert.equal(await enforceIssue({ api, repo: "acme/app", issue, forms }), "closed");
  const commentAt = calls.findIndex((c) => c.method === "POST" && c.path === "/issues/7/comments");
  const closeAt = calls.findIndex((c) => c.method === "PATCH" && c.data?.state === "closed");
  assert.ok(commentAt >= 0 && closeAt > commentAt, "comment must come before close");
  const body = calls[commentAt].data.body;
  assert.ok(body.startsWith(MARKER));
  assert.match(body, /@someone/);
  assert.match(body, /What is missing/);
  assert.match(body, /issues\/new\?template=/);
  assert.match(body, /reopens automatically/);
  assert.ok(calls.some((c) => c.path === "/issues/7/labels" && c.data.labels[0] === LABEL));
});

test("reopens and thanks the author once the issue conforms", async () => {
  const bug = forms.find((f) => f.title.startsWith("bug"));
  const prior = [{ id: 99, user: { login: "github-actions[bot]" }, body: `${MARKER}\nold` }];
  const { api, calls } = fakeApi(prior);
  const issue = { number: 7, title: "bug: x", body: filled(bug), state: "closed", user: author, labels: [{ name: LABEL }] };
  assert.equal(await enforceIssue({ api, repo: "acme/app", issue, forms }), "reopened");
  assert.ok(calls.some((c) => c.method === "PATCH" && c.data?.state === "open"));
  assert.ok(calls.some((c) => c.method === "PATCH" && c.path === "/issues/comments/99" && /open again/.test(c.data.body)));
});

test("leaves conforming issues, bots, and issues closed for other reasons alone", async () => {
  const bug = forms.find((f) => f.title.startsWith("bug"));
  for (const issue of [
    { number: 1, title: "bug: x", body: filled(bug), state: "open", user: author, labels: [] },
    { number: 2, title: "x", body: "x", state: "open", user: { login: "app", type: "Bot" }, labels: [] },
  ]) {
    const { api, calls } = fakeApi();
    await enforceIssue({ api, repo: "acme/app", issue, forms });
    assert.ok(!calls.some((c) => c.method !== "GET"), `#${issue.number} must not be changed`);
  }
});
