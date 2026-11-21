// Reads the organization's issue forms and extracts what each one requires,
// without a YAML dependency. The forms are simple and owned by this repository.
import { readdirSync, readFileSync } from "node:fs";

const unquote = (value) => value.trim().replace(/^["']|["']$/g, "");

export function parseForm(text, file) {
  const form = { file, name: "", title: "", labels: [], fields: [] };
  let field;
  let option;
  for (const line of text.split("\n")) {
    const top = line.match(/^(name|title|labels):\s*(.*)$/);
    if (top) {
      if (top[1] === "labels")
        form.labels = [...top[2].matchAll(/"([^"]+)"|'([^']+)'/g)].map((m) => m[1] ?? m[2]);
      else form[top[1]] = unquote(top[2]);
      continue;
    }
    const type = line.match(/^\s*- type:\s*(\S+)/);
    if (type) {
      field = { type: type[1], label: "", required: false, options: [] };
      option = undefined;
      if (type[1] !== "markdown") form.fields.push(field);
      continue;
    }
    if (!field) continue;
    const label = line.match(/^\s*label:\s*(.+)$/);
    const optionLabel = line.match(/^\s*- label:\s*(.+)$/);
    if (optionLabel) {
      option = { label: unquote(optionLabel[1]), required: false };
      field.options.push(option);
    } else if (label && !field.label) field.label = unquote(label[1]);
    if (/^\s*required:\s*true\s*$/.test(line)) {
      if (field.type === "checkboxes" && option) option.required = true;
      else field.required = true;
    }
  }
  return form;
}

export function loadForms(directory) {
  return readdirSync(directory)
    .filter((file) => /\.ya?ml$/.test(file) && file !== "config.yml")
    .sort()
    .map((file) => parseForm(readFileSync(new URL(file, directory), "utf8"), file));
}
