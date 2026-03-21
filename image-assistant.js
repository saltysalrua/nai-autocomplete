(function () {
  'use strict';

  if (window.top !== window.self) return;
  if (window.__naiAssistantV4Loaded) return;
  window.__naiAssistantV4Loaded = true;

  const SETTINGS_KEY = 'nai-llm-assistant-settings';
  const HISTORY_KEY = 'nai-llm-reverse-history';
  const PANEL_LAYOUT_KEY = 'nai-llm-panel-layout';
  const PROMPT_LIBRARY_KEY = 'nai-shared-prompt-library';
  const ROLE_LIBRARY_CATEGORY = 'char';
  const MAX_HISTORY = 30;
  const PANEL_MARGIN = 20;
  const PANEL_MIN_WIDTH = 320;
  const PANEL_MIN_HEIGHT = 260;

  const T = {
    title: '\u56fe\u50cf\u53cd\u63a8\u52a9\u624b',
    fab: '\u53cd\u63a8',
    tabReverse: '\u53cd\u63a8',
    tabHistory: '\u5386\u53f2',
    tabSettings: '\u8bbe\u7f6e',
    quickHint: '\u5feb\u6377\u952e\uff1a',
    pick: '\u624b\u52a8\u9009\u56fe',
    reverseCopy: '\u53cd\u63a8\u5e76\u590d\u5236',
    copyResult: '\u590d\u5236\u7ed3\u679c',
    previewEmpty: '\u5c1a\u672a\u9501\u5b9a\u56fe\u7247',
    resultLabel: '\u53cd\u63a8\u7ed3\u679c\uff08\u81ea\u52a8\u590d\u5236\u5230\u526a\u5207\u677f\uff09',
    resultPlaceholder: '\u53cd\u63a8\u7ed3\u679c\u4f1a\u663e\u793a\u5728\u8fd9\u91cc',
    clearHistory: '\u6e05\u7a7a\u5386\u53f2',
    noHistory: '\u6682\u65e0\u5386\u53f2\u8bb0\u5f55',
    copy: '\u590d\u5236',
    load: '\u52a0\u8f7d',
    serviceProvider: '\u670d\u52a1\u5546\u9884\u8bbe',
    protocol: '\u63a5\u53e3\u534f\u8bae',
    model: '\u6a21\u578b',
    systemPrompt: '\u7cfb\u7edf\u63d0\u793a\u8bcd',
    reversePrompt: '\u53cd\u63a8\u6307\u4ee4\uff08\u53cd\u63a8\u9875\u4e0d\u518d\u5355\u72ec\u8f93\u5165\uff09',
    roleMode: '\u66ff\u6362\u89d2\u8272\u6a21\u5f0f',
    roleSystemPrompt: '\u89d2\u8272\u6a21\u5f0f\u7cfb\u7edf\u63d0\u793a\u8bcd',
    roleReversePrompt: '\u89d2\u8272\u6a21\u5f0f\u53cd\u63a8\u6307\u4ee4',
    rolePrompt: '\u76ee\u6807\u89d2\u8272\u63d0\u793a\u8bcd',
    roleLibrary: '\u8bcd\u5e93\u89d2\u8272',
    roleLibraryPlaceholder: '\u9009\u62e9\u5df2\u4fdd\u5b58\u7684 char: \u89d2\u8272\u8bcd\u5e93',
    applyRoleLibrary: '\u5957\u7528\u5230\u89d2\u8272\u63d0\u793a\u8bcd',
    sectionAppearance: '\u5916\u89c2',
    sectionAppearanceHint: '\u989c\u8272\u4e0e\u9762\u677f\u884c\u4e3a',
    sectionProvider: 'LLM \u670d\u52a1',
    sectionProviderHint: '\u6a21\u578b\u3001Endpoint \u4e0e\u8fde\u63a5\u68c0\u67e5',
    sectionPrompt: '\u63d0\u793a\u8bcd',
    sectionPromptHint: '\u53cd\u63a8\u903b\u8f91\u4e0e\u89d2\u8272\u66ff\u6362',
    sectionBehavior: '\u751f\u6210\u9009\u9879',
    sectionBehaviorHint: '\u56fe\u7247\u53d1\u9001\u65b9\u5f0f\u4e0e\u8f93\u51fa\u884c\u4e3a',
    sectionFallback: '\u5907\u7528\u6a21\u578b',
    sectionFallbackHint: '\u4e3b\u6a21\u578b\u5931\u8d25\u540e\u7684\u5140\u5e95\u8def\u7531',
    defaultCodeFence: '\u9ed8\u8ba4\u4ee3\u7801\u6846\u8f93\u51fa',
    wrapCodeButton: '\u5305\u88f9\u4ee3\u7801\u6846',
    fetchModels: '\u83b7\u53d6\u6a21\u578b',
    testConnection: '\u6d4b\u8bd5\u8fde\u63a5',
    fallbackMode: '\u542f\u7528\u5907\u7528\u6a21\u578b\uff08\u4e3b\u6a21\u578b\u5931\u8d25\u65f6\u81ea\u52a8\u91cd\u8bd5\uff09',
    fallbackProvider: '\u5907\u7528\u670d\u52a1\u5546\u9884\u8bbe',
    fallbackProtocol: '\u5907\u7528\u63a5\u53e3\u534f\u8bae',
    fallbackEndpoint: '\u5907\u7528 API Endpoint',
    fallbackModel: '\u5907\u7528\u6a21\u578b',
    fallbackApiKey: '\u5907\u7528 API Key\uff08\u7559\u7a7a\u5219\u590d\u7528\u4e3b Key\uff09',
    themePreset: '\u989c\u8272\u9884\u8bbe',
    sendImageAsDataUrl: '\u53d1\u9001\u56fe\u7247\u5185\u5bb9\uff08\u5173\u95ed\u5219\u53d1\u9001\u539f\u59cb URL\uff09',
    showBall: '\u663e\u793a\u60ac\u6d6e\u7403\uff08\u5173\u95ed\u540e\u4ec5\u53ef\u901a\u8fc7\u5feb\u6377\u952e\u6216\u6269\u5c55\u5f39\u7a97\u6253\u5f00\uff09',
    saveSettings: '\u4fdd\u5b58\u8bbe\u7f6e',
    statusReady: '\u5c31\u7eea\u3002\u53ef\u4f7f\u7528 Alt + Shift + \u70b9\u51fb\u56fe\u7247 \u5feb\u901f\u53cd\u63a8\u3002',
    statusNeedImage: '\u8bf7\u5148\u901a\u8fc7\u5feb\u6377\u952e\u6216\u624b\u52a8\u9009\u56fe\u9501\u5b9a\u56fe\u7247\u3002',
    statusNeedKey: '\u672a\u914d\u7f6e API Key\uff0c\u8bf7\u5207\u6362\u5230\u8bbe\u7f6e\u9875\u4fdd\u5b58\u914d\u7f6e\u3002',
    statusNeedPrompt: '\u8bf7\u5148\u5728\u8bbe\u7f6e\u9875\u586b\u5199\u53cd\u63a8\u6307\u4ee4\u3002',
    statusNeedRolePrompt: '\u5df2\u5f00\u542f\u66ff\u6362\u89d2\u8272\u6a21\u5f0f\uff0c\u8bf7\u5728\u8bbe\u7f6e\u9875\u586b\u5199\u76ee\u6807\u89d2\u8272\u63d0\u793a\u8bcd\u3002',
    statusRunning: '\u6b63\u5728\u8bf7\u6c42\u6a21\u578b\u53cd\u63a8...',
    statusRunningFallback: '\u4e3b\u6a21\u578b\u8bf7\u6c42\u5931\u8d25\uff0c\u6b63\u5728\u5207\u6362\u5230\u5907\u7528\u6a21\u578b...',
    statusDoneCopied: '\u53cd\u63a8\u5b8c\u6210\uff0c\u5df2\u590d\u5236\u5230\u526a\u5207\u677f\u3002',
    statusDoneNotCopied: '\u53cd\u63a8\u5b8c\u6210\uff0c\u4f46\u81ea\u52a8\u590d\u5236\u5931\u8d25\u3002',
    statusDoneCopiedFallback: '\u4e3b\u6a21\u578b\u5931\u8d25\uff0c\u5df2\u81ea\u52a8\u5207\u6362\u5230\u5907\u7528\u6a21\u578b\u5e76\u590d\u5236\u5230\u526a\u5207\u677f\u3002',
    statusDoneNotCopiedFallback: '\u4e3b\u6a21\u578b\u5931\u8d25\uff0c\u5df2\u81ea\u52a8\u5207\u6362\u5230\u5907\u7528\u6a21\u578b\uff0c\u4f46\u81ea\u52a8\u590d\u5236\u5931\u8d25\u3002',
    statusSelectMode: '\u9009\u56fe\u6a21\u5f0f\uff1a\u70b9\u51fb\u4e00\u5f20\u56fe\u7247\uff0c\u6309 Esc \u53d6\u6d88\u3002',
    statusSelectCanceled: '\u5df2\u53d6\u6d88\u9009\u56fe\u6a21\u5f0f\u3002',
    statusImageLocked: '\u56fe\u7247\u5df2\u9501\u5b9a\u3002',
    statusSaved: '\u8bbe\u7f6e\u5df2\u4fdd\u5b58\u3002',
    statusHistoryCleared: '\u5386\u53f2\u8bb0\u5f55\u5df2\u6e05\u7a7a\u3002',
    statusCopied: '\u5df2\u590d\u5236\u7ed3\u679c\u3002',
    statusCopyFailed: '\u6682\u65e0\u53ef\u590d\u5236\u7ed3\u679c\u6216\u590d\u5236\u5931\u8d25\u3002',
    statusLoadedHistory: '\u5df2\u52a0\u8f7d\u5386\u53f2\u7ed3\u679c\u3002',
    statusWrapped: '\u5df2\u5c06\u7ed3\u679c\u5305\u88f9\u4e3a\u4ee3\u7801\u6846\u3002',
    statusNoResult: '\u6682\u65e0\u53ef\u5305\u88f9\u7684\u7ed3\u679c\u3002',
    statusRoleLibraryApplied: '\u5df2\u5c06\u8bcd\u5e93\u89d2\u8272\u5957\u7528\u5230\u89d2\u8272\u63d0\u793a\u8bcd\u3002',
    statusRoleLibraryMissing: '\u8bf7\u5148\u9009\u62e9\u4e00\u4e2a\u8bcd\u5e93\u89d2\u8272\u3002',
    statusTestingConnection: '\u6b63\u5728\u6d4b\u8bd5\u8fde\u63a5...',
    statusNeedFallbackConfig: '\u5df2\u542f\u7528\u5907\u7528\u6a21\u578b\uff0c\u8bf7\u5148\u5b8c\u6574\u914d\u7f6e\u5907\u7528\u670d\u52a1\u5546\u3001Endpoint\u3001Model \u548c API Key\u3002',
    statusContextInvalidated: '\u6269\u5c55\u5df2\u66f4\u65b0\uff0c\u8bf7\u5237\u65b0\u5f53\u524d\u9875\u9762\u540e\u91cd\u8bd5\u3002',
  };

  const DEFAULT_SETTINGS = {
    providerPreset: 'openai',
    protocol: 'openai-chat',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4.1-mini',
    apiKey: '',
    systemPrompt: '\u4f60\u662f NovelAI \u56fe\u50cf\u63d0\u793a\u8bcd\u53cd\u63a8\u4e13\u5bb6\uff0c\u4e13\u7cbe V4+ \u52a8\u6f2b\u98ce\u683c\u751f\u6210\u6a21\u578b\u3002\u5f53\u7528\u6237\u63d0\u4f9b\u56fe\u50cf\u65f6\uff0c\u53ea\u8f93\u51fa\u5355\u4e2a\u7eaf\u82f1\u6587\u3001NovelAI-ready \u7684 prompt \u672c\u4f53\uff0c\u4e0d\u8981\u89e3\u91ca\uff0c\u4e0d\u8981\u6807\u9898\uff0c\u4e0d\u8981 TAGS\uff0c\u4e0d\u8981 PROMPT\uff0c\u4e0d\u8981 JSON\uff0c\u4e0d\u8981\u4ee3\u7801\u5757\u5916\u7684\u4efb\u4f55\u6587\u5b57\u3002\u63d0\u793a\u8bcd\u5fc5\u987b\u5c3d\u91cf\u4f7f\u7528 Danbooru \u98ce\u683c tag\uff0c\u591a\u8bcd tag \u4f7f\u7528\u4e0b\u5212\u7ebf\uff0c\u540c\u65f6\u5141\u8bb8\u5c11\u91cf\u81ea\u7136\u8bed\u8a00\u77ed\u8bed\u589e\u5f3a\u573a\u666f\u4e00\u81f4\u6027\u3002\u7edd\u5bf9\u4e0d\u8981\u6dfb\u52a0 masterpiece, best quality, very aesthetic, absurdres, highly detailed \u7b49\u8d28\u91cf\u589e\u5f3a\u8bcd\uff0c\u4e5f\u4e0d\u8981\u8f93\u51fa negative prompt\u3002',
    reversePrompt: '\u8bf7\u5c06\u8fd9\u5f20\u56fe\u53cd\u63a8\u4e3a\u53ef\u76f4\u63a5\u7528\u4e8e NovelAI \u7684\u5355\u4e2a\u82f1\u6587 prompt\uff0c\u53ea\u8f93\u51fa prompt \u672c\u4f53\uff0c\u4e0d\u8981\u4efb\u4f55\u989d\u5916\u6587\u5b57\u3002\u987a\u5e8f\u5fc5\u987b\u4f18\u5148\u4e3a\uff1a\u6574\u4f53\u573a\u666f/\u6784\u56fe/\u4eba\u6570/\u706f\u5149 -> \u89d2\u8272\u6838\u5fc3\u7279\u5f81\uff08\u8d8a\u91cd\u8981\u8d8a\u9760\u524d\uff09\u3002\u5355\u89d2\u8272\u65f6\u8bf7\u7528\u6362\u884c\u5206\u4e3a 3-4 \u5c42\uff1a\u7b2c 1 \u884c\u5199 scene/composition/\u4eba\u6570\uff0c\u7b2c 2 \u884c\u5199\u53d1\u8272/\u53d1\u578b/\u77b3\u8272/\u8084\u4f53/\u7279\u5f81\uff0c\u7b2c 3 \u884c\u5199\u670d\u88c5\u4e0e\u914d\u9970\uff0c\u7b2c 4 \u884c\u5199\u52a8\u4f5c/\u8868\u60c5/\u573a\u666f/\u5149\u5f71/\u955c\u5934\u3002\u591a\u89d2\u8272\uff082-6\u4eba\uff09\u65f6\u5fc5\u987b\u4f7f\u7528 NovelAI V4+ \u7684 | \u5206\u9694\u7ed3\u6784\uff0c\u6574\u4e2a prompt \u4ee5\u6700\u540e\u4e00\u4e2a | \u7ed3\u5c3e\u3002\u53ef\u6df7\u5408 Danbooru \u7cbe\u786e tag \u548c\u77ed\u53e5\uff0c\u4f46\u4e0d\u8981\u51fa\u73b0\u4efb\u4f55 tag \u4ee5\u5916\u7684\u6807\u9898\u8bcd\u3002',
    enableRoleReplaceMode: false,
    roleSystemPrompt: '\u4f60\u662f NovelAI \u89d2\u8272\u66ff\u6362\u53cd\u63a8\u4e13\u5bb6\u3002\u4f60\u9700\u8981\u4fdd\u7559\u539f\u56fe\u7684\u6784\u56fe\u3001\u52a8\u4f5c\u3001\u955c\u5934\u3001\u670d\u88c5\u5c42\u7ea7\u3001\u573a\u666f\u3001\u5149\u5f71\u3001\u6c1b\u56f4\u4e0e\u753b\u98ce\uff0c\u53ea\u5c06\u4eba\u7269\u66ff\u6362\u4e3a\u76ee\u6807\u89d2\u8272\u8bbe\u5b9a\u3002\u6700\u7ec8\u53ea\u8f93\u51fa\u5355\u4e2a\u7eaf\u82f1\u6587 NovelAI-ready prompt \u672c\u4f53\uff0c\u4e0d\u8981\u89e3\u91ca\uff0c\u4e0d\u8981 TAGS\uff0c\u4e0d\u8981 PROMPT\uff0c\u4e0d\u8981 JSON\uff0c\u4e0d\u8981 negative prompt\uff0c\u4e0d\u8981\u4fdd\u7559\u539f\u89d2\u8272\u540d\u79f0\u3002',
    roleReversePrompt: '\u8bf7\u5c06\u8fd9\u5f20\u56fe\u53cd\u63a8\u4e3a\u53ef\u76f4\u63a5\u7528\u4e8e NovelAI \u7684\u5355\u4e2a\u82f1\u6587 prompt\uff0c\u4f46\u8981\u5b8c\u6210\u89d2\u8272\u66ff\u6362\uff1a\u4fdd\u6301\u539f\u56fe\u7684 pose\u3001composition\u3001camera angle\u3001clothing structure\u3001scene\u3001lighting\u3001mood \u4e0e style\uff0c\u540c\u65f6\u5c06\u4eba\u7269\u66ff\u6362\u4e3a\u76ee\u6807\u89d2\u8272\u3002\u53ea\u8f93\u51fa prompt \u672c\u4f53\uff0c\u4e0d\u8981\u4efb\u4f55\u989d\u5916\u6587\u5b57\u3002\u5355\u89d2\u8272\u65f6\u7528\u6362\u884c\u5206\u5c42\u8f93\u51fa\uff0c\u591a\u89d2\u8272\u65f6\u4f7f\u7528 NovelAI V4+ \u7684 | \u7ed3\u6784\u5e76\u4ee5 | \u7ed3\u5c3e\u3002\u4f18\u5148\u4f7f\u7528 Danbooru \u7cbe\u786e tag\uff0c\u53ef\u6df7\u5408\u7b80\u77ed\u81ea\u7136\u8bed\u8a00\uff0c\u4f46\u4e0d\u8981\u51fa\u73b0\u4efb\u4f55\u6807\u9898\u6216\u6ce8\u91ca\u6587\u5b57\u3002',
    rolePrompt: '',
    defaultCodeFence: false,
    temperature: 0.4,
    maxTokens: 700,
    enableFallbackModel: false,
    fallbackProviderPreset: 'xai-responses',
    fallbackProtocol: 'responses',
    fallbackEndpoint: 'https://api.x.ai/v1/responses',
    fallbackModel: 'grok-4-fast-reasoning',
    fallbackApiKey: '',
    themePreset: 'sunrise',
    sendImageAsDataUrl: true,
    showFloatingBall: true,
  };



  const PROTOCOL_OPTIONS = [
    { id: 'openai-chat', label: 'OpenAI Chat Completions' },
    { id: 'responses', label: 'Responses API' },
    { id: 'anthropic-messages', label: 'Anthropic Messages API' },
  ];

  const PROVIDER_PRESETS = [
    { id: 'openai', label: 'OpenAI', protocol: 'openai-chat', endpoint: 'https://api.openai.com/v1/chat/completions', defaultModel: 'gpt-4.1-mini' },
    { id: 'openrouter', label: 'OpenRouter', protocol: 'openai-chat', endpoint: 'https://openrouter.ai/api/v1/chat/completions', defaultModel: 'openai/gpt-4.1-mini' },
    { id: 'xai-chat', label: 'xAI (Chat Completions)', protocol: 'openai-chat', endpoint: 'https://api.x.ai/v1/chat/completions', defaultModel: 'grok-4' },
    { id: 'xai-responses', label: 'xAI (Responses API)', protocol: 'responses', endpoint: 'https://api.x.ai/v1/responses', defaultModel: 'grok-4-fast-reasoning' },
    { id: 'gemini-openai', label: 'Google Gemini (OpenAI\u517c\u5bb9)', protocol: 'openai-chat', endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', defaultModel: 'gemini-2.5-flash' },
    { id: 'deepseek', label: 'DeepSeek', protocol: 'openai-chat', endpoint: 'https://api.deepseek.com/chat/completions', defaultModel: 'deepseek-chat' },
    { id: 'anthropic', label: 'Anthropic', protocol: 'anthropic-messages', endpoint: 'https://api.anthropic.com/v1/messages', defaultModel: 'claude-sonnet-4-20250514' },
    { id: 'custom', label: '\u81ea\u5b9a\u4e49', protocol: 'openai-chat', endpoint: '', defaultModel: '' },
  ];
  const THEME_PRESETS = [
    { id: 'sunrise', label: '\u65e5\u7167\u5976\u6cb9' },
    { id: 'porcelain', label: '\u74f7\u84dd\u96fe\u767d' },
    { id: 'matcha', label: '\u62b9\u8336\u7ec7\u7eaf' },
    { id: 'rose', label: '\u8517\u8587\u7ec6\u6c99' },
    { id: 'ember', label: '\u4f59\u70ec\u66ae\u68d5' },
    { id: 'midnight', label: '\u6df1\u6d77\u591c\u84dd' },
    { id: 'moss', label: '\u9752\u82d4\u5e7d\u591c' },
  ];
  const LEGACY_DEFAULT_PROMPTS = {
    systemPrompt: [
      '\u4f60\u662f\u56fe\u50cf\u53cd\u63a8\u52a9\u624b\u3002\u8bf7\u5206\u6790\u56fe\u7247\u5e76\u7ed9\u51fa\u9ad8\u8d28\u91cf\u6807\u7b7e\uff0c\u4ee5\u53ca\u4e00\u6761\u53ef\u76f4\u63a5\u7528\u4e8e\u751f\u6210\u7684\u7cbe\u7b80\u63d0\u793a\u8bcd\u3002',
      '\u4f60\u662f NovelAI \u56fe\u50cf\u53cd\u63a8\u52a9\u624b\u3002\u4efb\u52a1\u662f\u5c06\u56fe\u50cf\u5185\u5bb9\u8f6c\u6362\u4e3a\u53ef\u76f4\u63a5\u7528\u4e8e NovelAI \u751f\u56fe\u7684 Danbooru \u98ce\u683c\u63d0\u793a\u8bcd\u3002\u8bf7\u4e25\u683c\u4f7f\u7528\u82f1\u6587 tag\uff0c\u5c3d\u91cf\u63a5\u8fd1 Danbooru \u5e38\u7528\u5199\u6cd5\uff0c\u591a\u8bcd tag \u4f7f\u7528\u4e0b\u5212\u7ebf\uff0c\u5404 tag \u4e4b\u95f4\u7528\u82f1\u6587\u9017\u53f7+\u7a7a\u683c\u5206\u9694\u3002\u4e0d\u8981\u5199\u89e3\u91ca\uff0c\u4e0d\u8981\u5199\u81ea\u7136\u8bed\u8a00\u6bb5\u843d\uff0c\u4e0d\u8981\u8f93\u51fa JSON \u6216 Markdown \u6807\u9898\u3002\u82e5\u65e0\u6cd5\u786e\u8ba4\u7684\u7ec6\u8282\uff0c\u5b81\u53ef\u7701\u7565\u4e5f\u4e0d\u8981\u81c6\u9020\u3002',
    ],
    reversePrompt: [
      '\u8bf7\u53cd\u63a8\u8fd9\u5f20\u56fe\uff0c\u8f93\u51fa\uff1a1) \u5173\u952e\u6807\u7b7e 2) \u4e00\u6761\u53ef\u76f4\u63a5\u4f7f\u7528\u7684\u6700\u7ec8\u63d0\u793a\u8bcd\u3002',
      '\u8bf7\u5206\u6790\u8fd9\u5f20\u56fe\uff0c\u5e76\u4e25\u683c\u6309\u7167\u4ee5\u4e0b\u683c\u5f0f\u8f93\u51fa\uff1a\\nTAGS: <\u4e00\u884c\u82f1\u6587 Danbooru tags\uff0c\u9017\u53f7\u5206\u9694\uff0c\u53ef\u5305\u542b 1girl/1boy\uff0chair\uff0ceyes\uff0cclothes\uff0cpose\uff0ccomposition\uff0cbackground\uff0cstyle\uff0cquality \u7b49\u6807\u7b7e>\\nPROMPT: <\u4e00\u884c\u53ef\u76f4\u63a5\u7528\u4e8e NovelAI \u7684\u6700\u7ec8 prompt\uff0c\u4ecd\u7136\u5168\u90e8\u4f7f\u7528\u82f1\u6587 Danbooru tags\uff0c\u6309\u4e3b\u4f53 -> \u5916\u89c2 -> \u670d\u88c5 -> \u52a8\u4f5c -> \u955c\u5934/\u6784\u56fe -> \u573a\u666f -> \u753b\u98ce/\u753b\u8d28 \u6392\u5e8f>\\n\u8981\u6c42\uff1a\u4f18\u5148\u4f7f\u7528 NovelAI \u5e38\u7528\u6807\u7b7e\uff0c\u907f\u514d\u5197\u4f59\u91cd\u590d tag\uff0c\u4e0d\u8981\u8f93\u51fa negative prompt\uff0c\u4e0d\u8981\u9644\u52a0\u989d\u5916\u8bf4\u660e\u3002',
    ],
    roleSystemPrompt: [
      '\u4f60\u662f\u89d2\u8272\u66ff\u6362\u53cd\u63a8\u52a9\u624b\u3002\u8bf7\u57fa\u4e8e\u56fe\u50cf\u5185\u5bb9\u751f\u6210\u6807\u7b7e\u4e0e\u63d0\u793a\u8bcd\uff0c\u5e76\u5c06\u89d2\u8272\u66ff\u6362\u4e3a\u76ee\u6807\u89d2\u8272\u8bbe\u5b9a\u3002',
      '\u4f60\u662f NovelAI \u89d2\u8272\u66ff\u6362\u53cd\u63a8\u52a9\u624b\u3002\u4f60\u9700\u8981\u5148\u8bc6\u522b\u56fe\u50cf\u7684\u6784\u56fe\u3001\u59ff\u52bf\u3001\u670d\u88c5\u5c42\u7ea7\u3001\u955c\u5934\u3001\u573a\u666f\u3001\u6c1b\u56f4\u4e0e\u753b\u98ce\uff0c\u518d\u5c06\u4eba\u7269\u66ff\u6362\u4e3a\u76ee\u6807\u89d2\u8272\u3002\u8f93\u51fa\u5fc5\u987b\u662f\u53ef\u76f4\u63a5\u7528\u4e8e NovelAI \u7684\u82f1\u6587 Danbooru tags\uff0c\u4e0d\u8981\u89e3\u91ca\uff0c\u4e0d\u8981\u81ea\u7136\u8bed\u8a00\u6bb5\u843d\uff0c\u4e0d\u8981\u4fdd\u7559\u539f\u89d2\u8272\u7684\u8eab\u4efd\u540d\u79f0\u3002',
    ],
    roleReversePrompt: [
      '\u8bf7\u5148\u5206\u6790\u56fe\u50cf\uff0c\u7136\u540e\u8f93\u51fa\uff1a1) \u9ad8\u8d28\u91cf\u751f\u56fe\u6807\u7b7e 2) \u4e00\u6761\u5df2\u5b8c\u6210\u89d2\u8272\u66ff\u6362\u7684\u6700\u7ec8\u63d0\u793a\u8bcd\u3002',
      '\u8bf7\u5206\u6790\u8fd9\u5f20\u56fe\uff0c\u4fdd\u6301\u539f\u56fe\u7684 pose\u3001composition\u3001camera angle\u3001clothing structure\u3001scene\u3001lighting\u3001mood \u4e0e style\uff0c\u4f46\u5c06\u4eba\u7269\u66ff\u6362\u4e3a\u76ee\u6807\u89d2\u8272\u8bbe\u5b9a\u3002\u4e25\u683c\u6309\u7167\u4ee5\u4e0b\u683c\u5f0f\u8f93\u51fa\uff1a\\nTAGS: <\u4e00\u884c\u82f1\u6587 Danbooru tags\uff0c\u9017\u53f7\u5206\u9694\uff0c\u5df2\u5b8c\u6210\u89d2\u8272\u66ff\u6362>\\nPROMPT: <\u4e00\u884c\u53ef\u76f4\u63a5\u7528\u4e8e NovelAI \u7684\u6700\u7ec8 prompt\uff0c\u4ecd\u7136\u5168\u90e8\u4f7f\u7528\u82f1\u6587 Danbooru tags\uff0c\u4f18\u5148\u4fdd\u7559\u539f\u56fe\u7684\u89c6\u89c9\u8981\u7d20>\\n\u8981\u6c42\uff1a\u4e0d\u8981\u4fdd\u7559\u539f\u89d2\u8272\u59d3\u540d\uff0c\u4e0d\u8981\u8f93\u51fa\u89e3\u91ca\uff0c\u4e0d\u8981\u8f93\u51fa negative prompt\u3002',
    ],
  };
  const state = {
    settings: { ...DEFAULT_SETTINGS },
    history: [],
    selectedImage: null,
    lastResult: '',
    isOpen: false,
    isPickingImage: false,
    pending: false,
    hoveredImage: null,
    promptLibrary: [],
    activePage: 'reverse',
    extensionContextInvalidated: false,
    panelLayout: null,
    panelDrag: {
      active: false,
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
      width: 0,
      height: 0,
    },
    panelResize: {
      active: false,
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
      startWidth: 0,
      startHeight: 0,
    },
    panelInteraction: {
      rafId: 0,
      clientX: 0,
      clientY: 0,
    },
  };

  const ui = {
    root: null,
    fab: null,
    panel: null,
    header: null,
    resizeHandle: null,
    status: null,
    preview: null,
    previewHint: null,
    resultOutput: null,
    sendButton: null,
    historyList: null,
    navButtons: [],
    pages: {},
    settings: {},
  };


  function upgradePromptSettings(settings) {
    const next = { ...settings };

    if (!next.systemPrompt || LEGACY_DEFAULT_PROMPTS.systemPrompt.includes(next.systemPrompt)) {
      next.systemPrompt = DEFAULT_SETTINGS.systemPrompt;
    }

    if (!next.reversePrompt || LEGACY_DEFAULT_PROMPTS.reversePrompt.includes(next.reversePrompt)) {
      next.reversePrompt = DEFAULT_SETTINGS.reversePrompt;
    }

    if (!next.roleSystemPrompt || LEGACY_DEFAULT_PROMPTS.roleSystemPrompt.includes(next.roleSystemPrompt)) {
      next.roleSystemPrompt = DEFAULT_SETTINGS.roleSystemPrompt;
    }

    if (!next.roleReversePrompt || LEGACY_DEFAULT_PROMPTS.roleReversePrompt.includes(next.roleReversePrompt)) {
      next.roleReversePrompt = DEFAULT_SETTINGS.roleReversePrompt;
    }

    return next;
  }

  function normalizePromptLibraryEntry(entry) {
    const alias = String(entry?.alias || '').trim().toLowerCase();
    const tags = Array.isArray(entry?.tags) ? entry.tags.map((tag) => String(tag || '').trim()).filter(Boolean) : [];
    if (!alias || !tags.length) return null;
    const [rawCategory, ...rest] = alias.split(':');
    const category = String(entry?.category || rawCategory || '').trim().toLowerCase();
    const name = String(entry?.name || rest.join(':') || '').trim().toLowerCase();
    const delimiters = Array.isArray(entry?.delimiters)
      ? entry.delimiters.map((delimiter) => String(delimiter || ''))
      : tags.map((_, index) => index === tags.length - 1 ? '' : ', ');

    while (delimiters.length < tags.length) {
      delimiters.push(tags.length === delimiters.length + 1 ? '' : ', ');
    }

    return {
      id: String(entry.id || alias),
      alias,
      shortAlias: name || (alias.includes(':') ? alias.split(':').slice(1).join(':') : alias),
      category: category || 'char',
      name: name || (alias.includes(':') ? alias.split(':').slice(1).join(':') : alias),
      tags,
      delimiters: delimiters.slice(0, tags.length),
    };
  }
  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isContextInvalidatedError(error) {
    const message = error instanceof Error ? error.message : String(error || '');
    return message.includes('Extension context invalidated');
  }

  function markContextInvalidated(error) {
    if (!isContextInvalidatedError(error)) return false;
    state.extensionContextInvalidated = true;
    stopPickMode();
    setPending(false);
    setStatus(T.statusContextInvalidated, true);
    return true;
  }

  function ensureExtensionContext() {
    if (state.extensionContextInvalidated) {
      setStatus(T.statusContextInvalidated, true);
      return false;
    }
    return true;
  }

  function storageGet(keys) {
    return new Promise((resolve) => {
      if (!ensureExtensionContext()) {
        resolve({});
        return;
      }

      try {
        chrome.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError && markContextInvalidated(chrome.runtime.lastError)) {
            resolve({});
            return;
          }
          resolve(result || {});
        });
      } catch (error) {
        if (markContextInvalidated(error)) {
          resolve({});
          return;
        }
        throw error;
      }
    });
  }

  function storageSet(data) {
    return new Promise((resolve, reject) => {
      if (!ensureExtensionContext()) {
        resolve(false);
        return;
      }

      try {
        chrome.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            if (markContextInvalidated(chrome.runtime.lastError)) {
              resolve(false);
              return;
            }
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(true);
        });
      } catch (error) {
        if (markContextInvalidated(error)) {
          resolve(false);
          return;
        }
        reject(error);
      }
    });
  }

  function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
      if (!ensureExtensionContext()) {
        reject(new Error(T.statusContextInvalidated));
        return;
      }

      try {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            if (markContextInvalidated(chrome.runtime.lastError)) {
              reject(new Error(T.statusContextInvalidated));
              return;
            }
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      } catch (error) {
        if (markContextInvalidated(error)) {
          reject(new Error(T.statusContextInvalidated));
          return;
        }
        reject(error);
      }
    });
  }

  function setStatus(text, isError) {
    if (!ui.status) return;
    ui.status.textContent = text || '';
    ui.status.classList.toggle('is-error', Boolean(isError));
  }

  function fallbackCopyText(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'readonly');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }

  async function copyText(text) {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      try {
        return fallbackCopyText(text);
      } catch (fallbackError) {
        return false;
      }
    }
  }

  function setPending(isPending, label) {
    state.pending = isPending;
    if (!ui.sendButton) return;
    ui.sendButton.disabled = isPending;
    ui.sendButton.textContent = isPending ? (label || '\u53cd\u63a8\u4e2d...') : T.reverseCopy;
  }

  function setResult(text) {
    state.lastResult = text || '';
    if (ui.resultOutput) {
      ui.resultOutput.value = state.lastResult;
      autoResizeTextarea(ui.resultOutput);
    }
  }


  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeStoredPanelLayout(layout) {
    if (!layout || typeof layout !== 'object') return null;

    const left = Number(layout.left);
    const top = Number(layout.top);
    const width = Number(layout.width);
    const height = Number(layout.height);

    if (![left, top, width, height].every(Number.isFinite)) return null;
    if (width < PANEL_MIN_WIDTH || height < PANEL_MIN_HEIGHT) return null;

    return {
      left: Math.round(left),
      top: Math.round(top),
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  function normalizePanelRect() {
    if (!ui.panel) return null;
    const rect = ui.panel.getBoundingClientRect();
    ui.panel.style.left = `${Math.round(rect.left)}px`;
    ui.panel.style.top = `${Math.round(rect.top)}px`;
    ui.panel.style.right = 'auto';
    ui.panel.style.bottom = 'auto';
    ui.panel.style.width = `${Math.round(rect.width)}px`;
    ui.panel.style.height = `${Math.round(rect.height)}px`;
    return rect;
  }

  function getPanelLayout() {
    if (!ui.panel || ui.panel.classList.contains('nai-hidden')) return state.panelLayout;
    const rect = normalizePanelRect();
    if (!rect) return null;

    return {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  }

  function applyPanelLayout(layout) {
    const normalized = normalizeStoredPanelLayout(layout);
    if (!ui.panel || !normalized) return;

    ui.panel.style.left = `${normalized.left}px`;
    ui.panel.style.top = `${normalized.top}px`;
    ui.panel.style.right = 'auto';
    ui.panel.style.bottom = 'auto';
    ui.panel.style.width = `${normalized.width}px`;
    ui.panel.style.height = `${normalized.height}px`;
  }

  function persistPanelLayout() {
    const layout = getPanelLayout();
    if (!layout) return;
    state.panelLayout = layout;
    void storageSet({ [PANEL_LAYOUT_KEY]: layout });
  }

  function clampPanelPosition(left, top, width, height) {
    const maxLeft = Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
    const maxTop = Math.max(PANEL_MARGIN, window.innerHeight - height - PANEL_MARGIN);
    return {
      left: clamp(left, PANEL_MARGIN, maxLeft),
      top: clamp(top, PANEL_MARGIN, maxTop),
    };
  }

  function setPanelInteractionState(isActive) {
    if (!ui.panel) return;
    ui.panel.classList.toggle('nai-is-interacting', Boolean(isActive));
    ui.root?.classList.toggle('nai-panel-interacting', Boolean(isActive));
    document.documentElement.classList.toggle('nai-panel-interacting', Boolean(isActive));
  }

  function applyPanelPointerUpdate(clientX, clientY) {
    if (!ui.panel) return;

    if (state.panelDrag.active) {
      const left = state.panelDrag.startLeft + (clientX - state.panelDrag.startX);
      const top = state.panelDrag.startTop + (clientY - state.panelDrag.startY);
      const pos = clampPanelPosition(left, top, state.panelDrag.width, state.panelDrag.height);
      ui.panel.style.left = `${Math.round(pos.left)}px`;
      ui.panel.style.top = `${Math.round(pos.top)}px`;
      return;
    }

    if (state.panelResize.active) {
      const maxWidth = Math.max(PANEL_MIN_WIDTH, window.innerWidth - state.panelResize.startLeft - PANEL_MARGIN);
      const maxHeight = Math.max(PANEL_MIN_HEIGHT, window.innerHeight - state.panelResize.startTop - PANEL_MARGIN);
      const width = clamp(state.panelResize.startWidth + (clientX - state.panelResize.startX), PANEL_MIN_WIDTH, maxWidth);
      const height = clamp(state.panelResize.startHeight + (clientY - state.panelResize.startY), PANEL_MIN_HEIGHT, maxHeight);
      ui.panel.style.width = `${Math.round(width)}px`;
      ui.panel.style.height = `${Math.round(height)}px`;
    }
  }

  function flushPanelPointerUpdate() {
    state.panelInteraction.rafId = 0;
    applyPanelPointerUpdate(state.panelInteraction.clientX, state.panelInteraction.clientY);
  }

  function keepPanelInsideViewport() {
    if (!ui.panel || ui.panel.classList.contains('nai-hidden')) return;
    const rect = normalizePanelRect();
    if (!rect) return;

    const maxWidth = Math.max(PANEL_MIN_WIDTH, window.innerWidth - PANEL_MARGIN * 2);
    const maxHeight = Math.max(PANEL_MIN_HEIGHT, window.innerHeight - PANEL_MARGIN * 2);
    const width = clamp(rect.width, PANEL_MIN_WIDTH, maxWidth);
    const height = clamp(rect.height, PANEL_MIN_HEIGHT, maxHeight);
    const pos = clampPanelPosition(rect.left, rect.top, width, height);

    ui.panel.style.left = `${Math.round(pos.left)}px`;
    ui.panel.style.top = `${Math.round(pos.top)}px`;
    ui.panel.style.width = `${Math.round(width)}px`;
    ui.panel.style.height = `${Math.round(height)}px`;
    state.panelLayout = {
      left: Math.round(pos.left),
      top: Math.round(pos.top),
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  function onPointerMove(event) {
    if (!ui.panel) return;
    state.panelInteraction.clientX = event.clientX;
    state.panelInteraction.clientY = event.clientY;
    if (!state.panelInteraction.rafId) {
      state.panelInteraction.rafId = requestAnimationFrame(flushPanelPointerUpdate);
    }
  }

  function onPointerUp() {
    const hadLayoutInteraction = state.panelDrag.active || state.panelResize.active;
    if (state.panelInteraction.rafId) {
      cancelAnimationFrame(state.panelInteraction.rafId);
      state.panelInteraction.rafId = 0;
      applyPanelPointerUpdate(state.panelInteraction.clientX, state.panelInteraction.clientY);
    }
    state.panelDrag.active = false;
    state.panelResize.active = false;
    setPanelInteractionState(false);
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('pointercancel', onPointerUp, true);
    if (hadLayoutInteraction) {
      persistPanelLayout();
    }
  }

  function startDrag(event) {
    if (!ui.panel) return;
    const rect = ui.panel.getBoundingClientRect();
    if (!rect) return;

    ui.panel.style.left = `${Math.round(rect.left)}px`;
    ui.panel.style.top = `${Math.round(rect.top)}px`;
    ui.panel.style.right = 'auto';
    ui.panel.style.bottom = 'auto';

    state.panelDrag.active = true;
    state.panelDrag.startX = event.clientX;
    state.panelDrag.startY = event.clientY;
    state.panelDrag.startLeft = rect.left;
    state.panelDrag.startTop = rect.top;
    state.panelDrag.width = rect.width;
    state.panelDrag.height = rect.height;

    state.panelResize.active = false;
    state.panelInteraction.clientX = event.clientX;
    state.panelInteraction.clientY = event.clientY;
    setPanelInteractionState(true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', onPointerUp, true);
  }

  function startResize(event) {
    if (!ui.panel) return;
    const rect = normalizePanelRect();
    if (!rect) return;

    state.panelResize.active = true;
    state.panelResize.startX = event.clientX;
    state.panelResize.startY = event.clientY;
    state.panelResize.startLeft = rect.left;
    state.panelResize.startTop = rect.top;
    state.panelResize.startWidth = rect.width;
    state.panelResize.startHeight = rect.height;

    state.panelDrag.active = false;
    state.panelInteraction.clientX = event.clientX;
    state.panelInteraction.clientY = event.clientY;
    setPanelInteractionState(true);
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', onPointerUp, true);
  }

  function bindPanelInteractions() {
    if (!ui.header || !ui.resizeHandle) return;

    ui.header.addEventListener('pointerdown', (event) => {
      if (!(event.target instanceof HTMLElement)) return;
      if (event.target.closest('[data-action="close"]')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      startDrag(event);
    });

    ui.resizeHandle.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      startResize(event);
    });

    window.addEventListener('resize', () => {
      keepPanelInsideViewport();
      persistPanelLayout();
    });
  }

  function updateFabVisibility() {
    if (!ui.fab) return;
    ui.fab.classList.toggle('nai-hidden', !state.settings.showFloatingBall);
  }

  function updatePreview() {
    if (!ui.preview || !ui.previewHint) return;
    if (!state.selectedImage) {
      ui.preview.classList.add('nai-hidden');
      ui.preview.src = '';
      ui.previewHint.textContent = T.previewEmpty;
      return;
    }

    ui.preview.classList.remove('nai-hidden');
    ui.preview.src = state.selectedImage.dataUrl;
    ui.previewHint.textContent = state.selectedImage.sourceUrl;
  }

  function getBackgroundImageUrl(element) {
    if (!(element instanceof HTMLElement)) return '';

    const backgroundImage = window.getComputedStyle(element).backgroundImage || '';
    const match = backgroundImage.match(/url\((['"]?)(.*?)\1\)/i);
    if (!match?.[2]) return '';

    try {
      return new URL(match[2], window.location.href).href;
    } catch (error) {
      return match[2];
    }
  }

  function isImageCandidate(element) {
    return (
      element instanceof HTMLImageElement ||
      element instanceof HTMLCanvasElement ||
      (element instanceof HTMLElement && Boolean(getBackgroundImageUrl(element)))
    );
  }

  function findImageCandidate(event) {
    const candidates = [];

    const pushCandidate = (element) => {
      if (!(element instanceof Element)) return;
      if (ui.root?.contains(element)) return;
      if (!candidates.includes(element)) candidates.push(element);
    };

    if (state.hoveredImage) {
      pushCandidate(state.hoveredImage);
    }

    if (event.target instanceof Element) {
      pushCandidate(event.target);
      pushCandidate(event.target.closest('img, canvas'));
    }

    if (typeof event.composedPath === 'function') {
      event.composedPath().forEach((node) => {
        if (!(node instanceof Element)) return;
        pushCandidate(node);
        pushCandidate(node.closest('img, canvas'));
      });
    }

    if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
      document.elementsFromPoint(event.clientX, event.clientY).forEach((element) => {
        pushCandidate(element);
        pushCandidate(element.closest('img, canvas'));
      });
    }

    return candidates.find(isImageCandidate) || null;
  }

  function tryElementToDataUrl(element) {
    try {
      if (element instanceof HTMLCanvasElement) {
        return element.toDataURL('image/png');
      }

      if (element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0 && element.naturalHeight > 0) {
        const canvas = document.createElement('canvas');
        canvas.width = element.naturalWidth;
        canvas.height = element.naturalHeight;
        const context = canvas.getContext('2d');
        if (!context) return '';
        context.drawImage(element, 0, 0);
        return canvas.toDataURL('image/png');
      }
    } catch (error) {
      return '';
    }

    return '';
  }

  function resolveImageSource(element) {
    if (element instanceof HTMLImageElement) {
      const sourceUrl = element.currentSrc || element.src || '';
      const dataUrl = sourceUrl.startsWith('data:') ? sourceUrl : tryElementToDataUrl(element);
      return { sourceUrl, dataUrl };
    }

    if (element instanceof HTMLCanvasElement) {
      return {
        sourceUrl: window.location.href,
        dataUrl: tryElementToDataUrl(element),
      };
    }

    if (element instanceof HTMLElement) {
      return {
        sourceUrl: getBackgroundImageUrl(element),
        dataUrl: '',
      };
    }

    return { sourceUrl: '', dataUrl: '' };
  }

  function setPage(page) {
    state.activePage = page;
    if (ui.root) {
      ui.root.dataset.page = page;
    }
    ui.navButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });
    Object.entries(ui.pages).forEach(([name, el]) => {
      el.classList.toggle('nai-hidden', name !== page);
    });
    requestAnimationFrame(() => autoResizeAllTextareas());
  }

  function openPanel(page) {
    state.isOpen = true;
    if (state.panelLayout) {
      applyPanelLayout(state.panelLayout);
    }
    ui.panel.classList.remove('nai-hidden');
    setPage(page || state.activePage || 'reverse');
    keepPanelInsideViewport();
  }

  function closePanel() {
    persistPanelLayout();
    state.isOpen = false;
    ui.panel.classList.add('nai-hidden');
    onPointerUp();
    stopPickMode();
  }

  function buildMessages(userPrompt, systemPrompt) {
    const messages = [];

    if (systemPrompt?.trim()) {
      messages.push({ role: 'system', content: systemPrompt.trim() });
    }

    const content = [{ type: 'text', text: userPrompt }];
    const imagePayload = state.settings.sendImageAsDataUrl
      ? state.selectedImage?.dataUrl || state.selectedImage?.sourceUrl
      : state.selectedImage?.sourceUrl || state.selectedImage?.dataUrl;
    if (imagePayload) {
      content.push({ type: 'image_url', image_url: { url: imagePayload } });
    }

    messages.push({ role: 'user', content });
    return messages;
  }

  function getProviderPresetById(id) {
    return PROVIDER_PRESETS.find((item) => item.id === id) || PROVIDER_PRESETS[0];
  }

  function fillSelectOptions(select, options) {
    if (!select) return;
    select.innerHTML = options
      .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`)
      .join('');
  }

  function renderPromptLibraryOptions() {
    const select = ui.settings.roleLibrarySelect;
    if (!select) return;
    const roleLibraryEntries = state.promptLibrary.filter((entry) => entry.category === ROLE_LIBRARY_CATEGORY);

    const libraryOptions = [
      { value: '', label: T.roleLibraryPlaceholder },
      ...roleLibraryEntries
        .map((entry) => ({
          value: entry.id,
          label: entry.alias,
        })),
    ];

    select.innerHTML = libraryOptions
      .map((item) => `<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`)
      .join('');

    if (!roleLibraryEntries.some((entry) => entry.id === select.value)) {
      select.value = '';
    }
  }

  function applyPromptLibraryToRolePrompt() {
    const select = ui.settings.roleLibrarySelect;
    const rolePrompt = ui.settings.rolePrompt;
    if (!select || !rolePrompt) return;

    const entry = state.promptLibrary.find((item) => item.id === select.value && item.category === ROLE_LIBRARY_CATEGORY);
    if (!entry) {
      setStatus(T.statusRoleLibraryMissing, true);
      return;
    }

    rolePrompt.value = entry.tags
      .map((tag, index) => `${tag}${entry.delimiters?.[index] || ''}`)
      .join('');
    autoResizeTextarea(rolePrompt);
    setStatus(T.statusRoleLibraryApplied, false);
  }

  function updateFallbackSettingsVisibility() {
    if (!ui.settings.fallbackSection) return;
    ui.settings.fallbackSection.classList.toggle('nai-hidden', !ui.settings.enableFallbackModel.checked);
  }

  function applyThemePreset() {
    if (!ui.root) return;
    ui.root.dataset.theme = state.settings.themePreset || DEFAULT_SETTINGS.themePreset;
  }

  function autoResizeTextarea(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    const maxHeight = textarea.classList.contains('nai-md3-result') ? 420 : 440;
    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${Math.max(nextHeight, 72)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }

  function autoResizeAllTextareas() {
    if (!ui.root) return;
    ui.root.querySelectorAll('textarea').forEach((textarea) => autoResizeTextarea(textarea));
  }

  function bindTextareaAutosize() {
    if (!ui.root) return;
    ui.root.querySelectorAll('textarea').forEach((textarea) => {
      textarea.addEventListener('input', () => autoResizeTextarea(textarea));
      autoResizeTextarea(textarea);
    });
  }

  function syncProviderFields(kind, forceModel) {
    const isFallback = kind === 'fallback';
    const presetField = isFallback ? ui.settings.fallbackProviderPreset : ui.settings.providerPreset;
    const protocolField = isFallback ? ui.settings.fallbackProtocol : ui.settings.protocol;
    const endpointField = isFallback ? ui.settings.fallbackEndpoint : ui.settings.endpoint;
    const modelField = isFallback ? ui.settings.fallbackModel : ui.settings.model;
    const preset = getProviderPresetById(presetField.value);

    if (preset.protocol) {
      protocolField.value = preset.protocol;
    }

    if (preset.endpoint || preset.id === 'custom') {
      endpointField.value = preset.endpoint;
    }

    if (forceModel || !modelField.value.trim() || preset.id !== 'custom') {
      modelField.value = preset.defaultModel || modelField.value;
    }
  }

  function buildRequestConfig(target, messages) {
    const preset = getProviderPresetById(target.providerPreset);
    return {
      providerId: target.providerPreset,
      label: preset?.label || '\u81ea\u5b9a\u4e49',
      protocol: target.protocol,
      endpoint: target.endpoint.trim(),
      apiKey: target.apiKey.trim(),
      model: target.model.trim(),
      temperature: Number(state.settings.temperature) || DEFAULT_SETTINGS.temperature,
      maxTokens: Number(state.settings.maxTokens) || DEFAULT_SETTINGS.maxTokens,
      messages,
    };
  }

  function hasCompleteModelConfig(config) {
    return Boolean(config?.endpoint && config?.model && config?.apiKey);
  }

  function buildPrimaryConfig(messages) {
    return buildRequestConfig({
      providerPreset: state.settings.providerPreset,
      protocol: state.settings.protocol,
      endpoint: state.settings.endpoint,
      apiKey: state.settings.apiKey,
      model: state.settings.model,
    }, messages);
  }

  function buildFallbackConfig(messages, primaryApiKey) {
    if (!state.settings.enableFallbackModel) return null;
    const fallbackKey = (state.settings.fallbackApiKey || '').trim() || primaryApiKey || '';
    return buildRequestConfig({
      providerPreset: state.settings.fallbackProviderPreset,
      protocol: state.settings.fallbackProtocol,
      endpoint: state.settings.fallbackEndpoint,
      apiKey: fallbackKey,
      model: state.settings.fallbackModel,
    }, messages);
  }

  function buildTestMessages() {
    return [
      { role: 'system', content: 'You are a connection test assistant. Reply with OK only.' },
      { role: 'user', content: [{ type: 'text', text: 'Reply with OK only.' }] },
    ];
  }

  async function runConnectionCheck(config) {
    const response = await sendRuntimeMessage({
      type: 'nai-llm-chat',
      payload: { primary: config },
    });

    if (!response?.ok) {
      throw new Error(response?.error || '\u8fde\u63a5\u6d4b\u8bd5\u5931\u8d25');
    }

    return response;
  }

  async function testConnection() {
    if (state.pending) return;

    const testMessages = buildTestMessages();
    const primaryConfig = buildPrimaryConfig(testMessages);
    if (!hasCompleteModelConfig(primaryConfig)) {
      setStatus('\u8bf7\u5148\u5b8c\u6574\u914d\u7f6e\u4e3b\u6a21\u578b\u7684\u670d\u52a1\u5546\u3001Endpoint\u3001Model \u548c API Key\u3002', true);
      openPanel('settings');
      return;
    }

    const fallbackConfig = buildFallbackConfig(testMessages, primaryConfig.apiKey);
    if (state.settings.enableFallbackModel && !hasCompleteModelConfig(fallbackConfig)) {
      setStatus(T.statusNeedFallbackConfig, true);
      openPanel('settings');
      return;
    }

    const checks = [{ name: '\u4e3b\u6a21\u578b', config: primaryConfig }];
    if (state.settings.enableFallbackModel && fallbackConfig) {
      checks.push({ name: '\u5907\u7528\u6a21\u578b', config: fallbackConfig });
    }

    setPending(true, '\u6d4b\u8bd5\u4e2d...');
    setStatus(T.statusTestingConnection, false);

    const passed = [];
    const failed = [];

    try {
      for (const check of checks) {
        try {
          await runConnectionCheck(check.config);
          passed.push(`${check.name}\uFF08${check.config.model}\uFF09`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failed.push(`${check.name}\uFF08${check.config.model}\uFF09\uFF1A${message}`);
        }
      }

      if (failed.length) {
        throw new Error(failed.join('\uFF1B'));

      }

      setStatus(`\u8fde\u63a5\u6d4b\u8bd5\u901a\u8fc7\uff1a${passed.join('\u3001')}\u3002`, false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), true);
    } finally {
      setPending(false);
    }
  }

  function getModelListConfig(kind) {
    const isFallback = kind === 'fallback';
    return {
      providerId: isFallback ? ui.settings.fallbackProviderPreset.value : ui.settings.providerPreset.value,
      protocol: isFallback ? ui.settings.fallbackProtocol.value : ui.settings.protocol.value,
      endpoint: (isFallback ? ui.settings.fallbackEndpoint.value : ui.settings.endpoint.value).trim(),
      apiKey: ((isFallback ? ui.settings.fallbackApiKey.value : ui.settings.apiKey.value) || ui.settings.apiKey.value).trim(),
    };
  }

  function populateModelSuggestions(kind, models) {
    const isFallback = kind === 'fallback';
    const list = isFallback ? ui.settings.fallbackModelList : ui.settings.modelList;
    const input = isFallback ? ui.settings.fallbackModel : ui.settings.model;
    if (!list || !input) return;
    list.innerHTML = models
      .map((model) => `<option value="${escapeHtml(model)}"></option>`)
      .join('');
    if (!input.value.trim() && models[0]) {
      input.value = models[0];
    }
  }

  async function fetchModelsFor(kind) {
    const config = getModelListConfig(kind);
    if (!config.endpoint || !config.apiKey) {
      setStatus('\\u8bf7\\u5148\\u586b\\u5199\\u5bf9\\u5e94\\u7684 Endpoint \\u548c API Key\\uff0c\\u518d\\u83b7\\u53d6\\u6a21\\u578b\\u5217\\u8868\\u3002', true);
      return;
    }

    setStatus('\\u6b63\\u5728\\u83b7\\u53d6\\u6a21\\u578b\\u5217\\u8868...', false);
    try {
      const response = await sendRuntimeMessage({
        type: 'nai-list-models',
        payload: config,
      });

      if (!response?.ok) {
        throw new Error(response?.error || '\\u83b7\\u53d6\\u6a21\\u578b\\u5217\\u8868\\u5931\\u8d25');
      }

      const models = Array.isArray(response.models) ? response.models : [];
      populateModelSuggestions(kind, models);
      setStatus(
        models.length
          ? `\u5df2\u52a0\u8f7d ${models.length} \u4e2a\u6a21\u578b\u5019\u9009${kind === 'fallback' ? '\uff08\u5907\u7528\uff09' : ''}\u3002`
          : `\u8be5\u670d\u52a1\u672a\u8fd4\u56de\u53ef\u7528\u6a21\u578b${kind === 'fallback' ? '\uff08\u5907\u7528\uff09' : ''}\u3002`,
        !models.length
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), true);
    }
  }
  function getPromptConfig() {
    if (state.settings.enableRoleReplaceMode) {
      const roleReversePrompt = state.settings.roleReversePrompt?.trim();
      const rolePrompt = state.settings.rolePrompt?.trim();
      const userPrompt = [
        roleReversePrompt,
        rolePrompt ? `\u76ee\u6807\u89d2\u8272\u8bbe\u5b9a\uff1a${rolePrompt}` : '',
        '\u8981\u6c42\uff1a\u5728\u540c\u4e00\u6b21\u56de\u590d\u4e2d\u5b8c\u6210\u53cd\u63a8\u4e0e\u89d2\u8272\u66ff\u6362\uff0c\u76f4\u63a5\u8f93\u51fa\u6700\u7ec8\u53ef\u7528\u7684\u6807\u7b7e\u4e0e\u63d0\u793a\u8bcd\u3002',
      ].filter(Boolean).join('\n\n');

      return {
        systemPrompt: state.settings.roleSystemPrompt?.trim() || state.settings.systemPrompt?.trim(),
        userPrompt,
      };
    }

    return {
      systemPrompt: state.settings.systemPrompt?.trim(),
      userPrompt: state.settings.reversePrompt?.trim(),
    };
  }

  function isCodeFenceWrapped(text) {
    const trimmed = String(text || '').trim();
    return /^```[\s\S]*```$/.test(trimmed);
  }

  function wrapWithCodeFence(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return '';
    if (isCodeFenceWrapped(trimmed)) return trimmed;
    return '```\n' + trimmed + '\n```';
  }

  function formatResultBySettings(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return '';
    return state.settings.defaultCodeFence ? wrapWithCodeFence(trimmed) : trimmed;
  }

  async function wrapCurrentResult() {
    const current = String(state.lastResult || '').trim();
    if (!current) {
      setStatus(T.statusNoResult, true);
      return;
    }

    const wrapped = wrapWithCodeFence(current);
    setResult(wrapped);
    const copied = await copyText(wrapped);
    setStatus(copied ? T.statusWrapped : T.statusCopyFailed, !copied);
  }

  function formatTime(time) {
    try {
      return new Date(time).toLocaleString('zh-CN', { hour12: false });
    } catch (error) {
      return String(time);
    }
  }

  function renderHistory() {
    if (!ui.historyList) return;

    if (!state.history.length) {
      ui.historyList.innerHTML = `<div class="nai-history-empty">${T.noHistory}</div>`;
      return;
    }

    ui.historyList.innerHTML = state.history.map((item) => {
      const source = escapeHtml(item.sourceUrl || '\u672a\u77e5\u6765\u6e90');
      const result = escapeHtml(item.result || '');
      const brief = result.length > 140 ? `${result.slice(0, 140)}...` : result;

      return `
        <article class="nai-history-item" data-id="${item.id}">
          <div class="nai-history-meta"><span>${formatTime(item.time)}</span></div>
          <div class="nai-history-source" title="${source}">${source}</div>
          <div class="nai-history-brief">${brief}</div>
          <div class="nai-history-actions">
            <button type="button" data-action="history-copy" data-id="${item.id}">${T.copy}</button>
            <button type="button" data-action="history-use" data-id="${item.id}">${T.load}</button>
          </div>
        </article>
      `;
    }).join('');
  }

  async function saveHistory() {
    await storageSet({ [HISTORY_KEY]: state.history.slice(0, MAX_HISTORY) });
  }

  async function pushHistory(record) {
    state.history.unshift(record);
    state.history = state.history.slice(0, MAX_HISTORY);
    renderHistory();
    await saveHistory();
  }

  async function reverseAndCopy() {
    if (state.pending) return;

    if (!state.selectedImage) {
      setStatus(T.statusNeedImage, true);
      return;
    }

    if (!state.settings.apiKey?.trim()) {
      setStatus(T.statusNeedKey, true);
      openPanel('settings');
      return;
    }

    const promptConfig = getPromptConfig();
    if (!promptConfig.userPrompt) {
      setStatus(T.statusNeedPrompt, true);
      openPanel('settings');
      return;
    }

    if (state.settings.enableRoleReplaceMode && !state.settings.rolePrompt?.trim()) {
      setStatus(T.statusNeedRolePrompt, true);
      openPanel('settings');
      return;
    }

    const messages = buildMessages(promptConfig.userPrompt, promptConfig.systemPrompt);
    const primaryConfig = buildPrimaryConfig(messages);

    if (!hasCompleteModelConfig(primaryConfig)) {
      setStatus('\u8bf7\u5148\u5b8c\u6574\u914d\u7f6e\u4e3b\u6a21\u578b\u7684\u670d\u52a1\u5546\u3001Endpoint\u3001Model \u548c API Key\u3002', true);
      openPanel('settings');
      return;
    }

    let fallbackConfig = null;
    if (state.settings.enableFallbackModel) {
      const candidate = buildFallbackConfig(messages, primaryConfig.apiKey);
      if (hasCompleteModelConfig(candidate)) {
        fallbackConfig = candidate;
      }
    }

    setPending(true, '\u53cd\u63a8\u4e2d...');
    setStatus(T.statusRunning, false);

    try {
      const response = await sendRuntimeMessage({
        type: 'nai-llm-chat',
        payload: {
          primary: primaryConfig,
          fallback: fallbackConfig,
        },
      });

      const usedFallback = Array.isArray(response?.attempts) && response.attempts.length > 0;

      if (!response?.ok) {
        throw new Error(response?.error || '\u53cd\u63a8\u5931\u8d25');
      }

      const modelResult = (response.text || '').trim() || '\u6a21\u578b\u6ca1\u6709\u8fd4\u56de\u6587\u672c\u7ed3\u679c\u3002';
      const resultText = formatResultBySettings(modelResult);
      setResult(resultText);

      await pushHistory({
        id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        time: Date.now(),
        sourceUrl: state.selectedImage.sourceUrl,
        result: resultText,
      });

      const copied = await copyText(resultText);
      if (usedFallback) {
        setStatus(copied ? T.statusDoneCopiedFallback : T.statusDoneNotCopiedFallback, !copied);
      } else {
        setStatus(copied ? T.statusDoneCopied : T.statusDoneNotCopied, !copied);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), true);
    } finally {
      setPending(false);
    }
  }


  function getVisibleCaptureRect(element) {
    if (!(element instanceof Element)) return null;
    const rect = element.getBoundingClientRect();
    const left = Math.max(0, rect.left);
    const top = Math.max(0, rect.top);
    const right = Math.min(window.innerWidth, rect.right);
    const bottom = Math.min(window.innerHeight, rect.bottom);
    const width = right - left;
    const height = bottom - top;

    if (width < 2 || height < 2) return null;

    return {
      left,
      top,
      width,
      height,
      devicePixelRatio: window.devicePixelRatio || 1,
    };
  }

  async function captureVisibleElement(element) {
    const rect = getVisibleCaptureRect(element);
    if (!rect) return '';

    try {
      const response = await sendRuntimeMessage({
        type: 'nai-capture-visible-area',
        rect,
      });
      return response?.ok ? response.dataUrl || '' : '';
    } catch (error) {
      return '';
    }
  }

  async function useImageElement(image, autoReverse) {
    const resolved = resolveImageSource(image);
    const sourceUrl = resolved.sourceUrl;
    if (!sourceUrl) {
      setStatus('\u76ee\u6807\u5143\u7d20\u6ca1\u6709\u53ef\u7528\u56fe\u7247\u5730\u5740\u3002', true);
      return;
    }

    setStatus('\u6b63\u5728\u8bfb\u53d6\u56fe\u7247...', false);

    try {
      if (resolved.dataUrl) {
        state.selectedImage = { sourceUrl, dataUrl: resolved.dataUrl };
        updatePreview();
        openPanel('reverse');
        setStatus(T.statusImageLocked, false);

        if (autoReverse) {
          await reverseAndCopy();
        }
        return;
      }

      const response = await sendRuntimeMessage({
        type: 'nai-fetch-image-dataurl',
        url: sourceUrl,
        referrer: window.location.href,
      });

      if (!response?.ok) {
        const capturedDataUrl = await captureVisibleElement(image);
        if (!capturedDataUrl) {
          throw new Error(response?.error || '\u56fe\u7247\u8bfb\u53d6\u5931\u8d25');
        }

        state.selectedImage = { sourceUrl, dataUrl: capturedDataUrl };
        updatePreview();
        openPanel('reverse');
        setStatus(T.statusImageLocked, false);

        if (autoReverse) {
          await reverseAndCopy();
        }
        return;
      }

      state.selectedImage = { sourceUrl, dataUrl: response.dataUrl };
      updatePreview();
      openPanel('reverse');
      setStatus(T.statusImageLocked, false);

      if (autoReverse) {
        await reverseAndCopy();
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), true);
    }
  }

  function stopPickMode() {
    state.isPickingImage = false;
    document.documentElement.classList.remove('nai-image-pick-mode');
    document.removeEventListener('mouseover', onPickHover, true);
    document.removeEventListener('mouseout', onPickOut, true);
    document.removeEventListener('click', onPickClick, true);
    document.removeEventListener('keydown', onPickKey, true);

    if (state.hoveredImage) {
      state.hoveredImage.classList.remove('nai-image-pick-hover');
      state.hoveredImage = null;
    }
  }

  function startPickMode() {
    if (!ensureExtensionContext() || state.isPickingImage) return;
    state.isPickingImage = true;

    document.documentElement.classList.add('nai-image-pick-mode');
    document.addEventListener('mouseover', onPickHover, true);
    document.addEventListener('mouseout', onPickOut, true);
    document.addEventListener('click', onPickClick, true);
    document.addEventListener('keydown', onPickKey, true);

    setStatus(T.statusSelectMode, false);
  }
  function onPickHover(event) {
    if (!state.isPickingImage) return;
    const image = findImageCandidate(event);
    if (!image) return;

    if (state.hoveredImage && state.hoveredImage !== image) {
      state.hoveredImage.classList.remove('nai-image-pick-hover');
    }

    state.hoveredImage = image;
    state.hoveredImage.classList.add('nai-image-pick-hover');
  }

  function onPickOut(event) {
    if (!state.isPickingImage || !state.hoveredImage) return;
    const relatedTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (relatedTarget && state.hoveredImage.contains(relatedTarget)) return;
    state.hoveredImage.classList.remove('nai-image-pick-hover');
    state.hoveredImage = null;
  }

  function onPickKey(event) {
    if (!state.isPickingImage || event.key !== 'Escape') return;
    event.preventDefault();
    stopPickMode();
    setStatus(T.statusSelectCanceled, false);
  }

  function onPickClick(event) {
    if (!state.isPickingImage) return;
    const image = findImageCandidate(event);
    event.preventDefault();
    event.stopPropagation();

    if (!image) {
      setStatus('\u8bf7\u70b9\u51fb\u56fe\u7247\u5143\u7d20\u3002', true);
      return;
    }

    stopPickMode();
    useImageElement(image, false);
  }

  async function onShortcutClick(event) {
    if (!ensureExtensionContext() || state.pending || state.isPickingImage) return;
    if (event.button !== 0 || !event.altKey || !event.shiftKey) return;

    const image = findImageCandidate(event);
    if (!image) return;

    event.preventDefault();
    event.stopPropagation();
    await useImageElement(image, true);
  }

  function applySettingsToInputs() {
    ui.settings.providerPreset.value = state.settings.providerPreset;
    ui.settings.protocol.value = state.settings.protocol;
    ui.settings.endpoint.value = state.settings.endpoint;
    ui.settings.model.value = state.settings.model;
    ui.settings.apiKey.value = state.settings.apiKey;
    ui.settings.systemPrompt.value = state.settings.systemPrompt;
    ui.settings.reversePrompt.value = state.settings.reversePrompt;
    ui.settings.enableRoleReplaceMode.checked = Boolean(state.settings.enableRoleReplaceMode);
    ui.settings.roleSystemPrompt.value = state.settings.roleSystemPrompt;
    ui.settings.roleReversePrompt.value = state.settings.roleReversePrompt;
    ui.settings.rolePrompt.value = state.settings.rolePrompt;
    ui.settings.temperature.value = String(state.settings.temperature);
    ui.settings.maxTokens.value = String(state.settings.maxTokens);
    ui.settings.enableFallbackModel.checked = Boolean(state.settings.enableFallbackModel);
    ui.settings.fallbackProviderPreset.value = state.settings.fallbackProviderPreset;
    ui.settings.fallbackProtocol.value = state.settings.fallbackProtocol;
    ui.settings.fallbackEndpoint.value = state.settings.fallbackEndpoint;
    ui.settings.fallbackModel.value = state.settings.fallbackModel;
    ui.settings.fallbackApiKey.value = state.settings.fallbackApiKey;
    ui.settings.themePreset.value = state.settings.themePreset || DEFAULT_SETTINGS.themePreset;
    ui.settings.sendImageAsDataUrl.checked = Boolean(state.settings.sendImageAsDataUrl);
    ui.settings.defaultCodeFence.checked = Boolean(state.settings.defaultCodeFence);
    ui.settings.showFloatingBall.checked = Boolean(state.settings.showFloatingBall);
    updateFallbackSettingsVisibility();
    requestAnimationFrame(() => autoResizeAllTextareas());
  }

  function readSettingsFromInputs() {
    return {
      providerPreset: ui.settings.providerPreset.value || DEFAULT_SETTINGS.providerPreset,
      protocol: ui.settings.protocol.value || DEFAULT_SETTINGS.protocol,
      endpoint: ui.settings.endpoint.value.trim() || DEFAULT_SETTINGS.endpoint,
      model: ui.settings.model.value.trim() || DEFAULT_SETTINGS.model,
      apiKey: ui.settings.apiKey.value.trim(),
      systemPrompt: ui.settings.systemPrompt.value.trim() || DEFAULT_SETTINGS.systemPrompt,
      reversePrompt: ui.settings.reversePrompt.value.trim() || DEFAULT_SETTINGS.reversePrompt,
      enableRoleReplaceMode: Boolean(ui.settings.enableRoleReplaceMode.checked),
      roleSystemPrompt: ui.settings.roleSystemPrompt.value.trim() || DEFAULT_SETTINGS.roleSystemPrompt,
      roleReversePrompt: ui.settings.roleReversePrompt.value.trim() || DEFAULT_SETTINGS.roleReversePrompt,
      rolePrompt: ui.settings.rolePrompt.value.trim(),
      defaultCodeFence: Boolean(ui.settings.defaultCodeFence.checked),
      temperature: Number(ui.settings.temperature.value) || DEFAULT_SETTINGS.temperature,
      maxTokens: Number(ui.settings.maxTokens.value) || DEFAULT_SETTINGS.maxTokens,
      enableFallbackModel: Boolean(ui.settings.enableFallbackModel.checked),
      fallbackProviderPreset: ui.settings.fallbackProviderPreset.value || DEFAULT_SETTINGS.fallbackProviderPreset,
      fallbackProtocol: ui.settings.fallbackProtocol.value || DEFAULT_SETTINGS.fallbackProtocol,
      fallbackEndpoint: ui.settings.fallbackEndpoint.value.trim() || '',
      fallbackModel: ui.settings.fallbackModel.value.trim() || '',
      fallbackApiKey: ui.settings.fallbackApiKey.value.trim(),
      themePreset: ui.settings.themePreset.value || DEFAULT_SETTINGS.themePreset,
      sendImageAsDataUrl: Boolean(ui.settings.sendImageAsDataUrl.checked),
      showFloatingBall: Boolean(ui.settings.showFloatingBall.checked),
    };
  }

  async function saveSettings() {
    if (!ensureExtensionContext()) return;
    state.settings = { ...DEFAULT_SETTINGS, ...readSettingsFromInputs() };
    const saved = await storageSet({ [SETTINGS_KEY]: state.settings });
    if (!saved) return;
    applyThemePreset();
    updateFabVisibility();
    setStatus(T.statusSaved, false);
  }

  async function clearHistory() {
    if (!ensureExtensionContext()) return;
    state.history = [];
    renderHistory();
    await saveHistory();
    setStatus(T.statusHistoryCleared, false);
  }

  function bindStorageListener() {
    if (!ensureExtensionContext()) return;

    try {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== 'local') return;

        if (changes[SETTINGS_KEY]?.newValue) {
          state.settings = upgradePromptSettings({ ...DEFAULT_SETTINGS, ...changes[SETTINGS_KEY].newValue });
          applySettingsToInputs();
          applyThemePreset();
          updateFabVisibility();
        }

        if (changes[HISTORY_KEY]?.newValue) {
          state.history = Array.isArray(changes[HISTORY_KEY].newValue) ? changes[HISTORY_KEY].newValue : [];
          renderHistory();
        }

        if (changes[PROMPT_LIBRARY_KEY]) {
          state.promptLibrary = Array.isArray(changes[PROMPT_LIBRARY_KEY].newValue)
            ? changes[PROMPT_LIBRARY_KEY].newValue.map(normalizePromptLibraryEntry).filter(Boolean)
            : [];
          renderPromptLibraryOptions();
        }
      });
    } catch (error) {
      markContextInvalidated(error);
    }
  }

  function createUI() {
    const root = document.createElement('div');
    root.className = 'nai-md3-root';
    root.innerHTML = `
      <button class="nai-md3-fab" type="button" title="${T.title}">${T.fab}</button>
      <section class="nai-md3-panel nai-hidden">
        <header class="nai-md3-header">
          <div class="nai-md3-title">${T.title}</div>
          <button class="nai-md3-close" type="button" data-action="close">&times;</button>
        </header>

        <nav class="nai-md3-tabs">
          <button type="button" class="active" data-page="reverse">${T.tabReverse}</button>
          <button type="button" data-page="history">${T.tabHistory}</button>
          <button type="button" data-page="settings">${T.tabSettings}</button>
        </nav>

        <div class="nai-md3-body">
        <section class="nai-md3-page" data-page="reverse">
          <div class="nai-md3-hint">${T.quickHint}<kbd>Alt</kbd> + <kbd>Shift</kbd> + \u70b9\u51fb\u56fe\u7247</div>
          <div class="nai-md3-actions nai-md3-actions-reverse">
            <button type="button" data-action="pick">${T.pick}</button>
            <button type="button" class="nai-md3-primary" data-action="reverse">${T.reverseCopy}</button>
            <button type="button" data-action="copy">${T.copyResult}</button>
            <button type="button" data-action="wrap-code">${T.wrapCodeButton}</button>
          </div>
          <img class="nai-md3-preview nai-hidden" alt="preview" />
          <div class="nai-md3-preview-hint">${T.previewEmpty}</div>
          <div class="nai-md3-status"></div>
          <label class="nai-md3-label">${T.resultLabel}</label>
          <textarea class="nai-md3-result" rows="8" readonly placeholder="${T.resultPlaceholder}"></textarea>
        </section>

        <section class="nai-md3-page nai-hidden" data-page="history">
          <div class="nai-md3-actions"><button type="button" data-action="clear-history">${T.clearHistory}</button></div>
          <div class="nai-history-list"></div>
        </section>

        <section class="nai-md3-page nai-hidden" data-page="settings">
          <div class="nai-md3-settings-section nai-md3-settings-appearance">
            <div class="nai-md3-section-head">
              <div class="nai-md3-section-title">${T.sectionAppearance}</div>
              <div class="nai-md3-section-note">${T.sectionAppearanceHint}</div>
            </div>
            <div><label class="nai-md3-label">${T.themePreset}</label><select class="nai-md3-input" data-field="themePreset"></select></div>
            <label class="nai-md3-switch"><input data-field="showFloatingBall" type="checkbox" /><span>${T.showBall}</span></label>
          </div>

          <div class="nai-md3-settings-section">
            <div class="nai-md3-section-head">
              <div class="nai-md3-section-title">${T.sectionProvider}</div>
              <div class="nai-md3-section-note">${T.sectionProviderHint}</div>
            </div>
            <div class="nai-md3-grid-2">
              <div><label class="nai-md3-label">${T.serviceProvider}</label><select class="nai-md3-input" data-field="providerPreset"></select></div>
              <div><label class="nai-md3-label">${T.protocol}</label><select class="nai-md3-input" data-field="protocol"></select></div>
            </div>
            <label class="nai-md3-label">API Endpoint</label><input class="nai-md3-input" data-field="endpoint" type="text" />
            <div class="nai-md3-grid-2">
              <div>
                <label class="nai-md3-label">${T.model}</label>
                <div class="nai-md3-input-row">
                  <input class="nai-md3-input" data-field="model" list="nai-primary-model-list" type="text" />
                  <button type="button" class="nai-md3-inline-action" data-action="fetch-models">${T.fetchModels}</button>
                </div>
                <datalist id="nai-primary-model-list"></datalist>
              </div>
              <div><label class="nai-md3-label">API Key</label><input class="nai-md3-input" data-field="apiKey" type="password" /></div>
            </div>
          </div>

          <div class="nai-md3-settings-section">
            <div class="nai-md3-section-head">
              <div class="nai-md3-section-title">${T.sectionPrompt}</div>
              <div class="nai-md3-section-note">${T.sectionPromptHint}</div>
            </div>
            <label class="nai-md3-label">${T.systemPrompt}</label><textarea class="nai-md3-input" data-field="systemPrompt" rows="3"></textarea>
            <label class="nai-md3-label">${T.reversePrompt}</label><textarea class="nai-md3-input" data-field="reversePrompt" rows="3"></textarea>
            <label class="nai-md3-switch"><input data-field="enableRoleReplaceMode" type="checkbox" /><span>${T.roleMode}</span></label>
            <label class="nai-md3-label">${T.roleSystemPrompt}</label><textarea class="nai-md3-input" data-field="roleSystemPrompt" rows="3"></textarea>
            <label class="nai-md3-label">${T.roleReversePrompt}</label><textarea class="nai-md3-input" data-field="roleReversePrompt" rows="3"></textarea>
            <label class="nai-md3-label">${T.rolePrompt}</label><textarea class="nai-md3-input" data-field="rolePrompt" rows="2"></textarea>
            <div class="nai-md3-grid-2 nai-md3-library-row">
              <div><label class="nai-md3-label">${T.roleLibrary}</label><select class="nai-md3-input" data-field="roleLibrarySelect"></select></div>
              <div class="nai-md3-library-action"><button type="button" class="nai-md3-inline-action" data-action="apply-role-library">${T.applyRoleLibrary}</button></div>
            </div>
          </div>

          <div class="nai-md3-settings-section">
            <div class="nai-md3-section-head">
              <div class="nai-md3-section-title">${T.sectionBehavior}</div>
              <div class="nai-md3-section-note">${T.sectionBehaviorHint}</div>
            </div>
            <div class="nai-md3-grid-2">
              <div><label class="nai-md3-label">Temperature</label><input class="nai-md3-input" data-field="temperature" type="number" min="0" max="2" step="0.1" /></div>
              <div><label class="nai-md3-label">Max Tokens</label><input class="nai-md3-input" data-field="maxTokens" type="number" min="64" max="4096" step="1" /></div>
            </div>
            <label class="nai-md3-switch"><input data-field="sendImageAsDataUrl" type="checkbox" /><span>${T.sendImageAsDataUrl}</span></label>
            <label class="nai-md3-switch"><input data-field="defaultCodeFence" type="checkbox" /><span>${T.defaultCodeFence}</span></label>
            <label class="nai-md3-switch"><input data-field="enableFallbackModel" type="checkbox" /><span>${T.fallbackMode}</span></label>
          </div>

          <div class="nai-md3-settings-section nai-hidden" data-fallback-section>
            <div class="nai-md3-section-head">
              <div class="nai-md3-section-title">${T.sectionFallback}</div>
              <div class="nai-md3-section-note">${T.sectionFallbackHint}</div>
            </div>
            <div class="nai-md3-grid-2">
              <div><label class="nai-md3-label">${T.fallbackProvider}</label><select class="nai-md3-input" data-field="fallbackProviderPreset"></select></div>
              <div><label class="nai-md3-label">${T.fallbackProtocol}</label><select class="nai-md3-input" data-field="fallbackProtocol"></select></div>
            </div>
            <label class="nai-md3-label">${T.fallbackEndpoint}</label><input class="nai-md3-input" data-field="fallbackEndpoint" type="text" />
            <div class="nai-md3-grid-2">
              <div>
                <label class="nai-md3-label">${T.fallbackModel}</label>
                <div class="nai-md3-input-row">
                  <input class="nai-md3-input" data-field="fallbackModel" list="nai-fallback-model-list" type="text" />
                  <button type="button" class="nai-md3-inline-action" data-action="fetch-fallback-models">${T.fetchModels}</button>
                </div>
                <datalist id="nai-fallback-model-list"></datalist>
              </div>
              <div><label class="nai-md3-label">${T.fallbackApiKey}</label><input class="nai-md3-input" data-field="fallbackApiKey" type="password" /></div>
            </div>
          </div>

          <div class="nai-md3-actions nai-md3-settings-actions"><button type="button" data-action="test-connection">${T.testConnection}</button><button type="button" class="nai-md3-primary" data-action="save-settings">${T.saveSettings}</button></div>
        </section>
        </div>
        <div class="nai-md3-resize-handle" aria-hidden="true"></div>
      </section>
    `;

    document.body.appendChild(root);
    ui.root = root;
    ui.fab = root.querySelector('.nai-md3-fab');
    ui.panel = root.querySelector('.nai-md3-panel');
    ui.header = root.querySelector('.nai-md3-header');
    ui.resizeHandle = root.querySelector('.nai-md3-resize-handle');
    ui.status = root.querySelector('.nai-md3-status');
    ui.preview = root.querySelector('.nai-md3-preview');
    ui.previewHint = root.querySelector('.nai-md3-preview-hint');
    ui.resultOutput = root.querySelector('.nai-md3-result');
    ui.sendButton = root.querySelector('[data-action="reverse"]');
    ui.historyList = root.querySelector('.nai-history-list');
    ui.navButtons = Array.from(root.querySelectorAll('.nai-md3-tabs [data-page]'));

    root.querySelectorAll('.nai-md3-page').forEach((el) => {
      ui.pages[el.dataset.page] = el;
    });

    ui.settings.providerPreset = root.querySelector('[data-field="providerPreset"]');
    ui.settings.protocol = root.querySelector('[data-field="protocol"]');
    ui.settings.themePreset = root.querySelector('[data-field="themePreset"]');
    ui.settings.endpoint = root.querySelector('[data-field="endpoint"]');
    ui.settings.model = root.querySelector('[data-field="model"]');
    ui.settings.modelList = root.querySelector('#nai-primary-model-list');
    ui.settings.apiKey = root.querySelector('[data-field="apiKey"]');
    ui.settings.systemPrompt = root.querySelector('[data-field="systemPrompt"]');
    ui.settings.reversePrompt = root.querySelector('[data-field="reversePrompt"]');
    ui.settings.enableRoleReplaceMode = root.querySelector('[data-field="enableRoleReplaceMode"]');
    ui.settings.roleSystemPrompt = root.querySelector('[data-field="roleSystemPrompt"]');
    ui.settings.roleReversePrompt = root.querySelector('[data-field="roleReversePrompt"]');
    ui.settings.rolePrompt = root.querySelector('[data-field="rolePrompt"]');
    ui.settings.roleLibrarySelect = root.querySelector('[data-field="roleLibrarySelect"]');
    ui.settings.temperature = root.querySelector('[data-field="temperature"]');
    ui.settings.maxTokens = root.querySelector('[data-field="maxTokens"]');
    ui.settings.enableFallbackModel = root.querySelector('[data-field="enableFallbackModel"]');
    ui.settings.fallbackProviderPreset = root.querySelector('[data-field="fallbackProviderPreset"]');
    ui.settings.fallbackProtocol = root.querySelector('[data-field="fallbackProtocol"]');
    ui.settings.fallbackEndpoint = root.querySelector('[data-field="fallbackEndpoint"]');
    ui.settings.fallbackModel = root.querySelector('[data-field="fallbackModel"]');
    ui.settings.fallbackModelList = root.querySelector('#nai-fallback-model-list');
    ui.settings.fallbackApiKey = root.querySelector('[data-field="fallbackApiKey"]');
    ui.settings.fallbackSection = root.querySelector('[data-fallback-section]');
    ui.settings.sendImageAsDataUrl = root.querySelector('[data-field="sendImageAsDataUrl"]');
    ui.settings.defaultCodeFence = root.querySelector('[data-field="defaultCodeFence"]');
    ui.settings.showFloatingBall = root.querySelector('[data-field="showFloatingBall"]');

    fillSelectOptions(ui.settings.providerPreset, PROVIDER_PRESETS);
    fillSelectOptions(ui.settings.protocol, PROTOCOL_OPTIONS);
    fillSelectOptions(ui.settings.themePreset, THEME_PRESETS);
    fillSelectOptions(ui.settings.fallbackProviderPreset, PROVIDER_PRESETS);
    fillSelectOptions(ui.settings.fallbackProtocol, PROTOCOL_OPTIONS);
    renderPromptLibraryOptions();

    ui.settings.providerPreset.addEventListener('change', () => syncProviderFields('primary', true));
    ui.settings.fallbackProviderPreset.addEventListener('change', () => syncProviderFields('fallback', true));
    ui.settings.enableFallbackModel.addEventListener('change', () => updateFallbackSettingsVisibility());
    ui.settings.themePreset.addEventListener('change', () => {
      state.settings.themePreset = ui.settings.themePreset.value || DEFAULT_SETTINGS.themePreset;
      applyThemePreset();
    });

    ui.fab.addEventListener('click', () => openPanel('reverse'));
    bindPanelInteractions();
    bindTextareaAutosize();
    applyPanelLayout(state.panelLayout);

    // Direct tab listeners: avoid delegated click edge cases.
    ui.navButtons.forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        setPage(btn.dataset.page);
      });
    });

    root.addEventListener('click', async (event) => {
      const actionTarget = event.target instanceof HTMLElement ? event.target.closest('[data-action]') : null;
      if (!actionTarget) return;

      const action = actionTarget.getAttribute('data-action');

      if (action === 'close') closePanel();
      else if (action === 'pick') startPickMode();
      else if (action === 'reverse') await reverseAndCopy();
      else if (action === 'copy') {
        const copied = await copyText(state.lastResult);
        setStatus(copied ? T.statusCopied : T.statusCopyFailed, !copied);
      } else if (action === 'fetch-models') await fetchModelsFor('primary');
      else if (action === 'fetch-fallback-models') await fetchModelsFor('fallback');
      else if (action === 'test-connection') await testConnection();
      else if (action === 'wrap-code') await wrapCurrentResult();
      else if (action === 'apply-role-library') applyPromptLibraryToRolePrompt();
      else if (action === 'save-settings') await saveSettings();
      else if (action === 'clear-history') await clearHistory();
      else if (action === 'history-copy') {
        const item = state.history.find((x) => x.id === actionTarget.dataset.id);
        const copied = await copyText(item?.result || '');
        setStatus(copied ? T.statusCopied : T.statusCopyFailed, !copied);
      } else if (action === 'history-use') {
        const item = state.history.find((x) => x.id === actionTarget.dataset.id);
        if (!item) return;
        setResult(item.result || '');
        openPanel('reverse');
        setStatus(T.statusLoadedHistory, false);
      }
    });
  }

  async function initState() {
    const data = await storageGet([SETTINGS_KEY, HISTORY_KEY, PANEL_LAYOUT_KEY, PROMPT_LIBRARY_KEY]);
    const rawSettings = { ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] || {}) };
    const upgradedSettings = upgradePromptSettings(rawSettings);
    state.settings = upgradedSettings;
    state.history = Array.isArray(data[HISTORY_KEY]) ? data[HISTORY_KEY] : [];
    state.promptLibrary = Array.isArray(data[PROMPT_LIBRARY_KEY]) ? data[PROMPT_LIBRARY_KEY].map(normalizePromptLibraryEntry).filter(Boolean) : [];
    state.panelLayout = normalizeStoredPanelLayout(data[PANEL_LAYOUT_KEY]);

    if (JSON.stringify(rawSettings) !== JSON.stringify(upgradedSettings)) {
      await storageSet({ [SETTINGS_KEY]: upgradedSettings });
    }
  }

  function bindMessageListener() {
    if (!ensureExtensionContext()) return;

    try {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message || typeof message !== 'object') return false;

        if (message.type === 'nai-open-panel') {
          openPanel(message.page === 'settings' ? 'settings' : 'reverse');
          sendResponse({ ok: true });
          return true;
        }

        return false;
      });
    } catch (error) {
      markContextInvalidated(error);
    }
  }

  async function init() {
    await initState();
    createUI();

    applySettingsToInputs();
    applyThemePreset();
    updateFabVisibility();
    updatePreview();
    renderHistory();
    setResult('');
    setPage('reverse');
    setStatus(T.statusReady, false);

    bindStorageListener();
    bindMessageListener();
    document.addEventListener('click', onShortcutClick, true);
  }

  init();
})();
