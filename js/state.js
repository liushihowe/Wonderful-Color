// ============================================================
// 全局状态与持久化
// lang / variant / seed 存 localStorage(长期记忆);
// theme 只存 sessionStorage:默认跟随系统,手动切换仅本会话生效
// ============================================================
import { defaultLang } from './i18n.js';

export const prefersDark = matchMedia('(prefers-color-scheme: dark)');

// key → 存储介质,键名统一为 wc-<key>
const PERSIST = {
  lang: localStorage,
  variant: localStorage,
  seed: localStorage,
  theme: sessionStorage,
};

const load = (key, fallback) => PERSIST[key].getItem(`wc-${key}`) || fallback;

export const state = {
  lang: load('lang', navigator.language.startsWith('zh') ? 'zh-CN' : defaultLang),
  theme: load('theme', prefersDark.matches ? 'dark' : 'light'),
  variant: load('variant', 'tonalSpot'),
  seed: load('seed', '#6750A4'),
};

export function setState(key, value) {
  state[key] = value;
  PERSIST[key].setItem(`wc-${key}`, value);
}
