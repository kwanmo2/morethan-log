export const queryKey = {
  scheme: () => ["scheme"],
  language: () => ["language"],
  posts: () => ["posts"],
  tags: () => ["tags"],
  categories: () => ["categories"],
  post: (slug: string) => ["post", slug],
  visitorStats: () => ["visitorStats"],
  comments: (slug: string) => ["comments", slug],
}
