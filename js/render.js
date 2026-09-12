// ============================================================
// 渲染:页面所有动态内容在这里生成
// ============================================================
import { Hct, argbFromHex, hexFromArgb } from '../vendor/mcu/index.js';
import { t } from './lang.js';
import { state } from './state.js';
import { supportedLangs } from './i18n.js';
import { syncColorPicker } from './picker.js';
import {
  VARIANTS, PRESETS, TILE_ROLES, PALETTE_GROUPS, TONES, PAIRINGS,
  kebab, cssVar, colorsOf,
} from './engine.js';

const $ = (id) => document.getElementById(id);

// ---------- 静态文案与整站换肤 ----------

export function applyStaticTexts() {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  document.documentElement.lang = state.lang;
  document.title = t('app.title');
  document.querySelector('meta[name="description"]').content = t('app.desc');
}

// 把当前主题的角色色写入 :root 的 --m3-* 变量,整站实时换肤
export function applyThemeVars(colors) {
  for (const [role, hex] of Object.entries(colors)) {
    document.documentElement.style.setProperty(cssVar(role), hex);
  }
  document.documentElement.dataset.theme = state.theme;
  // 移动端浏览器地址栏颜色跟随当前方案的 surface
  document.querySelector('meta[name="theme-color"]').content = colors.surface;
}

// ---------- 顶栏 ----------

export function renderLangMenu() {
  $('lang-btn').setAttribute('aria-label', t('header.language'));
  $('lang-list').innerHTML = supportedLangs.map(({ value, label }) => `
    <button class="lang-item ${value === state.lang ? 'active' : ''}" data-lang="${value}" type="button" role="menuitem">
      <span>${label}</span>
      <svg class="check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
           stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
    </button>`).join('');
}

export function closeLangMenu() {
  $('lang-list').classList.remove('open');
  $('lang-btn').setAttribute('aria-expanded', 'false');
}

export function updateThemeToggle() {
  const label = state.theme === 'dark' ? t('theme.toLight') : t('theme.toDark');
  $('theme-toggle').title = label;
  $('theme-toggle').setAttribute('aria-label', label);
}

// ---------- 源色控件 ----------

export function renderVariantChips() {
  $('variant-chips').innerHTML = Object.keys(VARIANTS).map((value) => `
    <button class="chip ${value === state.variant ? 'active' : ''}" data-variant="${value}" type="button">
      ${t(`variant.${value}`)}
    </button>`).join('');
}

export function renderPresets() {
  $('preset-row').innerHTML = PRESETS.map(({ hex, labelKey }) => `
    <button class="preset ${hex === state.seed ? 'active' : ''}" data-seed="${hex}" type="button">
      <span class="preset-dot" style="background:${hex}"></span>${t(labelKey)}
    </button>`).join('');
}

export function syncSeedInputs() {
  $('hex-input').value = state.seed;
  syncColorPicker(state.seed);
  // 大色块舞台:铺满源色,文字颜色按色调明暗自动选择
  const stage = $('seed-stage');
  stage.style.background = state.seed;
  stage.style.color = Hct.fromInt(argbFromHex(state.seed)).tone >= 60
    ? 'rgba(0,0,0,.78)'
    : 'rgba(255,255,255,.92)';
  $('seed-stage-hex').textContent = state.seed;
}

// ---------- 配色方案色板 ----------

const hexChip = (colors, role) => `
  <button class="tile-hex" data-copy="${colors[role]}" type="button" title="${t(`role.${role}`)} · ${kebab(role)}">
    <i style="background:${colors[role]}"></i>${colors[role]}
  </button>`;

// 单个角色色板:成对角色显示 "Aa" 搭配块,独立角色显示纯色块
function tile(colors, { role, fg }) {
  const block = fg
    ? `<span class="tile-block" data-copy="${colors[role]}" style="background:${colors[role]}; color:${colors[fg]}">Aa</span>`
    : `<span class="tile-color" data-copy="${colors[role]}" style="background:${colors[role]}"></span>`;
  return `
    <div class="tile" title="${t(`roleDesc.${role}`)}">
      <span class="tile-label"><b>${t(`role.${role}`)}</b><code>${kebab(role)}</code></span>
      ${block}
      <span class="tile-hexes">${hexChip(colors, role)}${fg ? hexChip(colors, fg) : ''}</span>
    </div>`;
}

