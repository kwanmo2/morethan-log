import type { MetadataRoute } from "next"

import { getPosts } from "src/apis"
import { filterPosts, mergePostsByLanguage } from "src/libs/utils/notion"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import { syncAiTranslations } from "src/libs/server/aiTranslations"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://slowbeam.vercel.app"
  const posts = await getPosts()
  const postsWithTranslations = await syncAiTranslations(posts)
  const filteredPosts = mergePostsByLanguage(filterPosts(postsWithTranslations), DEFAULT_LANGUAGE)

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ]

  const postRoutes: MetadataRoute.Sitemap = filteredPosts.map((post) => ({
    url: `${baseUrl}/${post.slug}`,
    lastModified: new Date(post.date?.start_date || post.createdTime || Date.now()),
    changeFrequency: "monthly",
    priority: 0.8,
  }))

  return [...staticRoutes, ...postRoutes]
}
