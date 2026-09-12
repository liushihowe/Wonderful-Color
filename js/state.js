// ============================================================
// 全局状态与持久化
// lang / variant 存 localStorage(长期记忆);
// theme 只存 sessionStorage:默认跟随系统,手动切换仅本会话生效;
// seed 不持久化,每次启动随机生成
// ============================================================
import { defaultLang } from './i18n.js';

export const prefersDark = matchMedia('(prefers-color-scheme: dark)');

// key → 存储介质,键名统一为 wc-<key>(seed 不持久化,每次启动随机)
const PERSIST = {
  lang: localStorage,
  variant: localStorage,
  theme: sessionStorage,
};

const load = (key, fallback) => PERSIST[key].getItem(`wc-${key}`) || fallback;

// 随机源色:每次打开换一个颜色
const randomSeed = () => '#' + [0, 0, 0]
  .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'))
  .join('')
  .toUpperCase();

export const state = {
  lang: load('lang', navigator.language.startsWith('zh') ? 'zh-CN' : defaultLang),
  theme: load('theme', prefersDark.matches ? 'dark' : 'light'),
  variant: load('variant', 'tonalSpot'),
  seed: randomSeed(),
};

export function setState(key, value) {
  state[key] = value;
  PERSIST[key]?.setItem(`wc-${key}`, value);
}
