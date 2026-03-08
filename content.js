/**
 * NovelAI 提示词自动补全 - Content Script
 */
(function() {
  'use strict';

  const CONFIG = {
    CSV_URL: 'https://raw.githubusercontent.com/saltysalrua/nai-discordbot/refs/heads/main/danbooru_all_2.csv',
    MAX_RESULTS: 8,
    MIN_QUERY_LENGTH: 1,
    DEBOUNCE_DELAY: 150,
  };

  // 全局设置
  let settings = {
    convertSlashToSpace: false, // 斜杠转空格
  };

  let allTags = [];
  let isLoading = true;
  let activeEditor = null;
  let selectedIndex = 0;
  let currentResults = [];
  let currentQuery = '';
  let lastRenderedQuery = ''; // 用于判断是否需要重新渲染
  let autocompleteContainer = null;

  // CSV 解析 - 正确处理引号内的逗号
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
        console.log(`[NAI-AC] 缓存加载 ${allTags.length} 标签`);
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
      console.log(`[NAI-AC] 加载 ${allTags.length} 标签`);
    } catch (e) {
      console.error('[NAI-AC] 加载失败:', e);
      isLoading = false;
    }
  }

  // 搜索
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
        <label class="nai-slash-toggle" title="下划线⇔空格转换">
          <input type="checkbox" id="nai-slash-switch">
          <span>_⇔空格</span>
        </label>
      </div>
      <div class="nai-autocomplete-list"></div>
      <div class="nai-autocomplete-footer"><span class="nai-autocomplete-count-info"></span><span>↑↓选择 Tab确认</span></div>
    `;
    document.body.appendChild(c);
    autocompleteContainer = c;

    // 斜杠开关事件
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

  // 解析当前输入的上下文（权重、artist前缀等）
  function parseCurrentContext() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return { weight: 1.0, hasArtist: false };
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return { weight: 1.0, hasArtist: false };

    const text = node.textContent;
    const pos = range.startOffset;
    let start = pos;
    while (start > 0 && text[start - 1] !== ',' && text[start - 1] !== '\n') start--;
    while (start < pos && text[start] === ' ') start++;
    const segment = text.slice(start, pos);

    let weight = 1.0;
    let hasArtist = false;

    // 匹配权重 - 支持负数权重如 -1.3::tag，支持中英文冒号
    const weightMatch = segment.match(/^(-?\d+\.?\d*)[:：]{2}/);
    if (weightMatch) weight = parseFloat(weightMatch[1]);

    // 匹配 artist - 支持 artist:tag, -1.3::artist:tag, -1.3::artist:tag::
    if (/artist[:：]/.test(segment)) {
      hasArtist = true;
    }

    return { weight, hasArtist };
  }

  function showAutocomplete(editor, results, query) {
    const c = createContainer();
    const list = c.querySelector('.nai-autocomplete-list');

    // 如果 query 没变且已有结果，只更新位置，不重新渲染（保留用户修改）
    if (query === lastRenderedQuery && currentResults.length > 0) {
      positionAutocomplete(editor);
      if (!c.classList.contains('visible')) {
        requestAnimationFrame(() => c.classList.add('visible'));
      }
      return;
    }

    // query 改变了，重新渲染
    lastRenderedQuery = query;
    currentResults = results;
    currentQuery = query;
    selectedIndex = 0;

    // 获取当前上下文
    const context = parseCurrentContext();

    if (isLoading) {
      list.innerHTML = '<div class="nai-autocomplete-loading"><span class="nai-autocomplete-spinner"></span>加载中...</div>';
    } else if (!results.length) {
      list.innerHTML = '<div class="nai-autocomplete-empty"><div class="nai-autocomplete-empty-icon">🔍</div>无匹配</div>';
    } else {
      list.innerHTML = results.map((tag, i) => {
        const isArtist = tag.category === '1';
        const showArtistChecked = isArtist && context.hasArtist;
        return `
        <div class="nai-autocomplete-item ${i === 0 ? 'selected' : ''}" data-index="${i}">
          <div class="nai-autocomplete-category" data-category="${tag.category}"></div>
          <div class="nai-autocomplete-content">
            <div class="nai-autocomplete-tag">${highlight(tag.tag, query)}</div>
            ${tag.matchedAlias ? `<div class="nai-autocomplete-translation">⇐ ${tag.matchedAlias}</div>` :
              tag.translation ? `<div class="nai-autocomplete-translation">${tag.translation}</div>` : ''}
          </div>
          ${isArtist ? `<label class="nai-artist-toggle" title="使用 artist: 前缀" data-index="${i}">
            <input type="checkbox" class="nai-artist-check" data-index="${i}" ${showArtistChecked ? 'checked' : ''}>
            <span>artist:</span>
          </label>` : ''}
          <div class="nai-autocomplete-weight">
            <button class="nai-weight-btn nai-weight-down" data-index="${i}">−</button>
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

      // 画师复选框事件 - 分开处理 checkbox 和 label
      list.querySelectorAll('.nai-artist-check').forEach(chk => {
        // checkbox 自身的点击：阻止冒泡，让浏览器处理切换
        chk.addEventListener('mousedown', e => {
          e.stopPropagation();
        });
        chk.addEventListener('click', e => {
          e.stopPropagation();
        });
        // checkbox 状态变化时同步到数据
        chk.addEventListener('change', e => {
          e.stopPropagation();
          currentResults[+chk.dataset.index].useArtistPrefix = chk.checked;
        });
      });

      // 画师 label 点击（非 checkbox 部分）
      list.querySelectorAll('.nai-artist-toggle').forEach(label => {
        // 阻止 label 的默认 click 行为（会自动切换 checkbox）
        label.addEventListener('click', e => {
          if (!e.target.classList.contains('nai-artist-check')) {
            e.preventDefault();
            e.stopPropagation();
          }
        });
        label.addEventListener('mousedown', e => {
          // 如果点击的是 checkbox 本身，不处理（让上面的处理器处理）
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
          let val = parseFloat(valueEl.textContent) || 1.0;
          val = btn.classList.contains('nai-weight-up') ? val + 0.1 : val - 0.1;
          // 支持负数权重，范围 -2.0 到 2.0
          val = Math.max(-2.0, Math.min(2.0, val));
          valueEl.textContent = val.toFixed(1);
          currentResults[idx].weight = val;
        });
      });

      list.querySelectorAll('.nai-autocomplete-item').forEach(item => {
        // 用 mousedown 并阻止默认行为，防止编辑器失焦
        item.addEventListener('mousedown', (e) => {
          // 如果点击的是控件（按钮、复选框、label），不触发选择
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

    c.querySelector('.nai-autocomplete-count-info').textContent = `${results.length} 结果`;
    positionAutocomplete(editor);
    requestAnimationFrame(() => c.classList.add('visible'));
  }

  function hideAutocomplete() {
    autocompleteContainer?.classList.remove('visible');
    currentResults = [];
    selectedIndex = 0;
    lastRenderedQuery = ''; // 重置以便下次重新渲染
  }

  function positionAutocomplete(editor) {
    if (!autocompleteContainer || !editor) return;
    const rect = editor.getBoundingClientRect();
    const containerHeight = 320;

    // 优先显示在下方
    let top = rect.bottom + 4;

    // 如果下方空间不足，尝试上方
    if (top + containerHeight > window.innerHeight) {
      const topAbove = rect.top - containerHeight - 4;
      // 只有上方有足够空间才移到上方，否则保持下方（允许滚动）
      if (topAbove >= 0) {
        top = topAbove;
      } else {
        // 两边都不够，贴着视口底部
        top = Math.max(4, window.innerHeight - containerHeight - 4);
      }
    }

    // 确保不超出顶部
    top = Math.max(4, top);

    autocompleteContainer.style.top = top + 'px';
    autocompleteContainer.style.left = Math.min(rect.left, window.innerWidth - 380) + 'px';
  }

  function updateSelection() {
    autocompleteContainer?.querySelectorAll('.nai-autocomplete-item').forEach((item, i) => {
      item.classList.toggle('selected', i === selectedIndex);
    });
  }

  function getCurrentWord() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return '';
    const range = sel.getRangeAt(0);
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return '';
    const text = node.textContent;
    const pos = range.startOffset;
    let start = pos;
    // 支持逗号、换行、以及行首作为分隔
    while (start > 0 && text[start - 1] !== ',' && text[start - 1] !== '\n') start--;
    while (start < pos && text[start] === ' ') start++;
    let word = text.slice(start, pos).trim();

    // 如果 word 为空，不需要继续处理
    if (!word) return '';

    // 处理各种格式，提取实际要搜索的 tag 部分
    // 支持英文冒号 : 和中文冒号 ：
    // 支持负数权重，如 -1.3::tag::

    // -1.3::artist:tag:: - 提取 tag（已完成格式，可编辑）
    let match = word.match(/^(-?\d+\.?\d*)[:：]{2}artist[:：]([^:：,]+)[:：]{2}$/);
    if (match) return match[2];

    // -1.3::tag:: - 提取 tag（已完成格式，可编辑）
    match = word.match(/^(-?\d+\.?\d*)[:：]{2}([^:：,]+)[:：]{2}$/);
    if (match) return match[2];

    // -1.3::artist:tag::xxx - 提取 xxx（在完成tag后继续输入）
    match = word.match(/^(-?\d+\.?\d*)[:：]{2}artist[:：][^:：]+[:：]{2}(.+)$/);
    if (match) return match[2];

    // -1.3::tag::xxx - 提取 xxx（在完成tag后继续输入）
    match = word.match(/^(-?\d+\.?\d*)[:：]{2}[^:：]+[:：]{2}(.+)$/);
    if (match) return match[2];

    // -1.3::tag1,tag2,ta - 多tag格式，提取最后一个逗号后的部分
    match = word.match(/^(-?\d+\.?\d*)[:：]{2}.*,([^,]*)$/);
    if (match) return match[2].trim();

    // -1.3::artist:xxx - 提取 xxx
    match = word.match(/^(-?\d+\.?\d*)[:：]{2}artist[:：](.*)$/);
    if (match) return match[2].replace(/[:：]+$/, '');

    // -1.3::xxx - 提取 xxx（包括 -1.3::tag: 这种中间状态）
    match = word.match(/^(-?\d+\.?\d*)[:：]{2}(.*)$/);
    if (match) {
      // 去掉尾部的冒号（用户正在输入 ::）
      return match[2].replace(/[:：]+$/, '');
    }

    // artist:xxx - 提取 xxx
    match = word.match(/^artist[:：](.*)$/);
    if (match) return match[1];

    return word;
  }

  function selectTag(tag) {
    if (!activeEditor || !tag) return;
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const node = range.startContainer;

    let start = 0;
    let isAfterComplete = false;
    let isMultiTagFormat = false;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent;
      const pos = range.startOffset;
      start = pos;
      while (start > 0 && text[start - 1] !== ',' && text[start - 1] !== '\n') start--;
      while (start < pos && text[start] === ' ') start++;

      const currentSegment = text.slice(start, pos);

      // 检测是否在已完成的 tag 后继续输入 (e.g., "-1.3::tag::xxx" 或 "-1.3::artist:tag::xxx")
      // 支持负数权重和中英文冒号
      const afterCompleteMatch = currentSegment.match(/^(-?\d+\.?\d*[:：]{2}(artist[:：])?[^:：,]+[:：]{2})/);
      if (afterCompleteMatch) {
        // 用户在完成的 tag 后输入新内容，只替换新输入的部分
        start = start + afterCompleteMatch[0].length;
        isAfterComplete = true;
      } else {
        // 检测多 tag 格式: -1.3::tag1,tag2,ta - 只替换最后一个逗号后的部分
        const multiTagMatch = currentSegment.match(/^(-?\d+\.?\d*[:：]{2}.*,)/);
        if (multiTagMatch) {
          start = start + multiTagMatch[1].length;
          isMultiTagFormat = true;
        }
      }

      // 设置选区：从 start 到当前光标位置
      range.setStart(node, start);
      range.setEnd(node, pos);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // 应用下划线/空格转换
    let tagName = tag.tag;
    if (settings.convertSlashToSpace) {
      tagName = tagName.replace(/_/g, ' ');
    } else {
      tagName = tagName.replace(/ /g, '_');
    }

    const weight = tag.weight || 1.0;
    // 使用用户在UI中选择的 artist 设置
    const useArtist = tag.category === '1' && tag.useArtistPrefix;

    // 构建输出格式 - 始终基于用户在UI中的选择，替换整个段落
    let output;
    if (isAfterComplete || isMultiTagFormat) {
      // 在已完成 tag 后或多 tag 格式中，只输出 tag 名
      output = `${tagName},`;
    } else if (weight !== 1.0) {
      // 带权重格式: -1.3::tag:: 或 -1.3::artist:tag::
      const weightStr = weight >= 0 ? weight.toFixed(1) : weight.toFixed(1);
      output = useArtist ? `${weightStr}::artist:${tagName}::, ` : `${weightStr}::${tagName}::, `;
    } else {
      // 无权重格式: tag 或 artist:tag
      output = useArtist ? `artist:${tagName}, ` : `${tagName}, `;
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

    loadTags();

    // 监听输入事件
    document.addEventListener('input', e => {
      const editor = e.target.closest('.ProseMirror');
      if (editor) { activeEditor = editor; handleInput(editor); }
    }, true);

    // 监听光标移动（点击或键盘移动光标时也触发补全检测）
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
