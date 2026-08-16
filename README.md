# dsh-cursor-acp

English | [中文](README.zh.md)

A community plugin for DeepSeek Harness. In a normal chat, the current agent can hand a standalone job to the **Cursor CLI** already signed in on this machine.

This is not a Cursor row in the model picker, and it is not an official Cursor product.

## Before you start

Install the [Cursor CLI](https://cursor.com/docs/cli/installation) on the same computer, then sign in:

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

You can also set `CURSOR_API_KEY` instead of `agent login`.

## Mainland China / proxy

`agent login` and `cursor_agent` must reach Cursor's servers. A browser proxy does **not** apply to the terminal. Clash-style system proxy is ignored by Node unless you set it in **the same window** you will use:

```powershell
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:ALL_PROXY = "http://127.0.0.1:7890"
$env:NO_PROXY = "localhost,127.0.0.1"
$env:NODE_USE_ENV_PROXY = "1"
```

Use the port your proxy app shows (7890 is common). Then run `agent login` and start DeepSeek Harness in that same window. Let `node.exe` / `agent` use the proxy; do not force them to DIRECT.

## Install

Desktop:

```sh
dsh plugin --profile desktop add github:loeanxi/dsh-cursor-acp
```

Web:

```sh
dsh plugin --profile web add github:loeanxi/dsh-cursor-acp
```

Restart DeepSeek Harness after install.

## After install

Open **Settings → Cursor subagent**.

- If it found the CLI, the agent can use the `cursor_agent` tool.
- You can pick the child model (effort, Fast, model), then click **Apply**. That only affects `cursor_agent`, not the model of the current chat. The choice is stored by this plugin, so it works on stock DeepSeek Harness too — it does not need the Host settings allowlist.

## How to use it

Ask in chat, for example: “Have Cursor implement this feature” or “Have Cursor review this file.” Give enough detail in that message. The agent should call `cursor_agent` on its own.

The job runs in the current workspace folder and uses your Cursor subscription. The parent chat only sees the final result.

## If it cannot find the CLI

```sh
dsh plugin --profile desktop exec dsh-cursor-acp doctor
```

On web, use `--profile web`. This only prints the path it looked for. It does not read Cursor credentials.

## License

MIT
