import fs from "node:fs";

const required = [
  "CONSTITUTION.md",
  "AGENTS.md",
  "agents/coding.md",
  "agents/review.md",
  "agents/security.md",
  "specs/README.md",
  "docs/architecture/README.md",
  "docs/adr/README.md",
  "docs/guides/agent-loop.md",
  "rules/README.md",
];

const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length > 0) {
  console.error("Missing governance files:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

console.log(`Governance files verified: ${required.length}`);
