import {EN} from './locale-en.js';

export const language = () => globalThis.document?.documentElement?.lang === 'en' ? 'en' : 'es';
// Only application-owned literals go through t. Reports, quotes and user templates do not.
export function t(message, ...values) {
  const tagged = Array.isArray(message);
  const key = tagged ? message.join('{}') : message;
  const translated = language() === 'en' ? (EN[key] ?? key) : key;
  if (!tagged) return translated;
  let index = 0;
  return translated.replace(/\{\}/g, () => String(values[index++]));
}

export function initializeLanguage() {
  const url = new URL(location.href);
  let chosen = url.searchParams.get('lang');
  if (!['en', 'es'].includes(chosen)) {
    try { chosen = localStorage.getItem('dicta-language-v1'); } catch {}
  }
  document.documentElement.lang = ['en', 'es'].includes(chosen) ? chosen : 'en';
  try { localStorage.setItem('dicta-language-v1', language()); } catch {}
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  for (const attr of ['title', 'aria-label', 'placeholder']) {
    document.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`))));
  }
}

export function mountLanguageSwitch(parent, canChange = () => true) {
  const label = document.createElement('label');
  label.className = 'language-switch';
  label.append(language() === 'en' ? 'Language ' : 'Idioma ');
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Language / Idioma');
  select.append(new Option('English', 'en'), new Option('Español', 'es'));
  select.value = language();
  select.title = t('Cambiar idioma recarga la página. El borrador se conserva sin traducir.');
  select.onchange = () => {
    if (!canChange()) { select.value = language(); return; }
    const check = new CustomEvent('dicta-language-change', {cancelable: true});
    if (!window.dispatchEvent(check)) { select.value = language(); return; }
    try { localStorage.setItem('dicta-language-v1', select.value); } catch {}
    const url = new URL(location.href);url.searchParams.set('lang', select.value);
    location.assign(url.href);
  };
  label.append(select);parent.append(label);
  return select;
}
