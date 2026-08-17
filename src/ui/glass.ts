export type AppearanceTheme = "dark" | "light";

export interface GlassVariables {
  alpha: number;
  blur: number;
  saturation: number;
  shine: number;
  edge: string;
}

export function glassVariables(theme: AppearanceTheme, amount: number): GlassVariables {
  const t = Math.max(0, Math.min(100, amount)) / 100;
  const solidAlpha = theme === "dark" ? 0.78 : 0.92;
  const glassAlpha = theme === "dark" ? 0.16 : 0.38;
  const edgeAlpha = theme === "dark" ? 0.06 + 0.18 * t : 0.28 + 0.5 * t;
  return {
    alpha: solidAlpha + (glassAlpha - solidAlpha) * t,
    blur: Math.round(2 + 34 * t),
    saturation: Math.round(100 + 90 * t),
    shine: 0.015 + 0.16 * t,
    edge: `rgba(255, 255, 255, ${edgeAlpha.toFixed(3)})`,
  };
}
