import fs from "node:fs/promises"
import path from "node:path"

import { ExtendedRecordMap } from "notion-types"

import { getRecordMap } from "src/apis"
import {
  normalizeLanguageCode,
  sanitizePostBase,
} from "src/libs/utils/language"
import { TPost, TPostBase } from "src/types"

const AI_TRANSLATIONS_DIR = path.join(process.cwd(), "data", "ai-translations")
const LANGUAGE_CODE = "en"
const SKIPPED_BLOCK_TYPES = new Set(["code", "equation"])
const TEXT_PROPERTY_KEYS = ["title", "caption"] as const
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
const TRANSLATION_BATCH_SIZE = 60

type TextSegment = {
  blockId: string
  property: (typeof TEXT_PROPERTY_KEYS)[number]
  index: number
  text: string
}

type TranslationMetadata = {
  slug: string
  sourcePostId: string
  generatedAt: string
  model: string
  translation: TPost
  recordMap: ExtendedRecordMap
}

let cachedTranslations: TranslationMetadata[] | null = null

const cloneRecordMap = (recordMap: ExtendedRecordMap): ExtendedRecordMap => {
  if (typeof structuredClone === "function") {
    return structuredClone(recordMap)
  }
  return JSON.parse(JSON.stringify(recordMap))
}

const sanitizeFileName = (slug: string) => slug.replace(/[^a-zA-Z0-9-_]/g, "-")

const buildFilePath = (slug: string) =>
  path.join(AI_TRANSLATIONS_DIR, `${sanitizeFileName(slug)}-${LANGUAGE_CODE}.json`)

const ensureDirectory = async () => {
  await fs.mkdir(AI_TRANSLATIONS_DIR, { recursive: true })
}

const readStoredTranslations = async () => {
  if (cachedTranslations) return cachedTranslations
  try {
    await ensureDirectory()
    const files = await fs.readdir(AI_TRANSLATIONS_DIR)
    const jsonFiles = files.filter((file) => file.endsWith(".json"))
    const parsed = await Promise.all(
      jsonFiles.map(async (file) => {
        const fullPath = path.join(AI_TRANSLATIONS_DIR, file)
        const raw = await fs.readFile(fullPath, "utf8")
        return JSON.parse(raw) as TranslationMetadata
      })
    )
    cachedTranslations = parsed
    return parsed
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException
    if (nodeError.code === "ENOENT") {
      cachedTranslations = []
      return []
    }
    throw error
  }
}

const writeTranslationFile = async (translation: TranslationMetadata) => {
  await ensureDirectory()
  const filePath = buildFilePath(translation.slug)
  await fs.writeFile(filePath, JSON.stringify(translation, null, 2), "utf8")
  cachedTranslations = cachedTranslations
    ? [
        ...cachedTranslations.filter(
          (entry) => entry.translation.id !== translation.translation.id
        ),
        translation,
      ]
    : [translation]
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

const chunkArray = <T,>(values: T[], size: number) => {
  const chunks: T[][] = []
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size))
  }
  return chunks
}

class OpenAiTranslator {
  private readonly apiKey: string
  readonly model: string

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey
    this.model = model || DEFAULT_OPENAI_MODEL
  }

  private async translateChunk(texts: string[]) {
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
          content:
            `Translate each entry of this JSON array into English. Do not wrap the response in Markdown fences. Return a JSON object with a \"translations\" array that mirrors the input length. Input: ${JSON.stringify(
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
      throw new Error(`Failed to parse OpenAI response: ${(error as Error).message}`)
    }

    const translations = parsed?.translations
    if (!Array.isArray(translations) || translations.length !== texts.length) {
      throw new Error("OpenAI response length mismatch")
    }

    return translations.map((entry: unknown, index: number) => {
      if (typeof entry === "string" && entry.trim().length > 0) return entry
      return texts[index]
    })
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

  async createTranslation(post: TPost) {
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
      ? translationMap.get(base.summary) ?? base.summary
      : undefined

    const translationPost: TPost = {
      ...(base as TPostBase),
      id: `${post.id}-${LANGUAGE_CODE}`,
      title: translatedTitle,
      summary: translatedSummary,
      language: [LANGUAGE_CODE],
      isAiTranslation: true,
    }

    const file: TranslationMetadata = {
      slug: post.slug,
      sourcePostId: post.id,
      generatedAt: new Date().toISOString(),
      model: this.model,
      translation: translationPost,
      recordMap: translatedRecordMap,
    }

    return file
  }
}

const hasEnglishTranslation = (posts: TPost[]) => {
  return posts.some((post) =>
    (post.language ?? []).some((language) => normalizeLanguageCode(language) === LANGUAGE_CODE)
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

const selectSourcePost = (posts: TPost[]) => {
  return (
    posts.find((post) => normalizeLanguageCode(post.language?.[0]) !== LANGUAGE_CODE) || posts[0]
  )
}

export const syncAiTranslations = async (posts: TPost[]) => {
  const stored = await readStoredTranslations()
  const grouped = groupPostsBySlug(posts)
  const storedSlugs = new Set(stored.map((entry) => entry.slug))

  const pending: { slug: string; post: TPost }[] = []
  grouped.forEach((groupPosts, slug) => {
    if (hasEnglishTranslation(groupPosts)) return
    if (storedSlugs.has(slug)) return
    const source = selectSourcePost(groupPosts)
    if (!source) return
    pending.push({ slug, post: source })
  })

  const apiKey = process.env.OPENAI_API_KEY
  if (pending.length && !apiKey) {
    console.warn(
      `[ai-translation] Missing OPENAI_API_KEY. Unable to generate English versions for: ${pending
        .map((entry) => entry.slug)
        .join(", ")}`
    )
  }

  if (pending.length && apiKey) {
    const translator = new OpenAiTranslator(apiKey, process.env.OPENAI_MODEL)
    for (const entry of pending) {
      try {
        const translation = await translator.createTranslation(entry.post)
        await writeTranslationFile(translation)
        console.info(
          `[ai-translation] Generated English draft for "${entry.slug}" using ${translator.model}.`
        )
      } catch (error) {
        console.error(
          `[ai-translation] Failed to translate "${entry.slug}": ${(error as Error).message}`
        )
      }
    }
  }

  const updatedStore = await readStoredTranslations()
  const translations = updatedStore.map((entry) => entry.translation)

  return [...posts, ...translations]
}

export const loadAiTranslationRecordMap = async (translationId: string) => {
  const translations = await readStoredTranslations()
  const match = translations.find((entry) => entry.translation.id === translationId)
  return match?.recordMap ?? null
}
