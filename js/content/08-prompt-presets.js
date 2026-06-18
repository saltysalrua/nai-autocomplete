function getToolbarSelectedPresetId(editor) {
  const select = promptPresetToolbar?.querySelector('[data-field="preset-select"]');
  if (select instanceof HTMLSelectElement && select.value) return select.value;
  return getMatchedPromptPresetId(editor);
}

function isPromptPresetDialogOpen() {
  return Boolean(promptPresetDialog && !promptPresetDialog.classList.contains('nai-hidden'));
}

function normalizePresetName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 60);
}

function clonePromptPresetBlocks(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map((block) => ({
    id: String(block?.id || createId(block?.isGroup ? 'block' : 'tag')),
    tags: Array.isArray(block?.tags) ? block.tags.map((tag) => String(tag || '').trim()).filter(Boolean) : [],
    delimiters: Array.isArray(block?.delimiters)
      ? block.delimiters.map((delimiter) => String(delimiter || ''))
      : [],
    locked: Boolean(block?.locked),
    isGroup: Boolean(block?.isGroup),
    libraryId: block?.libraryId ? String(block.libraryId) : '',
    libraryAlias: block?.libraryAlias ? String(block.libraryAlias) : '',
    libraryCategory: block?.libraryCategory ? String(block.libraryCategory) : '',
  })).filter((block) => block.tags.length);
}

function assignFreshPromptPresetBlockIds(blocks) {
  return clonePromptPresetBlocks(blocks).map((block) => ({
    ...block,
    id: createId(block.isGroup ? 'block' : 'tag'),
  }));
}

function serializePromptPresetStructure(blocks) {
  return JSON.stringify(clonePromptPresetBlocks(blocks).map((block) => ({
    tags: block.tags,
    delimiters: Array.isArray(block.delimiters) && block.delimiters.length === block.tags.length
      ? block.delimiters
      : block.tags.map((_, index) => index === block.tags.length - 1 ? '' : ', '),
    locked: Boolean(block.locked),
    isGroup: Boolean(block.isGroup),
    libraryAlias: block.libraryAlias || '',
  })));
}

function normalizePromptPresetEntry(entry) {
  const name = normalizePresetName(entry?.name);
  const blocks = clonePromptPresetBlocks(entry?.blocks);
  if (!name || !blocks.length) return null;

  return {
    id: String(entry?.id || createId('preset')),
    name,
    blocks,
    createdAt: Number(entry?.createdAt) || Date.now(),
    updatedAt: Number(entry?.updatedAt) || Date.now(),
    signature: serializePromptPresetStructure(blocks),
  };
}

function readPromptPresetLocalBackup() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PROMPT_PRESET_LIBRARY_KEY) || 'null');
    return Array.isArray(parsed) ? parsed.map(normalizePromptPresetEntry).filter(Boolean) : [];
  } catch (error) {
    return [];
  }
}

function clearPromptPresetLocalBackup() {
  try {
    localStorage.removeItem(PROMPT_PRESET_LIBRARY_KEY);
  } catch (error) {}
}

function mergePromptPresetEntries(primaryEntries, secondaryEntries) {
  const merged = [];
  const idIndexMap = new Map();
  const nameIndexMap = new Map();

  const upsert = (entry) => {
    const normalized = normalizePromptPresetEntry(entry);
    if (!normalized) return;

    const idKey = String(normalized.id || '');
    const nameKey = normalized.name.toLowerCase();
    const existingIndex = idIndexMap.get(idKey) ?? nameIndexMap.get(nameKey);

    if (existingIndex === undefined) {
      merged.push(normalized);
      const index = merged.length - 1;
      if (idKey) idIndexMap.set(idKey, index);
      nameIndexMap.set(nameKey, index);
      return;
    }

    const existing = merged[existingIndex];
    const existingTime = Number(existing.updatedAt || existing.createdAt || 0);
    const incomingTime = Number(normalized.updatedAt || normalized.createdAt || 0);
    if (incomingTime < existingTime) return;

    merged[existingIndex] = normalized;
    if (idKey) idIndexMap.set(idKey, existingIndex);
    nameIndexMap.set(nameKey, existingIndex);
  };

  (primaryEntries || []).forEach(upsert);
  (secondaryEntries || []).forEach(upsert);
  return merged;
}

