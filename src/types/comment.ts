export type CommentAuthor = {
  id: string
  name: string
  picture?: string
  email?: string
}

export type StoredComment = {
  id: string
  postId: string
  postSlug: string
  postTitle: string
  content: string
  createdAt: string
  author: CommentAuthor
}

export type CommentResponse = {
  comments: StoredComment[]
}

export type CreateCommentRequest = {
  postId: string
  postSlug: string
  postTitle: string
  content: string
}
