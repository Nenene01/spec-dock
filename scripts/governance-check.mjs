import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const required = [
  "CONSTITUTION.md",
  "AGENTS.md",
  "README.md",
  "CONTRIBUTING.md",
  "agents/coding.md",
  "agents/review.md",
  "agents/security.md",
  "specs/README.md",
  "specs/domain/source-catalog.md",
  "specs/features/mvp.md",
  "specs/features/studio-reader-experience.md",
  "specs/features/offline-studio.md",
  "docs/README.md",
  "docs/architecture/README.md",
  "docs/adr/README.md",
  "docs/guides/development-loop.md",
  "docs/guides/hosting.md",
  "docs/guides/agent-loop.md",
  "rules/README.md",
  ".github/pull_request_template.md",
  ".github/workflows/ci.yml",
];

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && extname(path) === ".md" ? [path] : [];
  });
}

export function checkGovernance(root) {
  const problems = [];
  for (const file of required) if (!existsSync(join(root, file))) problems.push(`必須ファイルがありません: ${file}`);
  const files = ["README.md", "CONTRIBUTING.md", "AGENTS.md", "CONSTITUTION.md"]
    .map((file) => join(root, file)).filter(existsSync);
  for (const directory of ["agents", "docs", "rules", "specs", ".github"]) files.push(...markdownFiles(join(root, directory)));
  for (const file of files) {
    const content = readFileSync(file, "utf8").replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm, "").replace(/`[^`\n]*`/g, "");
    for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const destination = match[1].split(/[?#]/)[0];
      if (!destination || /^[a-z][a-z\d+.-]*:/i.test(destination)) continue;
      let path;
      try { path = decodeURIComponent(destination); } catch { problems.push(`${relative(root, file)}: 不正なリンク ${destination}`); continue; }
      const target = resolve(isAbsolute(path) ? root : dirname(file), path.replace(/^\//, ""));
      if (target !== root && !target.startsWith(`${root}${sep}`)) problems.push(`${relative(root, file)}: リポジトリ外へのリンク ${destination}`);
      else if (!existsSync(target)) problems.push(`${relative(root, file)}: リンク先がありません ${destination}`);
    }
  }
  return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = checkGovernance(process.cwd());
  if (problems.length) {
    for (const problem of problems) console.error(problem);
    process.exitCode = 1;
  } else console.log(`Governance files and links verified: ${required.length} required files`);
}
