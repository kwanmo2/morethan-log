/* eslint-disable no-console */
const fs = require("node:fs")
const path = require("node:path")
const Module = require("module")
const ts = require("typescript")

// Add project root to module resolution paths so absolute imports (e.g., "src/..." or "site.config") work.
const projectRoot = path.resolve(__dirname, "..")
process.env.NODE_PATH = [projectRoot, process.env.NODE_PATH || ""]
  .filter(Boolean)
  .join(path.delimiter)
Module._initPaths()

// Minimal TypeScript loader for .ts/.tsx
const registerTs = (ext) => {
  Module._extensions[ext] = function transpile(module, filename) {
    const source = fs.readFileSync(filename, "utf8")
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        resolveJsonModule: true,
        allowJs: true,
      },
      fileName: filename,
    })
    return module._compile(transpiled.outputText, filename)
  }
}

registerTs(".ts")
registerTs(".tsx")

const { getPosts } = require("src/apis")
const { syncAiTranslations } = require("src/libs/server/aiTranslations")

const run = async () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to generate AI translations.")
  }

  // Force translation generation even if build-time deferral is enabled.
  process.env.AI_TRANSLATIONS_BACKGROUND = "0"
  process.env.AI_TRANSLATIONS_DISABLED = ""

  const posts = await getPosts()
  const before = Date.now()
  const postsWithTranslations = await syncAiTranslations(posts)
  const elapsed = ((Date.now() - before) / 1000).toFixed(1)

  const translationCount = postsWithTranslations.filter(
    (post) => post.language?.includes("en") && post.isAiTranslation
  ).length

  console.info(
    `Generated/ensured AI translations. English drafts available: ${translationCount}. Duration: ${elapsed}s.`
  )
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
