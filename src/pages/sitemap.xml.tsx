import { getPosts } from "../apis/notion-client/getPosts"
import { CONFIG } from "site.config"
import { getServerSideSitemap, ISitemapField } from "next-sitemap"
import { GetServerSideProps } from "next"
import { filterPosts, mergePostsByLanguage } from "src/libs/utils/notion"
import { syncAiTranslations } from "src/libs/server/aiTranslations"
import {
  buildLanguageSegment,
  buildPostPath,
  getCanonicalUrl,
} from "src/libs/utils/paths"
import { extractPostLanguage } from "src/libs/utils/language"
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "src/constants/language"

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const posts = await getPosts()
  const postsWithTranslations = await syncAiTranslations(posts)
  const filteredPosts = filterPosts(postsWithTranslations)
  const mergedPosts = mergePostsByLanguage(filteredPosts, DEFAULT_LANGUAGE)

  const postPaths = mergedPosts.flatMap((post) => {
    const contents = [post, ...(post.translations ?? [])]
    return contents.map((content) => {
      const languageSegment = buildLanguageSegment(extractPostLanguage(content))
      const path = buildPostPath(content, languageSegment)
      return getCanonicalUrl(path, CONFIG.link)
    })
  })

  const localizedRoots = SUPPORTED_LANGUAGES.map((language) =>
    getCanonicalUrl(`/${language}`, CONFIG.link)
  )

  const dynamicPaths = Array.from(new Set([...postPaths, ...localizedRoots]))

  // Create an array of fields, each with a loc and lastmod
  const fields: ISitemapField[] = dynamicPaths.map((path) => ({
    loc: path,
    lastmod: new Date().toISOString(),
    priority: 0.7,
    changefreq: "daily",
  }))

  // Include the site root separately
  fields.unshift({
    loc: CONFIG.link,
    lastmod: new Date().toISOString(),
    priority: 1.0,
    changefreq: "daily",
  })

  return getServerSideSitemap(ctx, fields)
}

// Default export to prevent next.js errors
const EmptySiteMap = () => null

export default EmptySiteMap
