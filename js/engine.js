// ============================================================
// 配色引擎:基于官方 material-color-utilities(vendor/mcu)
// 从源色生成深 / 浅两套 M3 方案,并提供渲染 / 换肤 / 导出
// 共用的静态配置(角色、色阶、预设色、组件搭配)
// ============================================================
import {
  Hct, argbFromHex, hexFromArgb,
  SchemeTonalSpot, SchemeVibrant, SchemeExpressive, SchemeNeutral,
  SchemeFidelity, SchemeContent, SchemeMonochrome,
} from '../vendor/mcu/index.js';

// 方案类型:键名与官方 Scheme 类一一对应
export const VARIANTS = {
  tonalSpot: SchemeTonalSpot,
  vibrant: SchemeVibrant,
  expressive: SchemeExpressive,
  neutral: SchemeNeutral,
  fidelity: SchemeFidelity,
  content: SchemeContent,
  monochrome: SchemeMonochrome,
};

// 预设源色
export const PRESETS = [
  { hex: '#6750A4', labelKey: 'preset.baseline' },
  { hex: '#4285F4', labelKey: 'preset.gBlue' },
  { hex: '#DB4437', labelKey: 'preset.gRed' },
  { hex: '#F4B400', labelKey: 'preset.gYellow' },
  { hex: '#0F9D58', labelKey: 'preset.gGreen' },
  { hex: '#00897B', labelKey: 'preset.teal' },
  { hex: '#EF6C00', labelKey: 'preset.orange' },
  { hex: '#E91E63', labelKey: 'preset.pink' },
];

// 成对角色:bg 是背景色,fg 是放在它上面的文字/图标颜色(展示与导出都按此顺序)
export const ROLE_PAIRS = [
  { bg: 'primary', fg: 'onPrimary' },
  { bg: 'primaryContainer', fg: 'onPrimaryContainer' },
  { bg: 'secondary', fg: 'onSecondary' },
  { bg: 'secondaryContainer', fg: 'onSecondaryContainer' },
  { bg: 'tertiary', fg: 'onTertiary' },
  { bg: 'tertiaryContainer', fg: 'onTertiaryContainer' },
  { bg: 'error', fg: 'onError' },
  { bg: 'surface', fg: 'onSurface' },
  { bg: 'surfaceVariant', fg: 'onSurfaceVariant' },
  { bg: 'inverseSurface', fg: 'inverseOnSurface' },
];

// 独立角色:描边与容器表面,没有固定搭配的前景色
export const SOLO_ROLES = [
  'outline', 'outlineVariant',
  'surfaceContainer', 'surfaceContainerLow', 'surfaceContainerHigh', 'surfaceContainerHighest',
  'inversePrimary',
];

// 参与展示与导出的 Material 3 角色名(与 scheme 上的 getter 同名)
export const ROLES = [...ROLE_PAIRS.flatMap(({ bg, fg }) => [bg, fg]), ...SOLO_ROLES];

// 色板展示:[背景角色, 搭配的前景角色(可空)],成对与独立角色统一处理
export const TILE_ROLES = [
  ...ROLE_PAIRS.map(({ bg, fg }) => ({ role: bg, fg })),
  ...SOLO_ROLES.map((role) => ({ role, fg: null })),
];

// 色调板分组:palette 是 scheme 上的调色板属性
export const PALETTE_GROUPS = [
  { labelKey: 'palette.primary', palette: 'primaryPalette' },
  { labelKey: 'palette.secondary', palette: 'secondaryPalette' },
  { labelKey: 'palette.tertiary', palette: 'tertiaryPalette' },
  { labelKey: 'palette.error', palette: 'errorPalette' },
  { labelKey: 'palette.neutral', palette: 'neutralPalette' },
  { labelKey: 'palette.neutralVariant', palette: 'neutralVariantPalette' },
];

// 展示的色阶:官方 13 级色调(100、98、95、90、80、70、60、50、40、30、20、10、0)
export const TONES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 100];

// 常见组件搭配:usageKey 是 i18n 键,bg / fg 是角色名(成对使用,divider 无前景色)
export const PAIRINGS = [
  { usageKey: 'pair.filledBtn', bg: 'primary', fg: 'onPrimary' },
  { usageKey: 'pair.fab', bg: 'primaryContainer', fg: 'onPrimaryContainer' },
  { usageKey: 'pair.tonalBtn', bg: 'secondaryContainer', fg: 'onSecondaryContainer' },
  { usageKey: 'pair.chip', bg: 'tertiaryContainer', fg: 'onTertiaryContainer' },
  { usageKey: 'pair.card', bg: 'surfaceContainerLow', fg: 'onSurface' },
  { usageKey: 'pair.page', bg: 'surface', fg: 'onSurfaceVariant' },
  { usageKey: 'pair.input', bg: 'surface', fg: 'onSurface' },
  { usageKey: 'pair.errorBtn', bg: 'error', fg: 'onError' },
  { usageKey: 'pair.snackbar', bg: 'inverseSurface', fg: 'inverseOnSurface' },
  { usageKey: 'pair.divider', bg: 'outlineVariant', fg: null },
];

export const kebab = (name) => name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
export const cssVar = (role) => `--m3-${kebab(role)}`;

// 从源色 + 方案类型生成深 / 浅两套方案
export function buildSchemes(seed, variant) {
  const sourceColorHct = Hct.fromInt(argbFromHex(seed));
  const SchemeClass = VARIANTS[variant];
  return {
    light: new SchemeClass(sourceColorHct, false, 0.0),
    dark: new SchemeClass(sourceColorHct, true, 0.0),
  };
}

// 方案 → { 角色名: '#HEX' } 映射,渲染 / 换肤 / 导出共用
export function colorsOf(scheme) {
  return Object.fromEntries(ROLES.map((role) => [role, hexFromArgb(scheme[role])]));
}
