export const appearanceStorageKey = "specdock:appearance:v2";
const legacyStorageKey = "specdock:appearance:v1";
const previousDefaultFontFamily = '-apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif';
const previousEditorFontStack = 'Menlo, "Hack Nerd Font", Monaco, "Courier New", monospace';
export const preferredFontStack = 'Menlo, "Hack Nerd Font", Monaco, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif';

export const themeOptions = [
  { id: "dark", label: "Dark (SpecDock)", background: "#0b0f14", sidebar: "#111827", surface: "#111820", elevated: "#1b2430", border: "#263140", text: "#d6d9e0", muted: "#9aa4b2", accent: "#a78bfa", strong: "#8b5cf6", subtle: "#2a214b" },
  { id: "abyss", label: "Abyss", background: "#06111f", sidebar: "#0b1a2e", surface: "#102338", elevated: "#162e47", border: "#24425d", text: "#d8e8f5", muted: "#a1b7cb", accent: "#62d5f7", strong: "#299fc9", subtle: "#163a56" },
  { id: "monokai", label: "Monokai Dark", background: "#1d1e19", sidebar: "#252620", surface: "#2b2c25", elevated: "#35372e", border: "#46493d", text: "#e9e9df", muted: "#b4b7a8", accent: "#a6e22e", strong: "#7fb51f", subtle: "#354426" },
  { id: "one-dark", label: "One Dark", background: "#191d25", sidebar: "#21252b", surface: "#282c34", elevated: "#303641", border: "#3b414c", text: "#d7dae0", muted: "#a4acb8", accent: "#61afef", strong: "#358bce", subtle: "#253d55" },
];

export const defaultAppearance = {
  theme: "dark",
  fontFamily: preferredFontStack,
  fontSize: 14,
};

export function normalizeAppearance(value) {
  const source = value && typeof value === "object" ? value : {};
  const fontFamily = typeof source.fontFamily === "string" ? source.fontFamily.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 180) : "";
  const fontSize = Number(source.fontSize);
  return {
    theme: themeOptions.some((option) => option.id === source.theme) ? source.theme : defaultAppearance.theme,
    fontFamily: fontFamily === previousDefaultFontFamily || fontFamily === previousEditorFontStack ? defaultAppearance.fontFamily : fontFamily || defaultAppearance.fontFamily,
    fontSize: Number.isInteger(fontSize) && fontSize >= 10 && fontSize <= 28 ? fontSize : defaultAppearance.fontSize,
  };
}

export function appearanceStyles(appearance) {
  const settings = normalizeAppearance(appearance);
  const theme = themeOptions.find((option) => option.id === settings.theme);
  return {
    "--studio-bg": theme.background,
    "--studio-sidebar": theme.sidebar,
    "--studio-surface": theme.surface,
    "--studio-elevated": theme.elevated,
    "--studio-border": theme.border,
    "--studio-text": theme.text,
    "--studio-muted": theme.muted,
    "--studio-accent": theme.accent,
    "--studio-accent-strong": theme.strong,
    "--studio-accent-subtle": theme.subtle,
    "--studio-font": settings.fontFamily,
    "--studio-scale": settings.fontSize / 14,
  };
}

export function loadAppearance(storage) {
  try {
    const saved = storage.getItem(appearanceStorageKey);
    if (saved) return normalizeAppearance(JSON.parse(saved));
    const legacy = JSON.parse(storage.getItem(legacyStorageKey) || "null");
    if (!legacy) return { ...defaultAppearance };
    const legacyFonts = { system: defaultAppearance.fontFamily, sans: '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif', mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' };
    const legacyThemes = { violet: "dark", blue: "abyss", teal: "abyss", amber: "monokai", rose: "one-dark" };
    return normalizeAppearance({ theme: legacyThemes[legacy.color], fontFamily: legacyFonts[legacy.font], fontSize: legacy.size });
  } catch { return { ...defaultAppearance }; }
}

export function saveAppearance(storage, appearance) {
  try { storage.setItem(appearanceStorageKey, JSON.stringify(normalizeAppearance(appearance))); }
  catch { /* The controls still work when browser storage is unavailable. */ }
}
