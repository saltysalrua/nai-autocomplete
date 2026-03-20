/**
 * NovelAI 提示词自动补全 - Content Script
 */
(function() {
  'use strict';

  const ASSISTANT_SETTINGS_KEY = 'nai-llm-assistant-settings';
  const DEFAULT_THEME = 'sunrise';

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
  let lastRenderedQuery = ''; // 用于判断是否需要重新渲染
  let autocompleteContainer = null;

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

    let weight = 1.0;
    let hasArtist = false;

    // 匹配权重，支持负数和中英文冒号
    const weightMatch = segment.match(/^(-?\d+\.?\d*)(?::|：){2}/);
    if (weightMatch) weight = parseFloat(weightMatch[1]);

    // 匹配 artist 前缀
    if (/artist(?::|：)/.test(segment)) {
      hasArtist = true;
    }

    return { weight, hasArtist };
  }

  function showAutocomplete(editor, results, query) {
    const c = createContainer();
    const list = c.querySelector('.nai-autocomplete-list');

    // query 没变且已有结果时，只更新位置，不重复渲染
    if (query === lastRenderedQuery && currentResults.length > 0) {
      positionAutocomplete(editor);
      if (!c.classList.contains('visible')) {
        requestAnimationFrame(() => c.classList.add('visible'));
      }
      return;
    }

    // query 变化后重新渲染
    lastRenderedQuery = query;
    currentResults = results;
    currentQuery = query;
    selectedIndex = 0;

    // 获取当前上下文
    const context = parseCurrentContext();

    if (isLoading) {
      list.innerHTML = '<div class="nai-autocomplete-loading"><span class="nai-autocomplete-spinner"></span>加载中...</div>';
    } else if (!results.length) {
      list.innerHTML = '<div class="nai-autocomplete-empty"><div class="nai-autocomplete-empty-icon">-</div>无匹配结果</div>';
    } else {
      list.innerHTML = results.map((tag, i) => {
        const isArtist = tag.category === '1';
        const showArtistChecked = isArtist && context.hasArtist;
        return `
        <div class="nai-autocomplete-item ${i === 0 ? 'selected' : ''}" data-index="${i}">
          <div class="nai-autocomplete-category" data-category="${tag.category}"></div>
          <div class="nai-autocomplete-content">
            <div class="nai-autocomplete-tag">${highlight(tag.tag, query)}</div>
            ${tag.matchedAlias ? `<div class="nai-autocomplete-translation">别名 · ${tag.matchedAlias}</div>` :
              tag.translation ? `<div class="nai-autocomplete-translation">${tag.translation}</div>` : ''}
          </div>
          ${isArtist ? `<label class="nai-artist-toggle" title="使用 artist: 前缀" data-index="${i}">
            <input type="checkbox" class="nai-artist-check" data-index="${i}" ${showArtistChecked ? 'checked' : ''}>
            <span>artist:</span>
          </label>` : ''}
          <div class="nai-autocomplete-weight">
            <button class="nai-weight-btn nai-weight-down" data-index="${i}">-</button>
            <span class="nai-weight-value" data-index="${i}">${context.weight.toFixed(1)}</span>
            <button class="nai-weight-btn nai-weight-up" data-index="${i}">+</button>
          </div>
          <div class="nai-autocomplete-count">${formatCount(tag.postCount)}</div>
        </div>
      `}).join('');

      // 初始化权重和 artist 状态
      results.forEach((tag, i) => {
        tag.weight = context.weight;
        if (tag.category === '1') {
          tag.useArtistPrefix = context.hasArtist;
        }
      });

      // artist 复选框事件
      list.querySelectorAll('.nai-artist-check').forEach(chk => {
        // checkbox 自身点击时阻止冒泡，避免误触整项选择
        chk.addEventListener('mousedown', e => {
          e.stopPropagation();
        });
        chk.addEventListener('click', e => {
          e.stopPropagation();
        });
        // checkbox 状态变化时同步到当前结果
        chk.addEventListener('change', e => {
          e.stopPropagation();
          currentResults[+chk.dataset.index].useArtistPrefix = chk.checked;
        });
      });

      // artist label 点击事件
      list.querySelectorAll('.nai-artist-toggle').forEach(label => {
        // 阻止 label 默认 click，避免重复切换
        label.addEventListener('click', e => {
          if (!e.target.classList.contains('nai-artist-check')) {
            e.preventDefault();
            e.stopPropagation();
          }
        });
        label.addEventListener('mousedown', e => {
          // 如果点的是 checkbox 本身，交给上面的处理器
          if (e.target.classList.contains('nai-artist-check')) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          const chk = label.querySelector('.nai-artist-check');
          chk.checked = !chk.checked;
          currentResults[+label.dataset.index].useArtistPrefix = chk.checked;
        });
      });

      // 权重按钮事件
      list.querySelectorAll('.nai-weight-btn').forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const idx = +btn.dataset.index;
          const valueEl = list.querySelector(`.nai-weight-value[data-index="${idx}"]`);
          const currentValue = parseFloat(valueEl.textContent);
          let val = Number.isFinite(currentValue) ? currentValue : 1.0;
          val = btn.classList.contains('nai-weight-up') ? val + 0.1 : val - 0.1;
          // 支持负数权重，范围限制在 -2.0 到 2.0
          val = Math.max(-2.0, Math.min(2.0, val));
          valueEl.textContent = val.toFixed(1);
          currentResults[idx].weight = val;
        });
      });

      list.querySelectorAll('.nai-autocomplete-item').forEach(item => {
        // 用 mousedown 并阻止默认行为，避免编辑器失焦
        item.addEventListener('mousedown', (e) => {
          // 点击的是控件时，不触发整项补全
          if (e.target.closest('.nai-weight-btn') ||
              e.target.closest('.nai-artist-toggle') ||
              e.target.closest('.nai-artist-check')) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          selectTag(currentResults[+item.dataset.index]);
        });
        item.onmouseenter = () => { selectedIndex = +item.dataset.index; updateSelection(); };
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
    lastRenderedQuery = ''; // 重置，确保下次重新渲染
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

    let word = context.segmentText.trim();

    // 当前片段为空时，不继续处理
    if (!word) return '';

    // 处理各种格式，提取实际需要搜索的 tag 片段

    // -1.3::artist:tag:: -> tag
    let match = word.match(/^(-?\d+\.?\d*)(?::|：){2}artist(?::|：)([^:：]+)(?::|：){2}$/);
    if (match) return match[2];

    // -1.3::tag:: -> tag
    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}([^:：]+)(?::|：){2}$/);
    if (match) return match[2];

    // -1.3::artist:tag: -> tag
    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}artist(?::|：)([^:：]+)(?::|：)$/);
    if (match) return match[2];

    // -1.3::tag: -> tag
    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}([^:：]+)(?::|：)$/);
    if (match) return match[2];

    // -1.3::artist:tag::xxx -> xxx
    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}artist(?::|：)[^:：]+(?::|：){2}(.+)$/);
    if (match) return match[2];

    // -1.3::tag::xxx -> xxx
    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}[^:：]+(?::|：){2}(.+)$/);
    if (match) return match[2];

    // -1.3::tag1,tag2,ta -> ta
    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}.*,([^,]*)$/);
    if (match) return match[2].trim();

    // -1.3::artist:xxx -> xxx
    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}artist(?::|：)(.*)$/);
    if (match) return match[2].replace(/(?::|：)+$/, '');

    // -1.3::xxx -> xxx（包括尚未输入完的中间态）
    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}(.*)$/);
    if (match) {
      // 去掉尾部冒号，兼容正在输入 :: 的情况
      return match[2].replace(/(?::|：)+$/, '');
    }

    // artist:xxx -> xxx
    match = word.match(/^artist(?::|：)(.*)$/);
    if (match) return match[1];

    return word;
  }

  function selectTag(tag) {
    if (!activeEditor || !tag) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
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

    // 应用下划线/空格转换
    let tagName = tag.tag;
    if (settings.convertSlashToSpace) {
      tagName = tagName.replace(/_/g, ' ');
    } else {
      tagName = tagName.replace(/ /g, '_');
    }

    const weight = Number.isFinite(tag.weight) ? tag.weight : 1.0;
    // 使用当前 UI 中选择的 artist 设置
    const useArtist = tag.category === '1' && tag.useArtistPrefix;
    const commaSuffix = shouldAppendComma ? ', ' : '';

    // 构建输出格式，始终基于当前 UI 状态
    let output;
    if (isAfterComplete || isMultiTagFormat) {
      // 完整 tag 后继续输入，或多 tag 模式下，只替换最后一段
      output = `${tagName}${preservedSuffix}${shouldAppendComma ? ',' : ''}`;
    } else if (weight !== 1.0) {
      // 带权重格式：-1.3::tag:: / -1.3::artist:tag::
      const weightStr = weight.toFixed(1);
      output = useArtist
        ? `${weightStr}::artist:${tagName}::${preservedSuffix}${commaSuffix}`
        : `${weightStr}::${tagName}::${preservedSuffix}${commaSuffix}`;
    } else {
      // 无权重格式：tag / artist:tag
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
    else if (e.key === 'Tab' || e.key === 'Enter') { if (currentResults[selectedIndex]) { e.preventDefault(); selectTag(currentResults[selectedIndex]); } }
    else if (e.key === 'Escape') { e.preventDefault(); hideAutocomplete(); }
  }

  function init() {
    console.log('[NAI-AC] 扩展已加载');

    // 加载保存的设置
    try {
      const saved = localStorage.getItem('nai-ac-settings');
      if (saved) Object.assign(settings, JSON.parse(saved));
    } catch (e) {}

    syncThemeFromStorage();
    loadTags();

    // 监听输入事件
    document.addEventListener('input', e => {
      const editor = e.target.closest('.ProseMirror');
      if (editor) { activeEditor = editor; handleInput(editor); }
    }, true);

    // 监听光标移动，点选或键盘移动都重新判断补全
    document.addEventListener('selectionchange', () => {
      const sel = window.getSelection();
      if (!sel.rangeCount) return;
      const node = sel.getRangeAt(0).startContainer;
      const editor = node.nodeType === Node.TEXT_NODE
        ? node.parentElement?.closest('.ProseMirror')
        : node.closest?.('.ProseMirror');
      if (editor) { activeEditor = editor; handleInput(editor); }
    });

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusout', () => setTimeout(() => {
      if (!autocompleteContainer?.contains(document.activeElement)) hideAutocomplete();
    }, 150), true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

