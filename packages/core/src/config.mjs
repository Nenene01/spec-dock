import { readFile } from "node:fs/promises";
import { join } from "node:path";

const defaultConfig = {
  api: { mode: "code-first" },
};

export async function loadProjectConfig(project) {
  for (const filename of ["spec-dock.config.json", ".specdockrc.json"]) {
    let raw;
    try { raw = await readFile(join(project, filename), "utf8"); } catch { continue; }
    try {
      const parsed = JSON.parse(raw);
      return { ...defaultConfig, ...parsed, api: { ...defaultConfig.api, ...(parsed.api ?? {}) }, file: filename };
    } catch {
      return { api: { mode: null }, file: filename, parseError: true };
    }
  }
  return { ...defaultConfig, api: { ...defaultConfig.api }, file: null };
}
