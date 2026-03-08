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


async function cropCapturedArea(dataUrl, rect) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);

  const dpr = Number(rect.devicePixelRatio) || 1;
  const sx = Math.max(0, Math.floor(rect.left * dpr));
  const sy = Math.max(0, Math.floor(rect.top * dpr));
  const sw = Math.max(1, Math.min(bitmap.width - sx, Math.floor(rect.width * dpr)));
  const sh = Math.max(1, Math.min(bitmap.height - sy, Math.floor(rect.height * dpr)));

  const canvas = new OffscreenCanvas(sw, sh);
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to crop captured image');
  }

  context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh);
  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
  const buffer = await croppedBlob.arrayBuffer();
  return 'data:image/png;base64,' + arrayBufferToBase64(buffer);
}


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') {
    return false;
  }

  if (message.type === 'nai-fetch-image-dataurl') {
    (async () => {
      try {
        const imageUrl = message.url;
        const referrer = typeof message.referrer === 'string' ? message.referrer : sender?.tab?.url || '';
        if (!imageUrl || typeof imageUrl !== 'string') {
          throw new Error('Missing image URL');
        }

        const fetchOptions = {
          credentials: 'include',
          cache: 'no-cache',
        };

        if (/^https?:/i.test(referrer)) {
          fetchOptions.referrer = referrer;
          fetchOptions.referrerPolicy = 'strict-origin-when-cross-origin';
        }

        let response = await fetch(imageUrl, fetchOptions);
        if (!response.ok && fetchOptions.referrer) {
          response = await fetch(imageUrl, {
            credentials: 'include',
            cache: 'no-cache',
          });
        }

        if (!response.ok) {
          throw new Error(
            response.status === 403
              ? 'Image fetch failed: 403. The site may be blocking hotlink requests; try selecting the fully visible image again.'
              : 'Image fetch failed: ' + response.status
          );
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();
        const base64 = arrayBufferToBase64(buffer);

        sendResponse({
          ok: true,
          dataUrl: 'data:' + contentType + ';base64,' + base64,
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

  if (message.type === 'nai-capture-visible-area') {
    (async () => {
      try {
        const rect = message.rect || {};
        if (typeof rect.left !== 'number' || typeof rect.top !== 'number' || typeof rect.width !== 'number' || typeof rect.height !== 'number') {
          throw new Error('Missing capture rect');
        }

        const screenshotDataUrl = await new Promise((resolve, reject) => {
          chrome.tabs.captureVisibleTab(sender?.tab?.windowId, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(dataUrl);
          });
        });

        const croppedDataUrl = await cropCapturedArea(screenshotDataUrl, rect);
        sendResponse({
          ok: true,
          dataUrl: croppedDataUrl,
          sourceUrl: sender?.tab?.url || '',
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