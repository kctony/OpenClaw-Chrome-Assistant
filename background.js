try {
  importScripts('i18n_bg.js');
} catch (e) {
  console.error(e);
}

// Default prompts if not set
const DEFAULT_PROMPTS = {
  page: [
    { label: 'Summarize', prompt: 'Summarize this page: {url}' }
  ],
  selection: [
    { label: 'Record', prompt: 'Record this to brain: {text}' }
  ],
  image: [
    { label: 'Explain', prompt: 'Explain this image: {imageUrl}' }
  ]
};

chrome.runtime.onInstalled.addListener(async () => {
  await updateContextMenu();
  chrome.storage.local.get(['openclaw_custom_icon'], (result) => {
    if (result.openclaw_custom_icon) {
      updateActionIcon(result.openclaw_custom_icon);
    }
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    updateContextMenu();
    if (changes.openclaw_custom_icon) {
      updateActionIcon(changes.openclaw_custom_icon.newValue);
    }
  }
});

async function updateActionIcon(emoji) {
  if (!emoji) return; // Revert to default? 
  // If emoji is empty, maybe reset? For now assume valid emoji.

  try {
    const size = 32; // Standard size
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, size, size);
    ctx.font = `${size - 4}px serif`; // Adjust size
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, size / 2, size / 2 + 2); // Center + generic baseline tweak

    const imageData = ctx.getImageData(0, 0, size, size);
    
    await chrome.action.setIcon({ imageData: imageData });
  } catch (e) {
    console.error("Failed to update icon:", e);
  }
}

async function updateContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.storage.local.get([
      'openclaw_page_prompts',
      'openclaw_selection_prompts',
      'openclaw_image_prompts',
      'openclaw_custom_icon' // Just in case we want to use it in title, but context menu icon is manifest defined
    ], function(result) {
      
      const pagePrompts = result.openclaw_page_prompts || DEFAULT_PROMPTS.page;
      const selectionPrompts = result.openclaw_selection_prompts || DEFAULT_PROMPTS.selection;
      const imagePrompts = result.openclaw_image_prompts || DEFAULT_PROMPTS.image;

      // Parent Menu
      chrome.contextMenus.create({
        id: "openclaw-root",
        title: "OpenClaw Assistant 🦞",
        contexts: ["page", "selection", "image"]
      }, () => {
        if (chrome.runtime.lastError) {
             console.error("Error creating parent menu:", chrome.runtime.lastError);
             return;
        }
        
        // --- Page Context Submenu ---
        pagePrompts.forEach((item, index) => {
            chrome.contextMenus.create({
            parentId: "openclaw-root",
            id: `openclaw-page-${index}`,
            title: item.label, // Remove emoji prefix to keep it clean or add if desired
            contexts: ["page"]
            });
        });

        // --- Selection Context Submenu ---
        selectionPrompts.forEach((item, index) => {
            chrome.contextMenus.create({
            parentId: "openclaw-root",
            id: `openclaw-selection-${index}`,
            title: item.label,
            contexts: ["selection"]
            });
        });

        // --- Image Context Submenu ---
        imagePrompts.forEach((item, index) => {
            chrome.contextMenus.create({
            parentId: "openclaw-root",
            id: `openclaw-image-${index}`,
            title: item.label,
            contexts: ["image"]
            });
        });
      });
    });
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const menuId = info.menuItemId;
  
  chrome.storage.local.get([
    'openclaw_page_prompts',
    'openclaw_selection_prompts',
    'openclaw_image_prompts'
  ], function(result) {
    let promptTemplate = "";
    let contextType = "";

    const pagePrompts = result.openclaw_page_prompts || DEFAULT_PROMPTS.page;
    const selectionPrompts = result.openclaw_selection_prompts || DEFAULT_PROMPTS.selection;
    const imagePrompts = result.openclaw_image_prompts || DEFAULT_PROMPTS.image;

    if (menuId.startsWith('openclaw-page-')) {
      const index = parseInt(menuId.replace('openclaw-page-', ''));
      if (pagePrompts && pagePrompts[index]) {
        promptTemplate = pagePrompts[index].prompt;
        contextType = 'page';
      }
    } else if (menuId.startsWith('openclaw-selection-')) {
      const index = parseInt(menuId.replace('openclaw-selection-', ''));
      if (selectionPrompts && selectionPrompts[index]) {
        promptTemplate = selectionPrompts[index].prompt;
        contextType = 'selection';
      }
    } else if (menuId.startsWith('openclaw-image-')) {
      const index = parseInt(menuId.replace('openclaw-image-', ''));
      if (imagePrompts && imagePrompts[index]) {
        promptTemplate = imagePrompts[index].prompt;
        contextType = 'image';
      }
    }

    if (promptTemplate) {
      let finalPrompt = promptTemplate;
      
      // Inject variables
      finalPrompt = finalPrompt.replace(/{url}/g, tab.url);
      
      if (contextType === 'selection' && info.selectionText) {
        finalPrompt = finalPrompt.replace(/{text}/g, info.selectionText);
      }
      
      let imageUrl = null;
      if (contextType === 'image' && info.srcUrl) {
        finalPrompt = finalPrompt.replace(/{imageUrl}/g, info.srcUrl);
        imageUrl = info.srcUrl;
      }

      // Send to content script
      chrome.tabs.sendMessage(tab.id, {
        action: "injectText",
        text: finalPrompt,
        autoSend: true,
        imageUrl: imageUrl
      });
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openOptions") {
    chrome.runtime.openOptionsPage();
  } else if (request.action === "sendMessage") {
    handleSendMessage(request, sendResponse);
    return true; // Keep channel open
  }
});

async function handleSendMessage(request, sendResponse) {
  try {
    const storage = await chrome.storage.local.get(["openclaw_token", "openclaw_gateway", "openclaw_session_key"]);
    const token = storage.openclaw_token;
    let gateway = storage.openclaw_gateway || "http://localhost:18789";
    const sessionKey = storage.openclaw_session_key || "agent:main:main";

    if (!token) {
      sendResponse({ success: false, error: "Token required (請先設定 Token)" });
      return;
    }

    // Auto-complete /v1/chat/completions
    // Ensure we don't double append if user typed it
    if (!gateway.includes('/v1/chat/completions')) {
        // Remove trailing slash if present
        if (gateway.endsWith('/')) {
            gateway = gateway.slice(0, -1);
        }
        gateway += '/v1/chat/completions';
    }

    const payload = {
      model: "openclaw", 
      messages: [
        { role: "user", content: request.text }
      ],
      stream: false
    };

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };

    if (sessionKey) {
      headers["x-openclaw-session-key"] = sessionKey;
    }

    const response = await fetch(gateway, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API Error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    
    let reply = "";
    if (data.choices && data.choices[0] && data.choices[0].message) {
      reply = data.choices[0].message.content;
    } else if (data.response) {
       reply = data.response;
    } else {
       reply = JSON.stringify(data);
    }
    
    sendResponse({ success: true, data: reply });

  } catch (error) {
    console.error("API Error:", error);
    sendResponse({ success: false, error: error.message || "Unknown error" });
  }
}
