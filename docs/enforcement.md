# How the standards are enforced

Templates alone do not stop anything: GitHub pre-fills a PR description from the template but never rejects a PR for ignoring it. These pieces turn the standards into rules GitHub enforces.

## Pull requests: an organization ruleset

The organization ruleset **PR standard** targets the default branch of every FantasticDevHQ repository. It requires a pull request, and requires the workflow [`org-pr-standard.yml`](../.github/workflows/org-pr-standard.yml) from this repository to pass.

That workflow runs in the target repository with a read-only token, and executes only this repository's validator ([`scripts/org-pr-check.mjs`](../scripts/org-pr-check.mjs)). It checks the title, the five sections, the evidence, and the Linear references on every commit. When a PR does not conform, the check fails, the merge is blocked, and the job summary tells the author, by name, exactly what to fix. Editing the PR runs it again.

Organization admins may bypass the ruleset in an emergency, through a pull request only; GitHub logs every bypass. Bot PRs, including release PRs, must comply like any other; they are not exempt.

GitHub does not run ruleset-required workflows when only a PR's title or description changes. Every repository therefore also gets (rolled out per repository, like the Issue standard) the [`PR standard re-run`](../workflow-templates/pr-standard-rerun.yml) workflow. On a title or description edit it re-runs the latest `Org PR standard` check for the PR's head (waiting for a run in progress to finish first), so fixing the description unblocks the PR and breaking it blocks it again. It only re-runs the organization's required workflow (matched by its `required_workflows` URL, so a same-named workflow added by a PR is ignored), leaves fork runs awaiting approval alone, and tells the author to push a commit or reopen the PR if GitHub refuses a re-run (more than 30 days after the run). It runs [`scripts/rerun-org-pr-standard.mjs`](../scripts/rerun-org-pr-standard.mjs) from this repository with `actions: write` and never checks out PR code.

## Issues: forms, plus a check for API-created issues

The issue forms in [`.github/ISSUE_TEMPLATE`](../.github/ISSUE_TEMPLATE) are the organization defaults, and `blank_issues_enabled: false` makes the GitHub UI refuse free-form issues.

Issues created with `gh issue create` or the API skip forms. Every repository with issues enabled runs the [`Issue standard`](../workflow-templates/issue-standard.yml) workflow, which runs [`scripts/enforce-issue-standard.mjs`](../scripts/enforce-issue-standard.mjs) from this repository. It reads the repository's own forms, or the organization defaults if it has none. For an issue that does not follow a form, it:

1. **comments first**: @-mentions the author, says why, lists exactly what is missing, links the forms, and explains how to fix it;
2. adds the `needs-form` label and closes the issue as not planned.

When the author edits the issue to conform, the workflow reopens it and thanks them. It never closes an issue without that comment. Issues opened by GitHub Apps are skipped.

The workflow is also published as an organization workflow template, so new repositories can add it from the **Actions** tab.
