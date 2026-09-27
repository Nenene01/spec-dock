import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const defaultConfig = {
  studio: { title: "SpecDock", subtitle: "ソース仕様に接続する開発Studio" },
  api: { mode: "code-first" },
};

export async function loadProjectConfig(project, configPath) {
  for (const filename of configPath ? [configPath] : ["spec-dock.config.json", ".specdockrc.json"]) {
    let raw;
    try { raw = await readFile(configPath ? resolve(project, filename) : join(project, filename), "utf8"); }
    catch (error) { if (configPath) throw error; continue; }
    try {
      const parsed = JSON.parse(raw);
      return { ...defaultConfig, ...parsed, studio: { ...defaultConfig.studio, ...(parsed.studio ?? {}) }, api: { ...defaultConfig.api, ...(parsed.api ?? {}) }, file: filename };
    } catch {
      return { studio: { ...defaultConfig.studio }, api: { mode: null }, file: filename, parseError: true };
    }
  }
  return { ...defaultConfig, api: { ...defaultConfig.api }, file: null };
}
