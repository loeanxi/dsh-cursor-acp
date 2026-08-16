/**
 * Config handed to the official ACP provider. Kept as a pure function so
 * tests can see that proxy env actually reaches the child.
 */
import { withModelArgs } from './models.js';
import { proxyChildEnv } from './proxy-env.js';
/**
 * Build the ACP child mount. `env` is the explicit proxy slice, not the
 * whole parent process env.
 * @param command - spawnable Cursor CLI (`node.exe` or `agent`).
 * @param args - args that end with `acp`.
 * @param model - composed `--model` id (`auto` omits the flag).
 * @param env - parent process env to slice proxy names from.
 */
export function cursorAcpProviderConfig(command, args, model, env) {
    return {
        providerName: 'cursor',
        command,
        args: withModelArgs(args, model),
        permission: 'allow',
        env: proxyChildEnv(env),
    };
}
