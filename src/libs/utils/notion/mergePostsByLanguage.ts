import {
  extractPostLanguage,
  normalizeLanguageCode,
  sanitizePostBase,
} from "src/libs/utils/language"
import { TPost, TPostBase } from "src/types"

export const mergePostsByLanguage = (
  posts: TPost[],
  defaultLanguage: string
): TPost[] => {
  const grouped = new Map<string, TPostBase[]>()
  const order: string[] = []

  posts.forEach((post) => {
    if (!post.slug) return
    if (!grouped.has(post.slug)) {
      grouped.set(post.slug, [])
      order.push(post.slug)
    }

    const currentGroup = grouped.get(post.slug)!
    currentGroup.push(sanitizePostBase(post))
  })

  return order.map((slug) => {
    const group = grouped.get(slug) ?? []
    if (!group.length) throw new Error("Post group cannot be empty")

    const normalizedDefault = normalizeLanguageCode(defaultLanguage) ?? defaultLanguage

    const primary =
      group.find(
        (candidate) => extractPostLanguage(candidate) === normalizedDefault
      ) || group[0]

    const translations = group
      .filter((candidate) => candidate.id !== primary.id)
      .map((candidate) => ({ ...candidate }))

    return {
      ...primary,
      translations,
    }
  })
}
