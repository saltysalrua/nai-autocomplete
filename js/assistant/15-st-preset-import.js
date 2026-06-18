function normalizeImportedPromptText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}

function getOrderedPromptItemsFromStPreset(data) {
  const prompts = Array.isArray(data?.prompts) ? data.prompts.filter((item) => item && typeof item === 'object') : [];
  if (!prompts.length) return [];

  const promptMap = new Map();
  prompts.forEach((item, index) => {
    const identifier = String(item.identifier || item.id || `prompt_${index}`).trim();
    if (!identifier) return;
    promptMap.set(identifier, item);
  });

  const promptOrder = Array.isArray(data?.prompt_order) ? data.prompt_order : [];
  const firstOrder = promptOrder.find((entry) => entry && typeof entry === 'object' && Array.isArray(entry.order));
  const orderedIdentifiers = Array.isArray(firstOrder?.order) ? firstOrder.order : [];

  const orderedItems = [];
  const seen = new Set();

  orderedIdentifiers.forEach((entry) => {
    const identifier = String(entry?.identifier || '').trim();
    if (!identifier || seen.has(identifier)) return;
    const prompt = promptMap.get(identifier);
    if (!prompt) return;
    const isEnabled = entry?.enabled !== false && prompt?.enabled !== false;
    if (!isEnabled) return;
    orderedItems.push(prompt);
    seen.add(identifier);
  });

  prompts.forEach((prompt, index) => {
    const identifier = String(prompt.identifier || prompt.id || `prompt_${index}`).trim();
    if (!identifier || seen.has(identifier) || prompt?.enabled === false) return;
    orderedItems.push(prompt);
    seen.add(identifier);
  });

  return orderedItems;
}

function readStPromptRole(prompt) {
  const role = String(prompt?.role || (prompt?.system_prompt ? 'system' : '')).trim().toLowerCase();
  if (role === 'system' || role === 'user' || role === 'assistant') return role;
  return 'system';
}

function convertStPresetToBlocks(data) {
  const orderedPrompts = getOrderedPromptItemsFromStPreset(data);
  if (!orderedPrompts.length) {
    throw new Error(T.statusStPresetImportFailed);
  }

  const blocks = [];
  orderedPrompts.forEach((prompt) => {
    if (prompt?.marker || !String(prompt?.content || '').trim()) return;

    const role = readStPromptRole(prompt);
    const content = normalizeImportedPromptText(prompt.content);
    if (!content) return;

    blocks.push({
      id: generateBlockId(),
      role,
      content,
      enabled: true,
    });
  });

  if (!blocks.length) {
    throw new Error(T.statusStPresetImportFailed);
  }

  const hasBooruVar = blocks.some((block) => block.enabled && block.content.includes('{{booru_tags}}'));
  if (!hasBooruVar) {
    const lastUserBlock = [...blocks].reverse().find((block) => block.role === 'user' && block.enabled);
    if (lastUserBlock) {
      lastUserBlock.content = `${lastUserBlock.content}\n\n{{booru_tags}}`;
    } else {
      blocks.push({
        id: generateBlockId(),
        role: 'user',
        content: '{{booru_tags}}',
        enabled: true,
      });
    }
  }

  return blocks;
}

function getStPresetName(data) {
  return String(data?.name || data?.id || '').trim() || 'ST 导入';
}

async function applyImportedStPreset(preset) {
  state.settings.activePresetId = preset.id;
  if (ui.settings.activePresetId) ui.settings.activePresetId.value = preset.id;
  if (ui.wb?.presetId) ui.wb.presetId.value = preset.id;
  renderPresetSelector();
  renderWorkbenchPresetSelector();
  renderPresetEditor('settings');
  renderPresetEditor('workbench');
  updateRoleSectionVisibility();
  updateWorkbenchRoleSectionVisibility();

  const presetsSaved = await saveCustomPresets();
  if (!presetsSaved) {
    setStatus(T.statusContextInvalidated, true);
    return;
  }

  const settingsSaved = await storageSet({ [SETTINGS_KEY]: state.settings });
  if (!settingsSaved) {
    setStatus(T.statusContextInvalidated, true);
    return;
  }

  setStatus(T.statusStPresetImported, false);
}

function importStPresetObject(data) {
  const blocks = convertStPresetToBlocks(data);
  const preset = {
    id: 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
    name: getStPresetName(data),
    builtIn: false,
    blocks,
  };
  state.customPresets.push(normalizePreset(preset));
  return preset;
}

function triggerStPresetImport() {
  ui.stPresetInput?.click();
}

async function handleStPresetImport(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;

  const [file] = Array.from(input.files || []);
  input.value = '';
  if (!file) return;

  if (!ensureExtensionContext()) {
    setStatus(T.statusContextInvalidated, true);
    return;
  }

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const preset = importStPresetObject(parsed);
    await applyImportedStPreset(preset);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : T.statusStPresetImportFailed, true);
  }
}
