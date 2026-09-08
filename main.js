// ============================================================
// Wonderful Color 核心逻辑
// 1. 用官方 material-color-utilities(vendor/mcu)从源色生成深/浅两套方案
// 2. 把当前主题的角色色写入 :root 的 --m3-* 变量,整站实时换肤
// 3. 渲染色板 / 色调板 / 组件预览,支持复制 CSS 变量与 JSON
// ============================================================
import {
  Hct, argbFromHex, hexFromArgb,
  SchemeTonalSpot, SchemeVibrant, SchemeExpressive, SchemeNeutral,
  SchemeFidelity, SchemeContent, SchemeMonochrome,
} from './vendor/mcu/index.js';
import { supportedLangs, defaultLang, messages } from './i18n.js';

// ---------- 静态配置 ----------

// 方案类型:键名与官方 Scheme 类一一对应
const VARIANTS = {
  tonalSpot: SchemeTonalSpot,
  vibrant: SchemeVibrant,
  expressive: SchemeExpressive,
  neutral: SchemeNeutral,
  fidelity: SchemeFidelity,
  content: SchemeContent,
  monochrome: SchemeMonochrome,
};

// 预设源色
const PRESETS = [
  { hex: '#6750A4', labelKey: 'preset.baseline' },
  { hex: '#4285F4', labelKey: 'preset.gBlue' },
  { hex: '#DB4437', labelKey: 'preset.gRed' },
  { hex: '#F4B400', labelKey: 'preset.gYellow' },
  { hex: '#0F9D58', labelKey: 'preset.gGreen' },
  { hex: '#00897B', labelKey: 'preset.teal' },
  { hex: '#EF6C00', labelKey: 'preset.orange' },
  { hex: '#E91E63', labelKey: 'preset.pink' },
];

// 参与展示与导出的 Material 3 角色名(与 scheme 上的 getter 同名)
const ROLES = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
  'error', 'onError',
  'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
  'outline', 'outlineVariant',
  'surfaceContainer', 'surfaceContainerLow', 'surfaceContainerHigh', 'surfaceContainerHighest',
  'inverseSurface', 'inverseOnSurface', 'inversePrimary',
];

// 色调板分组:palette 是 scheme 上的调色板属性,keyColor 是官方关键色角色
const PALETTE_GROUPS = [
  { labelKey: 'palette.primary', palette: 'primaryPalette', keyColor: 'primaryPaletteKeyColor' },
  { labelKey: 'palette.secondary', palette: 'secondaryPalette', keyColor: 'secondaryPaletteKeyColor' },
  { labelKey: 'palette.tertiary', palette: 'tertiaryPalette', keyColor: 'tertiaryPaletteKeyColor' },
  { labelKey: 'palette.error', palette: 'errorPalette', keyColor: null },
  { labelKey: 'palette.neutral', palette: 'neutralPalette', keyColor: 'neutralPaletteKeyColor' },
  { labelKey: 'palette.neutralVariant', palette: 'neutralVariantPalette', keyColor: 'neutralVariantPaletteKeyColor' },
];

// 展示的色阶(M3 常用采样)
const TONES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100];

// ---------- 状态 ----------

const store = localStorage;
const state = {
  lang: store.getItem('wc-lang') || (navigator.language.startsWith('zh') ? 'zh-CN' : defaultLang),
  theme: store.getItem('wc-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  variant: store.getItem('wc-variant') || 'tonalSpot',
  seed: store.getItem('wc-seed') || '#6750A4',
};

// ---------- DOM ----------

const $ = (id) => document.getElementById(id);
const langSelect = $('lang-select');
const themeToggle = $('theme-toggle');
const picker = $('picker');
const hexInput = $('hex-input');
const variantSelect = $('variant-select');
const presetRow = $('preset-row');
const schemeGrid = $('scheme-grid');
const paletteList = $('palette-list');
const previewGrid = $('preview-grid');
const toastEl = $('toast');

// ---------- 工具 ----------

const kebab = (name) => name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());

function t(key, params = {}) {
  let text = messages[state.lang]?.[key] ?? messages[defaultLang][key] ?? key;
  for (const [name, value] of Object.entries(params)) {
    text = text.replaceAll(`{${name}}`, value);
  }
  return text;
}

function applyStaticTexts() {
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n);
  }
  document.documentElement.lang = state.lang;
  document.title = t('app.title');
}

