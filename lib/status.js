/**
 * Build the public status payload.
 * @param resolved - locate result.
 * @param extras - current picker state and account listing.
 * @param platform - `process.platform` (tests stub).
 */
export function cursorAcpStatus(resolved, extras = {}, platform = process.platform) {
    const installHint = platform === 'win32'
        ? "irm 'https://cursor.com/install?win32=true' | iex   then: agent login"
        : 'curl https://cursor.com/install -fsS | bash   then: agent login';
    const model = extras.model ?? 'auto';
    const effort = extras.effort ?? 'high';
    const fast = extras.fast === true;
    const models = extras.models ?? [{ id: 'auto', label: 'Auto' }];
    const families = extras.families ?? [{ id: 'auto', label: 'Auto', efforts: [], hasFast: false }];
    const composedModel = extras.composedModel ?? model;
    const login = extras.login ?? 'unknown';
    const proxy = extras.proxy ?? 'missing';
    const clashDirectNode = extras.clashDirectNode === true;
    const hostPluginError = extras.hostPluginError;
    if (resolved === undefined) {
        return {
            found: false, toolName: 'cursor_agent', installHint, login, proxy, clashDirectNode,
            ...hostPluginError === undefined ? {} : { hostPluginError },
            model, effort, fast, composedModel, models, families,
        };
    }
    return {
        found: true,
        command: resolved.command,
        source: resolved.source,
        toolName: 'cursor_agent',
        installHint,
        login,
        proxy,
        clashDirectNode,
        ...hostPluginError === undefined ? {} : { hostPluginError },
        model,
        effort,
        fast,
        composedModel,
        models,
        families,
    };
}