async function loadPromptPresetLibrary() {
  const backupEntries = readPromptPresetLocalBackup();

  try {
    const stored = await storageGetLocalStrict(PROMPT_PRESET_LIBRARY_KEY);
    const extensionEntries = Array.isArray(stored[PROMPT_PRESET_LIBRARY_KEY])
      ? stored[PROMPT_PRESET_LIBRARY_KEY].map(normalizePromptPresetEntry).filter(Boolean)
      : [];
    const mergedEntries = mergePromptPresetEntries(extensionEntries, backupEntries);

    promptPresetLibrary = mergedEntries;

    if (backupEntries.length) {
      const extensionSnapshot = JSON.stringify(extensionEntries);
      const mergedSnapshot = JSON.stringify(mergedEntries);
      if (extensionSnapshot !== mergedSnapshot) {
        await storageSetLocalStrict({ [PROMPT_PRESET_LIBRARY_KEY]: mergedEntries });
      }
      clearPromptPresetLocalBackup();
    }
  } catch (error) {
    promptPresetLibrary = backupEntries;
  }
}

async function savePromptPresetLibrary(entries) {
  promptPresetLibrary = entries.map(normalizePromptPresetEntry).filter(Boolean);
  await storageSetLocalStrict({ [PROMPT_PRESET_LIBRARY_KEY]: promptPresetLibrary });
  clearPromptPresetLocalBackup();
}

function createPromptPresetDialog() {
  if (promptPresetDialog) return promptPresetDialog;
  const dialog = document.createElement('div');
  dialog.className = 'nai-prompt-library-dialog nai-hidden';
  dialog.innerHTML = `
    <div class="nai-prompt-library-backdrop" data-action="close-preset-dialog"></div>
    <div class="nai-prompt-library-card" role="dialog" aria-modal="true" aria-label="保存预设">
      <div class="nai-prompt-library-head">
        <div class="nai-prompt-library-title">保存整套预设</div>
        <div class="nai-prompt-library-note">会保存当前主提示词区域里的完整区块结构、锁定状态和分组信息。</div>
      </div>
      <div class="nai-prompt-library-grid">
        <label class="nai-prompt-library-field">
          <span>预设名称</span>
          <input data-field="preset-name" type="text" placeholder="例如 默认角色组 / 晚霞场景组" />
        </label>
      </div>
      <div class="nai-prompt-library-preview" data-field="preset-preview">未命名预设</div>
      <div class="nai-prompt-library-error nai-hidden" data-field="preset-error"></div>
      <div class="nai-prompt-library-actions">
        <button type="button" data-action="close-preset-dialog">取消</button>
        <button type="button" class="is-primary" data-action="confirm-preset-save">保存</button>
      </div>
    </div>
  `;

  dialog.addEventListener('click', async (event) => {
    const actionTarget = event.target.closest('[data-action]');
    if (!actionTarget) return;
    const action = actionTarget.getAttribute('data-action');
    if (action === 'close-preset-dialog') {
      closePromptPresetDialog();
    } else if (action === 'confirm-preset-save') {
      await savePromptPresetFromDialog();
    }
  });

  dialog.querySelector('[data-field="preset-name"]')?.addEventListener('input', updatePromptPresetDialogPreview);
  dialog.addEventListener('keydown', async (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePromptPresetDialog();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await savePromptPresetFromDialog();
    }
  });

  dialog.addEventListener('mousedown', (event) => event.stopPropagation(), true);
  dialog.addEventListener('pointerdown', (event) => event.stopPropagation(), true);

  document.body.appendChild(dialog);
  promptPresetDialog = dialog;
  return dialog;
}

function getCurrentPromptPresetSignature(editor) {
  ensurePromptBlockModel(editor, { render: false });
  return serializePromptPresetStructure(promptBlocks);
}

function getMatchedPromptPresetId(editor) {
  const signature = getCurrentPromptPresetSignature(editor);
  const matched = promptPresetLibrary.find((entry) => entry.signature === signature);
  return matched?.id || '';
}

function updatePromptPresetDialogPreview() {
  const dialog = createPromptPresetDialog();
  const name = normalizePresetName(dialog.querySelector('[data-field="preset-name"]')?.value || '');
  const preview = dialog.querySelector('[data-field="preset-preview"]');
  const error = dialog.querySelector('[data-field="preset-error"]');
  const submit = dialog.querySelector('[data-action="confirm-preset-save"]');
  const hasName = Boolean(name);

  if (preview) {
    preview.textContent = hasName ? name : '未命名预设';
  }
  if (error) {
    error.textContent = hasName ? '' : '请先填写预设名称。';
    error.classList.toggle('nai-hidden', hasName);
  }
  if (submit instanceof HTMLButtonElement) {
    submit.disabled = !hasName;
  }
}

