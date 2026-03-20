/**
 * NovelAI 鎻愮ず璇嶈嚜鍔ㄨˉ鍏?- Content Script
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

  // 鍏ㄥ眬璁剧疆
  let settings = {
    convertSlashToSpace: false, // 鏂滄潬杞┖鏍?
  };

  let allTags = [];
  let isLoading = true;
  let activeEditor = null;
  let selectedIndex = 0;
  let currentResults = [];
  let currentQuery = '';
  let lastRenderedQuery = ''; // 鐢ㄤ簬鍒ゆ柇鏄惁闇€瑕侀噸鏂版覆鏌?
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

  // CSV 瑙ｆ瀽 - 姝ｇ‘澶勭悊寮曞彿鍐呯殑閫楀彿
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

  // 鍔犺浇鏍囩
  async function loadTags() {
    try {
      const cached = localStorage.getItem('nai-ac-tags');
      const cacheTime = localStorage.getItem('nai-ac-tags-time');
      if (cached && cacheTime && Date.now() - parseInt(cacheTime) < 86400000) {
        allTags = JSON.parse(cached);
        isLoading = false;
        console.log(`[NAI-AC] 缂撳瓨鍔犺浇 ${allTags.length} 鏍囩`);
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
      console.log(`[NAI-AC] 鍔犺浇 ${allTags.length} 鏍囩`);
    } catch (e) {
      console.error('[NAI-AC] 鍔犺浇澶辫触:', e);
      isLoading = false;
    }
  }

  // 鎼滅储
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

  // 鍒涘缓琛ュ叏瀹瑰櫒
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

    // 鏂滄潬寮€鍏充簨浠?
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

  // 瑙ｆ瀽褰撳墠杈撳叆鐨勪笂涓嬫枃锛堟潈閲嶃€乤rtist鍓嶇紑绛夛級
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

    // 鍖归厤鏉冮噸 - 鏀寔璐熸暟鏉冮噸濡?-1.3::tag锛屾敮鎸佷腑鑻辨枃鍐掑彿
    const weightMatch = segment.match(/^(-?\d+\.?\d*)(?::|：){2}/);
    if (weightMatch) weight = parseFloat(weightMatch[1]);

    // 鍖归厤 artist - 鏀寔 artist:tag, -1.3::artist:tag, -1.3::artist:tag::
    if (/artist(?::|：)/.test(segment)) {
      hasArtist = true;
    }

    return { weight, hasArtist };
  }

  function showAutocomplete(editor, results, query) {
    const c = createContainer();
    const list = c.querySelector('.nai-autocomplete-list');

    // 濡傛灉 query 娌″彉涓斿凡鏈夌粨鏋滐紝鍙洿鏂颁綅缃紝涓嶉噸鏂版覆鏌擄紙淇濈暀鐢ㄦ埛淇敼锛?
    if (query === lastRenderedQuery && currentResults.length > 0) {
      positionAutocomplete(editor);
      if (!c.classList.contains('visible')) {
        requestAnimationFrame(() => c.classList.add('visible'));
      }
      return;
    }

    // query 鏀瑰彉浜嗭紝閲嶆柊娓叉煋
    lastRenderedQuery = query;
    currentResults = results;
    currentQuery = query;
    selectedIndex = 0;

    // 鑾峰彇褰撳墠涓婁笅鏂?
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

      // 鍒濆鍖栨潈閲嶅拰 artist 鐘舵€?
      results.forEach((tag, i) => {
        tag.weight = context.weight;
        if (tag.category === '1') {
          tag.useArtistPrefix = context.hasArtist;
        }
      });

      // 鐢诲笀澶嶉€夋浜嬩欢 - 鍒嗗紑澶勭悊 checkbox 鍜?label
      list.querySelectorAll('.nai-artist-check').forEach(chk => {
        // checkbox 鑷韩鐨勭偣鍑伙細闃绘鍐掓场锛岃娴忚鍣ㄥ鐞嗗垏鎹?
        chk.addEventListener('mousedown', e => {
          e.stopPropagation();
        });
        chk.addEventListener('click', e => {
          e.stopPropagation();
        });
        // checkbox 鐘舵€佸彉鍖栨椂鍚屾鍒版暟鎹?
        chk.addEventListener('change', e => {
          e.stopPropagation();
          currentResults[+chk.dataset.index].useArtistPrefix = chk.checked;
        });
      });

      // 鐢诲笀 label 鐐瑰嚮锛堥潪 checkbox 閮ㄥ垎锛?
      list.querySelectorAll('.nai-artist-toggle').forEach(label => {
        // 闃绘 label 鐨勯粯璁?click 琛屼负锛堜細鑷姩鍒囨崲 checkbox锛?
        label.addEventListener('click', e => {
          if (!e.target.classList.contains('nai-artist-check')) {
            e.preventDefault();
            e.stopPropagation();
          }
        });
        label.addEventListener('mousedown', e => {
          // 濡傛灉鐐瑰嚮鐨勬槸 checkbox 鏈韩锛屼笉澶勭悊锛堣涓婇潰鐨勫鐞嗗櫒澶勭悊锛?
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

      // 鏉冮噸鎸夐挳浜嬩欢
      list.querySelectorAll('.nai-weight-btn').forEach(btn => {
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const idx = +btn.dataset.index;
          const valueEl = list.querySelector(`.nai-weight-value[data-index="${idx}"]`);
          let val = parseFloat(valueEl.textContent) || 1.0;
          val = btn.classList.contains('nai-weight-up') ? val + 0.1 : val - 0.1;
          // 鏀寔璐熸暟鏉冮噸锛岃寖鍥?-2.0 鍒?2.0
          val = Math.max(-2.0, Math.min(2.0, val));
          valueEl.textContent = val.toFixed(1);
          currentResults[idx].weight = val;
        });
      });

      list.querySelectorAll('.nai-autocomplete-item').forEach(item => {
        // 鐢?mousedown 骞堕樆姝㈤粯璁よ涓猴紝闃叉缂栬緫鍣ㄥけ鐒?
        item.addEventListener('mousedown', (e) => {
          // 濡傛灉鐐瑰嚮鐨勬槸鎺т欢锛堟寜閽€佸閫夋銆乴abel锛夛紝涓嶈Е鍙戦€夋嫨
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
    lastRenderedQuery = ''; // 閲嶇疆浠ヤ究涓嬫閲嶆柊娓叉煋
  }

  function positionAutocomplete(editor) {
    if (!autocompleteContainer || !editor) return;
    const rect = editor.getBoundingClientRect();
    const containerHeight = 320;

    // 浼樺厛鏄剧ず鍦ㄤ笅鏂?
    let top = rect.bottom + 4;

    // 濡傛灉涓嬫柟绌洪棿涓嶈冻锛屽皾璇曚笂鏂?
    if (top + containerHeight > window.innerHeight) {
      const topAbove = rect.top - containerHeight - 4;
      // 鍙湁涓婃柟鏈夎冻澶熺┖闂存墠绉诲埌涓婃柟锛屽惁鍒欎繚鎸佷笅鏂癸紙鍏佽婊氬姩锛?
      if (topAbove >= 0) {
        top = topAbove;
      } else {
        // 涓よ竟閮戒笉澶燂紝璐寸潃瑙嗗彛搴曢儴
        top = Math.max(4, window.innerHeight - containerHeight - 4);
      }
    }

    // 纭繚涓嶈秴鍑洪《閮?
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
    // 鏀寔閫楀彿銆佹崲琛屻€佷互鍙婅棣栦綔涓哄垎闅?
    while (start > 0 && text[start - 1] !== ',' && text[start - 1] !== '\n') start--;
    while (start < pos && text[start] === ' ') start++;
    let word = text.slice(start, pos).trim();

    // 濡傛灉 word 涓虹┖锛屼笉闇€瑕佺户缁鐞?
    if (!word) return '';

    // 澶勭悊鍚勭鏍煎紡锛屾彁鍙栧疄闄呰鎼滅储鐨?tag 閮ㄥ垎
    // 鏀寔鑻辨枃鍐掑彿 : 鍜屼腑鏂囧啋鍙?锛?
    // 鏀寔璐熸暟鏉冮噸锛屽 -1.3::tag::

    // -1.3::artist:tag:: - 鎻愬彇 tag锛堝凡瀹屾垚鏍煎紡锛屽彲缂栬緫锛?
    let match = word.match(/^(-?\d+\.?\d*)(?::|：){2}artist(?::|：)([^:：]+)(?::|：){2}$/);
    if (match) return match[2];

    // -1.3::tag:: - 鎻愬彇 tag锛堝凡瀹屾垚鏍煎紡锛屽彲缂栬緫锛?
    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}([^:：]+)(?::|：){2}$/);
    if (match) return match[2];

    // -1.3::artist:tag::xxx - 鎻愬彇 xxx锛堝湪瀹屾垚tag鍚庣户缁緭鍏ワ級
    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}artist(?::|：)[^:：]+(?::|：){2}(.+)$/);
    if (match) return match[2];

    // -1.3::tag::xxx - 鎻愬彇 xxx锛堝湪瀹屾垚tag鍚庣户缁緭鍏ワ級
    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}[^:：]+(?::|：){2}(.+)$/);
    if (match) return match[2];

    // -1.3::tag1,tag2,ta - 澶歵ag鏍煎紡锛屾彁鍙栨渶鍚庝竴涓€楀彿鍚庣殑閮ㄥ垎
    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}.*,([^,]*)$/);
    if (match) return match[2].trim();

    // -1.3::artist:xxx - 鎻愬彇 xxx
    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}artist(?::|：)(.*)$/);
    if (match) return match[2].replace(/(?::|：)+$/, '');

    // -1.3::xxx - 鎻愬彇 xxx锛堝寘鎷?-1.3::tag: 杩欑涓棿鐘舵€侊級
    match = word.match(/^(-?\d+\.?\d*)(?::|：){2}(.*)$/);
    if (match) {
      // 鍘绘帀灏鹃儴鐨勫啋鍙凤紙鐢ㄦ埛姝ｅ湪杈撳叆 ::锛?
      return match[2].replace(/(?::|：)+$/, '');
    }

    // artist:xxx - 鎻愬彇 xxx
    match = word.match(/^artist(?::|：)(.*)$/);
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

      // 妫€娴嬫槸鍚﹀湪宸插畬鎴愮殑 tag 鍚庣户缁緭鍏?(e.g., "-1.3::tag::xxx" 鎴?"-1.3::artist:tag::xxx")
      // 鏀寔璐熸暟鏉冮噸鍜屼腑鑻辨枃鍐掑彿
      const afterCompleteMatch = currentSegment.match(/^(-?\d+\.?\d*(?::|：){2}(artist(?::|：))?[^:：]+(?::|：){2})/);
      if (afterCompleteMatch) {
        // 鐢ㄦ埛鍦ㄥ畬鎴愮殑 tag 鍚庤緭鍏ユ柊鍐呭锛屽彧鏇挎崲鏂拌緭鍏ョ殑閮ㄥ垎
        start = start + afterCompleteMatch[0].length;
        isAfterComplete = true;
      } else {
        // 妫€娴嬪 tag 鏍煎紡: -1.3::tag1,tag2,ta - 鍙浛鎹㈡渶鍚庝竴涓€楀彿鍚庣殑閮ㄥ垎
        const multiTagMatch = currentSegment.match(/^(-?\d+\.?\d*(?::|：){2}.*,)/);
        if (multiTagMatch) {
          start = start + multiTagMatch[1].length;
          isMultiTagFormat = true;
        }
      }

      // 璁剧疆閫夊尯锛氫粠 start 鍒板綋鍓嶅厜鏍囦綅缃?
      range.setStart(node, start);
      range.setEnd(node, pos);
      sel.removeAllRanges();
      sel.addRange(range);
    }

    // 搴旂敤涓嬪垝绾?绌烘牸杞崲
    let tagName = tag.tag;
    if (settings.convertSlashToSpace) {
      tagName = tagName.replace(/_/g, ' ');
    } else {
      tagName = tagName.replace(/ /g, '_');
    }

    const weight = tag.weight || 1.0;
    // 浣跨敤鐢ㄦ埛鍦║I涓€夋嫨鐨?artist 璁剧疆
    const useArtist = tag.category === '1' && tag.useArtistPrefix;

    // 鏋勫缓杈撳嚭鏍煎紡 - 濮嬬粓鍩轰簬鐢ㄦ埛鍦║I涓殑閫夋嫨锛屾浛鎹㈡暣涓钀?
    let output;
    if (isAfterComplete || isMultiTagFormat) {
      // 鍦ㄥ凡瀹屾垚 tag 鍚庢垨澶?tag 鏍煎紡涓紝鍙緭鍑?tag 鍚?
      output = `${tagName},`;
    } else if (weight !== 1.0) {
      // 甯︽潈閲嶆牸寮? -1.3::tag:: 鎴?-1.3::artist:tag::
      const weightStr = weight >= 0 ? weight.toFixed(1) : weight.toFixed(1);
      output = useArtist ? `${weightStr}::artist:${tagName}::, ` : `${weightStr}::${tagName}::, `;
    } else {
      // 鏃犳潈閲嶆牸寮? tag 鎴?artist:tag
      output = useArtist ? `artist:${tagName}, ` : `${tagName}, `;
    }

    document.execCommand('insertText', false, output);
    hideAutocomplete();
  }

  // 闃叉姈
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

    // 鍔犺浇淇濆瓨鐨勮缃?
    try {
      const saved = localStorage.getItem('nai-ac-settings');
      if (saved) Object.assign(settings, JSON.parse(saved));
    } catch (e) {}

    syncThemeFromStorage();
    loadTags();

    // 鐩戝惉杈撳叆浜嬩欢
    document.addEventListener('input', e => {
      const editor = e.target.closest('.ProseMirror');
      if (editor) { activeEditor = editor; handleInput(editor); }
    }, true);

    // 鐩戝惉鍏夋爣绉诲姩锛堢偣鍑绘垨閿洏绉诲姩鍏夋爣鏃朵篃瑙﹀彂琛ュ叏妫€娴嬶級
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

