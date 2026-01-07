/* eslint-disable no-console */
import { getPosts } from "src/apis"
import { syncAiTranslations } from "src/libs/server/aiTranslations"

const run = async () => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to generate AI translations.")
  }
  if (!process.env.NOTION_API_TOKEN) {
    throw new Error(
      "NOTION_API_TOKEN is required to sync translations to Notion."
    )
  }
  if (!process.env.NOTION_PAGE_ID) {
    throw new Error(
      "NOTION_PAGE_ID is required to identify the Notion database."
    )
  }

  // Force translation generation
  process.env.AI_TRANSLATIONS_BACKGROUND = "0"
  process.env.AI_TRANSLATIONS_DISABLED = ""

  console.info("[ai-translation] Starting AI translation sync...")

  const posts = await getPosts()
  const before = Date.now()
  await syncAiTranslations(posts)
  const elapsed = ((Date.now() - before) / 1000).toFixed(1)

  console.info(`[ai-translation] Sync completed. Duration: ${elapsed}s`)
}

run().catch((error) => {
  console.error("[ai-translation] Fatal error:", error)
  process.exit(1)
})
