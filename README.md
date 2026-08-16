# dsh-cursor-acp

English | [中文](README.zh.md)

A DeepSeek Harness plugin. It lets the current agent hand a standalone task to the **Cursor CLI** already signed in on this machine, through the `cursor_agent` tool.

This is not a Cursor row in the model picker. It does not call Cursor's private HTTP API. It is a community plugin, not an official Cursor product.

## Requirements

1. [Cursor CLI](https://cursor.com/docs/cli/installation) on the same machine.
2. Sign in once: `agent login` (or set `CURSOR_API_KEY`).
3. A current DeepSeek Harness install (desktop or web).

Windows (PowerShell):

```powershell
irm 'https://cursor.com/install?win32=true' | iex
agent login
```

macOS / Linux:

```bash
curl https://cursor.com/install -fsS | bash
agent login
```

## Install

```sh
dsh plugin --profile desktop add github:loeanxi/dsh-cursor-acp
```

For the web profile, use `--profile web` instead. Restart after install.

Open **Settings → Cursor subagent**. If the CLI was found, you can pick the child model the same way Cursor does: effort, Fast, then model. That choice only affects `cursor_agent`. It does not change the parent chat model.

## How to use it

In a normal chat, ask the agent to give Cursor a self-contained job (for example: implement a feature, or review a file). The agent should call `cursor_agent` with a prompt that stands on its own.

The child runs in the current workspace folder and uses your Cursor subscription. Tool steps stay in the child. The parent chat only sees the final text.

## If the CLI is not found

```sh
dsh plugin --profile desktop exec dsh-cursor-acp doctor
```

This prints the path it looked for. It does not read Cursor credential files.

## License

MIT