export function renderSchemePanels(schemes) {
  $('scheme-grid').innerHTML = ['light', 'dark'].map((mode) => {
    const colors = colorsOf(schemes[mode]);
    return `
      <div class="panel" style="background:${colors.surface}; border-color:${colors.outlineVariant}; color:${colors.onSurface}">
        <h3>${t(`scheme.${mode}`)}</h3>
        <div class="tile-grid">${TILE_ROLES.map((role) => tile(colors, role)).join('')}</div>
      </div>`;
  }).join('');
}

// ---------- 色调板 ----------

export function renderPalettes(schemes) {
  $('palette-list').innerHTML = PALETTE_GROUPS.map(({ labelKey, palette }) => {
    const tonalPalette = schemes.light[palette];
    const swatches = TONES.map((tone) => {
      const hex = hexFromArgb(tonalPalette.tone(tone));
      const ink = tone >= 60 ? 'rgba(0,0,0,.72)' : 'rgba(255,255,255,.85)';
      return `
        <button class="swatch" data-copy="${hex}" type="button" style="background:${hex}; color:${ink}">
          <span class="swatch-tone">${tone}</span>
          <span class="swatch-hex">${hex}</span>
        </button>`;
    }).join('');
    return `
      <div class="palette-row">
        <h4>${t(labelKey)}</h4>
        <div class="swatch-row">${swatches}</div>
      </div>`;
  }).join('');
}

// ---------- 新手指南 ----------

export function renderGuide(schemes) {
  $('guide-rules').innerHTML = [1, 2, 3].map((n) => `
    <div class="guide-rule">
      <strong>${t(`guide.rule${n}.title`)}</strong>${t(`guide.rule${n}.text`)}
    </div>`).join('');

  const colors = colorsOf(schemes[state.theme]);
  const cell = (role) => `
    <span class="pair-dot" style="background:${colors[role]}"></span><code>${kebab(role)}</code>`;
  $('pair-table').innerHTML = `
    <thead>
      <tr>
        <th>${t('guide.col.usage')}</th>
        <th>${t('guide.col.bg')}</th>
        <th>${t('guide.col.fg')}</th>
        <th>${t('guide.col.sample')}</th>
      </tr>
    </thead>
    <tbody>
      ${PAIRINGS.map(({ usageKey, bg, fg }) => `
        <tr>
          <td>${t(usageKey)}</td>
          <td>${cell(bg)}</td>
          <td>${fg ? cell(fg) : '—'}</td>
          <td>${fg
            ? `<span class="pair-sample" style="background:${colors[bg]}; color:${colors[fg]}">${t(usageKey)}</span>`
            : `<span class="pair-line" style="background:${colors[bg]}"></span>`}</td>
        </tr>`).join('')}
    </tbody>`;
}

// ---------- 组件预览 ----------

function previewDemo(colors, title) {
  return `
    <div class="panel">
      <h3>${title}</h3>
      <div class="demo" style="background:${colors.surface}; border-color:${colors.outlineVariant}">
        <div class="demo-window">
          <i></i><i></i><i></i>
        </div>
        <div class="demo-content">
          <div class="demo-title" style="color:${colors.onSurface}">${t('preview.cardTitle')}</div>
          <p class="demo-body" style="color:${colors.onSurfaceVariant}">${t('preview.cardBody')}</p>
          <div class="demo-actions">
            <button class="demo-btn" style="background:${colors.primary}; color:${colors.onPrimary}" type="button">${t('preview.filled')}</button>
            <button class="demo-btn" style="background:${colors.secondaryContainer}; color:${colors.onSecondaryContainer}" type="button">${t('preview.tonal')}</button>
            <button class="demo-btn" style="background:transparent; border:1px solid ${colors.outline}; color:${colors.primary}" type="button">${t('preview.outlined')}</button>
            <button class="demo-btn" style="background:transparent; color:${colors.primary}" type="button">${t('preview.textBtn')}</button>
          </div>
          <div class="demo-footer">
            <span class="demo-chip" style="background:${colors.tertiaryContainer}; color:${colors.onTertiaryContainer}">${t('preview.chip')}</span>
            <button class="demo-fab" style="background:${colors.primaryContainer}; color:${colors.onPrimaryContainer}" type="button" aria-hidden="true">+</button>
          </div>
        </div>
      </div>
    </div>`;
}

export function renderPreview(schemes) {
  $('preview-grid').innerHTML = ['light', 'dark']
    .map((mode) => previewDemo(colorsOf(schemes[mode]), t(`scheme.${mode}`)))
    .join('');
}
