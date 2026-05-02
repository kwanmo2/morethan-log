/* eslint-disable no-console */
import { mkdir, writeFile } from "fs/promises"
import path from "path"

import { getPosts } from "src/apis"
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "src/constants/language"
import { extractPostLanguage, sanitizePostBase } from "src/libs/utils/language"
import { filterPosts, mergePostsByLanguage } from "src/libs/utils/notion"
import { FilterPostsOptions } from "src/libs/utils/notion/filterPosts"
import {
  buildLanguageSegment,
  buildPostPath,
  getCanonicalUrl,
} from "src/libs/utils/paths"
import { TPost, TPostBase } from "src/types"
import { CONFIG } from "site.config"

type SitemapEntry = {
  loc: string
  lastmod?: string
  alternates?: {
    hreflang: string
    href: string
  }[]
}

const SITEMAP_FILTER: FilterPostsOptions = {
  acceptStatus: ["Public", "PublicOnDetail"],
  acceptType: ["Paper", "Post", "Page"],
}

const PUBLIC_DIR = path.join(process.cwd(), "public")
const SITEMAP_PATH = path.join(PUBLIC_DIR, "sitemap.xml")
const ROBOTS_PATH = path.join(PUBLIC_DIR, "robots.txt")

const xmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")

const toIsoDate = (value?: string) => {
  if (!value) return undefined

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined

  return date.toISOString()
}

const getPostLastmod = (post: TPostBase) =>
  toIsoDate(post.date?.start_date) ?? toIsoDate(post.createdTime)

const dedupeAlternates = (alternates: SitemapEntry["alternates"]) => {
  const alternateMap = new Map<string, { hreflang: string; href: string }>()

  alternates?.forEach((alternate) => {
    if (!alternateMap.has(alternate.hreflang)) {
      alternateMap.set(alternate.hreflang, alternate)
    }
  })

  return Array.from(alternateMap.values())
}

const collectSitemapContents = (post: TPost): TPostBase[] => [
  sanitizePostBase(post),
  ...(post.translations ?? []).map((translation) =>
    sanitizePostBase(translation)
  ),
]

const buildStaticEntries = (): SitemapEntry[] => {
  const defaultLanguage = buildLanguageSegment(DEFAULT_LANGUAGE)

  return SUPPORTED_LANGUAGES.map((language) => ({
    loc: getCanonicalUrl(`/${language}`, CONFIG.link),
    alternates: [
      ...SUPPORTED_LANGUAGES.map((alternateLanguage) => ({
        hreflang: alternateLanguage,
        href: getCanonicalUrl(`/${alternateLanguage}`, CONFIG.link),
      })),
      {
        hreflang: "x-default",
        href: getCanonicalUrl(`/${defaultLanguage}`, CONFIG.link),
      },
    ],
  }))
}

const buildPostEntries = async (): Promise<SitemapEntry[]> => {
  const posts = await getPosts()
  const publicPosts = filterPosts(posts, SITEMAP_FILTER)
  const mergedPosts = mergePostsByLanguage(publicPosts, DEFAULT_LANGUAGE)

  return mergedPosts.flatMap((post) => {
    const contents = collectSitemapContents(post)
    const alternates = contents.map((content) => {
      const language = buildLanguageSegment(
        extractPostLanguage(content) ?? DEFAULT_LANGUAGE
      )

      return {
        hreflang: language,
        href: getCanonicalUrl(buildPostPath(content, language), CONFIG.link),
      }
    })
    const defaultAlternate =
      alternates.find(
        (alternate) =>
          alternate.hreflang === buildLanguageSegment(DEFAULT_LANGUAGE)
      ) ?? alternates[0]

    return contents.map((content) => {
      const language = buildLanguageSegment(
        extractPostLanguage(content) ?? DEFAULT_LANGUAGE
      )

      return {
        loc: getCanonicalUrl(buildPostPath(content, language), CONFIG.link),
        lastmod: getPostLastmod(content),
        alternates: dedupeAlternates([
          ...alternates,
          {
            hreflang: "x-default",
            href: defaultAlternate.href,
          },
        ]),
      }
    })
  })
}

const dedupeEntries = (entries: SitemapEntry[]) => {
  const entryMap = new Map<string, SitemapEntry>()

  entries.forEach((entry) => {
    if (!entryMap.has(entry.loc)) {
      entryMap.set(entry.loc, entry)
    }
  })

  return Array.from(entryMap.values())
}

const buildSitemapXml = (entries: SitemapEntry[]) => {
  const urls = entries
    .map((entry) => {
      const alternates =
        entry.alternates
          ?.map(
            (alternate) =>
              `    <xhtml:link rel="alternate" hreflang="${xmlEscape(
                alternate.hreflang
              )}" href="${xmlEscape(alternate.href)}" />`
          )
          .join("\n") ?? ""

      return [
        "  <url>",
        `    <loc>${xmlEscape(entry.loc)}</loc>`,
        entry.lastmod
          ? `    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>`
          : "",
        alternates,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n")
    })
    .join("\n")

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`
}

const buildRobotsTxt = () => {
  const siteUrl = CONFIG.link.replace(/\/+$/, "")

  return `# *
User-agent: *
Allow: /

# Host
Host: ${siteUrl}

# Sitemaps
Sitemap: ${siteUrl}/sitemap.xml
`
}

const run = async () => {
  if (!process.env.NOTION_PAGE_ID) {
    throw new Error("NOTION_PAGE_ID is required to generate sitemap URLs.")
  }

  const entries = dedupeEntries([
    ...buildStaticEntries(),
    ...(await buildPostEntries()),
  ])

  await mkdir(PUBLIC_DIR, { recursive: true })
  await writeFile(SITEMAP_PATH, buildSitemapXml(entries), "utf8")
  await writeFile(ROBOTS_PATH, buildRobotsTxt(), "utf8")

  console.info(`[sitemap] Generated ${entries.length} URLs.`)
}

run().catch((error) => {
  console.error("[sitemap] Fatal error:", error)
  process.exit(1)
})
