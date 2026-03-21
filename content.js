/**
 * NovelAI 提示词自动补全 - Content Script
 */
(function() {
  'use strict';

  const ASSISTANT_SETTINGS_KEY = 'nai-llm-assistant-settings';
  const DEFAULT_THEME = 'sunrise';
  const PROMPT_BLOCK_STORAGE_PREFIX = 'nai-ac-prompt-blocks';
  const PROMPT_LIBRARY_KEY = 'nai-shared-prompt-library';
  const PRESET_PROMPT_LIBRARY_CATEGORIES = [
    { id: 'char', label: '角色' },
    { id: 'style', label: '风格' },
    { id: 'scene', label: '场景' },
    { id: 'outfit', label: '服装' },
    { id: 'pose', label: '动作' },
  ];

  const CONFIG = {
    CSV_URL: 'https://raw.githubusercontent.com/saltysalrua/nai-discordbot/refs/heads/main/danbooru_all_2.csv',
    MAX_RESULTS: 8,
    MIN_QUERY_LENGTH: 1,
    DEBOUNCE_DELAY: 150,
  };

  // 全局设置
  let settings = {
    convertSlashToSpace: false, // 下划线与空格互转
  };

  let allTags = [];
  let isLoading = true;
  let activeEditor = null;
  let selectedIndex = 0;
  let currentResults = [];
  let currentQuery = '';
  let lastRenderedQuery = '';
  let autocompleteContainer = null;
  let promptBlockPanel = null;
  let promptBlockToolbar = null;
  let promptBlocks = [];
  let promptBlockSignature = '';
  let promptBlockDragId = null;
  let promptBlockDropIndicator = null;
  let promptLibraryDialog = null;
  let promptLibraryDialogState = { blockId: '' };
  let promptBlockStates = new WeakMap();
  let isPromptBlockDragMode = false;
  let promptLibrary = [];
  const PROMPT_BLOCK_COLORS = ['#f08a5d', '#7aa7ff', '#76b89a', '#c68cff', '#f4b860', '#e97a9a'];

  function createId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeTagValue(tag) {
    return String(tag || '').replace(/\s+/g, ' ').trim();
  }

  function getEditorText(editor) {
    return (editor?.textContent || '').replace(/\u200b/g, '').trim();
  }

  function parsePromptTokens(text) {
    const source = String(text || '');
    const tokens = [];
    let current = '';
    let index = 0;

    while (index < source.length) {
      const char = source[index];
      if (char === ',' || char === '\n') {
        const tag = current.trim();
        let delimiter = char;
        index += 1;

        while (index < source.length) {
          const next = source[index];
          if (next === ',' || next === '\n' || /\s/.test(next)) {
            delimiter += next;
            index += 1;
            continue;
          }
          break;
        }

        if (tag) {
          tokens.push({ tag, delimiter });
        }
        current = '';
        continue;
      }

      current += char;
      index += 1;
    }

    const lastTag = current.trim();
    if (lastTag) {
      tokens.push({ tag: lastTag, delimiter: '' });
    }

    return tokens;
  }

  function splitPromptTags(text) {
    return parsePromptTokens(text).map(token => token.tag);
  }

  function serializePromptBlocks(blocks) {
    return blocks.map(block => block.tags.map((tag, index) => `${tag}${block.delimiters?.[index] || ''}`).join('')).join('');
  }

  function flattenPromptBlocks(blocks) {
    return blocks.flatMap(block => block.tags.map(tag => normalizeTagValue(tag)));
  }

  function createSingleBlocksFromText(text) {
    return parsePromptTokens(text).map(token => ({
      id: createId('tag'),
      tags: [token.tag],
      delimiters: [token.delimiter],
      locked: false,
      isGroup: false,
    }));
  }

  function clonePromptBlocks(blocks) {
    return blocks.map(block => ({
      ...block,
      tags: [...block.tags],
      delimiters: [...(block.delimiters || block.tags.map((_, index) => index === block.tags.length - 1 ? '' : ', '))],
    }));
  }

  function hasCompletePromptBlockDelimiters(blocks) {
    return blocks.every(block => Array.isArray(block.delimiters) && block.delimiters.length === block.tags.length);
  }

  function normalizePromptLibraryCategory(category) {
    return String(category || '')
      .trim()
      .toLowerCase()
      .replace(/[:\s]+/g, '_')
      .replace(/[^\p{L}\p{N}_-]/gu, '');
  }

  function normalizePromptLibraryName(name) {
    return String(name || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/:+/g, '_')
      .replace(/[^\p{L}\p{N}_-]/gu, '');
  }

  function splitPromptLibraryAlias(alias) {
    const normalized = String(alias || '').trim().toLowerCase();
    const [rawCategory, ...rest] = normalized.split(':');
    const category = normalizePromptLibraryCategory(rawCategory);
    const name = normalizePromptLibraryName(rest.join(':'));
    return {
      category: category || 'char',
      name,
    };
  }

  function normalizePromptLibraryAlias(alias, fallbackCategory = 'char') {
    const raw = String(alias || '').trim().toLowerCase();
    if (!raw) return '';
    if (raw.includes(':')) {
      const parts = splitPromptLibraryAlias(raw);
      return parts.name ? `${parts.category}:${parts.name}` : '';
    }

    const category = normalizePromptLibraryCategory(fallbackCategory) || 'char';
    const name = normalizePromptLibraryName(raw);
    return name ? `${category}:${name}` : '';
  }

  function normalizePromptLibraryEntry(entry) {
    const category = normalizePromptLibraryCategory(entry?.category || splitPromptLibraryAlias(entry?.alias || '').category || 'char') || 'char';
    const name = normalizePromptLibraryName(entry?.name || splitPromptLibraryAlias(entry?.alias || '').name || entry?.shortAlias || '');
    const alias = normalizePromptLibraryAlias(entry?.alias || (name ? `${category}:${name}` : ''), category);
    const tags = Array.isArray(entry?.tags) ? entry.tags.map(tag => String(tag || '').trim()).filter(Boolean) : [];
    if (!alias || !tags.length) return null;
    const parts = splitPromptLibraryAlias(alias);

    const delimiters = Array.isArray(entry?.delimiters)
      ? entry.delimiters.map(delimiter => String(delimiter || ''))
      : tags.map((_, index) => index === tags.length - 1 ? '' : ', ');

    while (delimiters.length < tags.length) {
      delimiters.push(tags.length === delimiters.length + 1 ? '' : ', ');
    }

    return {
      id: String(entry.id || createId('library')),
      alias,
      shortAlias: parts.name,
      prefix: parts.category,
      category: parts.category,
      name: parts.name,
      tags,
      delimiters: delimiters.slice(0, tags.length),
      promptText: serializePromptBlocks([{ tags, delimiters }]),
      createdAt: Number(entry.createdAt) || Date.now(),
      updatedAt: Number(entry.updatedAt) || Date.now(),
    };
  }

  function getPromptLibrarySearchKeys(entry) {
    return [
      entry.alias,
      entry.shortAlias,
      entry.alias.replace(/_/g, ' '),
      entry.shortAlias.replace(/_/g, ' '),
    ].filter(Boolean);
  }

  function getPromptLibrarySummary(entry) {
    const preview = entry.tags.slice(0, 3).join(', ');
    const remain = Math.max(0, entry.tags.length - 3);
    return remain > 0 ? `${preview} ... +${remain}` : preview;
  }

  function getLibraryDefaultName(block) {
    const firstTag = normalizeTagValue(block?.tags?.[0] || '');
    if (!firstTag) return 'new_entry';
    return normalizePromptLibraryName(firstTag);
  }

  function getStorageArea() {
    try {
      if (chrome?.storage?.local) return chrome.storage.local;
    } catch (error) {}
    return null;
  }

  function storageGetLocal(key) {
    const area = getStorageArea();
    if (!area) {
      try {
        return Promise.resolve({ [key]: JSON.parse(localStorage.getItem(key) || 'null') });
      } catch (error) {
        return Promise.resolve({ [key]: null });
      }
    }

    return new Promise(resolve => {
      try {
        area.get([key], result => resolve(result || {}));
      } catch (error) {
        resolve({});
      }
    });
  }

  function storageSetLocal(data) {
    const area = getStorageArea();
    if (!area) {
      Object.entries(data || {}).forEach(([key, value]) => {
        localStorage.setItem(key, JSON.stringify(value));
      });
      return Promise.resolve();
    }

    return new Promise(resolve => {
      try {
        area.set(data, () => resolve());
      } catch (error) {
        resolve();
      }
    });
  }

  async function loadPromptLibrary() {
    const stored = await storageGetLocal(PROMPT_LIBRARY_KEY);
    promptLibrary = Array.isArray(stored[PROMPT_LIBRARY_KEY])
      ? stored[PROMPT_LIBRARY_KEY].map(normalizePromptLibraryEntry).filter(Boolean)
      : [];
  }

  async function savePromptLibrary(entries) {
    promptLibrary = entries.map(normalizePromptLibraryEntry).filter(Boolean);
    await storageSetLocal({ [PROMPT_LIBRARY_KEY]: promptLibrary });
  }

  function getEditorStorageKey(editor) {
    if (!editor) return null;
    const editors = Array.from(document.querySelectorAll('.ProseMirror'));
    const index = editors.indexOf(editor);
    if (index === -1) return null;
    return `${PROMPT_BLOCK_STORAGE_PREFIX}:${location.origin}${location.pathname}:${index}`;
  }

  function loadPersistedPromptBlockState(editor) {
    const storageKey = getEditorStorageKey(editor);
    if (!storageKey) return null;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed?.blocks)) return null;
      return {
        blocks: parsed.blocks.map(block => ({
          id: block.id || createId(block.isGroup ? 'block' : 'tag'),
          tags: Array.isArray(block.tags) ? block.tags.map(tag => String(tag)) : [],
          delimiters: Array.isArray(block.delimiters) ? block.delimiters.map(delimiter => String(delimiter)) : [],
          locked: Boolean(block.locked),
          isGroup: Boolean(block.isGroup),
          libraryId: block.libraryId ? String(block.libraryId) : undefined,
          libraryAlias: block.libraryAlias ? String(block.libraryAlias) : undefined,
          libraryCategory: block.libraryCategory ? String(block.libraryCategory) : undefined,
        })).filter(block => block.tags.length > 0),
        signature: typeof parsed.signature === 'string' ? parsed.signature : '',
      };
    } catch (error) {
      return null;
    }
  }

  function persistPromptBlockState(editor, state) {
    const storageKey = getEditorStorageKey(editor);
    if (!storageKey) return;

    try {
      if (!state?.blocks?.length) {
        localStorage.removeItem(storageKey);
        return;
      }

      localStorage.setItem(storageKey, JSON.stringify({
        blocks: state.blocks,
        signature: state.signature,
      }));
    } catch (error) {}
  }

  function loadPromptBlockState(editor) {
    const state = editor ? (promptBlockStates.get(editor) || loadPersistedPromptBlockState(editor)) : null;
    promptBlocks = clonePromptBlocks(state?.blocks || []);
    promptBlockSignature = state?.signature || '';
    if (editor && state) {
      promptBlockStates.set(editor, {
        blocks: clonePromptBlocks(promptBlocks),
        signature: promptBlockSignature,
      });
    }
  }

  function savePromptBlockState(editor) {
    if (!editor) return;
    const state = {
      blocks: clonePromptBlocks(promptBlocks),
      signature: promptBlockSignature,
    };
    promptBlockStates.set(editor, state);
    persistPromptBlockState(editor, state);
  }

  function rebuildPromptBlocksFromTokens(tokens) {
    if (!promptBlocks.length) {
      return tokens.map(token => ({
        id: createId('tag'),
        tags: [token.tag],
        delimiters: [token.delimiter],
        locked: false,
        isGroup: false,
      }));
    }

    const nextBlocks = [];
    let cursor = 0;

    promptBlocks.forEach(block => {
      if (cursor >= tokens.length) return;
      const remaining = tokens.length - cursor;
      const blockSize = Math.min(block.tags.length, remaining);
      const nextTokens = tokens.slice(cursor, cursor + blockSize);
      cursor += blockSize;

      if (!nextTokens.length) return;

      const isGroup = block.isGroup && nextTokens.length > 1;

      nextBlocks.push({
        ...block,
        id: block.id,
        tags: nextTokens.map(token => token.tag),
        delimiters: nextTokens.map(token => token.delimiter),
        locked: block.locked && isGroup,
        isGroup,
        libraryId: isGroup ? block.libraryId : undefined,
        libraryAlias: isGroup ? block.libraryAlias : undefined,
        libraryCategory: isGroup ? block.libraryCategory : undefined,
      });
    });

    while (cursor < tokens.length) {
      nextBlocks.push({
        id: createId('tag'),
        tags: [tokens[cursor].tag],
        delimiters: [tokens[cursor].delimiter],
        locked: false,
        isGroup: false,
      });
      cursor += 1;
    }

    return nextBlocks;
  }

  function getTextOffsetForTokenIndex(tokens, tokenIndex) {
    if (tokenIndex <= 0) return 0;
    return tokens
      .slice(0, tokenIndex)
      .reduce((sum, token) => sum + token.tag.length + (token.delimiter?.length || 0), 0);
  }

  function replaceEditorText(editor, text) {
    if (!editor) return;
    const range = document.createRange();
    range.selectNodeContents(editor);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('insertText', false, text);
    activeEditor = editor;
  }

  function getPromptBlockIcon(type) {
    const icons = {
      group: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h5A1.5 1.5 0 0 1 12 7.5v5A1.5 1.5 0 0 1 10.5 14h-5A1.5 1.5 0 0 1 4 12.5zm8 0A1.5 1.5 0 0 1 13.5 6h5A1.5 1.5 0 0 1 20 7.5v5A1.5 1.5 0 0 1 18.5 14h-5A1.5 1.5 0 0 1 12 12.5zM8 15.5a.75.75 0 0 1 .75.75V18H10.5a.75.75 0 0 1 0 1.5H8.75v1.75a.75.75 0 0 1-1.5 0V19.5H5.5a.75.75 0 0 1 0-1.5h1.75v-1.75A.75.75 0 0 1 8 15.5z" fill="currentColor"/></svg>',
      save: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.25 3h9.69a2.25 2.25 0 0 1 1.6.66l2.8 2.8a2.25 2.25 0 0 1 .66 1.59v9.7A3.25 3.25 0 0 1 17.75 21h-11.5A3.25 3.25 0 0 1 3 17.75v-11.5A3.25 3.25 0 0 1 6.25 3m1.25 1.5v4.25h8V6.5H13a.75.75 0 0 1-.75-.75V4.5zm4.5 11.25a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5" fill="currentColor"/></svg>',
      grip: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="7" r="1.6" fill="currentColor"/><circle cx="8" cy="12" r="1.6" fill="currentColor"/><circle cx="8" cy="17" r="1.6" fill="currentColor"/><circle cx="16" cy="7" r="1.6" fill="currentColor"/><circle cx="16" cy="12" r="1.6" fill="currentColor"/><circle cx="16" cy="17" r="1.6" fill="currentColor"/></svg>',
      lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8.5a5 5 0 1 1 10 0V10h.75A2.25 2.25 0 0 1 20 12.25v7.5A2.25 2.25 0 0 1 17.75 22h-11.5A2.25 2.25 0 0 1 4 19.75v-7.5A2.25 2.25 0 0 1 6.25 10zm1.5 0h7V8.5a3.5 3.5 0 1 0-7 0z" fill="currentColor"/></svg>',
      unlock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 10V8.5a3.5 3.5 0 0 0-6.86-.98.75.75 0 1 1-1.47-.3A5 5 0 0 1 17 8.5V10h.75A2.25 2.25 0 0 1 20 12.25v7.5A2.25 2.25 0 0 1 17.75 22h-11.5A2.25 2.25 0 0 1 4 19.75v-7.5A2.25 2.25 0 0 1 6.25 10z" fill="currentColor"/></svg>',
      remove: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.53 5.47a.75.75 0 0 1 1.06 0L12 6.88l1.41-1.41a.75.75 0 1 1 1.06 1.06L13.06 7.94l1.41 1.41a.75.75 0 1 1-1.06 1.06L12 9l-1.41 1.41a.75.75 0 1 1-1.06-1.06l1.41-1.41-1.41-1.41a.75.75 0 0 1 0-1.06M7 4.25A2.25 2.25 0 0 1 9.25 2h5.5A2.25 2.25 0 0 1 17 4.25V5h1.25a.75.75 0 0 1 0 1.5h-.45l-.63 10.12A2.25 2.25 0 0 1 14.92 19H9.08a2.25 2.25 0 0 1-2.25-2.38L6.2 6.5h-.45a.75.75 0 0 1 0-1.5H7zm1.5.75h7v-.75a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75z" fill="currentColor"/></svg>',
    };
    return icons[type] || '';
  }

  function applyThemePreset(themePreset) {
    document.documentElement.dataset.naiTheme = themePreset || DEFAULT_THEME;
  }

  function syncThemeFromStorage() {
    try {
      chrome.storage.local.get([ASSISTANT_SETTINGS_KEY], (data) => {
        applyThemePreset(data?.[ASSISTANT_SETTINGS_KEY]?.themePreset || DEFAULT_THEME);
      });

      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local' || !changes[ASSISTANT_SETTINGS_KEY]) return;
        applyThemePreset(changes[ASSISTANT_SETTINGS_KEY].newValue?.themePreset || DEFAULT_THEME);
      });
    } catch (error) {
      applyThemePreset(DEFAULT_THEME);
    }
  }

  // CSV 解析，正确处理引号中的逗号
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  // 加载标签
  async function loadTags() {
    try {
      const cached = localStorage.getItem('nai-ac-tags');
      const cacheTime = localStorage.getItem('nai-ac-tags-time');
      if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 86400000) {
        allTags = JSON.parse(cached);
        isLoading = false;
        console.log(`[NAI-AC] 已从缓存加载 ${allTags.length} 个标签`);
        return;
      }

      const response = await fetch(CONFIG.CSV_URL);
      const text = await response.text();
      const lines = text.split('\n');
      allTags = [];

      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = parseCSVLine(line);
        if (parts[0]) {
          allTags.push({
            tag: parts[0].trim(),
            category: parts[1]?.trim() || '0',
            postCount: parseInt(parts[2]) || 0,
            aliases: parts[3]?.split(',').map(a => a.trim()).filter(Boolean) || [],
            translation: parts[4]?.split('|')[0]?.trim() || '',
          });
        }
      }

      allTags.sort((a, b) => b.postCount - a.postCount);
      localStorage.setItem('nai-ac-tags', JSON.stringify(allTags.slice(0, 50000)));
      localStorage.setItem('nai-ac-tags-time', Date.now().toString());
      isLoading = false;
      console.log(`[NAI-AC] 已加载 ${allTags.length} 个标签`);
    } catch (e) {
      console.error('[NAI-AC] 标签加载失败:', e);
      isLoading = false;
    }
  }

  // 搜索标签
  function searchTags(query) {
    if (!query || query.length < CONFIG.MIN_QUERY_LENGTH) return [];
    const q = query.toLowerCase().replace(/_/g, ' ');
    const results = [];

    promptLibrary.forEach(entry => {
      const keys = getPromptLibrarySearchKeys(entry);
      let score = 0;
      for (const key of keys) {
        const normalizedKey = key.toLowerCase().replace(/_/g, ' ');
        if (normalizedKey === q) {
          score = Math.max(score, 3000);
        } else if (normalizedKey.startsWith(q)) {
          score = Math.max(score, 2400);
        } else if (normalizedKey.includes(q)) {
          score = Math.max(score, 1800);
        }
      }

      if (score > 0) {
        results.push({
          ...entry,
          resultType: 'prompt-library',
          category: 'library',
          translation: getPromptLibrarySummary(entry),
          postCount: entry.tags.length,
          score: score + entry.tags.length / 100,
        });
      }
    });

    for (const tag of allTags) {
      if (results.length >= CONFIG.MAX_RESULTS * 3) break;
      const t = tag.tag.toLowerCase().replace(/_/g, ' ');
      const tr = tag.translation?.toLowerCase() || '';
      const aliases = tag.aliases || [];

      if (t.startsWith(q)) {
        results.push({ ...tag, score: 1000 + tag.postCount / 1e6 });
      } else if (t.includes(q)) {
        results.push({ ...tag, score: 500 + tag.postCount / 1e6 });
      } else if (tr.includes(q)) {
        results.push({ ...tag, score: 300 + tag.postCount / 1e6 });
      } else if (aliases.some(a => a.toLowerCase().replace(/_/g, ' ').includes(q))) {
        results.push({ ...tag, score: 200 + tag.postCount / 1e6, matchedAlias: aliases.find(a => a.toLowerCase().includes(q)) });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, CONFIG.MAX_RESULTS);
  }

  // 创建补全容器
  function createContainer() {
    if (autocompleteContainer) return autocompleteContainer;
    const c = document.createElement('div');
    c.className = 'nai-autocomplete-container';
    c.innerHTML = `
      <div class="nai-autocomplete-header">
        <span class="nai-autocomplete-title">标签补全</span>
        <label class="nai-slash-toggle" title="下划线与空格互转">
          <input type="checkbox" id="nai-slash-switch">
          <span>_ ⇄ 空格</span>
        </label>
      </div>
      <div class="nai-autocomplete-list"></div>
      <div class="nai-autocomplete-footer"><span class="nai-autocomplete-count-info"></span><span>↑↓ 选择 · Tab 确认</span></div>
    `;
    document.body.appendChild(c);
    autocompleteContainer = c;

    // 下划线互转开关
    const slashSwitch = c.querySelector('#nai-slash-switch');
    slashSwitch.checked = settings.convertSlashToSpace;
    slashSwitch.addEventListener('change', (e) => {
      e.stopPropagation();
      settings.convertSlashToSpace = slashSwitch.checked;
      localStorage.setItem('nai-ac-settings', JSON.stringify(settings));
    });

    document.addEventListener('click', e => {
      if (!c.contains(e.target) && e.target !== activeEditor) hideAutocomplete();
    });
    return c;
  }

  function escapeHtml(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  function highlight(text, query) {
    const i = text.toLowerCase().indexOf(query.toLowerCase());
    if (i === -1) return escapeHtml(text);
    return escapeHtml(text.slice(0, i)) + '<span class="highlight">' + escapeHtml(text.slice(i, i + query.length)) + '</span>' + escapeHtml(text.slice(i + query.length));
  }

  function formatCount(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toString();
  }

  function slicePromptBlock(block, startIndex, endIndexExclusive) {
    const tags = block.tags.slice(startIndex, endIndexExclusive);
    const delimiters = (block.delimiters || []).slice(startIndex, endIndexExclusive);
    if (!tags.length) return null;
    const isGroup = block.isGroup && tags.length > 1;
    const isWholeBlock = startIndex === 0 && endIndexExclusive === block.tags.length;
    return {
      ...(isWholeBlock ? block : {}),
      id: tags.length === block.tags.length ? block.id : createId(isGroup ? 'block' : 'tag'),
      tags,
      delimiters,
      locked: isGroup && block.locked,
      isGroup,
      libraryId: isGroup && isWholeBlock ? block.libraryId : undefined,
      libraryAlias: isGroup && isWholeBlock ? block.libraryAlias : undefined,
      libraryCategory: isGroup && isWholeBlock ? block.libraryCategory : undefined,
    };
  }

  function replacePromptBlocksByTokenRange(startTokenIndex, endTokenIndex, insertedBlocks) {
    let cursor = 0;
    const before = [];
    const after = [];

    promptBlocks.forEach(block => {
      const blockStart = cursor;
      const blockEnd = cursor + block.tags.length - 1;

      if (blockEnd < startTokenIndex) {
        before.push(block);
      } else if (blockStart > endTokenIndex) {
        after.push(block);
      } else {
        const startOffset = Math.max(0, startTokenIndex - blockStart);
        const endOffset = Math.min(block.tags.length, endTokenIndex - blockStart + 1);
        const leading = slicePromptBlock(block, 0, startOffset);
        const trailing = slicePromptBlock(block, endOffset, block.tags.length);
        if (leading) before.push(leading);
        if (trailing) after.push(trailing);
      }

      cursor += block.tags.length;
    });

    return [...before, ...insertedBlocks, ...after];
  }

  function getEditorFromRange(range) {
    const node = range.startContainer;
    return node.nodeType === Node.TEXT_NODE
      ? node.parentElement?.closest('.ProseMirror')
      : node.closest?.('.ProseMirror');
  }

  function createRangeFromTextOffsets(root, startOffset, endOffset) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let node = null;
    let currentOffset = 0;
    let startNode = null;
    let startNodeOffset = 0;
    let endNode = null;
    let endNodeOffset = 0;

    while ((node = walker.nextNode())) {
      const textLength = node.textContent?.length || 0;
      const nextOffset = currentOffset + textLength;

      if (!startNode && startOffset <= nextOffset) {
        startNode = node;
        startNodeOffset = Math.max(0, startOffset - currentOffset);
      }

      if (!endNode && endOffset <= nextOffset) {
        endNode = node;
        endNodeOffset = Math.max(0, endOffset - currentOffset);
        break;
      }

      currentOffset = nextOffset;
    }

    if (!startNode || !endNode) return null;

    range.setStart(startNode, startNodeOffset);
    range.setEnd(endNode, endNodeOffset);
    return range;
  }

  function getSegmentContext() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return null;

    const range = sel.getRangeAt(0);
    const editor = activeEditor || getEditorFromRange(range);
    if (!editor) return null;

    const beforeRange = range.cloneRange();
    beforeRange.selectNodeContents(editor);
    beforeRange.setEnd(range.startContainer, range.startOffset);

    const afterRange = range.cloneRange();
    afterRange.selectNodeContents(editor);
    afterRange.setStart(range.startContainer, range.startOffset);

    const beforeText = beforeRange.toString();
    const afterText = afterRange.toString();
    const segmentBreak = Math.max(beforeText.lastIndexOf(','), beforeText.lastIndexOf('\n'));
    const rawSegment = beforeText.slice(segmentBreak + 1);
    const leadingSpaceLength = rawSegment.match(/^\s*/)?.[0].length || 0;
    const segmentText = rawSegment.slice(leadingSpaceLength);
    const caretOffset = beforeText.length;
    const segmentStartOffset = caretOffset - segmentText.length;
    const segmentTailMatch = afterText.match(/^[^,\n]*/);
    const segmentTailText = segmentTailMatch ? segmentTailMatch[0] : '';
    const afterSegmentText = afterText.slice(segmentTailText.length);
    const nextMeaningfulChar = afterSegmentText.replace(/^\s+/, '').charAt(0);
    const segmentRange = createRangeFromTextOffsets(editor, segmentStartOffset, caretOffset);

    if (!segmentRange) return null;

    return {
      editor,
      segmentText,
      segmentTailText,
      segmentStartOffset,
      caretOffset,
      nextMeaningfulChar,
      segmentRange,
    };
  }

  // 解析当前上下文（权重、artist 前缀等）
  function parseCurrentContext() {
    const context = getSegmentContext();
    if (!context) return { weight: 1.0, hasArtist: false };

    const { segmentText: segment } = context;
    const weightMatch = segment.match(/^(-?\d+\.?\d*)(?::|：){2}/);

    return {
      weight: weightMatch ? parseFloat(weightMatch[1]) : 1.0,
      hasArtist: /artist(?::|：)/.test(segment),
    };
  }

  function showAutocomplete(editor, results, query) {
    const c = createContainer();
    const list = c.querySelector('.nai-autocomplete-list');

    if (query === lastRenderedQuery && currentResults.length > 0) {
      positionAutocomplete(editor);
      if (!c.classList.contains('visible')) {
        requestAnimationFrame(() => c.classList.add('visible'));
      }
      return;
    }

    lastRenderedQuery = query;
    currentResults = results;
    currentQuery = query;
    selectedIndex = 0;

    const context = parseCurrentContext();

    if (isLoading) {
      list.innerHTML = '<div class="nai-autocomplete-loading"><span class="nai-autocomplete-spinner"></span>加载中...</div>';
    } else if (!results.length) {
      list.innerHTML = '<div class="nai-autocomplete-empty"><div class="nai-autocomplete-empty-icon">-</div>无匹配结果</div>';
    } else {
      list.innerHTML = results.map((tag, i) => {
        const isLibrary = tag.resultType === 'prompt-library';
        const isArtist = tag.category === '1';
        const showArtistChecked = isArtist && context.hasArtist;
        const weightControl = isLibrary ? '' : `
          <div class="nai-autocomplete-weight">
            <button class="nai-weight-btn nai-weight-down" data-index="${i}">-</button>
            <span class="nai-weight-value" data-index="${i}">${context.weight.toFixed(1)}</span>
            <button class="nai-weight-btn nai-weight-up" data-index="${i}">+</button>
          </div>
        `;
        const countLabel = isLibrary ? `${tag.tags.length} tags` : formatCount(tag.postCount);
        const tagTitle = isLibrary
          ? `<div class="nai-autocomplete-tag"><span class="nai-autocomplete-tag-text">${highlight(tag.alias, query)}</span><span class="nai-autocomplete-badge">词库</span></div>`
          : `<div class="nai-autocomplete-tag"><span class="nai-autocomplete-tag-text">${highlight(tag.tag, query)}</span></div>`;
        const subTitle = isLibrary
          ? `<div class="nai-autocomplete-translation">${escapeHtml(tag.translation || '')}</div>`
          : (tag.matchedAlias ? `<div class="nai-autocomplete-translation">别名 · ${tag.matchedAlias}</div>` :
              tag.translation ? `<div class="nai-autocomplete-translation">${tag.translation}</div>` : '');
        return `
        <div class="nai-autocomplete-item ${i === 0 ? 'selected' : ''}" data-index="${i}">
          <div class="nai-autocomplete-category" data-category="${isLibrary ? 'library' : tag.category}"></div>
          <div class="nai-autocomplete-content">
            ${tagTitle}
            ${subTitle}
          </div>
          ${isArtist && !isLibrary ? `<label class="nai-artist-toggle" title="使用 artist: 前缀" data-index="${i}">
            <input type="checkbox" class="nai-artist-check" data-index="${i}" ${showArtistChecked ? 'checked' : ''}>
            <span>artist:</span>
          </label>` : ''}
          ${weightControl}
          <div class="nai-autocomplete-count">${countLabel}</div>
        </div>
      `;
      }).join('');

      results.forEach(tag => {
        if (tag.resultType === 'prompt-library') return;
        tag.weight = context.weight;
        if (tag.category === '1') {
          tag.useArtistPrefix = context.hasArtist;
        }
      });

      list.querySelectorAll('.nai-artist-check').forEach(chk => {
        chk.addEventListener('mousedown', e => e.stopPropagation());
        chk.addEventListener('click', e => e.stopPropagation());
        chk.addEventListener('change', e => {
          e.stopPropagation();
          currentResults[+chk.dataset.index].useArtistPrefix = chk.checked;
        });
      });

      list.querySelectorAll('.nai-artist-toggle').forEach(label => {
        label.addEventListener('click', e => {
          if (!e.target.classList.contains('nai-artist-check')) {
            e.preventDefault();
            e.stopPropagation();
          }
        });

        label.addEventListener('mousedown', e => {
          if (e.target.classList.contains('nai-artist-check')) return;
          e.preventDefault();
          e.stopPropagation();
          const chk = label.querySelector('.nai-artist-check');
          chk.checked = !chk.checked;
          currentResults[+label.dataset.index].useArtistPrefix = chk.checked;
        });
      });

      list.querySelectorAll('.nai-weight-btn').forEach(btn => {
        btn.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
          const idx = +btn.dataset.index;
          const valueEl = list.querySelector(`.nai-weight-value[data-index="${idx}"]`);
          const currentValue = parseFloat(valueEl.textContent);
          let val = Number.isFinite(currentValue) ? currentValue : 1.0;
          val = btn.classList.contains('nai-weight-up') ? val + 0.1 : val - 0.1;
          val = Math.max(-2.0, Math.min(2.0, val));
          valueEl.textContent = val.toFixed(1);
          currentResults[idx].weight = val;
        });
      });

      list.querySelectorAll('.nai-autocomplete-item').forEach(item => {
        item.addEventListener('mousedown', e => {
          if (
            e.target.closest('.nai-weight-btn') ||
            e.target.closest('.nai-artist-toggle') ||
            e.target.closest('.nai-artist-check')
          ) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          applyAutocompleteResult(currentResults[+item.dataset.index]);
        });
        item.onmouseenter = () => {
          selectedIndex = +item.dataset.index;
          updateSelection();
        };
      });
    }

    c.querySelector('.nai-autocomplete-count-info').textContent = `${results.length} 条结果`;
    positionAutocomplete(editor);
    requestAnimationFrame(() => c.classList.add('visible'));
  }

  function hideAutocomplete() {
    autocompleteContainer?.classList.remove('visible');
    currentResults = [];
    selectedIndex = 0;
    lastRenderedQuery = '';
  }

  function getCaretRect(editor) {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return editor.getBoundingClientRect();

    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);

    let rect = range.getBoundingClientRect();
    if (rect && (rect.width || rect.height)) return rect;

    const marker = document.createElement('span');
    marker.textContent = '\u200b';
    marker.setAttribute('data-nai-caret-marker', 'true');

    try {
      range.insertNode(marker);
      rect = marker.getBoundingClientRect();
    } finally {
      marker.remove();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    return rect && (rect.width || rect.height) ? rect : editor.getBoundingClientRect();
  }

  function positionAutocomplete(editor) {
    if (!autocompleteContainer || !editor) return;
    const editorRect = editor.getBoundingClientRect();
    const caretRect = getCaretRect(editor);
    const viewportPadding = 8;
    const gap = 10;
    const panelWidth = Math.min(
      Math.max(autocompleteContainer.offsetWidth || 360, 280),
      400
    );
    const panelHeight = Math.min(
      Math.max(autocompleteContainer.offsetHeight || 320, 180),
      320
    );

    const spaceBelow = window.innerHeight - caretRect.bottom - viewportPadding;
    const spaceAbove = caretRect.top - viewportPadding;

    let top;
    if (spaceBelow >= panelHeight || spaceBelow >= spaceAbove) {
      top = caretRect.bottom + gap;
    } else {
      top = caretRect.top - panelHeight - gap;
    }

    top = Math.min(
      Math.max(viewportPadding, top),
      Math.max(viewportPadding, window.innerHeight - panelHeight - viewportPadding)
    );

    let left = caretRect.left;
    if (left + panelWidth > window.innerWidth - viewportPadding) {
      left = window.innerWidth - panelWidth - viewportPadding;
    }
    left = Math.max(viewportPadding, left);

    if (left < editorRect.left - panelWidth * 0.5) {
      left = Math.max(viewportPadding, editorRect.left);
    }

    autocompleteContainer.style.top = `${top}px`;
    autocompleteContainer.style.left = `${left}px`;
  }

  function updateSelection() {
    autocompleteContainer?.querySelectorAll('.nai-autocomplete-item').forEach((item, i) => {
      item.classList.toggle('selected', i === selectedIndex);
    });
  }

  function getCurrentWord() {
    const context = getSegmentContext();
    if (!context) return '';

    const word = context.segmentText.trim();
    if (!word) return '';

    let match = word.match(/^(-?\d+\.?\d*)(?::|：){2}artist(?::|：)([^:：]+)(?::|：){2}$/);
    if (match) return match[2];

    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}([^:：]+)(?::|：){2}$/);
    if (match) return match[2];

    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}artist(?::|：)([^:：]+)(?::|：)$/);
    if (match) return match[2];

    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}([^:：]+)(?::|：)$/);
    if (match) return match[2];

    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}artist(?::|：)[^:：]+(?::|：){2}(.+)$/);
    if (match) return match[2];

    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}[^:：]+(?::|：){2}(.+)$/);
    if (match) return match[2];

    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}.*,([^,]*)$/);
    if (match) return match[2].trim();

    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}artist(?::|：)(.*)$/);
    if (match) return match[2].replace(/(?::|：)+$/, '');

    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}(.*)$/);
    if (match) return match[2].replace(/(?::|：)+$/, '');

    match = word.match(/^artist(?::|：)(.*)$/);
    if (match) return match[1];

    return word;
  }

  function applyAutocompleteResult(item) {
    if (!item) return;
    if (item.resultType === 'prompt-library') {
      selectPromptLibrary(item);
      return;
    }
    selectTag(item);
  }

  function selectPromptLibrary(entry) {
    if (!activeEditor || !entry) return;
    ensurePromptBlockModel(activeEditor);

    const context = getSegmentContext();
    if (!context) return;

    const fullText = getEditorText(activeEditor);
    const replaceStartTokenIndex = splitPromptTags(fullText.slice(0, context.segmentStartOffset)).length;
    const replaceTokenCount = Math.max(1, splitPromptTags(`${context.segmentText}${context.segmentTailText}`).length);
    const replaceEndTokenIndex = replaceStartTokenIndex + replaceTokenCount - 1;
    const insertedDelimiters = [...(entry.delimiters || entry.tags.map((_, index) => index === entry.tags.length - 1 ? '' : ', '))];
    const nextChar = context.nextMeaningfulChar;
    if (nextChar === ',' || nextChar === '，' || nextChar === '\n') {
      insertedDelimiters[insertedDelimiters.length - 1] = '';
    }

    promptBlocks = replacePromptBlocksByTokenRange(replaceStartTokenIndex, replaceEndTokenIndex, [{
      id: createId('block'),
      tags: [...entry.tags],
      delimiters: insertedDelimiters,
      locked: false,
      isGroup: true,
      libraryId: entry.id,
      libraryAlias: entry.alias,
    }]);

    hideAutocomplete();
    commitPromptBlocks(activeEditor);
  }

  function selectTag(tag) {
    if (!activeEditor || !tag) return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;

    const context = getSegmentContext();
    if (!context) return;

    const {
      editor,
      segmentText: currentSegment,
      segmentTailText,
      segmentStartOffset,
      caretOffset,
      nextMeaningfulChar,
    } = context;

    let start = 0;
    let isAfterComplete = false;
    let isMultiTagFormat = false;
    const preservedSuffixMatch = segmentTailText.match(/[\)\]\}]+$/);
    const preservedSuffix = preservedSuffixMatch ? preservedSuffixMatch[0] : '';
    const normalizedTail = segmentTailText.slice(0, segmentTailText.length - preservedSuffix.length);
    const fullSegment = `${currentSegment}${normalizedTail}`;
    const shouldAppendComma = nextMeaningfulChar !== ',' && nextMeaningfulChar !== '，';

    const exactCompleteMatch = fullSegment.match(/^(-?\d+\.?\d*(?::|：){2}(artist(?::|：))?[^:：]+(?::|：){1,2})$/);
    const afterCompleteMatch = fullSegment.match(/^(-?\d+\.?\d*(?::|：){2}(artist(?::|：))?[^:：]+(?::|：){2})(.+)$/);
    if (exactCompleteMatch) {
      isAfterComplete = false;
    } else if (afterCompleteMatch) {
      start = afterCompleteMatch[1].length;
      isAfterComplete = true;
    } else {
      const multiTagMatch = fullSegment.match(/^(-?\d+\.?\d*(?::|：){2}.*,)/);
      if (multiTagMatch) {
        start = multiTagMatch[1].length;
        isMultiTagFormat = true;
      }
    }

    const replacementRange = createRangeFromTextOffsets(
      editor,
      segmentStartOffset + start,
      caretOffset + segmentTailText.length
    );
    if (!replacementRange) return;

    sel.removeAllRanges();
    sel.addRange(replacementRange);

    let tagName = tag.tag;
    if (settings.convertSlashToSpace) {
      tagName = tagName.replace(/_/g, ' ');
    } else {
      tagName = tagName.replace(/ /g, '_');
    }

    const weight = Number.isFinite(tag.weight) ? tag.weight : 1.0;
    const useArtist = tag.category === '1' && tag.useArtistPrefix;
    const commaSuffix = shouldAppendComma ? ', ' : '';

    let output;
    if (isAfterComplete || isMultiTagFormat) {
      output = `${tagName}${preservedSuffix}${shouldAppendComma ? ',' : ''}`;
    } else if (weight !== 1.0) {
      const weightStr = weight.toFixed(1);
      output = useArtist
        ? `${weightStr}::artist:${tagName}::${preservedSuffix}${commaSuffix}`
        : `${weightStr}::${tagName}::${preservedSuffix}${commaSuffix}`;
    } else {
      output = useArtist
        ? `artist:${tagName}${preservedSuffix}${commaSuffix}`
        : `${tagName}${preservedSuffix}${commaSuffix}`;
    }

    document.execCommand('insertText', false, output);
    hideAutocomplete();
  }

  // 防抖
  function debounce(fn, delay) {
    let t;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), delay); };
  }

  const handleInput = debounce(editor => {
    const word = getCurrentWord();
    if (word.length >= CONFIG.MIN_QUERY_LENGTH) {
      const results = searchTags(word);
      if (results.length || isLoading) showAutocomplete(editor, results, word);
      else hideAutocomplete();
    } else hideAutocomplete();
  }, CONFIG.DEBOUNCE_DELAY);

  function handleKeyDown(e) {
    if (!autocompleteContainer?.classList.contains('visible')) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); selectedIndex = Math.min(selectedIndex + 1, currentResults.length - 1); updateSelection(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selectedIndex = Math.max(selectedIndex - 1, 0); updateSelection(); }
    else if (e.key === 'Tab' || e.key === 'Enter') { if (currentResults[selectedIndex]) { e.preventDefault(); applyAutocompleteResult(currentResults[selectedIndex]); } }
    else if (e.key === 'Escape') { e.preventDefault(); hideAutocomplete(); }
  }

  function ensurePromptBlockModel(editor) {
    if (!editor) return [];
    loadPromptBlockState(editor);
    const text = getEditorText(editor);
    const tokens = parsePromptTokens(text);
    const tags = tokens.map(token => token.tag);
    const signature = tags.map(tag => normalizeTagValue(tag)).join('\n');

    if (!signature) {
      promptBlocks = [];
      promptBlockSignature = '';
      savePromptBlockState(editor);
      renderPromptBlockPanel(editor);
      return promptBlocks;
    }

    if (signature !== promptBlockSignature || !hasCompletePromptBlockDelimiters(promptBlocks)) {
      promptBlocks = rebuildPromptBlocksFromTokens(tokens);
      promptBlockSignature = signature;
      savePromptBlockState(editor);
    }

    renderPromptBlockPanel(editor);
    return promptBlocks;
  }

  function createPromptBlockPanel() {
    if (promptBlockPanel) return promptBlockPanel;
    const panel = document.createElement('div');
    panel.className = 'nai-prompt-block-panel nai-hidden';

    panel.addEventListener('click', async (event) => {
      const target = event.target.closest('[data-action]');
      if (!target) return;
      if (!activeEditor) return;
      ensurePromptBlockModel(activeEditor);

      const blockId = target.closest('[data-block-id]')?.dataset.blockId;
      const blockIndex = promptBlocks.findIndex(block => block.id === blockId);

      if (blockIndex === -1) return;

      if (target.dataset.action === 'toggle-lock') {
        promptBlocks[blockIndex] = {
          ...promptBlocks[blockIndex],
          locked: !promptBlocks[blockIndex].locked,
        };
        savePromptBlockState(activeEditor);
        renderPromptBlockPanel(activeEditor);
        return;
      }

      if (target.dataset.action === 'remove-block' && promptBlocks[blockIndex].isGroup) {
        const singles = promptBlocks[blockIndex].tags.map((tag, index) => ({
          id: createId('tag'),
          tags: [tag],
          delimiters: [promptBlocks[blockIndex].delimiters?.[index] || ''],
          locked: false,
          isGroup: false,
        }));
        promptBlocks.splice(blockIndex, 1, ...singles);
        commitPromptBlocks(activeEditor);
        return;
      }

      if (target.dataset.action === 'save-library' && promptBlocks[blockIndex].isGroup) {
        openPromptLibraryDialog(promptBlocks[blockIndex].id);
      }
    });

    panel.addEventListener('dragstart', (event) => {
      const item = event.target.closest('.nai-prompt-block-drag-hitbox[data-block-id]');
      if (!item) return;
      if (!isPromptBlockDragMode) {
        event.preventDefault();
        return;
      }
      const block = promptBlocks.find(entry => entry.id === item.dataset.blockId);
      if (!block || block.locked) {
        event.preventDefault();
        return;
      }
      promptBlockDragId = block.id;
      item.classList.add('is-dragging');
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', block.id);
      }
    });

    panel.addEventListener('dragend', (event) => {
      promptBlockDragId = null;
      event.target.closest('.nai-prompt-block-drag-hitbox')?.classList.remove('is-dragging');
      hidePromptBlockDropIndicator();
      setPromptBlockDragMode(false);
    });

    document.body.appendChild(panel);
    promptBlockPanel = panel;
    return panel;
  }

  function createPromptBlockDropIndicator() {
    if (promptBlockDropIndicator) return promptBlockDropIndicator;
    const indicator = document.createElement('div');
    indicator.className = 'nai-prompt-block-drop-indicator nai-hidden';
    document.body.appendChild(indicator);
    promptBlockDropIndicator = indicator;
    return indicator;
  }

  function createPromptLibraryDialog() {
    if (promptLibraryDialog) return promptLibraryDialog;
    const dialog = document.createElement('div');
    dialog.className = 'nai-prompt-library-dialog nai-hidden';
    dialog.innerHTML = `
      <div class="nai-prompt-library-backdrop" data-action="close-library-dialog"></div>
      <div class="nai-prompt-library-card" role="dialog" aria-modal="true" aria-label="保存词库">
        <div class="nai-prompt-library-head">
          <div class="nai-prompt-library-title">保存到词库</div>
          <div class="nai-prompt-library-note">格式固定为 分类:名称</div>
        </div>
        <div class="nai-prompt-library-grid">
          <label class="nai-prompt-library-field">
            <span>预设分类</span>
            <select data-field="preset-category">
              ${PRESET_PROMPT_LIBRARY_CATEGORIES.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join('')}
              <option value="custom">自定义</option>
            </select>
          </label>
          <label class="nai-prompt-library-field nai-hidden" data-custom-category-wrap>
            <span>自定义分类</span>
            <input data-field="custom-category" type="text" placeholder="例如 role_alt" />
          </label>
          <label class="nai-prompt-library-field">
            <span>名称</span>
            <input data-field="entry-name" type="text" placeholder="例如 yuukarin" />
          </label>
        </div>
        <div class="nai-prompt-library-preview" data-field="alias-preview">char:yuukarin</div>
        <div class="nai-prompt-library-error nai-hidden" data-field="alias-error"></div>
        <div class="nai-prompt-library-actions">
          <button type="button" data-action="close-library-dialog">取消</button>
          <button type="button" class="is-primary" data-action="confirm-library-save">保存</button>
        </div>
      </div>
    `;

    dialog.addEventListener('click', async (event) => {
      const actionTarget = event.target.closest('[data-action]');
      if (!actionTarget) return;
      const action = actionTarget.getAttribute('data-action');
      if (action === 'close-library-dialog') {
        closePromptLibraryDialog();
      } else if (action === 'confirm-library-save') {
        await savePromptLibraryFromDialog();
      }
    });

    dialog.querySelector('[data-field="preset-category"]')?.addEventListener('change', updatePromptLibraryDialogPreview);
    dialog.querySelector('[data-field="custom-category"]')?.addEventListener('input', updatePromptLibraryDialogPreview);
    dialog.querySelector('[data-field="entry-name"]')?.addEventListener('input', updatePromptLibraryDialogPreview);
    dialog.addEventListener('keydown', async (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePromptLibraryDialog();
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        await savePromptLibraryFromDialog();
      }
    });

    document.body.appendChild(dialog);
    promptLibraryDialog = dialog;
    return dialog;
  }

  function getPromptLibraryDialogAlias() {
    const dialog = createPromptLibraryDialog();
    const presetValue = dialog.querySelector('[data-field="preset-category"]')?.value || 'char';
    const customValue = dialog.querySelector('[data-field="custom-category"]')?.value || '';
    const nameValue = dialog.querySelector('[data-field="entry-name"]')?.value || '';
    const category = presetValue === 'custom' ? customValue : presetValue;
    const normalizedCategory = normalizePromptLibraryCategory(category);
    const normalizedName = normalizePromptLibraryName(nameValue);
    return {
      alias: normalizePromptLibraryAlias(`${category}:${nameValue}`, category),
      normalizedCategory,
      normalizedName,
      hasCategory: Boolean(String(category || '').trim()),
      hasName: Boolean(String(nameValue || '').trim()),
    };
  }

  function updatePromptLibraryDialogPreview() {
    const dialog = createPromptLibraryDialog();
    const presetValue = dialog.querySelector('[data-field="preset-category"]')?.value || 'char';
    const customWrap = dialog.querySelector('[data-custom-category-wrap]');
    if (customWrap) {
      customWrap.classList.toggle('nai-hidden', presetValue !== 'custom');
    }
    const preview = dialog.querySelector('[data-field="alias-preview"]');
    const error = dialog.querySelector('[data-field="alias-error"]');
    const submit = dialog.querySelector('[data-action="confirm-library-save"]');
    const draft = getPromptLibraryDialogAlias();
    let errorText = '';

    if (presetValue === 'custom' && !draft.hasCategory) {
      errorText = '请先填写自定义分类。';
    } else if (!draft.normalizedCategory) {
      errorText = '分类仅支持字母、数字、下划线、短横线或常见文字。';
    } else if (!draft.hasName) {
      errorText = '请先填写名称。';
    } else if (!draft.normalizedName) {
      errorText = '名称仅支持字母、数字、下划线、短横线或常见文字。';
    }

    if (preview) {
      preview.textContent = draft.alias || '分类:名称';
    }
    if (error) {
      error.textContent = errorText;
      error.classList.toggle('nai-hidden', !errorText);
    }
    if (submit instanceof HTMLButtonElement) {
      submit.disabled = Boolean(errorText);
    }
  }

  function openPromptLibraryDialog(blockId) {
    const block = promptBlocks.find((entry) => entry.id === blockId && entry.isGroup);
    if (!block) return;
    const dialog = createPromptLibraryDialog();
    const existing = splitPromptLibraryAlias(block.libraryAlias || '');
    const presetField = dialog.querySelector('[data-field="preset-category"]');
    const customField = dialog.querySelector('[data-field="custom-category"]');
    const nameField = dialog.querySelector('[data-field="entry-name"]');
    const isPreset = PRESET_PROMPT_LIBRARY_CATEGORIES.some((item) => item.id === existing.category);

    promptLibraryDialogState.blockId = blockId;
    if (presetField) presetField.value = block.libraryAlias ? (isPreset ? existing.category : 'custom') : 'char';
    if (customField) customField.value = block.libraryAlias && !isPreset ? existing.category : '';
    if (nameField) nameField.value = block.libraryAlias ? existing.name : getLibraryDefaultName(block);
    updatePromptLibraryDialogPreview();
    dialog.classList.remove('nai-hidden');
    requestAnimationFrame(() => {
      (nameField || customField)?.focus();
      (nameField || customField)?.select?.();
    });
  }

  function closePromptLibraryDialog() {
    if (!promptLibraryDialog) return;
    promptLibraryDialog.classList.add('nai-hidden');
    promptLibraryDialogState.blockId = '';
  }

  async function savePromptLibraryFromDialog() {
    if (!activeEditor || !promptLibraryDialogState.blockId) return;
    ensurePromptBlockModel(activeEditor);
    const blockIndex = promptBlocks.findIndex((entry) => entry.id === promptLibraryDialogState.blockId && entry.isGroup);
    if (blockIndex === -1) {
      closePromptLibraryDialog();
      return;
    }

    const draft = getPromptLibraryDialogAlias();
    if (!draft.alias || !draft.normalizedCategory || !draft.normalizedName) {
      updatePromptLibraryDialogPreview();
      return;
    }

    const block = promptBlocks[blockIndex];
    const nextEntry = normalizePromptLibraryEntry({
      id: block.libraryId || createId('library'),
      alias: draft.alias,
      category: draft.normalizedCategory,
      name: draft.normalizedName,
      tags: block.tags,
      delimiters: block.delimiters,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    if (!nextEntry) return;

    const existingIndex = promptLibrary.findIndex((entry) => entry.alias === draft.alias || entry.id === nextEntry.id);
    const nextLibrary = [...promptLibrary];
    if (existingIndex >= 0) {
      nextEntry.createdAt = promptLibrary[existingIndex].createdAt || nextEntry.createdAt;
      nextLibrary.splice(existingIndex, 1, nextEntry);
    } else {
      nextLibrary.unshift(nextEntry);
    }

    await savePromptLibrary(nextLibrary);
    promptBlocks[blockIndex] = {
      ...promptBlocks[blockIndex],
      libraryId: nextEntry.id,
      libraryAlias: nextEntry.alias,
      libraryCategory: nextEntry.category,
    };
    savePromptBlockState(activeEditor);
    renderPromptBlockPanel(activeEditor);
    closePromptLibraryDialog();
  }

  function hidePromptBlockDropIndicator() {
    if (!promptBlockDropIndicator) return;
    promptBlockDropIndicator.classList.add('nai-hidden');
  }

  function setPromptBlockDragMode(enabled) {
    isPromptBlockDragMode = enabled;
    document.documentElement.classList.toggle('nai-block-drag-mode', enabled);
  }

  function createPromptBlockToolbar() {
    if (promptBlockToolbar) return promptBlockToolbar;
    const toolbar = document.createElement('div');
    toolbar.className = 'nai-prompt-block-toolbar nai-hidden';
    toolbar.innerHTML = `<button type="button" data-action="group-selection" title="设为区块" aria-label="设为区块">${getPromptBlockIcon('group')}</button>`;
    toolbar.querySelector('button').addEventListener('click', () => groupPromptSelection());
    document.body.appendChild(toolbar);
    promptBlockToolbar = toolbar;
    return toolbar;
  }

  function positionPromptBlockPanel(editor) {
    if (!promptBlockPanel || !editor) return;
    promptBlockPanel.style.top = '0px';
    promptBlockPanel.style.left = '0px';
  }

  function getPromptBlockVisuals(editor) {
    const tokens = parsePromptTokens(getEditorText(editor));

    return promptBlocks.filter(block => block.isGroup).map((block, index) => {
      const label = block.tags.join(', ');
      const startTokenIndex = promptBlocks
        .slice(0, promptBlocks.findIndex(entry => entry.id === block.id))
        .reduce((sum, entry) => sum + entry.tags.length, 0);
      const startOffset = getTextOffsetForTokenIndex(tokens, startTokenIndex);
      const endOffset = startOffset + block.tags.reduce((sum, tag, tagIndex) => (
        sum + tag.length + (block.delimiters?.[tagIndex] || '').length
      ), 0) - ((block.delimiters?.[block.tags.length - 1] || '').length);

      const range = createRangeFromTextOffsets(editor, startOffset, endOffset);
      if (!range) return null;

      const rects = Array.from(range.getClientRects())
        .filter(rect => rect.width > 0 && rect.height > 0)
        .map(rect => ({
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        }));

      if (!rects.length) {
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          rects.push({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          });
        }
      }

      if (!rects.length) return null;

      const firstRect = rects[0];
      const unionRect = rects.reduce((acc, rect) => ({
        left: Math.min(acc.left, rect.left),
        top: Math.min(acc.top, rect.top),
        right: Math.max(acc.right, rect.left + rect.width),
        bottom: Math.max(acc.bottom, rect.top + rect.height),
      }), {
        left: firstRect.left,
        top: firstRect.top,
        right: firstRect.left + firstRect.width,
        bottom: firstRect.top + firstRect.height,
      });
      return {
        id: block.id,
        label,
        locked: block.locked,
        accent: PROMPT_BLOCK_COLORS[index % PROMPT_BLOCK_COLORS.length],
        rects,
        unionRect: {
          left: unionRect.left,
          top: unionRect.top,
          width: unionRect.right - unionRect.left,
          height: unionRect.bottom - unionRect.top,
        },
        anchorLeft: Math.min(window.innerWidth - 34, Math.max(6, unionRect.right + 4)),
        anchorTop: Math.max(6, firstRect.top - 6),
      };
    }).filter(Boolean);
  }

  function renderPromptBlockPanel(editor) {
    const panel = createPromptBlockPanel();
    if (!editor) {
      panel.classList.add('nai-hidden');
      panel.innerHTML = '';
      return;
    }

    positionPromptBlockPanel(editor);
    if (!promptBlocks.length) {
      panel.classList.add('nai-hidden');
      panel.innerHTML = '';
      return;
    }

    const visuals = getPromptBlockVisuals(editor);
    if (!visuals.length) {
      panel.classList.add('nai-hidden');
      panel.innerHTML = '';
      return;
    }

    panel.innerHTML = visuals.map(block => `
      ${block.rects.map(rect => `
        <div
          class="nai-prompt-block-highlight ${block.locked ? 'is-locked' : ''}"
          style="--nai-block-accent: ${block.accent}; left: ${rect.left}px; top: ${rect.top}px; width: ${rect.width}px; height: ${rect.height}px;"
        ></div>
      `).join('')}
      <div
        class="nai-prompt-block-drag-hitbox ${block.locked ? 'is-locked' : ''}"
        data-block-id="${block.id}"
        draggable="${block.locked ? 'false' : 'true'}"
        title="${escapeHtml(block.label)}"
        style="--nai-block-accent: ${block.accent}; left: ${block.unionRect.left}px; top: ${block.unionRect.top}px; width: ${block.unionRect.width}px; height: ${block.unionRect.height}px;"
      ></div>
      <div
        class="nai-prompt-block-anchor"
        data-block-id="${block.id}"
        style="--nai-block-accent: ${block.accent}; left: ${block.anchorLeft}px; top: ${block.anchorTop}px;"
      >
        <button
          type="button"
          class="nai-prompt-block-save"
          data-action="save-library"
          title="${block.libraryAlias ? `更新词库：${escapeHtml(block.libraryAlias)}` : '保存到词库'}"
          aria-label="${block.libraryAlias ? `更新词库：${escapeHtml(block.libraryAlias)}` : '保存到词库'}"
        >${getPromptBlockIcon('save')}</button>
        <button
          type="button"
          class="nai-prompt-block-remove"
          data-action="remove-block"
          title="取消区块"
          aria-label="取消区块"
        >${getPromptBlockIcon('remove')}</button>
        <button
          type="button"
          class="nai-prompt-block-lock"
          data-action="toggle-lock"
          title="${block.locked ? '解锁区块' : '锁定区块'}"
          aria-label="${block.locked ? '解锁区块' : '锁定区块'}"
        >${getPromptBlockIcon(block.locked ? 'unlock' : 'lock')}</button>
      </div>
    `).join('');

    panel.classList.remove('nai-hidden');
  }

  function commitPromptBlocks(editor) {
    if (!editor) return;
    const text = serializePromptBlocks(promptBlocks);
    promptBlockSignature = flattenPromptBlocks(promptBlocks).join('\n');
    savePromptBlockState(editor);
    replaceEditorText(editor, text);
    renderPromptBlockPanel(editor);
    handleInput(editor);
  }

  function hidePromptBlockToolbar() {
    if (!promptBlockToolbar) return;
    promptBlockToolbar.classList.add('nai-hidden');
  }

  function getPromptSelectionContext(editor) {
    const sel = window.getSelection();
    if (!editor || !sel?.rangeCount || sel.isCollapsed) return null;
    const range = sel.getRangeAt(0);
    const editorRange = document.createRange();
    editorRange.selectNodeContents(editor);
    if (
      range.compareBoundaryPoints(Range.START_TO_START, editorRange) < 0 ||
      range.compareBoundaryPoints(Range.END_TO_END, editorRange) > 0
    ) {
      return null;
    }

    const selectedText = range.toString();
    const selectedTags = splitPromptTags(selectedText);
    if (!selectedTags.length) return null;

    const beforeRange = range.cloneRange();
    beforeRange.selectNodeContents(editor);
    beforeRange.setEnd(range.startContainer, range.startOffset);
    const startTokenIndex = splitPromptTags(beforeRange.toString()).length;
    const rect = range.getBoundingClientRect();

    return {
      startTokenIndex,
      endTokenIndex: startTokenIndex + selectedTags.length - 1,
      selectedTags,
      rect,
    };
  }

  function updatePromptBlockToolbar(editor) {
    const toolbar = createPromptBlockToolbar();
    const context = getPromptSelectionContext(editor);
    if (!context || context.selectedTags.length <= 1) {
      hidePromptBlockToolbar();
      return;
    }

    let cursor = 0;
    const overlapsExistingGroup = promptBlocks.some(block => {
      const blockStart = cursor;
      const blockEnd = cursor + block.tags.length - 1;
      cursor += block.tags.length;
      return block.isGroup && context.startTokenIndex <= blockEnd && context.endTokenIndex >= blockStart;
    });

    if (overlapsExistingGroup) {
      hidePromptBlockToolbar();
      return;
    }

    const width = toolbar.offsetWidth || 120;
    const top = context.rect.top - 44 >= 8 ? context.rect.top - 44 : context.rect.bottom + 8;
    const left = Math.min(Math.max(8, context.rect.left), window.innerWidth - width - 8);
    toolbar.style.top = `${Math.max(8, top)}px`;
    toolbar.style.left = `${left}px`;
    toolbar.classList.remove('nai-hidden');
  }

  function groupPromptSelection() {
    if (!activeEditor) return;
    ensurePromptBlockModel(activeEditor);
    const context = getPromptSelectionContext(activeEditor);
    if (!context) return;

    let cursor = 0;
    const before = [];
    const groupedTags = [];
    const groupedDelimiters = [];
    const after = [];
    let blocked = false;

    promptBlocks.forEach(block => {
      const blockStart = cursor;
      const blockEnd = cursor + block.tags.length - 1;

      if (blockEnd < context.startTokenIndex) {
        before.push(block);
      } else if (blockStart > context.endTokenIndex) {
        after.push(block);
      } else {
        if (block.locked) blocked = true;
        const startOffset = Math.max(0, context.startTokenIndex - blockStart);
        const endOffset = Math.min(block.tags.length - 1, context.endTokenIndex - blockStart);
        const beforeTags = block.tags.slice(0, startOffset);
        const beforeDelimiters = (block.delimiters || []).slice(0, startOffset);
        const selectedTags = block.tags.slice(startOffset, endOffset + 1);
        const selectedDelimiters = (block.delimiters || []).slice(startOffset, endOffset + 1);
        const afterTags = block.tags.slice(endOffset + 1);
        const afterDelimiters = (block.delimiters || []).slice(endOffset + 1);

        if (beforeTags.length) {
          before.push({ id: createId('tag'), tags: beforeTags, delimiters: beforeDelimiters, locked: false, isGroup: false });
        }
        groupedTags.push(...selectedTags);
        groupedDelimiters.push(...selectedDelimiters);
        if (afterTags.length) {
          after.push({ id: createId('tag'), tags: afterTags, delimiters: afterDelimiters, locked: false, isGroup: false });
        }
      }

      cursor += block.tags.length;
    });

    if (blocked || groupedTags.length <= 1) {
      hidePromptBlockToolbar();
      return;
    }

    promptBlocks = [
      ...before,
      { id: createId('block'), tags: groupedTags, delimiters: groupedDelimiters, locked: false, isGroup: true },
      ...after,
    ];
    hidePromptBlockToolbar();
    commitPromptBlocks(activeEditor);
  }

  function getTokenIndexFromPoint(editor, clientX, clientY) {
    if (!editor) return 0;

    const pointTarget = document.elementFromPoint(clientX, clientY);
    if (!pointTarget?.closest('.ProseMirror')) {
      return splitPromptTags(getEditorText(editor)).length;
    }

    let caretRange = null;
    if (document.caretRangeFromPoint) {
      caretRange = document.caretRangeFromPoint(clientX, clientY);
    } else if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(clientX, clientY);
      if (position) {
        caretRange = document.createRange();
        caretRange.setStart(position.offsetNode, position.offset);
        caretRange.collapse(true);
      }
    }

    if (!caretRange) {
      return splitPromptTags(getEditorText(editor)).length;
    }

    const beforeRange = document.createRange();
    beforeRange.selectNodeContents(editor);
    beforeRange.setEnd(caretRange.startContainer, caretRange.startOffset);
    return splitPromptTags(beforeRange.toString()).length;
  }

  function showPromptBlockDropIndicator(editor, tokenIndex) {
    const indicator = createPromptBlockDropIndicator();
    const tokens = parsePromptTokens(getEditorText(editor));
    const offset = getTextOffsetForTokenIndex(tokens, Math.max(0, Math.min(tokenIndex, tokens.length)));
    const range = createRangeFromTextOffsets(editor, offset, offset);
    const fallbackRect = editor.getBoundingClientRect();
    const rect = range?.getBoundingClientRect?.() || fallbackRect;
    const left = Math.max(6, Math.min(window.innerWidth - 6, rect.left || fallbackRect.left));
    const top = (rect.top && rect.height) ? rect.top : fallbackRect.top;
    const height = Math.max(18, rect.height || 24);

    indicator.style.left = `${left}px`;
    indicator.style.top = `${top}px`;
    indicator.style.height = `${height}px`;
    indicator.classList.remove('nai-hidden');
  }

  function movePromptBlockToToken(sourceId, tokenIndex) {
    if (!activeEditor) return;
    const fromIndex = promptBlocks.findIndex(block => block.id === sourceId);
    if (fromIndex === -1 || promptBlocks[fromIndex].locked || !promptBlocks[fromIndex].isGroup) return;

    const sourceStartToken = promptBlocks
      .slice(0, fromIndex)
      .reduce((sum, block) => sum + block.tags.length, 0);

    const [block] = promptBlocks.splice(fromIndex, 1);
    let insertIndex = promptBlocks.length;
    let cursor = 0;

    for (let i = 0; i < promptBlocks.length; i++) {
      if (tokenIndex <= cursor) {
        insertIndex = i;
        break;
      }
      cursor += promptBlocks[i].tags.length;
      if (tokenIndex < cursor) {
        insertIndex = i + 1;
        break;
      }
    }

    const targetStartToken = promptBlocks
      .slice(0, insertIndex)
      .reduce((sum, entry) => sum + entry.tags.length, 0);

    const rangeStart = Math.min(sourceStartToken, targetStartToken);
    const rangeEnd = Math.max(sourceStartToken + block.tags.length - 1, targetStartToken);
    const crossesLocked = promptBlocks.some((entry, index) => {
      const entryStart = promptBlocks.slice(0, index).reduce((sum, item) => sum + item.tags.length, 0);
      const entryEnd = entryStart + entry.tags.length - 1;
      return entry.locked && entryStart <= rangeEnd && entryEnd >= rangeStart;
    });

    if (crossesLocked) {
      promptBlocks.splice(fromIndex, 0, block);
      return;
    }

    promptBlocks.splice(insertIndex, 0, block);
    commitPromptBlocks(activeEditor);
  }

  async function init() {
    console.log('[NAI-AC] 扩展已加载');

    try {
      const saved = localStorage.getItem('nai-ac-settings');
      if (saved) Object.assign(settings, JSON.parse(saved));
    } catch (e) {}

    syncThemeFromStorage();
    await loadPromptLibrary();
    loadTags();

    try {
      chrome?.storage?.onChanged?.addListener((changes, areaName) => {
        if (areaName !== 'local' || !changes[PROMPT_LIBRARY_KEY]) return;
        promptLibrary = Array.isArray(changes[PROMPT_LIBRARY_KEY].newValue)
          ? changes[PROMPT_LIBRARY_KEY].newValue.map(normalizePromptLibraryEntry).filter(Boolean)
          : [];
      });
    } catch (error) {}

    document.addEventListener('input', e => {
      const editor = e.target.closest('.ProseMirror');
      if (!editor) return;
      activeEditor = editor;
      ensurePromptBlockModel(editor);
      updatePromptBlockToolbar(editor);
      handleInput(editor);
    }, true);

    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection();
      if (!sel?.rangeCount) {
        hidePromptBlockToolbar();
        if (activeEditor?.isConnected) {
          ensurePromptBlockModel(activeEditor);
        }
        return;
      }

      const node = sel.getRangeAt(0).startContainer;
      const editor = node.nodeType === Node.TEXT_NODE
        ? node.parentElement?.closest('.ProseMirror')
        : node.closest?.('.ProseMirror');

      if (!editor) {
        hidePromptBlockToolbar();
        if (activeEditor?.isConnected) {
          renderPromptBlockPanel(activeEditor);
        }
        return;
      }

      activeEditor = editor;
      ensurePromptBlockModel(editor);
      updatePromptBlockToolbar(editor);
      handleInput(editor);
    });

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keydown', event => {
      if (event.key === 'Alt') {
        setPromptBlockDragMode(true);
      }
    }, true);
    document.addEventListener('keyup', event => {
      if (event.key === 'Alt') {
        setPromptBlockDragMode(false);
      }
    }, true);
    window.addEventListener('blur', () => setPromptBlockDragMode(false));
    document.addEventListener('focusout', () => setTimeout(() => {
      if (!autocompleteContainer?.contains(document.activeElement)) hideAutocomplete();
      if (!promptBlockPanel?.contains(document.activeElement)) hidePromptBlockToolbar();
    }, 150), true);

    document.addEventListener('dragover', event => {
      if (!promptBlockDragId || !activeEditor) return;
      const editor = document.elementFromPoint(event.clientX, event.clientY)?.closest('.ProseMirror');
      if (editor !== activeEditor) return;
      event.preventDefault();
      showPromptBlockDropIndicator(activeEditor, getTokenIndexFromPoint(activeEditor, event.clientX, event.clientY));
    }, true);

    document.addEventListener('drop', event => {
      if (!promptBlockDragId || !activeEditor) return;
      const editor = document.elementFromPoint(event.clientX, event.clientY)?.closest('.ProseMirror');
      if (editor !== activeEditor) return;
      event.preventDefault();
      const tokenIndex = getTokenIndexFromPoint(activeEditor, event.clientX, event.clientY);
      hidePromptBlockDropIndicator();
      movePromptBlockToToken(promptBlockDragId, tokenIndex);
    }, true);

    window.addEventListener('resize', () => {
      if (!activeEditor) return;
      renderPromptBlockPanel(activeEditor);
      updatePromptBlockToolbar(activeEditor);
    });

    document.addEventListener('scroll', () => {
      if (!activeEditor) return;
      renderPromptBlockPanel(activeEditor);
      updatePromptBlockToolbar(activeEditor);
      hidePromptBlockDropIndicator();
    }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


