// ============================================================
// 自定义取色器:SV 面板 + 色相条弹出层,替代丑陋的原生 input[type=color]
// 挂在 .seed-stage-wrap 下,点击源色舞台展开 / 收起
// ============================================================

const clamp01 = (x) => Math.min(1, Math.max(0, x));

// ---------- Hex / RGB / HSV 互转 ----------

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const rgbToHex = (r, g, b) => '#' + [r, g, b]
  .map((x) => Math.round(x).toString(16).padStart(2, '0'))
  .join('')
  .toUpperCase();

const rgbToHsv = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, max === 0 ? 0 : d / max, max];
};

const hsvToRgb = (h, s, v) => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rgb = [c, 0, x];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  return rgb.map((n) => (n + m) * 255);
};

// ---------- 弹出层 ----------

let onChange = null;          // 选色回调,由 main.js 注入(commit seed)
let hsv = [270, 1, 1];        // 当前色,与 state.seed 保持同步
let dragging = false;         // 拖动中跳过外部同步,避免回写打架
let els = null;               // 弹出层内各元素引用

// 指针拖动:down 后捕获,move 持续回调归一化坐标 (0~1)
function draggable(el, cb) {
  el.addEventListener('pointerdown', (e) => {
    const rect = el.getBoundingClientRect();
    dragging = true;
    el.setPointerCapture(e.pointerId);
    const update = (ev) => cb(
      clamp01((ev.clientX - rect.left) / rect.width),
      clamp01((ev.clientY - rect.top) / rect.height),
    );
    update(e);
    el.addEventListener('pointermove', update);
    el.addEventListener('pointerup', () => {
      dragging = false;
      el.removeEventListener('pointermove', update);
    }, { once: true });
    e.preventDefault();
  });
}

// 把当前 hsv 画到面板上
function paint() {
  const { svArea, svKnob, hueKnob, chip, hexText, rgbText } = els;
  // 只改背景色,保留 CSS 里的白→透明 / 透明→黑两层叠加渐变
  svArea.style.backgroundColor = `hsl(${hsv[0]} 100% 50%)`;
  svKnob.style.left = `${hsv[1] * 100}%`;
  svKnob.style.top = `${(1 - hsv[2]) * 100}%`;
  hueKnob.style.left = `${(hsv[0] / 360) * 100}%`;
  const [r, g, b] = hsvToRgb(...hsv);
  const hex = rgbToHex(r, g, b);
  chip.style.background = hex;
  hexText.textContent = hex;
  rgbText.textContent = `R ${Math.round(r)}  G ${Math.round(g)}  B ${Math.round(b)}`;
}

function build() {
  const stage = document.getElementById('seed-stage');
  const root = document.createElement('div');
  root.className = 'picker';
  root.innerHTML = `
    <div class="picker-sv"><span class="picker-knob"></span></div>
    <div class="picker-hue"><span class="picker-knob"></span></div>
    <div class="picker-info">
      <span class="picker-chip"></span>
      <span class="picker-values"><b></b><i></i></span>
    </div>`;
  stage.parentElement.appendChild(root);

  const [svArea, hueBar] = root.children;
  const [info] = [root.lastElementChild];
  els = {
    root, svArea, hueBar,
    svKnob: svArea.firstElementChild,
    hueKnob: hueBar.firstElementChild,
    chip: info.firstElementChild,
    hexText: info.lastElementChild.firstElementChild,
    rgbText: info.lastElementChild.lastElementChild,
  };

  const emit = () => onChange(rgbToHex(...hsvToRgb(...hsv)));
  draggable(svArea, (x, y) => { hsv[1] = x; hsv[2] = 1 - y; paint(); emit(); });
  draggable(hueBar, (x) => { hsv[0] = x * 360; paint(); emit(); });

  // 点击舞台展开 / 收起;点击面板外或 Esc 收起
  stage.addEventListener('click', () => root.classList.toggle('open'));
  document.addEventListener('click', (e) => {
    if (root.classList.contains('open')
      && !root.contains(e.target) && !stage.contains(e.target)) {
      root.classList.remove('open');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') root.classList.remove('open');
  });

  paint();
}

// ---------- 对外接口 ----------

// main.js 调用:注入选色回调并构建面板
export function initColorPicker(changeHandler) {
  onChange = changeHandler;
  build();
}

// render.js 调用:源色变化时同步面板显示
export function syncColorPicker(hex) {
  if (dragging) return;
  hsv = rgbToHsv(...hexToRgb(hex));
  if (els) paint();
}