let toastTimer;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
}

async function copyText(text, toastValue) {
  await navigator.clipboard.writeText(text);
  showToast(t('toast.copied', { value: toastValue ?? text }));
}

// ---------- 取色引擎 ----------

function buildSchemes() {
  const sourceColorHct = Hct.fromInt(argbFromHex(state.seed));
  const SchemeClass = VARIANTS[state.variant];
  return {
    light: new SchemeClass(sourceColorHct, false, 0.0),
    dark: new SchemeClass(sourceColorHct, true, 0.0),
  };
}

function applyThemeVars(scheme) {
  for (const role of ROLES) {
    document.documentElement.style.setProperty(`--m3-${kebab(role)}`, hexFromArgb(scheme[role]));
  }
}

function rolePairs(scheme) {
  return ROLES.map((role) => [role, hexFromArgb(scheme[role])]);
}

// ---------- 渲染 ----------

function renderVariantOptions() {
  variantSelect.innerHTML = Object.keys(VARIANTS)
    .map((value) => `<option value="${value}" ${value === state.variant ? 'selected' : ''}>${t(`variant.${value}`)}</option>`)
    .join('');
}

function renderPresets() {
  presetRow.innerHTML = PRESETS.map(({ hex, labelKey }) => `
    <button class="preset ${hex === state.seed.toUpperCase() ? 'active' : ''}" data-seed="${hex}" type="button">
      <span class="preset-dot" style="background:${hex}"></span>${t(labelKey)}
    </button>`).join('');
}

function renderTileGrid(scheme) {
  return rolePairs(scheme).map(([role, hex]) => `
    <button class="tile" data-copy="${hex}" type="button">
      <span class="tile-color" style="background:${hex}"></span>
      <span class="tile-name">${kebab(role)}</span>
      <span class="tile-hex">${hex}</span>
    </button>`).join('');
}

function renderSchemePanels(schemes) {
  schemeGrid.innerHTML = ['light', 'dark'].map((mode) => `
    <div class="panel">
      <h3>${t(`scheme.${mode}`)}</h3>
      <div class="tile-grid">${renderTileGrid(schemes[mode])}</div>
    </div>`).join('');
}

function renderPalettes(schemes) {
  paletteList.innerHTML = PALETTE_GROUPS.map(({ labelKey, palette, keyColor }) => {
    const tonalPalette = schemes.light[palette];
    const keyTone = keyColor ? Hct.fromInt(schemes.light[keyColor]).tone : null;
    const swatches = TONES.map((tone) => {
      const hex = hexFromArgb(tonalPalette.tone(tone));
      const isKey = keyTone !== null && TONES.reduce((a, b) => (Math.abs(b - keyTone) < Math.abs(a - keyTone) ? b : a)) === tone;
      const textColor = tone >= 60 ? 'rgba(0,0,0,.72)' : 'rgba(255,255,255,.85)';
      return `
        <button class="swatch ${isKey ? 'key' : ''}" data-copy="${hex}" type="button" style="background:${hex}; color:${textColor}">
          <span>${tone}</span>
        </button>`;
    }).join('');
    return `
      <div class="palette-row">
        <h4>${t(labelKey)}</h4>
        <div class="swatch-row">${swatches}</div>
      </div>`;
  }).join('');
}

function renderPreviewDemo(scheme, title) {
  const hex = (role) => hexFromArgb(scheme[role]);
  return `
    <div class="panel">
      <h3>${title}</h3>
      <div class="demo" style="background:${hex('surface')}; border-color:${hex('outlineVariant')}">
        <div class="demo-title" style="color:${hex('onSurface')}">${t('preview.cardTitle')}</div>
        <p class="demo-body" style="color:${hex('onSurfaceVariant')}">${t('preview.cardBody')}</p>
        <div class="demo-actions">
          <button class="demo-btn" style="background:${hex('primary')}; color:${hex('onPrimary')}" type="button">${t('preview.filled')}</button>
          <button class="demo-btn" style="background:${hex('secondaryContainer')}; color:${hex('onSecondaryContainer')}" type="button">${t('preview.tonal')}</button>
          <button class="demo-btn" style="background:transparent; border:1px solid ${hex('outline')}; color:${hex('primary')}" type="button">${t('preview.outlined')}</button>
          <button class="demo-btn" style="background:transparent; color:${hex('primary')}" type="button">${t('preview.textBtn')}</button>
        </div>
        <div class="demo-footer">
          <span class="demo-chip" style="background:${hex('tertiaryContainer')}; color:${hex('onTertiaryContainer')}">${t('preview.chip')}</span>
          <button class="demo-fab" style="background:${hex('primaryContainer')}; color:${hex('onPrimaryContainer')}" type="button" aria-hidden="true">+</button>
        </div>
      </div>
    </div>`;
}

