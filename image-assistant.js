(function () {
  'use strict';

  if (window.top !== window.self) return;
  if (window.__naiAssistantV4Loaded) return;
  window.__naiAssistantV4Loaded = true;

  const SETTINGS_KEY = 'nai-llm-assistant-settings';
  const HISTORY_KEY = 'nai-llm-reverse-history';
  const MAX_HISTORY = 30;
  const PANEL_MARGIN = 12;
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
    model: '\u6a21\u578b',
    systemPrompt: '\u7cfb\u7edf\u63d0\u793a\u8bcd',
    reversePrompt: '\u53cd\u63a8\u6307\u4ee4\uff08\u53cd\u63a8\u9875\u4e0d\u518d\u5355\u72ec\u8f93\u5165\uff09',
    roleMode: '\u66ff\u6362\u89d2\u8272\u6a21\u5f0f',
    roleSystemPrompt: '\u89d2\u8272\u6a21\u5f0f\u7cfb\u7edf\u63d0\u793a\u8bcd',
    roleReversePrompt: '\u89d2\u8272\u6a21\u5f0f\u53cd\u63a8\u6307\u4ee4',
    rolePrompt: '\u76ee\u6807\u89d2\u8272\u63d0\u793a\u8bcd',
    defaultCodeFence: '\u9ed8\u8ba4\u4ee3\u7801\u6846\u8f93\u51fa',
    wrapCodeButton: '\u5305\u88f9\u4ee3\u7801\u6846',
    showBall: '\u663e\u793a\u60ac\u6d6e\u7403\uff08\u5173\u95ed\u540e\u4ec5\u53ef\u901a\u8fc7\u5feb\u6377\u952e\u6216\u6269\u5c55\u5f39\u7a97\u6253\u5f00\uff09',
    saveSettings: '\u4fdd\u5b58\u8bbe\u7f6e',
    statusReady: '\u5c31\u7eea\u3002\u53ef\u4f7f\u7528 Alt + Shift + \u70b9\u51fb\u56fe\u7247 \u5feb\u901f\u53cd\u63a8\u3002',
    statusNeedImage: '\u8bf7\u5148\u901a\u8fc7\u5feb\u6377\u952e\u6216\u624b\u52a8\u9009\u56fe\u9501\u5b9a\u56fe\u7247\u3002',
    statusNeedKey: '\u672a\u914d\u7f6e API Key\uff0c\u8bf7\u5207\u6362\u5230\u8bbe\u7f6e\u9875\u4fdd\u5b58\u914d\u7f6e\u3002',
    statusNeedPrompt: '\u8bf7\u5148\u5728\u8bbe\u7f6e\u9875\u586b\u5199\u53cd\u63a8\u6307\u4ee4\u3002',
    statusNeedRolePrompt: '\u5df2\u5f00\u542f\u66ff\u6362\u89d2\u8272\u6a21\u5f0f\uff0c\u8bf7\u5728\u8bbe\u7f6e\u9875\u586b\u5199\u76ee\u6807\u89d2\u8272\u63d0\u793a\u8bcd\u3002',
    statusRunning: '\u6b63\u5728\u8bf7\u6c42\u6a21\u578b\u53cd\u63a8...',
    statusDoneCopied: '\u53cd\u63a8\u5b8c\u6210\uff0c\u5df2\u590d\u5236\u5230\u526a\u5207\u677f\u3002',
    statusDoneNotCopied: '\u53cd\u63a8\u5b8c\u6210\uff0c\u4f46\u81ea\u52a8\u590d\u5236\u5931\u8d25\u3002',
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
  };

  const DEFAULT_SETTINGS = {
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
    showFloatingBall: true,
  };


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
    activePage: 'reverse',
    panelDrag: {
      active: false,
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
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
  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function storageGet(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => resolve(result || {}));
    });
  }

  function storageSet(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, () => resolve());
    });
  }

  function sendRuntimeMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
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

  function setPending(isPending) {
    state.pending = isPending;
    if (!ui.sendButton) return;
    ui.sendButton.disabled = isPending;
    ui.sendButton.textContent = isPending ? '\u53cd\u63a8\u4e2d...' : T.reverseCopy;
  }

  function setResult(text) {
    state.lastResult = text || '';
    if (ui.resultOutput) ui.resultOutput.value = state.lastResult;
  }


  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
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

  function clampPanelPosition(left, top, width, height) {
    const maxLeft = Math.max(PANEL_MARGIN, window.innerWidth - width - PANEL_MARGIN);
    const maxTop = Math.max(PANEL_MARGIN, window.innerHeight - height - PANEL_MARGIN);
    return {
      left: clamp(left, PANEL_MARGIN, maxLeft),
      top: clamp(top, PANEL_MARGIN, maxTop),
    };
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
  }

  function onPointerMove(event) {
    if (!ui.panel) return;

    if (state.panelDrag.active) {
      const width = ui.panel.offsetWidth;
      const height = ui.panel.offsetHeight;
      const left = state.panelDrag.startLeft + (event.clientX - state.panelDrag.startX);
      const top = state.panelDrag.startTop + (event.clientY - state.panelDrag.startY);
      const pos = clampPanelPosition(left, top, width, height);
      ui.panel.style.left = `${Math.round(pos.left)}px`;
      ui.panel.style.top = `${Math.round(pos.top)}px`;
      return;
    }

    if (state.panelResize.active) {
      const maxWidth = Math.max(PANEL_MIN_WIDTH, window.innerWidth - state.panelResize.startLeft - PANEL_MARGIN);
      const maxHeight = Math.max(PANEL_MIN_HEIGHT, window.innerHeight - state.panelResize.startTop - PANEL_MARGIN);
      const width = clamp(state.panelResize.startWidth + (event.clientX - state.panelResize.startX), PANEL_MIN_WIDTH, maxWidth);
      const height = clamp(state.panelResize.startHeight + (event.clientY - state.panelResize.startY), PANEL_MIN_HEIGHT, maxHeight);
      ui.panel.style.width = `${Math.round(width)}px`;
      ui.panel.style.height = `${Math.round(height)}px`;
    }
  }

  function onPointerUp() {
    state.panelDrag.active = false;
    state.panelResize.active = false;
    document.removeEventListener('pointermove', onPointerMove, true);
    document.removeEventListener('pointerup', onPointerUp, true);
    document.removeEventListener('pointercancel', onPointerUp, true);
  }

  function startDrag(event) {
    if (!ui.panel) return;
    const rect = normalizePanelRect();
    if (!rect) return;

    state.panelDrag.active = true;
    state.panelDrag.startX = event.clientX;
    state.panelDrag.startY = event.clientY;
    state.panelDrag.startLeft = rect.left;
    state.panelDrag.startTop = rect.top;

    state.panelResize.active = false;
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

    window.addEventListener('resize', keepPanelInsideViewport);
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
    ui.navButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.page === page);
    });
    Object.entries(ui.pages).forEach(([name, el]) => {
      el.classList.toggle('nai-hidden', name !== page);
    });
  }

  function openPanel(page) {
    state.isOpen = true;
    ui.panel.classList.remove('nai-hidden');
    setPage(page || state.activePage || 'reverse');
    keepPanelInsideViewport();
  }

  function closePanel() {
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
    if (state.selectedImage?.dataUrl) {
      content.push({ type: 'image_url', image_url: { url: state.selectedImage.dataUrl } });
    }

    messages.push({ role: 'user', content });
    return messages;
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

    setPending(true);
    setStatus(T.statusRunning, false);

    try {
      const response = await sendRuntimeMessage({
        type: 'nai-llm-chat',
        payload: {
          endpoint: state.settings.endpoint,
          apiKey: state.settings.apiKey,
          model: state.settings.model,
          temperature: Number(state.settings.temperature),
          maxTokens: Number(state.settings.maxTokens),
          messages: buildMessages(promptConfig.userPrompt, promptConfig.systemPrompt),
        },
      });

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
      setStatus(copied ? T.statusDoneCopied : T.statusDoneNotCopied, !copied);
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
    if (state.isPickingImage) return;
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
    if (state.pending || state.isPickingImage) return;
    if (event.button !== 0 || !event.altKey || !event.shiftKey) return;

    const image = findImageCandidate(event);
    if (!image) return;

    event.preventDefault();
    event.stopPropagation();
    await useImageElement(image, true);
  }

  function applySettingsToInputs() {
    ui.settings.endpoint.value = state.settings.endpoint;
    ui.settings.model.value = state.settings.model;
    ui.settings.apiKey.value = state.settings.apiKey;
    ui.settings.systemPrompt.value = state.settings.systemPrompt;
    ui.settings.reversePrompt.value = state.settings.reversePrompt;
    ui.settings.enableRoleReplaceMode.checked = Boolean(state.settings.enableRoleReplaceMode);
    ui.settings.roleSystemPrompt.value = state.settings.roleSystemPrompt;
    ui.settings.roleReversePrompt.value = state.settings.roleReversePrompt;
    ui.settings.rolePrompt.value = state.settings.rolePrompt;
    ui.settings.defaultCodeFence.checked = Boolean(state.settings.defaultCodeFence);
    ui.settings.temperature.value = String(state.settings.temperature);
    ui.settings.maxTokens.value = String(state.settings.maxTokens);
    ui.settings.showFloatingBall.checked = Boolean(state.settings.showFloatingBall);
  }

  function readSettingsFromInputs() {
    return {
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
      showFloatingBall: Boolean(ui.settings.showFloatingBall.checked),
    };
  }

  async function saveSettings() {
    state.settings = { ...DEFAULT_SETTINGS, ...readSettingsFromInputs() };
    await storageSet({ [SETTINGS_KEY]: state.settings });
    updateFabVisibility();
    setStatus(T.statusSaved, false);
  }

  async function clearHistory() {
    state.history = [];
    renderHistory();
    await saveHistory();
    setStatus(T.statusHistoryCleared, false);
  }

  function bindStorageListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;

      if (changes[SETTINGS_KEY]?.newValue) {
        state.settings = upgradePromptSettings({ ...DEFAULT_SETTINGS, ...changes[SETTINGS_KEY].newValue });
        applySettingsToInputs();
        updateFabVisibility();
      }

      if (changes[HISTORY_KEY]?.newValue) {
        state.history = Array.isArray(changes[HISTORY_KEY].newValue) ? changes[HISTORY_KEY].newValue : [];
        renderHistory();
      }
    });
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
          <label class="nai-md3-label">API Endpoint</label><input class="nai-md3-input" data-field="endpoint" type="text" />
          <label class="nai-md3-label">${T.model}</label><input class="nai-md3-input" data-field="model" type="text" />
          <label class="nai-md3-label">API Key</label><input class="nai-md3-input" data-field="apiKey" type="password" />
          <label class="nai-md3-label">${T.systemPrompt}</label><textarea class="nai-md3-input" data-field="systemPrompt" rows="3"></textarea>
          <label class="nai-md3-label">${T.reversePrompt}</label><textarea class="nai-md3-input" data-field="reversePrompt" rows="3"></textarea>
          <label class="nai-md3-switch"><input data-field="enableRoleReplaceMode" type="checkbox" /><span>${T.roleMode}</span></label>
          <label class="nai-md3-label">${T.roleSystemPrompt}</label><textarea class="nai-md3-input" data-field="roleSystemPrompt" rows="3"></textarea>
          <label class="nai-md3-label">${T.roleReversePrompt}</label><textarea class="nai-md3-input" data-field="roleReversePrompt" rows="3"></textarea>
          <label class="nai-md3-label">${T.rolePrompt}</label><textarea class="nai-md3-input" data-field="rolePrompt" rows="2"></textarea>
          <div class="nai-md3-grid-2">
            <div><label class="nai-md3-label">Temperature</label><input class="nai-md3-input" data-field="temperature" type="number" min="0" max="2" step="0.1" /></div>
            <div><label class="nai-md3-label">Max Tokens</label><input class="nai-md3-input" data-field="maxTokens" type="number" min="64" max="4096" step="1" /></div>
          </div>
          <label class="nai-md3-switch"><input data-field="defaultCodeFence" type="checkbox" /><span>${T.defaultCodeFence}</span></label>
          <label class="nai-md3-switch"><input data-field="showFloatingBall" type="checkbox" /><span>${T.showBall}</span></label>
          <div class="nai-md3-actions"><button type="button" class="nai-md3-primary" data-action="save-settings">${T.saveSettings}</button></div>
        </section>
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

    ui.settings.endpoint = root.querySelector('[data-field="endpoint"]');
    ui.settings.model = root.querySelector('[data-field="model"]');
    ui.settings.apiKey = root.querySelector('[data-field="apiKey"]');
    ui.settings.systemPrompt = root.querySelector('[data-field="systemPrompt"]');
    ui.settings.reversePrompt = root.querySelector('[data-field="reversePrompt"]');
    ui.settings.enableRoleReplaceMode = root.querySelector('[data-field="enableRoleReplaceMode"]');
    ui.settings.roleSystemPrompt = root.querySelector('[data-field="roleSystemPrompt"]');
    ui.settings.roleReversePrompt = root.querySelector('[data-field="roleReversePrompt"]');
    ui.settings.rolePrompt = root.querySelector('[data-field="rolePrompt"]');
    ui.settings.defaultCodeFence = root.querySelector('[data-field="defaultCodeFence"]');
    ui.settings.temperature = root.querySelector('[data-field="temperature"]');
    ui.settings.maxTokens = root.querySelector('[data-field="maxTokens"]');
    ui.settings.showFloatingBall = root.querySelector('[data-field="showFloatingBall"]');

    ui.fab.addEventListener('click', () => openPanel('reverse'));
    bindPanelInteractions();

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
      } else if (action === 'wrap-code') await wrapCurrentResult();
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
    const data = await storageGet([SETTINGS_KEY, HISTORY_KEY]);
    const rawSettings = { ...DEFAULT_SETTINGS, ...(data[SETTINGS_KEY] || {}) };
    const upgradedSettings = upgradePromptSettings(rawSettings);
    state.settings = upgradedSettings;
    state.history = Array.isArray(data[HISTORY_KEY]) ? data[HISTORY_KEY] : [];

    if (JSON.stringify(rawSettings) !== JSON.stringify(upgradedSettings)) {
      await storageSet({ [SETTINGS_KEY]: upgradedSettings });
    }
  }

  function bindMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message || typeof message !== 'object') return false;

      if (message.type === 'nai-open-panel') {
        openPanel(message.page === 'settings' ? 'settings' : 'reverse');
        sendResponse({ ok: true });
        return true;
      }

      return false;
    });
  }

  async function init() {
    await initState();
    createUI();

    applySettingsToInputs();
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