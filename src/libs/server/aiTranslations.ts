import { ExtendedRecordMap } from "notion-types"
import { getTextContent } from "notion-utils"

import { getRecordMap } from "src/apis"
import {
  normalizeLanguageCode,
  sanitizePostBase,
} from "src/libs/utils/language"
import { TPost, TPostBase } from "src/types"

const LANGUAGE_CODE = "en"
const SKIPPED_BLOCK_TYPES = new Set(["code", "equation"])
const TEXT_PROPERTY_KEYS = ["title", "caption"] as const
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
const TRANSLATION_BATCH_SIZE = 60
const NOTION_API_VERSION = "2022-06-28"

type TextSegment = {
  blockId: string
  property: (typeof TEXT_PROPERTY_KEYS)[number]
  index: number
  text: string
}

type TranslationResult = {
  translation: TPost
  recordMap: ExtendedRecordMap
  sourcePostId: string
}

type NotionSyncConfig = {
  apiToken: string
  databaseId: string
}

const cloneRecordMap = (recordMap: ExtendedRecordMap): ExtendedRecordMap => {
  if (typeof structuredClone === "function") {
    return structuredClone(recordMap)
  }
  return JSON.parse(JSON.stringify(recordMap))
}

const getNotionSyncConfig = (): NotionSyncConfig | null => {
  const apiToken = process.env.NOTION_API_TOKEN
  const databaseId = process.env.NOTION_PAGE_ID

  if (!apiToken || !databaseId) return null

  return { apiToken, databaseId }
}

const buildRichText = (text?: string) => {
  if (!text?.trim()) return null
  // Notion API limits rich_text content to 2000 characters
  const truncated = text.length > 2000 ? text.slice(0, 2000) : text
  return [{ type: "text", text: { content: truncated } }]
}

const buildChildrenFromRecordMap = (
  recordMap: ExtendedRecordMap,
  blockId: string
): any[] => {
  const blockValue = recordMap.block?.[blockId]?.value as any
  if (!blockValue) return []

  const children = (blockValue.content ?? []).flatMap((childId: string) =>
    buildChildrenFromRecordMap(recordMap, childId)
  )

  const text = getTextContent(blockValue.properties?.title || [])
  const richText = buildRichText(text)

  const withChildren = children.length ? { children } : undefined

  switch (blockValue.type) {
    case "text":
    case "paragraph":
      if (!richText) return children
      return [
        {
          type: "paragraph",
          paragraph: { rich_text: richText },
          ...withChildren,
        },
      ]
    case "heading_1":
      if (!richText) return children
      return [
        {
          type: "heading_1",
          heading_1: { rich_text: richText },
          ...withChildren,
        },
      ]
    case "heading_2":
      if (!richText) return children
      return [
        {
          type: "heading_2",
          heading_2: { rich_text: richText },
          ...withChildren,
        },
      ]
    case "heading_3":
      if (!richText) return children
      return [
        {
          type: "heading_3",
          heading_3: { rich_text: richText },
          ...withChildren,
        },
      ]
    case "bulleted_list":
    case "bulleted_list_item":
      if (!richText) return children
      return [
        {
          type: "bulleted_list_item",
          bulleted_list_item: { rich_text: richText },
          ...withChildren,
        },
      ]
    case "numbered_list":
    case "numbered_list_item":
      if (!richText) return children
      return [
        {
          type: "numbered_list_item",
          numbered_list_item: { rich_text: richText },
          ...withChildren,
        },
      ]
    case "quote":
      if (!richText) return children
      return [
        {
          type: "quote",
          quote: { rich_text: richText },
          ...withChildren,
        },
      ]
    case "toggle":
      if (!richText) return children
      return [
        {
          type: "toggle",
          toggle: { rich_text: richText },
          ...withChildren,
        },
      ]
    case "to_do":
      if (!richText) return children
      return [
        {
          type: "to_do",
          to_do: { rich_text: richText, checked: false },
          ...withChildren,
        },
      ]
    case "callout":
      if (!richText) return children
      return [
        {
          type: "callout",
          callout: { rich_text: richText },
          ...withChildren,
        },
      ]
    case "code":
      // Preserve code blocks without translation
      if (!blockValue.properties?.title) return children
      const codeText = getTextContent(blockValue.properties.title)
      const language = blockValue.properties?.language?.[0]?.[0] || "plain text"
      return [
        {
          type: "code",
          code: {
            rich_text: buildRichText(codeText) ?? [],
            language: language.toLowerCase(),
          },
        },
      ]
    case "divider":
      return [{ type: "divider", divider: {} }]
    default:
      return children
  }
}

