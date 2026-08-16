# dsh-cursor-acp

[English](README.md) | 中文

这是一个 DeepSeek Harness 插件。当前对话里的智能体可以把一件独立的活交给本机**已经登录的 Cursor CLI**，走工具 `cursor_agent`。

这不是模型列表里的「Cursor 模型」，也不会去打 Cursor 的私有接口。社区插件，不是 Cursor 官方产品。

## 你需要

1. 同一台电脑上的 [Cursor CLI](https://cursor.com/docs/cli/installation)。
2. 先登录一次：`agent login`（或设置 `CURSOR_API_KEY`）。
3. 已安装可用的 DeepSeek Harness（桌面或 Web）。

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

## 安装

```sh
dsh plugin --profile desktop add github:loeanxi/dsh-cursor-acp
```

Web 端把 `--profile desktop` 换成 `--profile web`。装完重启。

打开 **设置 → Cursor 子代理**。找到 CLI 之后，可以按 Cursor 的方式选子代理模型：思考程度、Fast、模型。这只影响 `cursor_agent`，不会改当前对话用的模型。

## 怎么用

和平时一样聊天，让智能体把一件能独立做完的活交给 Cursor，比如实现某个功能、看某个文件。它应调用 `cursor_agent`，提示词要写完整，不要依赖对话里没传过去的上下文。

子进程用当前工作区目录，额度走你的 Cursor 订阅。中间工具过程留在子进程，这边对话只看到最终结果。

## 找不到命令行时

```sh
dsh plugin --profile desktop exec dsh-cursor-acp doctor
```

只打印它找到的路径，不读 Cursor 凭据。

## 许可证

MIT
