import { readFile } from "node:fs/promises";
import { join } from "node:path";

const defaultConfig = {
  studio: { title: "SpecDock", subtitle: "ソース仕様に接続する開発Studio" },
  api: { mode: "code-first" },
};

export async function loadProjectConfig(project) {
  for (const filename of ["spec-dock.config.json", ".specdockrc.json"]) {
    let raw;
    try { raw = await readFile(join(project, filename), "utf8"); } catch { continue; }
    try {
      const parsed = JSON.parse(raw);
      return { ...defaultConfig, ...parsed, studio: { ...defaultConfig.studio, ...(parsed.studio ?? {}) }, api: { ...defaultConfig.api, ...(parsed.api ?? {}) }, file: filename };
    } catch {
      return { studio: { ...defaultConfig.studio }, api: { mode: null }, file: filename, parseError: true };
    }
  }
  return { ...defaultConfig, api: { ...defaultConfig.api }, file: null };
}
