import { PostContent, PostDetail, TPost, TPostBase } from "src/types"

const LANGUAGE_ALIASES: Record<string, string> = {
  korean: "ko",
  kor: "ko",
  ko: "ko",
  "ko-kr": "ko",
  "ko_kR": "ko",
  "ko_kor": "ko",
  english: "en",
  eng: "en",
  en: "en",
  "en-us": "en",
  "en-gb": "en",
}

const normalizeKey = (value: string) => value.toLowerCase()

export const normalizeLanguageCode = (value?: string | null) => {
  if (!value) return undefined
  const key = normalizeKey(value)
  return LANGUAGE_ALIASES[key] ?? key
}

export const ensureLanguageArray = (value?: string | string[] | null) => {
  if (!value) return undefined
  if (Array.isArray(value)) {
    const filtered = value.filter(Boolean)
    return filtered.length ? filtered : undefined
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [value]
  }
  return undefined
}

export const deriveDefaultLanguage = (value?: string) => {
  if (!value) return "ko"
  const normalized = normalizeLanguageCode(value)
  if (normalized) return normalized
  const splitted = value.split(/[-_]/)[0]
  const fallback = normalizeLanguageCode(splitted)
  return fallback ?? "ko"
}

export const extractPostLanguage = (post: { language?: string[] }) => {
  const [first] = post.language ?? []
  return normalizeLanguageCode(first)
}

export const getPostLanguages = (post: { language?: string[] }) => {
  return Array.from(
    new Set(
      (post.language ?? [])
        .map((language) => normalizeLanguageCode(language))
        .filter((language): language is string => Boolean(language))
    )
  )
}

const findContentByLanguage = <T extends { language?: string[] }>(
  contents: T[],
  language: string
) => {
  const normalizedTarget = normalizeLanguageCode(language)
  if (!normalizedTarget) return undefined

  return (
    contents.find((content) => {
      const languages = getPostLanguages(content)
      return languages.length === 1 && languages[0] === normalizedTarget
    }) ||
    contents.find((content) => getPostLanguages(content).includes(normalizedTarget))
  )
}

export const collectPostContents = (post: PostDetail): PostContent[] => {
  const { translations = [], ...baseContent } = post
  return [baseContent as PostContent, ...translations]
}

export const selectContentByLanguage = <T extends { language?: string[] }>(
  contents: T[],
  language: string,
  fallbackLanguage: string
) => {
  const normalizedTarget = normalizeLanguageCode(language) ?? fallbackLanguage
  const fallback = findContentByLanguage(contents, fallbackLanguage)

  return (
    findContentByLanguage(contents, normalizedTarget) || fallback || contents[0]
  )
}

export const availableLanguagesFromContents = (contents: PostContent[]) => {
  return Array.from(
    new Set(
      contents.flatMap((content) => getPostLanguages(content))
    )
  )
}

type PostWithOptionalTranslations = TPostBase & { translations?: TPostBase[] }

export const sanitizePostBase = (post: PostWithOptionalTranslations): TPostBase => {
  const { translations: _translations, ...rest } = post
  return rest
}

export const selectPostBaseByLanguage = (
  post: TPost,
  language: string,
  fallbackLanguage: string
): TPostBase => {
  const { translations = [], ...baseContent } = post
  const options: TPostBase[] = [
    sanitizePostBase(baseContent as TPostBase),
    ...translations.map((translation) => sanitizePostBase(translation)),
  ]

  const normalizedTarget = normalizeLanguageCode(language) ?? fallbackLanguage

  const fallback = findContentByLanguage(options, fallbackLanguage)

  return (
    findContentByLanguage(options, normalizedTarget) || fallback || options[0]
  )
}
