class I18n {
  constructor() {
    this.locale = 'zh-TW'; // Default
  }

  async init() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['lobster_language'], (result) => {
        if (result.lobster_language) {
          this.locale = result.lobster_language;
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
    if (window.LOBSTER_I18N && window.LOBSTER_I18N[this.locale] && window.LOBSTER_I18N[this.locale][key]) {
      return window.LOBSTER_I18N[this.locale][key];
    }
    // Fallback to English
    if (window.LOBSTER_I18N && window.LOBSTER_I18N['en'] && window.LOBSTER_I18N['en'][key]) {
      return window.LOBSTER_I18N['en'][key];
    }
    return key;
  }
}

window.lobsterI18n = new I18n();
// Ensure init is called. For content script, we can call it immediately.
window.lobsterI18n.init();
