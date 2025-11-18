import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "src/constants/language"
import { normalizeLanguageCode } from "src/libs/utils/language"
import { TPostBase } from "src/types"

const DEFAULT_CATEGORY_SLUG = "uncategorized"

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim()

export const toKebabCase = (value: string) =>
  normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const normalizeSegment = (value?: string, fallback = "") => {
  if (!value) return fallback
  const transformed = toKebabCase(value)
  return transformed || fallback
}

export const buildCategorySlug = (categories?: string[]) => {
  const [primary] = categories ?? []
  return normalizeSegment(primary, DEFAULT_CATEGORY_SLUG)
}

export const buildPostSlug = (slug: string) => normalizeSegment(slug, slug)

export const buildLanguageSegment = (language?: string) => {
  const normalized = normalizeLanguageCode(language)
  if (normalized && SUPPORTED_LANGUAGES.includes(normalized as (typeof SUPPORTED_LANGUAGES)[number])) {
    return normalized
  }
  return DEFAULT_LANGUAGE
}

export const buildPostPath = (post: Pick<TPostBase, "slug" | "category">, language?: string) => {
  const languageSegment = buildLanguageSegment(language)
  const categorySegment = buildCategorySlug(post.category)
  const slugSegment = buildPostSlug(post.slug)

  return `/${languageSegment}/${categorySegment}/${slugSegment}`
}

export const buildPostCacheKey = (options: {
  slug: string
  category?: string
  language?: string
}) => {
  const languageSegment = buildLanguageSegment(options.language)
  const categorySegment = normalizeSegment(options.category, DEFAULT_CATEGORY_SLUG)
  const slugSegment = buildPostSlug(options.slug)
  return `${languageSegment}/${categorySegment}/${slugSegment}`
}

export const getCanonicalUrl = (path: string, siteUrl: string) => {
  const trimmedBase = siteUrl.replace(/\/+$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${trimmedBase}${normalizedPath}`
}
