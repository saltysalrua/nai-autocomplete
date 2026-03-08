// Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  console.log('[NAI-AC] Extension installed');
});

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function extractAssistantText(data) {
  const choice = data?.choices?.[0]?.message?.content;
  if (!choice) return '';

  if (typeof choice === 'string') {
    return choice.trim();
  }

  if (Array.isArray(choice)) {
    return choice
      .filter((item) => item && item.type === 'text' && typeof item.text === 'string')
      .map((item) => item.text)
      .join('\n')
      .trim();
  }

  return '';
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') {
    return false;
  }

  if (message.type === 'nai-fetch-image-dataurl') {
    (async () => {
      try {
        const imageUrl = message.url;
        if (!imageUrl || typeof imageUrl !== 'string') {
          throw new Error('Missing image URL');
        }

        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Image fetch failed: ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);

        sendResponse({
          ok: true,
          dataUrl: `data:${contentType};base64,${base64}`,
          sourceUrl: imageUrl,
        });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    return true;
  }

  if (message.type === 'nai-llm-chat') {
    (async () => {
      try {
        const payload = message.payload || {};
        const endpoint = payload.endpoint;
        const apiKey = payload.apiKey;
        const model = payload.model;
        const messages = payload.messages;

        if (!endpoint || !apiKey || !model || !Array.isArray(messages)) {
          throw new Error('Missing required LLM parameters');
        }

        const requestBody = {
          model,
          messages,
          temperature: typeof payload.temperature === 'number' ? payload.temperature : 0.4,
          max_tokens: typeof payload.maxTokens === 'number' ? payload.maxTokens : 700,
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        if (!response.ok) {
          const messageText = data?.error?.message || `LLM request failed: ${response.status}`;
          throw new Error(messageText);
        }

        sendResponse({
          ok: true,
          text: extractAssistantText(data),
          raw: data,
        });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();

    return true;
  }

  return false;
});