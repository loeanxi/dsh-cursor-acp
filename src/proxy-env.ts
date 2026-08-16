/**
 * Proxy env to forward onto Cursor CLI children. Values stay on the Host;
 * public status only reports names / kinds.
 */

const PROXY_URL_KEYS = ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy'] as const
const NO_PROXY_KEYS = ['NO_PROXY', 'no_proxy'] as const
const NODE_FLAG = 'NODE_USE_ENV_PROXY'

/**
 * Explicit child env: the five proxy names the user asked to forward.
 * If a proxy URL is set but `NODE_USE_ENV_PROXY` is missing, set it to `1`
 * so Node actually honours the URL.
 * @param env - parent process env.
 */
export function proxyChildEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const out: Record<string, string> = {}
  let hasUrl = false
  for (const key of PROXY_URL_KEYS) {
    const value = env[key]
    if (value === undefined || value.trim() === '') continue
    out[key] = value.trim()
    hasUrl = true
  }
  for (const key of NO_PROXY_KEYS) {
    const value = env[key]
    if (value === undefined || value.trim() === '') continue
    out[key] = value.trim()
  }
  const flag = env[NODE_FLAG]
  if (flag !== undefined && flag.trim() !== '') out[NODE_FLAG] = flag.trim()
  else if (hasUrl) out[NODE_FLAG] = '1'
  return out
}

/**
 * Env for `spawnSync` of the same CLI (models / status).
 * @param env - parent process env.
 */
export function spawnAgentEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return { ...env, ...proxyChildEnv(env) }
}
