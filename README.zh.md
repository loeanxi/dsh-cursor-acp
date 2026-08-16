# dsh-cursor-acp

[English](README.md) | 中文

把本机**官方 Cursor CLI**（`agent acp`）挂成 DeepSeek Harness 子代理。父模型可以用工具 `cursor_agent` 派一个独立任务。这**不是**模型选择器里的「Cursor 模型」，也**不会**去打 Cursor 的私有 HTTP 接口。

## 你需要

1. 同一台机器上的 [Cursor CLI](https://cursor.com/docs/cli/installation)。
2. 先执行 `agent login`（或设置 `CURSOR_API_KEY`）。
3. 当前 dsh 已带 `@deepseek-ai/dsh-subagent-acp` 与 `@deepseek-ai/dsh-tool-subagent`。

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

npm（发布到注册表之后）：

```sh
dsh plugin --profile desktop add dsh-cursor-acp
```

本地目录：

```sh
dsh plugin --profile desktop add link:/absolute/path/to/dsh-cursor-acp
```

重启 profile。打开 **设置 → Cursor 子代理** 查看是否找到命令行，并按 Cursor 的方式选子代理模型：思考程度、Fast、模型家族。这不会改父对话的模型。

## 怎么用

在 DeepSeek Harness 里让当前智能体把一件独立的活交给 Cursor。它应调用 `cursor_agent`，提示词要自成一体。子进程用当前工作区目录，额度走你的 Cursor 订阅。中间工具过程留在子进程，父对话只看到最终文本。

## 诊断

```sh
dsh plugin --profile desktop exec dsh-cursor-acp doctor
```

只打印路径元数据，不读 Cursor 凭据文件。

## 开源

MIT。GitHub 仓库请加 topic `dsh-plugin`，并给 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 提一行 PR。不要写成与 Cursor 官方合作。

## 许可证

MIT