const normalizeProperties = (post: TPost) => {
  const properties: Record<string, unknown> = {
    title: {
      title: buildRichText(post.title) ?? [
        { type: "text", text: { content: "" } },
      ],
    },
  }

  if (post.slug?.trim()) {
    properties.slug = { rich_text: buildRichText(post.slug) ?? [] }
  }

  if (post.summary?.trim()) {
    properties.summary = { rich_text: buildRichText(post.summary) ?? [] }
  }

  // Always set language to English for translated posts
  properties.language = {
    multi_select: [{ name: "en" }],
  }

  // Mark as AI translation
  properties.isAiTranslation = { checkbox: true }

  if (post.type?.length) {
    properties.type = {
      multi_select: post.type.map((entry) => ({ name: entry })),
    }
  }

  if (post.tags?.length) {
    properties.tags = {
      multi_select: post.tags.map((entry) => ({ name: entry })),
    }
  }

  if (post.category?.length) {
    properties.category = {
      multi_select: post.category.map((entry) => ({ name: entry })),
    }
  }

  if (post.status?.length) {
    properties.status = {
      multi_select: post.status.map((entry) => ({ name: entry })),
    }
  }

  if (post.date?.start_date) {
    properties.date = { date: { start: post.date.start_date } }
  }

  return properties
}

const notionRequest = async <T>(
  path: string,
  apiToken: string,
  options: RequestInit
): Promise<T> => {
  const response = await fetch(`https://api.notion.com/v1/${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
      "Notion-Version": NOTION_API_VERSION,
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Notion request failed: ${response.status} ${detail}`)
  }

  return (await response.json()) as T
}

const checkExistingEnglishTranslation = async (
  slug: string,
  config: NotionSyncConfig
): Promise<boolean> => {
  try {
    const response = await notionRequest<{ results: any[] }>(
      `databases/${config.databaseId}/query`,
      config.apiToken,
      {
        method: "POST",
        body: JSON.stringify({
          filter: {
            and: [
              { property: "slug", rich_text: { equals: slug } },
              { property: "language", multi_select: { contains: "en" } },
            ],
          },
        }),
      }
    )
    return response.results.length > 0
  } catch (error) {
    console.warn(
      `[ai-translation] Failed to check existing translation for "${slug}": ${(error as Error).message}`
    )
    return false
  }
}

const chunkArray = <T>(values: T[], size: number) => {
  const chunks: T[][] = []
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size))
  }
  return chunks
}

const publishTranslationToNotion = async (
  result: TranslationResult,
  config: NotionSyncConfig
) => {
  const rootBlock = result.recordMap.block?.[result.sourcePostId]?.value
  if (!rootBlock?.content?.length) {
    // Create page without content blocks
    const properties = normalizeProperties(result.translation)
    await notionRequest<{ id: string }>("pages", config.apiToken, {
      method: "POST",
      body: JSON.stringify({
        parent: { database_id: config.databaseId },
        properties,
      }),
    })
    return
  }

  const children = rootBlock.content.flatMap((childId: string) =>
    buildChildrenFromRecordMap(result.recordMap, childId)
  )

  const properties = normalizeProperties(result.translation)

  const page = await notionRequest<{ id: string }>("pages", config.apiToken, {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: config.databaseId },
      properties,
    }),
  })

  // Notion API limits appending to 100 blocks at a time
  const chunkedChildren = chunkArray(children, 100)
  for (const chunk of chunkedChildren) {
    if (!chunk.length) continue
    await notionRequest(`blocks/${page.id}/children`, config.apiToken, {
      method: "PATCH",
      body: JSON.stringify({ children: chunk }),
    })
  }
}

