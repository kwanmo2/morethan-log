import { runRedisCommand } from "src/libs/upstash"
import type { StoredComment } from "src/types/comment"

const COMMENT_PREFIX = "comments:"

const getCommentKey = (slug: string) => `${COMMENT_PREFIX}${slug}`

export const fetchComments = async (slug: string) => {
  const key = getCommentKey(slug)
  const raw = (await runRedisCommand(["GET", key])) as string | null
  if (!raw) return [] as StoredComment[]

  try {
    const parsed = JSON.parse(raw) as StoredComment[]
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error("Failed to parse stored comments", error)
    return []
  }
}

export const storeComments = async (slug: string, comments: StoredComment[]) => {
  const key = getCommentKey(slug)
  await runRedisCommand(["SET", key, JSON.stringify(comments)])
}

export const appendComment = async (slug: string, comment: StoredComment) => {
  const comments = await fetchComments(slug)
  comments.push(comment)
  await storeComments(slug, comments)
}
