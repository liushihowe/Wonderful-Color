// ============================================================
// 文案取值:按当前语言查 i18n 字典,支持 {name} 参数插值
// ============================================================
import { messages, defaultLang } from './i18n.js';
import { state } from './state.js';

export function t(key, params = {}) {
  let text = messages[state.lang]?.[key] ?? messages[defaultLang][key] ?? key;
  for (const [name, value] of Object.entries(params)) {
    text = text.replaceAll(`{${name}}`, value);
  }
  return text;
}
