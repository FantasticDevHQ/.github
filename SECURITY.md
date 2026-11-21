# Security policy

This policy covers every public repository and published package in
[FantasticDevHQ](https://github.com/FantasticDevHQ).

## Reporting a vulnerability

**Do not open a public issue, discussion or pull request for a security
problem.**

Report it privately through GitHub: open the affected repository's
**Security** tab and choose **Report a vulnerability**
(`https://github.com/FantasticDevHQ/<repository>/security/advisories/new`).
If that is not available, email [hello@fantastic.dev](mailto:hello@fantastic.dev)
with the subject line "Security report" and we will move the report into a
private advisory.

Please include:

- The affected repository, package and version or commit.
- What an attacker can do, and under which configuration.
- Steps or a proof of concept that reproduces it.
- Any suggested fix or mitigation.

Use test accounts and local or synthetic environments. Do not access other
people's data, degrade a service or run automated scanners against
infrastructure you do not own.

## What to expect

These projects are maintained on a best-effort basis, and security reports take
priority over other work. We will:

- Acknowledge your report and keep you updated in the private advisory.
- Confirm the issue, agree a severity with you and work on a fix or mitigation.
- Publish a GitHub security advisory with the fixed versions, request a CVE
  where appropriate, and credit you unless you ask us not to.

Please give us a reasonable chance to release a fix before disclosing
publicly, and tell us if you plan to disclose on a particular date.

## Supported versions

Security fixes go into the latest release of each package. We backport to an
earlier major version when practical. Upgrade to the latest release before
reporting where you can.

## Scope

In scope: the source code in these repositories, packages published from them
and their release workflows.

Out of scope: vulnerabilities in third-party dependencies that are already
public (report them upstream; we track them through automated updates), issues
that require an already compromised machine or account, and missing hardening
with no demonstrated impact.
