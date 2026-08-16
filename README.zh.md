# dsh-cursor-acp

[English](README.md) | 中文

DeepSeek Harness 的社区插件。平时聊天时，当前智能体可以把一件独立的活交给本机**已经登录的 Cursor 命令行**。

这不是模型列表里的「Cursor 模型」，也不是 Cursor 官方产品。

## 使用前

同一台电脑先装 [Cursor CLI](https://cursor.com/docs/cli/installation)，再登录：

Windows（PowerShell）：

```powershell
irm 'https://cursor.com/install?win32=true' | iex
agent login
```

macOS / Linux：

```bash
curl https://cursor.com/install -fsS | bash
agent login
```

不想交互登录的话，也可以设置 `CURSOR_API_KEY`。

## 安装

桌面：

```sh
dsh plugin --profile desktop add github:loeanxi/dsh-cursor-acp
```

Web：

```sh
dsh plugin --profile web add github:loeanxi/dsh-cursor-acp
```

装完重启 DeepSeek Harness。

## 装完之后

打开 **设置 → Cursor 子代理**。

- 显示已找到命令行，智能体就可以用工具 `cursor_agent`。
- 可以选子代理的思考程度、Fast、模型，再点 **应用**。这只影响交给 Cursor 的那次任务，不会改当前对话用的模型。

## 怎么用

直接在对话里说即可，比如「让 Cursor 实现这个功能」「让 Cursor 看一下这个文件」。把事情说完整。智能体会自己去调 `cursor_agent`。

任务在当前工作区目录里跑，额度走你的 Cursor 订阅。这边对话只看到最终结果。

## 找不到命令行时

```sh
dsh plugin --profile desktop exec dsh-cursor-acp doctor
```

Web 端把 `--profile desktop` 换成 `--profile web`。这条命令只看它在哪找 CLI，不读 Cursor 凭据。

## 许可证

MIT