function openPromptPresetDialog(editor, options = {}) {
  if (!editor) return;
  const dialog = createPromptPresetDialog();
  const input = dialog.querySelector('[data-field="preset-name"]');
  const presetId = options.presetId ?? getToolbarSelectedPresetId(editor);
  const preset = (presetId ? promptPresetLibrary.find((entry) => entry.id === presetId) : null)
    || promptPresetLibrary.find((entry) => entry.id === getMatchedPromptPresetId(editor));
  promptPresetDialogState.presetId = preset?.id || '';
  promptPresetDialogState.renameOnly = Boolean(options.renameOnly);
  if (input) {
    input.value = preset?.name || '';
  }
  const title = dialog.querySelector('.nai-prompt-library-title');
  if (title) {
    title.textContent = promptPresetDialogState.renameOnly ? '重命名预设' : '保存整套预设';
  }
  updatePromptPresetDialogPreview();
  dialog.classList.remove('nai-hidden');
  requestAnimationFrame(() => {
    input?.focus();
    input?.select?.();
  });
}

function closePromptPresetDialog() {
  if (!promptPresetDialog) return;
  promptPresetDialog.classList.add('nai-hidden');
  promptPresetDialogState.presetId = '';
  promptPresetDialogState.renameOnly = false;
  const title = promptPresetDialog.querySelector('.nai-prompt-library-title');
  if (title) title.textContent = '保存整套预设';
}

async function savePromptPresetFromDialog() {
  if (!activeEditor) return;
  ensurePromptBlockModel(activeEditor, { render: false });

  const dialog = createPromptPresetDialog();
  const input = dialog.querySelector('[data-field="preset-name"]');
  const error = dialog.querySelector('[data-field="preset-error"]');
  const name = normalizePresetName(input?.value || '');
  if (!name) {
    updatePromptPresetDialogPreview();
    return;
  }

  const existingPreset = promptPresetLibrary.find((entry) => entry.id === promptPresetDialogState.presetId)
    || promptPresetLibrary.find((entry) => entry.name.toLowerCase() === name.toLowerCase());

  const renameOnly = Boolean(promptPresetDialogState.renameOnly);
  const sourcePreset = existingPreset || (promptPresetDialogState.presetId
    ? promptPresetLibrary.find((entry) => entry.id === promptPresetDialogState.presetId)
    : null);
  const blocks = renameOnly && sourcePreset ? sourcePreset.blocks : promptBlocks;

  const nextEntry = normalizePromptPresetEntry({
    id: existingPreset?.id || createId('preset'),
    name,
    blocks,
    createdAt: existingPreset?.createdAt || Date.now(),
    updatedAt: Date.now(),
  });

  if (!nextEntry) {
    if (error) {
      error.textContent = '当前提示词为空，暂时不能保存为预设。';
      error.classList.remove('nai-hidden');
    }
    return;
  }

  const nextPresets = [...promptPresetLibrary];
  const existingIndex = existingPreset ? nextPresets.findIndex((entry) => entry.id === existingPreset.id) : -1;
  if (existingIndex >= 0) {
    nextPresets.splice(existingIndex, 1, nextEntry);
  } else {
    nextPresets.unshift(nextEntry);
  }

  try {
    await savePromptPresetLibrary(nextPresets);
  } catch (saveError) {
    if (error) {
      error.textContent = '预设保存失败，请稍后再试。';
      error.classList.remove('nai-hidden');
    }
    return;
  }

  closePromptPresetDialog();
  renderPromptPresetToolbar(activeEditor);
}

function applyPromptPresetToEditor(editor, presetId) {
  if (!editor || !presetId) return;
  const preset = promptPresetLibrary.find((entry) => entry.id === presetId);
  if (!preset) return;

  ensurePromptBlockModel(editor, { render: false });
  pushPromptBlockHistory(editor);
  promptBlocks = assignFreshPromptPresetBlockIds(preset.blocks);
  commitPromptBlocks(editor);
  renderPromptPresetToolbar(editor);
}