function renderPreview(schemes) {
  previewGrid.innerHTML =
    renderPreviewDemo(schemes.light, t('scheme.light')) +
    renderPreviewDemo(schemes.dark, t('scheme.dark'));
}

function updateThemeToggle() {
  themeToggle.textContent = state.theme === 'dark' ? '☀️' : '🌙';
  themeToggle.title = state.theme === 'dark' ? t('theme.toLight') : t('theme.toDark');
  themeToggle.setAttribute('aria-label', themeToggle.title);
}

function renderAll() {
  const schemes = buildSchemes();
  applyStaticTexts();
  applyThemeVars(schemes[state.theme]);
  document.documentElement.dataset.theme = state.theme;
  renderVariantOptions();
  renderPresets();
  renderSchemePanels(schemes);
  renderPalettes(schemes);
  renderPreview(schemes);
  updateThemeToggle();
  picker.value = state.seed;
  hexInput.value = state.seed.toUpperCase();
}

// ---------- 导出 ----------

function buildCssExport(schemes) {
  const block = (scheme) => rolePairs(scheme)
    .map(([role, hex]) => `  --m3-${kebab(role)}: ${hex};`)
    .join('\n');
  return [
    `/* Wonderful Color · ${t('app.title')} */`,
    `/* seed: ${state.seed.toUpperCase()} · variant: ${state.variant} */`,
    '',
    ':root,',
    '[data-theme="light"] {',
    block(schemes.light),
    '}',
    '',
    '[data-theme="dark"] {',
    block(schemes.dark),
    '}',
    '',
  ].join('\n');
}

function buildJsonExport(schemes) {
  const asObject = (scheme) => Object.fromEntries(rolePairs(scheme));
  return JSON.stringify(
    { seed: state.seed.toUpperCase(), variant: state.variant, light: asObject(schemes.light), dark: asObject(schemes.dark) },
    null, 2,
  );
}

// ---------- 事件 ----------

function setSeed(hex) {
  state.seed = hex.toUpperCase();
  store.setItem('wc-seed', state.seed);
  renderAll();
}

function setTheme(theme) {
  state.theme = theme;
  store.setItem('wc-theme', theme);
  renderAll();
}

function setLang(lang) {
  state.lang = lang;
  store.setItem('wc-lang', lang);
  renderAll();
}

langSelect.addEventListener('change', () => setLang(langSelect.value));
themeToggle.addEventListener('click', () => setTheme(state.theme === 'dark' ? 'light' : 'dark'));

variantSelect.addEventListener('change', () => {
  state.variant = variantSelect.value;
  store.setItem('wc-variant', state.variant);
  renderAll();
});

picker.addEventListener('input', () => setSeed(picker.value));

hexInput.addEventListener('input', () => {
  if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) setSeed(hexInput.value);
});
hexInput.addEventListener('change', () => { hexInput.value = state.seed; });

presetRow.addEventListener('click', (e) => {
  const btn = e.target.closest('.preset');
  if (btn) setSeed(btn.dataset.seed);
});

// 色块 / 色阶:点击复制(事件委托,两处容器共用)
const copyHandler = (e) => {
  const btn = e.target.closest('[data-copy]');
  if (btn) copyText(btn.dataset.copy);
};
schemeGrid.addEventListener('click', copyHandler);
paletteList.addEventListener('click', copyHandler);

$('copy-css').addEventListener('click', () => copyText(buildCssExport(buildSchemes()), t('export.copyCss')));
$('copy-json').addEventListener('click', () => copyText(buildJsonExport(buildSchemes()), t('export.copyJson')));

// 语言下拉选项(仅初始化一次)
langSelect.innerHTML = supportedLangs
  .map(({ value, label }) => `<option value="${value}" ${value === state.lang ? 'selected' : ''}>${label}</option>`)
  .join('');

renderAll();
