/**
 * Spec: /srv/workspace/brain/01-Projects/Chrome-Lobster-Assistant/2026-02-20_spec.md
 * Description: Content script injected into all pages. Handles the floating UI and interaction.
 */

(async function() {
  console.log("Lobster Assistant: Content script loaded.");

  // Prevent multiple injections
  if (document.getElementById('lobster-assistant-root')) return;

  // Wait for i18n
  if (!window.lobsterI18n) {
    console.error("Lobster Assistant: i18n not loaded.");
    return;
  }
  await window.lobsterI18n.init();
  const t = (key) => window.lobsterI18n.get(key);

  // --- Constants & Config ---
  const STORAGE_KEYS = {
    TOKEN: 'lobster_token',
    GATEWAY: 'lobster_gateway',
    SESSION_KEY: 'lobster_session_key',
    FADE_TIME: 'lobster_fade_time',
    ICON_POS: 'lobster_icon_pos',
    CUSTOM_ICON: 'lobster_custom_icon',
    LANGUAGE: 'lobster_language',
    PAGE_PROMPTS: 'lobster_page_prompts',
    SELECTION_PROMPTS: 'lobster_selection_prompts',
    IMAGE_PROMPTS: 'lobster_image_prompts'
  };

  const DEFAULT_CONFIG = {
    gateway: 'http://localhost:18789',
    fadeTime: 3
  };

  const DEFAULT_PROMPTS = {
    page: [{ label: 'Summarize', prompt: 'Summarize this page: {url}' }],
    selection: [{ label: 'Record', prompt: 'Record this to brain: {text}' }],
    image: [{ label: 'Explain', prompt: 'Explain this image: {imageUrl}' }]
  };

  let config = { ...DEFAULT_CONFIG };
  let fadeTimer = null;
  let isDragging = false;
  let dragStartTime = 0;
  let dragOffset = { x: 0, y: 0 };
  let lastContextMenuImage = null; // Stores image URL from context menu if any

  // --- UI Elements ---
  const root = document.createElement('div');
  root.id = 'lobster-assistant-root';

  const iconContainer = document.createElement('div');
  iconContainer.id = 'lobster-icon-container';

  const icon = document.createElement('div');
  icon.id = 'lobster-icon';
  icon.textContent = '🦞'; // Default
  icon.title = 'Lobster Assistant';
  
  // Hover Menu (Quick Actions)
  const hoverMenu = document.createElement('div');
  hoverMenu.id = 'lobster-hover-menu';
  hoverMenu.style.display = 'none';

  iconContainer.appendChild(hoverMenu);
  iconContainer.appendChild(icon);

  const dialog = document.createElement('div');
  dialog.id = 'lobster-dialog';
  dialog.style.display = 'none'; // Initially hidden

  // --- Dialog Structure ---
  dialog.innerHTML = `
    <div class="lobster-header">
      <span>${t('assistantName')}</span>
      <div class="lobster-controls">
        <button class="lobster-btn-icon" id="lobster-btn-fullscreen" title="${t('fullScreen')}">⛶</button>
        <button class="lobster-btn-icon" id="lobster-btn-chat" title="OpenClaw Chat">🔗</button>
        <button class="lobster-btn-icon" id="lobster-btn-close" title="${t('close')}">✕</button>
      </div>
    </div>
    <div class="lobster-messages" id="lobster-messages">
      <div class="lobster-message lobster-msg-assistant">${t('defaultWelcome')}</div>
    </div>
    <div class="lobster-input-area">
      <textarea id="lobster-input" placeholder="${t('placeholder')}" rows="1"></textarea>
      <button id="lobster-send-btn">➤</button>
    </div>
  `;

  root.appendChild(dialog);
  root.appendChild(iconContainer);
  document.body.appendChild(root);

  // --- Helper Functions ---
  
  function getSafePosition(left, top, width, height) {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let safeLeft = Math.max(0, Math.min(left, windowWidth - width));
    let safeTop = Math.max(0, Math.min(top, windowHeight - height));
    
    return { left: safeLeft, top: safeTop };
  }

  // --- Initialization & State Loading ---
  function loadState() {
    chrome.storage.local.get([
      STORAGE_KEYS.ICON_POS, 
      STORAGE_KEYS.CUSTOM_ICON, 
      STORAGE_KEYS.FADE_TIME, 
      STORAGE_KEYS.LANGUAGE
    ], (result) => {
      // 1. Icon Position
      if (result[STORAGE_KEYS.ICON_POS]) {
        const pos = result[STORAGE_KEYS.ICON_POS];
        const rect = iconContainer.getBoundingClientRect();
        // Ensure within bounds
        const safePos = getSafePosition(pos.left, pos.top, rect.width || 48, rect.height || 48); // Fallback size
        
        iconContainer.style.left = safePos.left + 'px';
        iconContainer.style.top = safePos.top + 'px';
        iconContainer.style.bottom = 'auto';
        iconContainer.style.right = 'auto';
      }

      // 2. Custom Icon
      if (result[STORAGE_KEYS.CUSTOM_ICON]) {
        icon.textContent = result[STORAGE_KEYS.CUSTOM_ICON];
      }
      
      // 3. Fade Time
      if (result[STORAGE_KEYS.FADE_TIME]) {
        config.fadeTime = parseInt(result[STORAGE_KEYS.FADE_TIME]);
      }

      // 4. Language
      if (result[STORAGE_KEYS.LANGUAGE]) {
        window.lobsterI18n.setLocale(result[STORAGE_KEYS.LANGUAGE]);
        updateUIText();
      }
    });
  }

  function updateUIText() {
    dialog.querySelector('.lobster-header span').textContent = t('assistantName');
    dialog.querySelector('#lobster-btn-close').title = t('close');
    dialog.querySelector('#lobster-btn-fullscreen').title = t('fullScreen');
    dialog.querySelector('#lobster-input').placeholder = t('placeholder');
    // Also update welcome message if it's the only message? Maybe not to disturb history.
  }

  loadState();

  // --- Dragging Logic (Robust) ---
  icon.addEventListener('mousedown', (e) => {
    // Left click only
    if (e.button !== 0) return;

    isDragging = false;
    dragStartTime = Date.now();
    
    const rect = iconContainer.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
    
    const onMouseMove = (e) => {
      // Threshold to detect drag vs click
      if (!isDragging && (Math.abs(e.clientX - (rect.left + dragOffset.x)) > 5 || Math.abs(e.clientY - (rect.top + dragOffset.y)) > 5)) {
        isDragging = true;
        iconContainer.classList.add('dragging');
        hoverMenu.style.display = 'none'; // Hide menu while dragging
      }

      if (isDragging) {
        e.preventDefault();
        let newLeft = e.clientX - dragOffset.x;
        let newTop = e.clientY - dragOffset.y;
        
        // Boundary Check
        const safePos = getSafePosition(newLeft, newTop, rect.width, rect.height);
        
        iconContainer.style.left = safePos.left + 'px';
        iconContainer.style.top = safePos.top + 'px';
        iconContainer.style.bottom = 'auto';
        iconContainer.style.right = 'auto';
      }
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      
      iconContainer.classList.remove('dragging');

      if (isDragging) {
        // Save position
        chrome.storage.local.set({
          [STORAGE_KEYS.ICON_POS]: {
            left: parseInt(iconContainer.style.left),
            top: parseInt(iconContainer.style.top)
          }
        });
        
        // Prevent click event trigger immediately after drag
        setTimeout(() => { isDragging = false; }, 50);
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });

  // --- Click Logic ---
  icon.addEventListener('click', (e) => {
    if (isDragging) return;
    if (Date.now() - dragStartTime < 200) { // Short click
      toggleDialog();
      // Recovery: If icon clicked, restore dialog opacity/events
      restoreDialog();
    }
  });

  // --- Hover Menu Logic ---
  let hoverMenuTimer = null;

  iconContainer.addEventListener('mouseenter', () => {
    if (isDragging) return;
    
    // Clear any pending hide timer
    if (hoverMenuTimer) {
      clearTimeout(hoverMenuTimer);
      hoverMenuTimer = null;
    }

    // Recovery: Restore dialog if user hovers icon
    restoreDialog();

    if (dialog.style.display !== 'flex') { // Only show hover menu if dialog is closed
        updateHoverMenu();
        
        // Smart Positioning for Hover Menu
        const iconRect = iconContainer.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        
        // Reset classes
        hoverMenu.classList.remove('left', 'right');
        
        if (iconRect.left > windowWidth / 2) {
            // Icon on right, menu appears on left
            hoverMenu.classList.add('left');
            hoverMenu.style.right = '100%'; 
            hoverMenu.style.left = 'auto';
        } else {
            // Icon on left, menu appears on right
            hoverMenu.classList.add('right');
            hoverMenu.style.left = '100%';
            hoverMenu.style.right = 'auto';
        }
        
        hoverMenu.style.display = 'flex';
    }
  });

  iconContainer.addEventListener('mouseleave', () => {
    // Add delay before hiding
    hoverMenuTimer = setTimeout(() => {
      hoverMenu.style.display = 'none';
    }, 500);
  });
  
  // Prevent menu from disappearing when hovering over it
  hoverMenu.addEventListener('mouseenter', () => {
    if (hoverMenuTimer) {
      clearTimeout(hoverMenuTimer);
      hoverMenuTimer = null;
    }
    hoverMenu.style.display = 'flex';
  });
  
  hoverMenu.addEventListener('mouseleave', () => {
    hoverMenuTimer = setTimeout(() => {
        hoverMenu.style.display = 'none';
    }, 500);
  });

  function updateHoverMenu() {
    // Determine context
    let mode = 'Page';
    let extraData = {};
    const selection = window.getSelection().toString().trim();
    
    if (selection) {
        mode = 'Selection';
        extraData.text = selection;
    } else if (lastContextMenuImage) {
        // This is tricky. Hover usually happens on the ICON.
        // Unless we just right-clicked an image and then went to the icon?
        // But the icon is floating.
        // Let's assume if we hold a reference to an image context, we use it.
        // But for simplicity, the spec says "Hover Menu... 分類顯示".
        // Let's prioritize Selection if text is selected.
        // Image mode is primarily for Context Menu. 
        // But if user wants to use Image mode from hover, they probably can't unless we know WHICH image.
        // So for Hover Menu on the floating icon, we mainly support Page and Selection (if selected).
    }

    hoverMenu.innerHTML = '';
    
    const modeLabel = document.createElement('div');
    modeLabel.className = 'lobster-hover-title';
    modeLabel.textContent = mode === 'Selection' ? t('modeSelection') : t('modePage');
    hoverMenu.appendChild(modeLabel);

    // Fetch prompts
    const promptKey = mode === 'Selection' ? STORAGE_KEYS.SELECTION_PROMPTS : STORAGE_KEYS.PAGE_PROMPTS;
    
    chrome.storage.local.get([promptKey], (result) => {
        let prompts = result[promptKey];
        if (!prompts || prompts.length === 0) {
            prompts = mode === 'Selection' ? DEFAULT_PROMPTS.selection : DEFAULT_PROMPTS.page;
        }

        prompts.forEach(p => {
            const btn = document.createElement('div');
            btn.className = 'lobster-hover-item';
            btn.textContent = p.label;
            btn.title = p.prompt;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                processQuickAction(p.prompt, extraData);
                hoverMenu.style.display = 'none';
            });
            hoverMenu.appendChild(btn);
        });
    });
  }

  function processQuickAction(template, extraData = {}) {
    let text = template;
    text = text.replace(/{url}/g, window.location.href);
    text = text.replace(/{text}/g, extraData.text || '');
    text = text.replace(/{imageUrl}/g, extraData.imageUrl || '');
    
    openDialog();
    const input = dialog.querySelector('#lobster-input');
    input.value = text;
    // Auto-resize input
    input.style.height = 'auto';
    input.style.height = (input.scrollHeight) + 'px';
    
    sendMessage();
  }

  // --- Dialog & Interaction ---
  
  function toggleDialog() {
      if (dialog.style.display === 'flex') closeDialog();
      else openDialog();
  }

  function openDialog() {
    hoverMenu.style.display = 'none'; // Ensure hover menu is closed
    
    // Smart Positioning
    const iconRect = iconContainer.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const dialogWidth = 320; // Approx width
    const dialogHeight = 400; // Approx max height
    
    // Reset classes
    dialog.classList.remove('left-side', 'right-side');

    // Horizontal Position
    // If icon is on the right half, dialog opens to the LEFT of the icon
    if (iconRect.left > windowWidth / 2) {
        // Position dialog to the left of the icon
        // right property is distance from right edge.
        // iconRect.left is distance from left edge.
        // windowWidth - iconRect.left is roughly distance from right edge to icon's left edge.
        // But we want to position relative to icon's LEFT edge so it doesn't overlap?
        // Actually, if it opens to the left, we want its RIGHT edge near the icon's LEFT edge.
        // So `right` style should be `windowWidth - iconRect.left`.
        dialog.style.right = (windowWidth - iconRect.left + 10) + 'px';
        dialog.style.left = 'auto';
        dialog.classList.add('left-side');
    } else {
        // Icon on left, dialog opens to the RIGHT
        // Dialog's LEFT edge near icon's RIGHT edge.
        dialog.style.left = (iconRect.right + 10) + 'px';
        dialog.style.right = 'auto';
        dialog.classList.add('right-side');
    }

    // Vertical Position
    // Try to center vertically relative to icon, but keep in bounds
    let top = iconRect.top;
    
    // Check if dialog fits below? Or just align top?
    // Let's align top with icon top for now, but ensure it doesn't go off screen bottom.
    if (top + dialogHeight > windowHeight) {
        top = windowHeight - dialogHeight - 20;
    }
    
    dialog.style.top = Math.max(20, top) + 'px';
    dialog.style.bottom = 'auto';

    dialog.style.display = 'flex';
    
    // Reset classes if fullscreen was active but now we are opening normal
    if (isFullScreen) {
        dialog.classList.add('lobster-fullscreen');
        dialog.style.top = '0';
        dialog.style.left = '0';
        dialog.style.right = '0';
        dialog.style.bottom = '0';
        dialog.style.width = '100vw';
        dialog.style.height = '100vh';
        dialog.querySelector('#lobster-btn-fullscreen').textContent = '↙️';
    } else {
        dialog.classList.remove('lobster-fullscreen');
        dialog.style.width = ''; 
        dialog.style.height = '';
        dialog.querySelector('#lobster-btn-fullscreen').textContent = '⛶';
    }

    const input = dialog.querySelector('#lobster-input');
    input.focus();
    
    // Start fresh
    restoreDialog();
  }

  function closeDialog() {
    dialog.style.display = 'none';
    if (fadeTimer) clearTimeout(fadeTimer);
  }

  // --- Auto Fade Logic (Updated) ---
  // Rules: 
  // 1. Mouse leaves dialog -> start 3s timer.
  // 2. Timer end -> fade to 0.1 opacity, pointer-events: none.
  // 3. Mouse enters dialog (via icon trigger usually) OR input focus -> restore.
  
  const input = dialog.querySelector('#lobster-input');
  
  function startFadeCountdown() {
    if (fadeTimer) clearTimeout(fadeTimer);
    if (dialog.style.display === 'none' || isFullScreen) return;

    // Start 3s timer
    fadeTimer = setTimeout(() => {
        dialog.classList.add('faded');
    }, 3000);
  }

  function restoreDialog() {
    if (fadeTimer) clearTimeout(fadeTimer);
    dialog.classList.remove('faded');
  }

  input.addEventListener('focus', () => {
    restoreDialog();
  });
  
  input.addEventListener('blur', () => {
    // If we blur, and mouse is also not over dialog, start count
    // But blur happens before mouseleave potentially?
    // Let's just rely on mouseleave for the main trigger.
    // However, if we TAB out, mouse might still be over?
    // If mouse is NOT over dialog, start count.
    if (!dialog.matches(':hover')) {
         startFadeCountdown();
    }
  });

  dialog.addEventListener('mouseenter', () => {
    restoreDialog();
  });

  dialog.addEventListener('mouseleave', () => {
    // If input is focused, do NOT fade.
    if (document.activeElement === input) return;
    startFadeCountdown();
  });

  // --- Fullscreen & Controls ---
  let isFullScreen = false;
  
  dialog.querySelector('#lobster-btn-close').addEventListener('click', closeDialog);
  
  dialog.querySelector('#lobster-btn-fullscreen').addEventListener('click', () => {
    isFullScreen = !isFullScreen;
    if (isFullScreen) {
        dialog.classList.add('lobster-fullscreen');
        dialog.style.top = '0';
        dialog.style.left = '0';
        dialog.style.right = '0';
        dialog.style.bottom = '0';
        dialog.style.width = '100vw';
        dialog.style.height = '100vh';
        dialog.querySelector('#lobster-btn-fullscreen').textContent = '↙️'; // Minimize icon
        restoreDialog(); // Ensure not faded
    } else {
        dialog.classList.remove('lobster-fullscreen');
        dialog.style.width = ''; // Reset to css default
        dialog.style.height = '';
        dialog.querySelector('#lobster-btn-fullscreen').textContent = '⛶';
        // Reposition needed? It might jump. Let's just close and reopen logic or keep current relative pos.
        // For simplicity, re-run openDialog logic to snap back near icon
        openDialog(); 
    }
  });

  dialog.querySelector('#lobster-btn-chat').addEventListener('click', () => {
    chrome.storage.local.get([STORAGE_KEYS.GATEWAY], (result) => {
      let gateway = result[STORAGE_KEYS.GATEWAY] || config.gateway;
      try {
        const url = new URL(gateway);
        window.open(url.origin, '_blank');
      } catch(e) {
        window.open(gateway, '_blank');
      }
    });
  });

  // --- Input Auto-Grow & Sending ---
  input.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if (this.value === '') this.style.height = ''; 
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  dialog.querySelector('#lobster-send-btn').addEventListener('click', sendMessage);

  // --- Markdown Parser (Simple) ---
  function parseMarkdown(text) {
    if (!text) return '';
    let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function appendMessage(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `lobster-message lobster-msg-${sender}`;
    if (sender === 'assistant') {
      msgDiv.innerHTML = parseMarkdown(text);
    } else {
      msgDiv.textContent = text;
    }
    
    const messagesArea = dialog.querySelector('#lobster-messages');
    messagesArea.appendChild(msgDiv);
    messagesArea.scrollTop = messagesArea.scrollHeight;
    
    // Activity resets fade
    restoreDialog();
  }

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    appendMessage(text, 'user');
    input.value = '';
    input.style.height = ''; 

    chrome.runtime.sendMessage({
      action: 'sendMessage',
      text: text,
      context: {
        url: window.location.href,
        title: document.title
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        appendMessage('Error: ' + chrome.runtime.lastError.message, 'assistant');
        return;
      }
      if (response && response.success) {
        appendMessage(response.data, 'assistant');
      } else {
        appendMessage('Error: ' + (response ? response.error : 'Unknown error'), 'assistant');
      }
    });
  }

  // --- Message Listener (from Background) ---
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'injectText') {
      // Logic for Context Menu trigger
      
      // Force open dialog
      openDialog();
      restoreDialog(); // Ensure visibility
      
      if (request.imageUrl) {
        lastContextMenuImage = request.imageUrl;
      }
      
      const input = dialog.querySelector('#lobster-input');
      input.value = request.text;
      input.style.height = 'auto';
      input.style.height = (input.scrollHeight) + 'px';
      
      if (request.autoSend) {
        sendMessage();
      }
    }
  });

})();