async function deletePromptPreset(editor, presetId) {
  const preset = promptPresetLibrary.find((entry) => entry.id === presetId);
  if (!preset) return;
  const confirmed = window.confirm(`确定删除预设“${preset.name}”吗？`);
  if (!confirmed) return;

  const nextPresets = promptPresetLibrary.filter((entry) => entry.id !== presetId);
  await savePromptPresetLibrary(nextPresets);
  renderPromptPresetToolbar(editor || activeEditor);
}

function createPromptPresetToolbar() {
  if (promptPresetToolbar) return promptPresetToolbar;
  const toolbar = document.createElement('div');
  toolbar.className = 'nai-prompt-preset-toolbar nai-hidden';
  toolbar.innerHTML = `
    <span class="nai-prompt-preset-label">预设</span>
    <select data-field="preset-select"></select>
    <button type="button" data-action="apply-preset" title="套用预设" aria-label="套用预设">套用</button>
    <button type="button" data-action="rename-preset" title="重命名预设" aria-label="重命名预设">重命名</button>
    <button type="button" data-action="save-preset" title="保存当前为预设" aria-label="保存当前为预设">保存</button>
    <button type="button" data-action="delete-preset" title="删除当前预设" aria-label="删除当前预设">删</button>
  `;

  toolbar.addEventListener('change', () => {
    updatePromptPresetToolbar(activeEditor);
  });

  toolbar.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-action]');
    if (!target || !activeEditor) return;
    const select = toolbar.querySelector('[data-field="preset-select"]');
    const selectedPresetId = select instanceof HTMLSelectElement ? select.value : '';
    const action = target.getAttribute('data-action');

      if (action === 'apply-preset') {
        applyPromptPresetToEditor(activeEditor, selectedPresetId);
      } else if (action === 'rename-preset') {
        if (!selectedPresetId) {
          window.alert('请先在列表里选择一个要重命名的预设。');
          return;
        }
        openPromptPresetDialog(activeEditor, { presetId: selectedPresetId, renameOnly: true });
      } else if (action === 'save-preset') {
        openPromptPresetDialog(activeEditor);
    } else if (action === 'delete-preset') {
      await deletePromptPreset(activeEditor, selectedPresetId);
    }
  });

  document.body.appendChild(toolbar);
  promptPresetToolbar = toolbar;
  return toolbar;
}

function positionPromptPresetToolbar(editor) {
  const toolbar = createPromptPresetToolbar();
  if (!editor) return;
  const rect = editor.getBoundingClientRect();
  const uiScale = getPromptEditorUiScale(editor);
  const width = (toolbar.offsetWidth || 360) * uiScale;
  const left = Math.min(window.innerWidth - width - 8, Math.max(8, rect.right - width));
  const top = Math.max(8, rect.top - 46 * uiScale >= 8 ? rect.top - 46 * uiScale : rect.bottom + 8);
  toolbar.style.left = `${left}px`;
  toolbar.style.top = `${top}px`;
  applyOverlayUiScale(toolbar, uiScale);
}

function hidePromptPresetToolbar() {
  if (!promptPresetToolbar) return;
  clearOverlayUiScale(promptPresetToolbar);
  promptPresetToolbar.classList.add('nai-hidden');
}

function renderPromptPresetToolbar(editor) {
  if (isPromptPresetDialogOpen()) return;

  const toolbar = createPromptPresetToolbar();
  if (!editor || !editor.isConnected || editor !== activeEditor) {
    hidePromptPresetToolbar();
    return;
  }

  const select = toolbar.querySelector('[data-field="preset-select"]');
  const deleteButton = toolbar.querySelector('[data-action="delete-preset"]');
  if (!(select instanceof HTMLSelectElement)) {
    hidePromptPresetToolbar();
    return;
  }

  const matchedPresetId = getMatchedPromptPresetId(editor);
  const currentValue = select.value;
  select.innerHTML = [
    '<option value="">选择整套预设</option>',
    ...promptPresetLibrary
      .slice()
      .sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0))
      .map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.name)}</option>`),
  ].join('');

  select.value = matchedPresetId || currentValue || '';
  if (select.value && !promptPresetLibrary.some((entry) => entry.id === select.value)) {
    select.value = '';
  }

  if (deleteButton instanceof HTMLButtonElement) {
    deleteButton.disabled = !select.value;
  }

  positionPromptPresetToolbar(editor);
  toolbar.classList.remove('nai-hidden');
}