const collectTextSegments = (recordMap: ExtendedRecordMap): TextSegment[] => {
  const segments: TextSegment[] = []
  const blocks = recordMap.block ?? {}

  Object.entries(blocks).forEach(([blockId, block]) => {
    const value = block?.value as any
    if (!value || SKIPPED_BLOCK_TYPES.has(value.type)) {
      return
    }

    if (!value.properties) return

    TEXT_PROPERTY_KEYS.forEach((property) => {
      const entries = value.properties?.[property]
      if (!Array.isArray(entries)) return

      entries.forEach((entry: any, index: number) => {
        const text = entry?.[0]
        if (typeof text !== "string") return
        if (!text.trim()) return
        segments.push({ blockId, property, index, text })
      })
    })
  })

  return segments
}

const applyTranslationsToRecordMap = (
  recordMap: ExtendedRecordMap,
  segments: TextSegment[],
  translationMap: Map<string, string>
) => {
  const clone = cloneRecordMap(recordMap)
  segments.forEach(({ blockId, property, index, text }) => {
    const translated = translationMap.get(text)
    if (!translated) return
    const block = clone.block?.[blockId]?.value as any
    if (!block?.properties?.[property]?.[index]) return
    block.properties[property][index][0] = translated
  })
  return clone
}

class OpenAiTranslator {
  private readonly apiKey: string
  readonly model: string

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey
    this.model = model || DEFAULT_OPENAI_MODEL
  }

  private async translateBatch(texts: string[]) {
    if (!texts.length) return [] as string[]
    const body = {
      model: this.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a professional technical translator. Translate Korean into natural English while preserving markdown, inline code and punctuation. Return only valid JSON.",
        },
        {
          role: "user",
          content: `Translate each entry of this JSON array into English. Do not wrap the response in Markdown fences. Return a JSON object with a "translations" array that mirrors the input length. Input: ${JSON.stringify(
            texts
          )}`,
        },
      ],
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`OpenAI request failed: ${response.status} ${detail}`)
    }

    const payload = (await response.json()) as any
    const content = payload?.choices?.[0]?.message?.content
    if (typeof content !== "string") {
      throw new Error("Unexpected OpenAI response format")
    }

    let parsed: any
    try {
      parsed = JSON.parse(content)
    } catch (error) {
      throw new Error(
        `Failed to parse OpenAI response: ${(error as Error).message}`
      )
    }

    const translations = parsed?.translations
    if (!Array.isArray(translations)) {
      throw new Error("OpenAI response length mismatch")
    }

    return translations
  }

  private async translateStrings(texts: string[]) {
    const chunks = chunkArray(texts, TRANSLATION_BATCH_SIZE)
    const results: string[] = []
    for (const chunk of chunks) {
      const translated = await this.translateChunk(chunk)
      results.push(...translated)
    }
    return results
  }

  private async translateSingle(text: string) {
    const [result] = await this.translateBatch([text]).catch(() => [text])
    return typeof result === "string" && result.trim().length > 0
      ? result
      : text
  }

  private async translateChunk(texts: string[]) {
    if (!texts.length) return [] as string[]

    const translations = await this.translateBatch(texts)

    if (!Array.isArray(translations)) {
      throw new Error("OpenAI response length mismatch")
    }

    if (translations.length !== texts.length) {
      console.warn(
        `[ai-translation] OpenAI response length mismatch (expected ${texts.length}, received ${translations.length}). Attempting to backfill missing entries.`
      )
      const normalized = new Array<string | null>(texts.length).fill(null)
      texts.forEach((_, index) => {
        normalized[index] = translations[index] ?? null
      })

      const results: string[] = []
      for (let i = 0; i < texts.length; i++) {
        const entry = normalized[i]
        if (typeof entry === "string" && entry.trim().length > 0) {
          results.push(entry)
          continue
        }

        const fallback = await this.translateSingle(texts[i])
        results.push(fallback)
      }
      return results
    }

    return texts.map((text, index) => {
      const entry = translations[index]
      if (typeof entry === "string" && entry.trim().length > 0) return entry
      return text
    })
  }

  async createTranslation(post: TPost): Promise<TranslationResult> {
    if (!post.slug) {
      throw new Error("Post slug is required for translation")
    }

    const base = sanitizePostBase(post)
    const recordMap = await getRecordMap(post.id)
    const segments = collectTextSegments(recordMap)

    const metadataTexts: { key: "title" | "summary"; text: string }[] = []
    if (base.title?.trim()) {
      metadataTexts.push({ key: "title", text: base.title })
    }
    if (base.summary?.trim()) {
      metadataTexts.push({ key: "summary", text: base.summary })
    }

    const allTexts = [
      ...segments.map((segment) => segment.text),
      ...metadataTexts.map((meta) => meta.text),
    ]

    const uniqueTexts = Array.from(
      new Set(allTexts.filter((text) => text && text.trim().length > 0))
    )

    const translationMap = new Map<string, string>()
    if (uniqueTexts.length) {
      const translatedStrings = await this.translateStrings(uniqueTexts)
      uniqueTexts.forEach((text, index) => {
        translationMap.set(text, translatedStrings[index])
      })
    }

    const translatedRecordMap = applyTranslationsToRecordMap(
      recordMap,
      segments,
      translationMap
    )

    const translatedTitle = translationMap.get(base.title) ?? base.title
    const translatedSummary = base.summary
      ? (translationMap.get(base.summary) ?? base.summary)
      : undefined

    const translationPost: TPost = {
      ...(base as TPostBase),
      id: `${post.id}-${LANGUAGE_CODE}`,
      title: translatedTitle,
      summary: translatedSummary,
      language: [LANGUAGE_CODE],
      isAiTranslation: true,
    }

    return {
      translation: translationPost,
      recordMap: translatedRecordMap,
      sourcePostId: post.id,
    }
  }
}

