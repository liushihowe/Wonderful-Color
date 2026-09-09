// ============================================================
// 导出:把深 / 浅两套方案转成 CSS 变量或 JSON 令牌
// ============================================================
import { t } from './lang.js';
import { state } from './state.js';
import { colorsOf, cssVar } from './engine.js';

export function buildCssExport(schemes) {
  const block = (colors) => Object.entries(colors)
    .map(([role, hex]) => `  ${cssVar(role)}: ${hex};`)
    .join('\n');
  return [
    `/* ${t('app.title')} */`,
    `/* seed: ${state.seed} · variant: ${state.variant} */`,
    '',
    ':root,',
    '[data-theme="light"] {',
    block(colorsOf(schemes.light)),
    '}',
    '',
    '[data-theme="dark"] {',
    block(colorsOf(schemes.dark)),
    '}',
    '',
  ].join('\n');
}

export function buildJsonExport(schemes) {
  return JSON.stringify({
    seed: state.seed,
    variant: state.variant,
    light: colorsOf(schemes.light),
    dark: colorsOf(schemes.dark),
  }, null, 2);
}
