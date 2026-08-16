/**
 * Minimal peer stubs so this package can typecheck without installing
 * unpublished `@deepseek-ai/*` packages from the npm registry.
 */

declare module '@deepseek-ai/cordis' {
  export interface Context {
    inject: (deps: string[], callback: (ctx: Context) => void) => void
    effect: (fn: () => (() => void) | void, name?: string) => void
    plugin: (mod: unknown, config?: unknown) => { dispose: () => void }
    systemPrompt: {
      section: (spec: {
        name: string
        order: number
        text: string | ((context: unknown) => string)
      }) => () => void
    }
    logger: {
      info: (message: string) => void
      warn: (message: string) => void
      error: (message: string) => void
    }
  }
}

declare module '@deepseek-ai/dsh-client-runtime/client' {
  export interface ClientContext {
    effect: (fn: () => (() => void) | void, name?: string) => void
    locale: {
      register: (ns: string, dicts: { zh: unknown; en: unknown }) => () => void
      bind: (ns: string) => (key: string) => string
    }
    slots: {
      inject: (name: string, factory: () => unknown) => void
      register: (slot: unknown, component: unknown) => () => void
    }
  }
}

declare module '@deepseek-ai/dsh-client-locale/client' {}

declare module '@deepseek-ai/dsh-client-ui-settings/client' {}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {}
}
