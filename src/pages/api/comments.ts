import { randomUUID } from "crypto"
import type { NextApiRequest, NextApiResponse } from "next"

import { appendComment, fetchComments } from "src/libs/comments"
import { verifyGoogleIdToken } from "src/libs/google/verifyIdToken"
import type {
  CommentResponse,
  CreateCommentRequest,
  StoredComment,
} from "src/types/comment"

const MAX_COMMENT_LENGTH = 2000

const parseRequestBody = (body: unknown): CreateCommentRequest | null => {
  if (!body || typeof body !== "object") return null

  const value = body as Partial<CreateCommentRequest>

  if (
    typeof value.postId !== "string" ||
    typeof value.postSlug !== "string" ||
    typeof value.postTitle !== "string" ||
    typeof value.content !== "string"
  ) {
    return null
  }

  return {
    postId: value.postId.trim(),
    postSlug: value.postSlug.trim(),
    postTitle: value.postTitle.trim(),
    content: value.content.trim(),
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CommentResponse | StoredComment | { message: string }>
) {
  if (req.method === "GET") {
    const slugParam = req.query.slug

    if (!slugParam || typeof slugParam !== "string") {
      return res.status(400).json({ message: "Missing slug" })
    }

    const comments = await fetchComments(slugParam)
    return res.status(200).json({ comments })
  }

  if (req.method === "POST") {
    try {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing credentials" })
      }

      const token = authHeader.replace("Bearer ", "")
      const payload = await verifyGoogleIdToken(token)
      const body = parseRequestBody(req.body)

      if (!body) {
        return res.status(400).json({ message: "Invalid request body" })
      }

      if (!body.content) {
        return res.status(400).json({ message: "Comment cannot be empty" })
      }

      if (body.content.length > MAX_COMMENT_LENGTH) {
        return res.status(400).json({ message: "Comment is too long" })
      }

      const comment: StoredComment = {
        id: randomUUID(),
        postId: body.postId,
        postSlug: body.postSlug,
        postTitle: body.postTitle,
        content: body.content,
        createdAt: new Date().toISOString(),
        author: {
          id: payload.sub,
          name: payload.name || payload.email || "Anonymous",
          picture: payload.picture,
          email: payload.email,
        },
      }

      await appendComment(body.postSlug, comment)

      return res.status(201).json(comment)
    } catch (error) {
      console.error("Failed to create comment", error)
      return res.status(401).json({ message: "Invalid Google authentication" })
    }
  }

  res.setHeader("Allow", "GET,POST")
  return res.status(405).json({ message: "Method Not Allowed" })
}
