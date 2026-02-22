class I18n {
  constructor() {
    this.locale = 'zh-TW'; // Default
  }

  async init() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['openclaw_language'], (result) => {
        if (result.openclaw_language) {
          this.locale = result.openclaw_language;
        } else {
          const lang = navigator.language;
          if (lang.startsWith('zh')) {
            this.locale = 'zh-TW';
          } else {
            this.locale = 'en';
          }
        }
        resolve();
      });
    });
  }

  setLocale(lang) {
    this.locale = lang;
  }

  get(key) {
    if (window.OPENCLAW_I18N && window.OPENCLAW_I18N[this.locale] && window.OPENCLAW_I18N[this.locale][key]) {
      return window.OPENCLAW_I18N[this.locale][key];
    }
    // Fallback to English
    if (window.OPENCLAW_I18N && window.OPENCLAW_I18N['en'] && window.OPENCLAW_I18N['en'][key]) {
      return window.OPENCLAW_I18N['en'][key];
    }
    return key;
  }
}

window.openclawI18n = new I18n();
// Ensure init is called. For content script, we can call it immediately.
window.openclawI18n.init();
