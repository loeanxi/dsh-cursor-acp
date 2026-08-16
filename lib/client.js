window.__ModuleLoader__.load({
	id: "dsh-cursor-acp",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		const React = require("react");
		const { jsx, jsxs, Fragment } = require("react/jsx-runtime");
		const zh = {
			nav: "Cursor 子代理",
			title: "Cursor 子代理",
			intro: "把本机已登录的 Cursor 命令行当成子代理。对话还在 DeepSeek Harness，任务会交给 Cursor。这不是模型列表里的「Cursor 模型」，也不是 Cursor 官方产品。",
			proxyHint: "国内请注意：浏览器开了代理，终端里的 agent / dsh 默认仍直连。先在同一窗口设置 HTTPS_PROXY 和 NODE_USE_ENV_PROXY=1，再登录、再启动。详见项目 README「国内网络」。",
			found: "已找到 Cursor 命令行。对话里会出现工具 cursor_agent。找到命令行不等于已经登录。",
			missing: "未找到 Cursor 命令行。请先安装，再登录，然后重启 DeepSeek Harness。",
			installWin: "PowerShell 安装：irm 'https://cursor.com/install?win32=true' | iex",
			installUnix: "安装：curl https://cursor.com/install -fsS | bash",
			login: "还要在终端执行 agent login（或设置 CURSOR_API_KEY）。没登录或代理不通时，派活会失败。",
			command: "可执行文件",
			loading: "正在检测…",
			failed: "无法读取状态。",
			picker: "子代理模型",
			pickerHelp: "只影响 cursor_agent。选法和 Cursor 一样：思考程度、Fast、模型。选好后点应用，下一轮才会换。auto 跟 CLI 默认走。",
			effort: "思考程度",
			effortLow: "低",
			effortMedium: "中",
			effortHigh: "高",
			effortXhigh: "极高",
			effortMax: "最大",
			options: "额外选项",
			fast: "Fast",
			model: "模型",
			using: "将使用",
			modelCustom: "或输入完整模型 id",
			modelApply: "应用",
			pickerPending: "还没应用，下一轮仍用当前已保存的模型。",
			modelUnavailable: "现在不能改这项设置。请重启 DeepSeek Harness 后再试。",
			saveFailed: "没保存成功。请确认已经重启过 DeepSeek Harness，再点一次应用。",
		};
		const en = {
			nav: "Cursor subagent",
			title: "Cursor subagent",
			intro: "Use the Cursor CLI already signed in on this machine as a subagent. The chat stays in DeepSeek Harness; the job goes to Cursor. This is not a Cursor row in the model picker, and it is not an official Cursor product.",
			proxyHint: "Behind a proxy (common in mainland China): the browser proxy does not apply to agent / dsh. Set HTTPS_PROXY and NODE_USE_ENV_PROXY=1 in the same terminal, then log in and start. See the README section “Mainland China / proxy”.",
			found: "Cursor CLI found. The chat can see the cursor_agent tool. Finding the CLI is not the same as being signed in.",
			missing: "Cursor CLI not found. Install it, sign in, then restart DeepSeek Harness.",
			installWin: "PowerShell install: irm 'https://cursor.com/install?win32=true' | iex",
			installUnix: "Install: curl https://cursor.com/install -fsS | bash",
			login: "You still need agent login (or CURSOR_API_KEY). A job fails if you are not signed in, or if the proxy is missing.",
			command: "Executable",
			loading: "Checking…",
			failed: "Could not read status.",
			picker: "Subagent model",
			pickerHelp: "Applies only to cursor_agent. Same three controls as Cursor: effort, Fast, and model. Click Apply before the next run. auto follows the CLI default.",
			effort: "Effort",
			effortLow: "Low",
			effortMedium: "Medium",
			effortHigh: "High",
			effortXhigh: "Extra High",
			effortMax: "Max",
			options: "Options",
			fast: "Fast",
			model: "Model",
			using: "Will use",
			modelCustom: "Or type a full model id",
			modelApply: "Apply",
			pickerPending: "Not applied yet. The next run still uses the saved model.",
			modelUnavailable: "This setting cannot be changed right now. Restart DeepSeek Harness and try again.",
			saveFailed: "Could not save. Restart DeepSeek Harness and click Apply again.",
		};
		const EFFORT_KEYS = { low: "effortLow", medium: "effortMedium", high: "effortHigh", xhigh: "effortXhigh", max: "effortMax" };
		const card = { marginTop: 16, border: "1px solid var(--dsw-alias-border, #333)", borderRadius: 10, background: "var(--dsw-alias-bg-elevated, #1e1e1e)", overflow: "hidden" };
		const heading = { padding: "10px 12px 4px", fontSize: 11, letterSpacing: 0.4, textTransform: "uppercase", color: "var(--dsw-alias-text-secondary, #888)" };
		const row = { padding: "8px 12px 12px" };
		const divider = { height: 1, background: "var(--dsw-alias-border, #333)" };
		function choiceFrom(status) {
			if (status !== "loading" && status !== "error") {
				return { model: status.model, effort: status.effort, fast: status.fast === true };
			}
			return { model: "auto", effort: "high", fast: false };
		}
		function sameChoice(a, b) {
			return a.model === b.model && a.effort === b.effort && a.fast === b.fast;
		}
		function previewComposed(choice, status) {
			if (choice.model === "auto") return "auto";
			const family = status.families.find((item) => item.id === choice.model);
			if (!family) return choice.model;
			const effort = family.efforts.includes(choice.effort)
				? choice.effort
				: family.efforts.includes("high")
					? "high"
					: (family.efforts[0] || choice.effort);
			const fast = family.hasFast && choice.fast;
			const listed = family.efforts.length === 0
				? (fast ? choice.model + "-fast" : choice.model)
				: choice.model + "-" + effort + (fast ? "-fast" : "");
			if (status.models.some((item) => item.id === listed)) return listed;
			if (family.efforts.length > 0) {
				return choice.model + "[effort=" + effort + ",fast=" + (fast ? "true" : "false") + "]";
			}
			return listed;
		}
		function CursorAcpSection(props) {
			const { t, loadStatus, saveSettings } = props;
			const [status, setStatus] = React.useState("loading");
			const [custom, setCustom] = React.useState("");
			const [draft, setDraft] = React.useState(null);
			const [saveError, setSaveError] = React.useState(false);
			React.useEffect(() => {
				let cancelled = false;
				void loadStatus().then(
					(next) => { if (!cancelled) setStatus(next); },
					() => { if (!cancelled) setStatus("error"); },
				);
				return () => { cancelled = true; };
			}, [loadStatus]);
			const writable = status !== "loading" && status !== "error";
			const saved = choiceFrom(status);
			const choice = draft || saved;
			const dirty = draft !== null && !sameChoice(draft, saved);
			const families = status !== "loading" && status !== "error" ? status.families : [{ id: "auto", label: "Auto", efforts: [], hasFast: false }];
			const family = families.find((item) => item.id === choice.model) || families[0];
			const efforts = family && family.efforts ? family.efforts : [];
			const showEffort = choice.model !== "auto" && efforts.length > 0;
			const showFast = choice.model !== "auto" && family && family.hasFast === true;
			const composed = status !== "loading" && status !== "error" ? previewComposed(choice, status) : choice.model;
			const setField = (field, value) => { setDraft({ ...choice, [field]: value }); };
			const applyChoice = (next) => {
				void (async () => {
					try {
						const savedNext = await saveSettings(next);
						setStatus(savedNext);
						setDraft(null);
						setSaveError(false);
					} catch {
						setSaveError(true);
					}
				})();
			};
			return jsxs("section", {
				style: { maxWidth: 640, padding: "8px 0" },
				children: [
					jsx("h2", { style: { fontSize: 18, margin: "0 0 8px" }, children: t("title") }),
					jsx("p", { style: { margin: "0 0 12px", lineHeight: 1.5 }, children: t("intro") }),
					jsx("p", { style: { margin: "0 0 12px", lineHeight: 1.5 }, children: t("proxyHint") }),
					status === "loading" ? jsx("p", { children: t("loading") }) : null,
					status === "error" ? jsx("p", { style: { color: "var(--dsw-alias-danger, #c00)" }, children: t("failed") }) : null,
					status !== "loading" && status !== "error" ? jsxs(Fragment, { children: [
						jsx("p", { children: status.found ? t("found") : t("missing") }),
						status.command !== undefined ? jsxs("p", { children: [t("command"), ": ", jsx("code", { children: status.command })] }) : null,
						jsx("h3", { style: { fontSize: 15, margin: "20px 0 6px" }, children: t("picker") }),
						jsx("p", { style: { margin: "0 0 8px", lineHeight: 1.5 }, children: t("pickerHelp") }),
						jsxs("div", { style: card, children: [
							showEffort ? jsxs(Fragment, { children: [
								jsx("div", { style: heading, children: t("effort") }),
								jsx("div", { style: { ...row, display: "flex", flexWrap: "wrap", gap: 8 }, children: efforts.map((effort) => {
									const selected = choice.effort === effort;
									const key = EFFORT_KEYS[effort] || "effortHigh";
									return jsxs("button", {
										type: "button",
										disabled: !writable,
										onClick: () => setField("effort", effort),
										style: {
											padding: "6px 12px",
											borderRadius: 8,
											border: selected ? "1px solid var(--dsw-alias-accent, #5BB73B)" : "1px solid var(--dsw-alias-border, #444)",
											background: selected ? "color-mix(in srgb, var(--dsw-alias-accent, #5BB73B) 18%, transparent)" : "transparent",
											color: "var(--dsw-alias-text, inherit)",
											cursor: writable ? "pointer" : "default",
										},
										children: [t(key), selected ? " ✓" : ""],
									}, effort);
								}) }),
								jsx("div", { style: divider }),
							] }) : null,
							showFast ? jsxs(Fragment, { children: [
								jsx("div", { style: heading, children: t("options") }),
								jsxs("label", { style: { ...row, display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [
									jsx("span", { children: t("fast") }),
									jsx("input", { type: "checkbox", role: "switch", checked: choice.fast, disabled: !writable, onChange: (event) => setField("fast", event.target.checked) }),
								] }),
								jsx("div", { style: divider }),
							] }) : null,
							jsx("div", { style: heading, children: t("model") }),
							jsxs("div", { style: row, children: [
								jsx("select", {
									value: choice.model,
									disabled: !writable,
									onChange: (event) => setField("model", event.target.value),
									style: { width: "100%", padding: "6px 8px" },
									children: families.map((item) => jsx("option", { value: item.id, children: item.label }, item.id)),
								}),
								jsxs("div", { style: { marginTop: 8, display: "flex", gap: 8, alignItems: "center" }, children: [
									jsxs("p", { style: { margin: 0, flex: 1, fontSize: 12, color: "var(--dsw-alias-text-secondary, #888)" }, children: [
										t("using"), ": ", jsx("code", { children: composed }),
									] }),
									jsx("button", { type: "button", disabled: !writable || !dirty, onClick: () => applyChoice(choice), children: t("modelApply") }),
								] }),
								dirty ? jsx("p", { style: { margin: "8px 0 0", fontSize: 12, color: "var(--dsw-alias-text-secondary, #888)" }, children: t("pickerPending") }) : null,
							] }),
						] }),
						jsxs("div", { style: { marginTop: 10, display: "flex", gap: 8, alignItems: "center" }, children: [
							jsx("input", { "aria-label": t("modelCustom"), placeholder: t("modelCustom"), value: custom, disabled: !writable, onChange: (event) => setCustom(event.target.value), style: { flex: 1, minWidth: 180, padding: "4px 8px" } }),
							jsx("button", { type: "button", disabled: !writable || custom.trim() === "", onClick: () => { const next = custom.trim(); setCustom(""); applyChoice({ model: next, effort: choice.effort, fast: choice.fast }); }, children: t("modelApply") }),
						] }),
						saveError ? jsx("p", { style: { marginTop: 8, color: "var(--dsw-alias-danger, #c00)" }, children: t("saveFailed") }) : null,
						jsx("p", { children: t(typeof navigator !== "undefined" && /Win/i.test(navigator.platform) ? "installWin" : "installUnix") }),
						jsx("p", { children: t("login") }),
					] }) : null,
				],
			});
		}
		const NS = "settings.cursor-acp";
		const STATUS_PATH = "/plugins/dsh-cursor-acp/status";
		async function loadStatus() {
			const response = await fetch(STATUS_PATH, { headers: { accept: "application/json" } });
			if (!response.ok) throw new Error("status " + String(response.status));
			return await response.json();
		}
		async function saveSettings(next) {
			const response = await fetch(STATUS_PATH, {
				method: "POST",
				headers: { accept: "application/json", "content-type": "application/json" },
				body: JSON.stringify(next),
			});
			if (!response.ok) throw new Error("save " + String(response.status));
			return await response.json();
		}
		const name = "dsh-cursor-acp-client";
		const inject = ["slots", "locale"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh, en }), "dsh-cursor-acp: dictionaries");
			const t = ctx.locale.bind(NS);
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "cursor-acp",
				order: 26,
				label: () => t("nav"),
				locale: NS,
				inject: () => ({ t: (key) => t(key), loadStatus, saveSettings }),
			}, CursorAcpSection));
		}
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