const hasEnglishTranslation = (posts: TPost[]) => {
  return posts.some((post) =>
    (post.language ?? []).some(
      (language) => normalizeLanguageCode(language) === LANGUAGE_CODE
    )
  )
}

const groupPostsBySlug = (posts: TPost[]) => {
  const grouped = new Map<string, TPost[]>()
  posts.forEach((post) => {
    if (!post.slug) return
    const group = grouped.get(post.slug)
    if (group) {
      group.push(post)
    } else {
      grouped.set(post.slug, [post])
    }
  })
  return grouped
}

const selectKoreanOnlyPost = (posts: TPost[]): TPost | null => {
  return (
    posts.find((post) => {
      const lang = post.language?.[0]
      // Skip if language is empty (user requested to ignore these)
      if (!lang) return false
      return normalizeLanguageCode(lang) === "ko"
    }) || null
  )
}

export const syncAiTranslations = async (posts: TPost[]) => {
  // Skip translation sync on Vercel builds - translations are created via GitHub Actions
  // and already exist in the Notion database
  if (process.env.VERCEL === "1") {
    return posts
  }

  const config = getNotionSyncConfig()
  if (!config) {
    console.warn(
      "[ai-translation] Missing NOTION_API_TOKEN or NOTION_PAGE_ID. Skipping sync."
    )
    return posts
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.warn("[ai-translation] Missing OPENAI_API_KEY. Skipping sync.")
    return posts
  }

  const grouped = groupPostsBySlug(posts)
  const translator = new OpenAiTranslator(apiKey, process.env.OPENAI_MODEL)
  let translatedCount = 0
  let skippedCount = 0

  for (const [slug, groupPosts] of grouped.entries()) {
    // Skip if already has English translation in the fetched posts
    if (hasEnglishTranslation(groupPosts)) {
      continue
    }

    // Find Korean-only post (skip if language is empty)
    const source = selectKoreanOnlyPost(groupPosts)
    if (!source) {
      continue
    }

    // Check if English version already exists in Notion DB
    const existsInNotion = await checkExistingEnglishTranslation(slug, config)
    if (existsInNotion) {
      console.info(
        `[ai-translation] Skipped "${slug}" - English version already exists in Notion`
      )
      skippedCount++
      continue
    }

    // Generate translation and publish to Notion
    try {
      console.info(`[ai-translation] Translating "${slug}"...`)
      const result = await translator.createTranslation(source)
      await publishTranslationToNotion(result, config)
      translatedCount++
      console.info(
        `[ai-translation] Created English version for "${slug}" in Notion`
      )
    } catch (error) {
      console.error(
        `[ai-translation] Failed to translate "${slug}": ${(error as Error).message}`
      )
    }
  }

  console.info(
    `[ai-translation] Summary: ${translatedCount} translated, ${skippedCount} skipped (already exists)`
  )

  return posts
}
