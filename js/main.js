// ============================================================
// Wonderful Color 主入口
// 事件绑定 + 状态变更后的整页重渲染编排
// ============================================================
import { state, setState, prefersDark } from './state.js';
import { t } from './lang.js';
import { buildSchemes, colorsOf } from './engine.js';
import { buildCssExport, buildJsonExport } from './exporter.js';
import { initColorPicker } from './picker.js';
import {
  applyStaticTexts, applyThemeVars,
  renderLangMenu, closeLangMenu, updateThemeToggle,
  renderVariantChips, renderPresets, syncSeedInputs,
  renderSchemePanels, renderPalettes, renderGuide, renderPreview,
} from './render.js';

const $ = (id) => document.getElementById(id);

// ---------- 提示条与复制 ----------

let toastTimer;
function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
}

async function copyText(text, toastValue = text) {
  await navigator.clipboard.writeText(text);
  showToast(t('toast.copied', { value: toastValue }));
}

// ---------- 状态变更 → 整页重渲染 ----------

function renderAll() {
  const schemes = buildSchemes(state.seed, state.variant);
  applyStaticTexts();
  applyThemeVars(colorsOf(schemes[state.theme]));
  renderLangMenu();
  updateThemeToggle();
  renderVariantChips();
  renderPresets();
  syncSeedInputs();
  renderSchemePanels(schemes);
  renderPalettes(schemes);
  renderGuide(schemes);
  renderPreview(schemes);
}

// 只渲染依赖源色的部分:切语言 / 方案 / 主题时走 renderAll,拖动取色时只走这里
function renderSeedDependent() {
  const schemes = buildSchemes(state.seed, state.variant);
  applyThemeVars(colorsOf(schemes[state.theme]));
  renderPresets();
  syncSeedInputs();
  renderSchemePanels(schemes);
  renderPalettes(schemes);
  renderGuide(schemes);
  renderPreview(schemes);
}

// 拖动取色时每个 pointermove 都会 commit,用 rAF 合并到每帧最多一次渲染
let seedRenderQueued = false;

const commit = (key, value) => {
  setState(key, value);
  if (key !== 'seed') { renderAll(); return; }
  if (seedRenderQueued) return;
  seedRenderQueued = true;
  requestAnimationFrame(() => {
    seedRenderQueued = false;
    renderSeedDependent();
  });
};

// ---------- 事件:顶栏 ----------

$('lang-btn').addEventListener('click', () => {
  const open = $('lang-list').classList.toggle('open');
  $('lang-btn').setAttribute('aria-expanded', open);
});
$('lang-list').addEventListener('click', (e) => {
  const item = e.target.closest('.lang-item');
  if (item) {
    commit('lang', item.dataset.lang);
    closeLangMenu();
  }
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('.lang-menu')) closeLangMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLangMenu();

  // 数字 1~6:跳转到对应编号章节(输入框内打字时不触发)
  if (!e.ctrlKey && !e.altKey && !e.metaKey
    && /^[1-6]$/.test(e.key) && !e.target.closest('input, textarea')) {
    const sections = document.querySelectorAll('main .section[id]');
    sections[Number(e.key) - 1]?.scrollIntoView({ behavior: 'smooth' });
  }
});

$('theme-toggle').addEventListener('click', () =>
  commit('theme', state.theme === 'dark' ? 'light' : 'dark'));

// 本会话未手动切换时,实时跟随系统深浅变化
prefersDark.addEventListener('change', (e) => {
  if (!sessionStorage.getItem('wc-theme')) commit('theme', e.matches ? 'dark' : 'light');
});

// ---------- 事件:源色 ----------

$('variant-chips').addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (chip && chip.dataset.variant !== state.variant) commit('variant', chip.dataset.variant);
});

$('preset-row').addEventListener('click', (e) => {
  const preset = e.target.closest('.preset');
  if (preset) commit('seed', preset.dataset.seed);
});

// 源色舞台:点击展开自定义取色器,拖动即实时改色
initColorPicker((hex) => commit('seed', hex));

$('hex-input').addEventListener('input', (e) => {
  if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) commit('seed', e.target.value.toUpperCase());
});
$('hex-input').addEventListener('change', (e) => { e.target.value = state.seed; });

// ---------- 事件:色块 / 色阶点击复制(事件委托) ----------

const copyOnClick = (e) => {
  const target = e.target.closest('[data-copy]');
  if (target) copyText(target.dataset.copy);
};
$('scheme-grid').addEventListener('click', copyOnClick);
$('palette-list').addEventListener('click', copyOnClick);

// ---------- 事件:导出 ----------

$('copy-css').addEventListener('click', () =>
  copyText(buildCssExport(buildSchemes(state.seed, state.variant)), t('export.copyCss')));
$('copy-json').addEventListener('click', () =>
  copyText(buildJsonExport(buildSchemes(state.seed, state.variant)), t('export.copyJson')));

// ---------- 启动 ----------

renderAll();
