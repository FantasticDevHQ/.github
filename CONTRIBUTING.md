# Contributing to Fantastic.Dev projects

Thanks for helping. This guide applies to every public repository in
[FantasticDevHQ](https://github.com/FantasticDevHQ). Each repository's README
**Contributing** section, `docs/development.md` and `AGENTS.md` add the exact
runtime, install and check commands for that project. Where they are more
specific than this guide, follow them.

By taking part you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).
Do not report security problems in public issues; see the
[security policy](SECURITY.md).

## Ways to contribute

- **Ask a question** in
  [Discussions](https://github.com/FantasticDevHQ/.github/discussions/categories/q-a).

- **Report a bug** with the bug report form. A minimal reproduction is the
  single most useful thing you can give us.
- **Report a broken agent setup.** Every README has a "Have my agent set this
  up" prompt. If your coding agent could not follow it to a working result, use
  the agent setup form. These reports are as valuable as bug reports.
- **Improve documentation.** Typos, unclear steps, missing prerequisites and
  commands that no longer work are all worth fixing.
- **Propose a feature** with the feature request form before writing code.
- **Fix an issue.** Issues labeled `good first issue` or `help wanted` are ready
  for outside contributors.

## Before you start

Open or comment on an issue before starting anything larger than a small fix,
so we can agree on the approach before you invest time. Comment on an issue to
say you are working on it; if there has been no activity for 14 days, someone
else may pick it up.

Small fixes (typos, broken links, clearly wrong docs, one-line bug fixes with a
test) can go straight to a pull request.

## Development setup

1. Fork the repository and clone your fork.
2. Install the runtime version the repository declares (`engines` in
   `package.json`, `.nvmrc`, `.node-version` or the README).
3. Install dependencies with the repository's own package manager and committed
   lockfile. Do not switch package managers or regenerate the lockfile from
   scratch.
4. Run the full check command from the README **Contributing** section (for
   example `pnpm check`) **before** you change anything, so you know the
   baseline.
5. Create a branch from the default branch for your change.

Most projects provide local, synthetic or dry-run paths for anything that talks
to an external service. Never use production credentials, send live messages,
charge cards or deploy to demonstrate a change.

## Making changes

- Keep each pull request focused on one change. Separate refactors from
  behavior changes.
- Add or update tests for every behavior change. A bug fix should include a
  test that fails without it.
- Update the README and `docs/` in the same pull request when behavior,
  configuration or commands change.
- Preserve the project's architecture, public API and package boundaries unless
  the change has been agreed in an issue.
- Do not commit generated evidence, screenshots, logs or local configuration.
  Evidence belongs in the pull request.
- Do not bump versions or edit `CHANGELOG.md`. Releases are automated from
  commit history.
- Keep secrets out of code, tests, fixtures, logs and pull requests.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```text
type(scope): short description
```

Types are `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`,
`ci`, `chore` and `revert`. The scope is optional. Mark a breaking change with
`!` before the colon and explain it in a `BREAKING CHANGE:` footer.

Every non-merge commit says what it works on, on its own line in the commit
body. Maintainers reference Linear tickets. As an outside contributor, reference
the GitHub issue with a closing word such as `Fixes`, or a non-closing word such
as `Refs` for partial work:

```text
fix(cli): handle missing config file

Fixes #42
```

A commit with no related issue carries a reason instead, such as
`No-ticket: typo fix`.

If the check reports a missing reference after you push, amend or reword the
commit and force-push your branch.

## Pull requests

Open the pull request against the default branch and fill in the template. An
automated **PR standard** check validates the title and description and leaves
one comment listing anything to fix. Editing the description re-runs it; you do
not need a new commit.

- **Title:** a Conventional Commit title, such as
  `fix(cli): handle missing config file`.
- **Summary:** the resulting behavior, then the issue on its own line:
  `Fixes #42` (closes it on merge) or `Refs #42` (partial work). With no issue,
  write `No ticket: <reason>`.
- **What** and **Why:** the concrete changes, the problem they solve and why
  this approach.
- **Evidence:** the commands you ran and their output, or a link reviewers can
  open. "Tests pass" alone is not evidence. Declare `UI changes: Yes` or
  `UI changes: No`; UI changes need a screenshot or video of the affected flow.
- **Agent:** who or what wrote the change (see below). If you wrote it
  yourself, use your GitHub username and `human-authored` as the session ID.

Leave "Allow edits by maintainers" switched on so we can make small fixes
before merging. Draft pull requests are welcome for early feedback.

## Using coding agents

Agent-assisted contributions are welcome; most of these projects are built that
way. The same bar applies to every contribution, however it was produced:

- Name the agent and session in the **Agent** section. Do not present
  agent-written work as hand-written.
- You are responsible for the change. Read the diff, run the checks yourself
  and make sure the evidence is real.
- Keep agent pull requests as focused as hand-written ones. We close large,
  unrequested or unreviewed bulk changes.
- Never paste secrets, private code or other people's personal data into an
  agent session to produce a contribution.

## Review and merge

A maintainer aims to give first feedback within a week. Small, well-evidenced
pull requests are reviewed fastest. Merging requires the PR standard check, the
repository's CI and a maintainer approval. We squash-merge, so the pull request
title and description become the commit on the default branch.

Pull requests that wait on the author for 30 days may be closed. You are always
welcome to reopen one when you pick it back up.

## Licensing

Each repository's `LICENSE` file states its license. By submitting a
contribution you agree that it is licensed under that same license, and you
confirm that you have the right to submit it. No separate contributor license
agreement is required.
