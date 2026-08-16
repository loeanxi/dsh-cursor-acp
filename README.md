# dsh-cursor-acp

English | [中文](README.zh.md)

DeepSeek Harness plugin that turns the **official Cursor CLI** (`agent acp`) into a subagent. The parent model can delegate a standalone task with the `cursor_agent` tool. This is **not** a Cursor row in the model picker and it does **not** call Cursor's private HTTP API.

## What you need

1. [Cursor CLI](https://cursor.com/docs/cli/installation) on the same machine.
2. `agent login` (or `CURSOR_API_KEY`) so the CLI is already signed in.
3. DeepSeek Harness with `@deepseek-ai/dsh-subagent-acp` and `@deepseek-ai/dsh-tool-subagent` (shipped with current dsh).

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

From npm (after a registry publish):

```sh
dsh plugin --profile desktop add dsh-cursor-acp
```

From a local checkout:

```sh
dsh plugin --profile desktop add link:/absolute/path/to/dsh-cursor-acp
```

Restart the profile. Open **Settings → Cursor 子代理** to see whether the CLI was found, and to pick the child model the same way Cursor does: effort, Fast, then model family. This does not change the parent chat model.

## How to use it

Ask the in-app agent to hand a self-contained task to Cursor. It should call `cursor_agent` with a standalone prompt. The child starts in the current workspace cwd and uses your Cursor subscription. Intermediate Cursor tool traffic stays in the child; the parent sees the final text.

## Doctor

```sh
dsh plugin --profile desktop exec dsh-cursor-acp doctor
```

Prints only path metadata. It never reads Cursor credential files.

## Open source

MIT. Please tag the GitHub repo with `dsh-plugin` and open a one-line PR on [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin). Do not describe this as an official Cursor partnership.

## License

MIT
