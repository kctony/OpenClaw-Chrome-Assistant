const LOBSTER_I18N_BG = {
  "en": {
    "menuSummarize": "Summarize Page",
    "menuRecord": "Record Selection",
    "menuExplainImage": "Explain Image"
  },
  "zh-TW": {
    "menuSummarize": "摘要網頁",
    "menuRecord": "記錄選取",
    "menuExplainImage": "解釋圖片"
  }
};

class I18nBg {
  constructor() {
    this.locale = 'zh-TW';
  }

  async init() {
    // Service worker specific
    // chrome.i18n.getUILanguage() is synchronous and available
    const lang = chrome.i18n.getUILanguage();
    if (lang.startsWith('zh')) {
      this.locale = 'zh-TW';
    } else {
      this.locale = 'en';
    }
    
    // Check storage override
    const result = await chrome.storage.local.get(['lobster_locale']);
    if (result.lobster_locale) {
      this.locale = result.lobster_locale;
    }
  }

  get(key) {
    if (LOBSTER_I18N_BG[this.locale] && LOBSTER_I18N_BG[this.locale][key]) {
      return LOBSTER_I18N_BG[this.locale][key];
    }
    if (LOBSTER_I18N_BG['en'] && LOBSTER_I18N_BG['en'][key]) {
      return LOBSTER_I18N_BG['en'][key];
    }
    return key;
  }
}

const i18n = new I18nBg();
