document.addEventListener('DOMContentLoaded', function() {
    // --- Initial Setup ---
    const DEFAULT_GATEWAY = 'http://localhost:18789';
    const DEFAULT_SESSION = 'agent:main:main';
    const DEFAULT_ICON = '🦞';
    const DEFAULT_FADE = 3;

    // Default Prompts (if none exist)
    const DEFAULT_PAGE_PROMPTS = [
        { label: 'Summarize', prompt: 'Summarize this page: {url}' }
    ];
    const DEFAULT_SELECTION_PROMPTS = [
        { label: 'Record', prompt: 'Record this to brain: {text}' }
    ];
    const DEFAULT_IMAGE_PROMPTS = [
        { label: 'Explain', prompt: 'Explain this image: {imageUrl}' }
    ];

    // --- DOM Elements ---
    const gatewayInput = document.getElementById('gatewayUrl');
    const tokenInput = document.getElementById('token');
    const sessionKeyInput = document.getElementById('sessionKey');
    const customIconInput = document.getElementById('customIcon');
    const languageSelect = document.getElementById('language');
    const fadeTimeInput = document.getElementById('fadeTime');
    const saveBtn = document.getElementById('save');
    const statusMsg = document.getElementById('statusMessage');

    const pageList = document.getElementById('pagePromptsList');
    const selectionList = document.getElementById('selectionPromptsList');
    const imageList = document.getElementById('imagePromptsList');

    // --- Load Settings ---
    chrome.storage.local.get([
        'lobster_gateway',
        'lobster_token',
        'lobster_session_key',
        'lobster_custom_icon',
        'lobster_language',
        'lobster_fade_time',
        'lobster_page_prompts',      // New Array format
        'lobster_selection_prompts', // New Array format
        'lobster_image_prompts',     // New Array format
        // Legacy keys to migrate
        'lobster_page_prompt',
        'lobster_selection_prompt',
        'lobster_image_prompt'
    ], function(result) {
        gatewayInput.value = result.lobster_gateway || DEFAULT_GATEWAY;
        tokenInput.value = result.lobster_token || '';
        sessionKeyInput.value = result.lobster_session_key || DEFAULT_SESSION;
        customIconInput.value = result.lobster_custom_icon || DEFAULT_ICON;
        languageSelect.value = result.lobster_language || 'zh-TW';
        fadeTimeInput.value = result.lobster_fade_time || DEFAULT_FADE;

        // Apply translations to static UI
        applyTranslations(languageSelect.value);

        // --- Migration Logic & Loading Prompts ---
        let pagePrompts = result.lobster_page_prompts;
        if (!pagePrompts) {
            if (result.lobster_page_prompt) {
                pagePrompts = [{ label: 'Custom', prompt: result.lobster_page_prompt }];
            } else {
                pagePrompts = DEFAULT_PAGE_PROMPTS;
            }
        }

        let selectionPrompts = result.lobster_selection_prompts;
        if (!selectionPrompts) {
            if (result.lobster_selection_prompt) {
                selectionPrompts = [{ label: 'Custom', prompt: result.lobster_selection_prompt }];
            } else {
                selectionPrompts = DEFAULT_SELECTION_PROMPTS;
            }
        }

        let imagePrompts = result.lobster_image_prompts;
        if (!imagePrompts) {
            if (result.lobster_image_prompt) {
                imagePrompts = [{ label: 'Custom', prompt: result.lobster_image_prompt }];
            } else {
                imagePrompts = DEFAULT_IMAGE_PROMPTS;
            }
        }

        renderPrompts(pageList, pagePrompts);
        renderPrompts(selectionList, selectionPrompts);
        renderPrompts(imageList, imagePrompts);
    });

    // --- Prompt UI Management ---
    function createPromptElement(labelVal = '', promptVal = '') {
        const div = document.createElement('div');
        div.className = 'prompt-item';
        
        const inputsDiv = document.createElement('div');
        inputsDiv.className = 'prompt-inputs';

        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.placeholder = 'Label (e.g., Summarize)';
        labelInput.value = labelVal;
        labelInput.className = 'prompt-label';

        const promptInput = document.createElement('textarea');
        promptInput.placeholder = 'Prompt content...';
        promptInput.value = promptVal;
        promptInput.rows = 2;
        promptInput.className = 'prompt-content';

        inputsDiv.appendChild(labelInput);
        inputsDiv.appendChild(promptInput);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '✕';
        removeBtn.onclick = function() {
            div.remove();
        };

        div.appendChild(inputsDiv);
        div.appendChild(removeBtn);

        return div;
    }

    function renderPrompts(container, prompts) {
        container.innerHTML = '';
        prompts.forEach(p => {
            container.appendChild(createPromptElement(p.label, p.prompt));
        });
    }

    function getPromptsFromContainer(container) {
        const prompts = [];
        container.querySelectorAll('.prompt-item').forEach(item => {
            const label = item.querySelector('.prompt-label').value.trim();
            const prompt = item.querySelector('.prompt-content').value.trim();
            if (label && prompt) {
                prompts.push({ label, prompt });
            }
        });
        return prompts;
    }

    // --- Add Buttons ---
    document.getElementById('addPagePrompt').addEventListener('click', () => {
        pageList.appendChild(createPromptElement());
    });
    document.getElementById('addSelectionPrompt').addEventListener('click', () => {
        selectionList.appendChild(createPromptElement());
    });
    document.getElementById('addImagePrompt').addEventListener('click', () => {
        imageList.appendChild(createPromptElement());
    });

    // --- Save Logic ---
    saveBtn.addEventListener('click', function() {
        const gatewayUrl = gatewayInput.value.trim();
        const token = tokenInput.value.trim();
        
        if (!token) {
            showStatus('Token is required!', true);
            return;
        }

        const settings = {
            'lobster_gateway': gatewayUrl,
            'lobster_token': token,
            'lobster_session_key': sessionKeyInput.value.trim(),
            'lobster_custom_icon': customIconInput.value.trim() || '🦞',
            'lobster_language': languageSelect.value,
            'lobster_fade_time': parseInt(fadeTimeInput.value) || 3,
            'lobster_page_prompts': getPromptsFromContainer(pageList),
            'lobster_selection_prompts': getPromptsFromContainer(selectionList),
            'lobster_image_prompts': getPromptsFromContainer(imageList)
        };

        chrome.storage.local.set(settings, function() {
            showStatus('Settings saved!');
            applyTranslations(languageSelect.value);
        });
    });

    function showStatus(msg, isError = false) {
        statusMsg.textContent = msg;
        statusMsg.style.display = 'block';
        statusMsg.className = 'status' + (isError ? ' error' : '');
        setTimeout(() => {
            statusMsg.style.display = 'none';
        }, 3000);
    }

    function applyTranslations(lang) {
        const t = window.LOBSTER_I18N[lang];
        if (!t) return;
        
        document.getElementById('settingsTitle').textContent = t.settingsTitle;
        document.getElementById('gatewayLabel').textContent = t.gatewayLabel;
        document.getElementById('tokenLabel').textContent = t.tokenLabel;
        document.getElementById('sessionKeyLabel').textContent = t.sessionKeyLabel;
        document.getElementById('iconLabel').textContent = t.iconLabel;
        document.getElementById('fadeTimeLabel').textContent = t.fadeTimeLabel;
        document.getElementById('save').textContent = t.saveBtn;
        
        document.getElementById('modePage').textContent = t.modePage;
        document.getElementById('modeSelection').textContent = t.modeSelection;
        document.getElementById('modeImage').textContent = t.modeImage;

        document.getElementById('addPagePrompt').textContent = t.addPrompt;
        document.getElementById('addSelectionPrompt').textContent = t.addPrompt;
        document.getElementById('addImagePrompt').textContent = t.addPrompt;

        document.getElementById('quickOptionsTitle').textContent = t.quickOptions;
        document.getElementById('quickOptionHelp').textContent = t.quickOptionHelp;
    }

    // Change language immediately on select to preview
    languageSelect.addEventListener('change', (e) => {
        applyTranslations(e.target.value);
    });
});
