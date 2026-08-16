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

## 国内网络（代理）

Cursor 的登录和跑任务都要连国外服务器。浏览器开了「魔法」、能打开 cursor.com，**不等于**终端里的 `agent` / `dsh` 也能连上。Clash 等软件的系统代理，Node 默认不认，会继续直连，然后 `agent login` 失败，或 `cursor_agent` 报地区/网络错误。

先看你的代理软件本地端口（常见是 `7890`，以软件里显示的为准），在**即将运行命令的那个窗口**里设（只对这个窗口有效）：

PowerShell：

```powershell
$env:HTTP_PROXY = "http://127.0.0.1:7890"
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:ALL_PROXY = "http://127.0.0.1:7890"
$env:NO_PROXY = "localhost,127.0.0.1"
$env:NODE_USE_ENV_PROXY = "1"
```

bash：

```bash
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
export ALL_PROXY=http://127.0.0.1:7890
export NO_PROXY=localhost,127.0.0.1
export NODE_USE_ENV_PROXY=1
```

然后在**同一个窗口**里再执行 `agent login`，以及启动 DeepSeek Harness。换一个没设过的窗口，又会直连。

Clash 里不要把 `node.exe` / `agent` 设成直连。规则模式请放行 `cursor.com` 等 Cursor 域名；全局模式一般也能过，但可能把国内模型也推进代理。装 CLI 的 `irm` / `curl` 同样要能访问 cursor.com。

插件会把当前进程的 `HTTP_PROXY` / `HTTPS_PROXY` / `ALL_PROXY` / `NO_PROXY` / `NODE_USE_ENV_PROXY` 传给 Cursor 子进程。若 Clash 配置里写了 `PROCESS-NAME,node.exe,DIRECT`，设置页和 `doctor` 会提示：子进程可能没走代理。

## 安装

优先用 npm：

```sh
dsh plugin --profile desktop add dsh-cursor-acp
```

Web：

```sh
dsh plugin --profile web add dsh-cursor-acp
```

也可以从 GitHub 装：

```sh
dsh plugin --profile desktop add github:loeanxi/dsh-cursor-acp
dsh plugin --profile web add github:loeanxi/dsh-cursor-acp
```

装完重启 DeepSeek Harness。

## 装完之后

打开 **设置 → Cursor 子代理**。

- 显示已找到命令行，对话里会出现工具 `cursor_agent`。**找到命令行不等于已经登录。** 设置页会跑一次官方的 `agent status`，并看当前进程有没有 `HTTPS_PROXY` 和 `NODE_USE_ENV_PROXY=1`。没登录或代理没带上时，会写出原因，不会显示你的邮箱。
- 可以选子代理的思考程度、Fast、模型，再点 **应用**。这只影响交给 Cursor 的那次任务，不会改当前对话用的模型。选模型由本插件自己保存，原版 DeepSeek Harness 也能改，不依赖 Host 设置白名单。如果官方设置里这一项是灰的，别管它，用 **设置 → Cursor 子代理**。
- **测一下** 会派一个官方只读任务（`agent --print --mode ask`，回复 `pong`）。会用一点 Cursor 额度。这不是完整的 ACP 会话。

![设置 → Cursor 子代理](assets/settings.png)

## 怎么用

直接在对话里说即可，比如「让 Cursor 实现这个功能」「让 Cursor 看一下这个文件」。把事情说完整。智能体会自己去调 `cursor_agent`。

任务在当前工作区目录里跑，额度走你的 Cursor 订阅。这边对话只看到最终结果。

![对话里 cursor_agent 跑完一个小任务](assets/job.png)

## 找不到命令行时

```sh
dsh plugin --profile desktop exec dsh-cursor-acp doctor
```

Web 端把 `--profile desktop` 换成 `--profile web`。这条命令会看 CLI 路径、登录/代理，以及这份 dsh 能不能加载 `@deepseek-ai/dsh-subagent-acp` / `dsh-tool-subagent`。不读 Cursor 凭据。若官方包不在，设置页会写明，并且不会挂上 `cursor_agent`。

## 许可证

MIT
