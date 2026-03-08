(() => {
  'use strict';

  const statusEl = document.getElementById('status');
  const openReverseBtn = document.getElementById('openReverse');
  const openSettingsBtn = document.getElementById('openSettings');

  function setStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.classList.toggle('error', isError);
  }

  async function sendToActiveTab(payload) {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (!tab?.id) {
      throw new Error('未找到可用标签页。');
    }

    return chrome.tabs.sendMessage(tab.id, payload);
  }

  async function openPanel(page) {
    try {
      const response = await sendToActiveTab({ type: 'nai-open-panel', page });
      if (!response?.ok) {
        throw new Error(response?.error || '打开失败');
      }
      window.close();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), true);
    }
  }

  openReverseBtn.addEventListener('click', () => openPanel('reverse'));
  openSettingsBtn.addEventListener('click', () => openPanel('settings'));
})();