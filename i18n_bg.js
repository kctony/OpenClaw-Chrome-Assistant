const OPENCLAW_I18N_BG = {
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
    const result = await chrome.storage.local.get(['openclaw_locale']);
    if (result.openclaw_locale) {
      this.locale = result.openclaw_locale;
    }
  }

  get(key) {
    if (OPENCLAW_I18N_BG[this.locale] && OPENCLAW_I18N_BG[this.locale][key]) {
      return OPENCLAW_I18N_BG[this.locale][key];
    }
    if (OPENCLAW_I18N_BG['en'] && OPENCLAW_I18N_BG['en'][key]) {
      return OPENCLAW_I18N_BG['en'][key];
    }
    return key;
  }
}

const i18n = new I18nBg();
