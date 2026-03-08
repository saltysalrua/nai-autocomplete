# NovelAI Prompt Autocomplete

一个基于 Chrome Manifest V3 的 NovelAI 浏览器扩展，当前包含两部分能力：

- `NovelAI 标签自动补全`
- `基于 LLM 的图像反推助手`

项目仓库：<https://github.com/saltysalrua/nai-autocomplete>

## 功能概览

### 1. NovelAI 标签自动补全

在 `https://novelai.net/*` 页面注入标签补全能力：

- Danbooru 风格标签搜索
- 常用标签候选列表
- 本地缓存标签数据
- 支持下划线与空格转换开关

### 2. 图像反推助手

在任意网页注入一个可呼出的 MD3 风格悬浮面板，用于选图、调用 LLM 反推提示词并自动复制结果。

支持能力：

- `Alt + Shift + 点击图片` 直接锁定图片并打开反推面板
- 手动选图模式
- Pixiv 一类覆盖层场景的选图兼容
- 图像直链失败时的抓图兜底与截图回退
- 悬浮窗可拖动、可缩放
- 支持历史记录
- 支持角色替换模式
- 支持默认代码框输出 / 手动包裹代码框
- 支持隐藏悬浮球，仅通过快捷键或扩展弹窗呼出

### 3. 多模型与多服务商

设置页支持主模型 + 备用模型两套配置。

支持能力：

- 主模型失败后自动切换备用模型
- 自动获取模型列表
- 测试连接按钮
- 服务商预设 + 协议预设

当前内置预设：

- OpenAI
- OpenRouter
- xAI (Chat Completions)
- xAI (Responses API)
- Google Gemini (OpenAI 兼容)
- DeepSeek
- Anthropic
- 自定义

协议支持：

- OpenAI Chat Completions
- Responses API
- Anthropic Messages API

## 安装方式

### 方式一：从 Release 下载

前往 Releases 页面下载 zip：

- <https://github.com/saltysalrua/nai-autocomplete/releases>

解压后，在 Chrome / Edge 中打开扩展管理页，启用开发者模式，再选择“加载已解压的扩展程序”。

### 方式二：直接加载仓库目录

1. 克隆仓库
2. 打开浏览器扩展管理页
3. 启用开发者模式
4. 选择“加载已解压的扩展程序”
5. 选择项目目录 `nai-autocomplete`

## 使用说明

### 自动补全

1. 打开 `NovelAI` 页面
2. 在提示词输入区域输入标签
3. 使用候选列表完成补全

### 图像反推

1. 打开任意图片页面
2. 使用以下任一方式选图：
   - `Alt + Shift + 点击图片`
   - 扩展弹窗打开反推页后点击“手动选图”
3. 在设置页填写 LLM 配置
4. 点击“反推并复制”
5. 结果会写入面板并自动复制到剪切板

### 设置页可配置项

- 服务商预设
- 接口协议
- Endpoint
- Model
- API Key
- 系统提示词
- 反推提示词
- 角色替换模式
- 备用模型
- 默认代码框输出
- 是否显示悬浮球
- 获取模型
- 测试连接

## 默认工作流

推荐使用流程：

1. 先在设置页选择服务商预设
2. 填写 API Key
3. 点击“获取模型”自动拉取可用模型
4. 点击“测试连接”确认主模型 / 备用模型配置有效
5. 再开始图像反推

## 项目结构

- [manifest.json](./manifest.json)：扩展清单
- [content.js](./content.js)：NovelAI 页面标签补全脚本
- [image-assistant.js](./image-assistant.js)：图像反推悬浮面板与交互逻辑
- [background.js](./background.js)：后台请求、抓图、LLM 调用逻辑
- [styles.css](./styles.css)：扩展样式
- `dist/`：本地打包产物

## 开发说明

本项目当前没有复杂构建步骤，核心文件可直接作为扩展源码加载。

常用本地校验：

```powershell
node --check "D:/Code/Codex/nai-autocomplete/image-assistant.js"
node --check "D:/Code/Codex/nai-autocomplete/background.js"
```

## 已知说明

- 图像反推依赖你自己配置的 LLM 服务，不内置 API Key
- 某些站点会对图片直链做防盗链限制，扩展已内置兜底逻辑，但仍可能受站点策略影响
- 不同服务商支持的模型、协议和视觉能力并不完全一致

## License

本项目使用仓库内的 [LICENSE](./LICENSE)。
