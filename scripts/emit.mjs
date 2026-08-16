import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(join(fileURLToPath(new URL('.', import.meta.url)), '../../deepseek-harness/package.json'))
const ts = require('typescript')
const root = fileURLToPath(new URL('..', import.meta.url))

const files = [
  ['src/resolve-agent.ts', 'lib/resolve-agent.js'],
  ['src/status.ts', 'lib/status.js'],
  ['src/models.ts', 'lib/models.js'],
  ['src/list-models.ts', 'lib/list-models.js'],
  ['src/settings-schema.ts', 'lib/settings-schema.js'],
  ['src/import-host.ts', 'lib/import-host.js'],
  ['src/index.ts', 'lib/index.js'],
  ['src/bin.ts', 'lib/bin.js'],
]

for (const [src, dest] of files) {
  const input = readFileSync(join(root, src), 'utf8')
  const result = ts.transpileModule(input, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2024,
      jsx: ts.JsxEmit.ReactJSX,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
    },
    fileName: src,
  })
  const out = join(root, dest)
  const rewritten = result.outputText
    .replaceAll(/(\.\.?\/[^'"]+)\.tsx?(?=['"])/g, '$1.js')
  mkdirSync(dirname(out), { recursive: true })
  const body = rewritten.replace(/^#!.*\r?\n/, '')
  writeFileSync(out, dest.endsWith('bin.js') ? `#!/usr/bin/env node\n${body}` : body)
  process.stdout.write(`wrote ${dest}\n`)
}
