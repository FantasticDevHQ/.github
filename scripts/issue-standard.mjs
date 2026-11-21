// Checks that an issue follows one of the organization's issue forms. Issues
// created in the GitHub UI already do; this catches issues created through the
// API or `gh issue create`, which skip forms.
const EMPTY = /^\s*(_no response_|n\/a|tbd|none|-)?\s*$/i;

function sections(body) {
  const found = new Map();
  let current;
  for (const line of (body ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading) {
      current = heading[1].trim().toLowerCase();
      found.set(current, "");
    } else if (current) found.set(current, `${found.get(current)}${line}\n`);
  }
  return found;
}

export function matchForm(issue, forms) {
  const title = (issue.title ?? "").toLowerCase();
  const labels = new Set((issue.labels ?? []).map((l) => (typeof l === "string" ? l : l.name)));
  return (
    forms.find((form) => form.title && title.startsWith(form.title.trim().toLowerCase())) ??
    forms.find((form) => form.labels.some((l) => l !== "needs-triage" && labels.has(l)))
  );
}

export function validateIssue(issue, forms) {
  const form = matchForm(issue, forms);
  if (!form)
    return {
      form: undefined,
      errors: [
        `Use one of the issue forms. Start the title with ${forms
          .map((f) => `\`${f.title.trim()}\``)
          .join(", ")} and fill in that form's sections.`,
      ],
    };
  const body = sections(issue.body);
  const errors = [];
  for (const field of form.fields) {
    const key = field.label.toLowerCase();
    if (field.type === "checkboxes") {
      const required = field.options.filter((o) => o.required);
      if (!required.length) continue;
      const text = body.get(key) ?? "";
      for (const option of required) {
        const ticked = text
          .split("\n")
          .some((line) => /^\s*[-*]\s*\[[xX]\]/.test(line) && line.includes(option.label));
        if (!ticked) errors.push(`Under **${field.label}**, confirm: "${option.label}"`);
      }
    } else if (field.required) {
      if (!body.has(key)) errors.push(`Add a **${field.label}** section (\`### ${field.label}\`).`);
      else if (EMPTY.test(body.get(key))) errors.push(`Fill in **${field.label}**; it is required.`);
    }
  }
  return { form, errors };
}
