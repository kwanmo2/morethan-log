/* eslint-disable no-console */
import { mkdir, readFile, writeFile } from "fs/promises"
import path from "path"

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "src/constants/language"
import { buildLanguageSegment, getCanonicalUrl } from "src/libs/utils/paths"
import { CONFIG } from "site.config"

type SitemapEntry = {
  loc: string
  lastmod?: string
  alternates?: {
    hreflang: string
    href: string
  }[]
}

type PrerenderManifest = {
  routes?: Record<
    string,
    {
      srcRoute?: string | null
    }
  >
}

const PUBLIC_DIR = path.join(process.cwd(), "public")
const SITEMAP_PATH = path.join(PUBLIC_DIR, "sitemap.xml")
const ROBOTS_PATH = path.join(PUBLIC_DIR, "robots.txt")
const PRERENDER_MANIFEST_PATH = path.join(
  process.cwd(),
  ".next",
  "prerender-manifest.json"
)

const xmlEscape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")

const dedupeAlternates = (alternates: SitemapEntry["alternates"]) => {
  const alternateMap = new Map<string, { hreflang: string; href: string }>()

  alternates?.forEach((alternate) => {
    if (!alternateMap.has(alternate.hreflang)) {
      alternateMap.set(alternate.hreflang, alternate)
    }
  })

  return Array.from(alternateMap.values())
}

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

const isSupportedRoute = (route: string) => {
  const supportedLanguages = SUPPORTED_LANGUAGES.map((language) =>
    buildLanguageSegment(language)
  )
  const [language, category, slug, ...rest] = route.split("/").filter(Boolean)

  if (!supportedLanguages.includes(language)) return false
  if (!category && !slug) return true

  return Boolean(category && slug && rest.length === 0)
}

const buildManifestEntries = async (): Promise<SitemapEntry[]> => {
  let manifest: PrerenderManifest

  try {
    manifest = JSON.parse(
      await readFile(PRERENDER_MANIFEST_PATH, "utf8")
    ) as PrerenderManifest
  } catch (error) {
    console.warn(
      `[sitemap] Could not read prerender manifest: ${(error as Error).message}`
    )
    return []
  }

  const routes = Object.keys(manifest.routes ?? {})
  return routes.filter(isSupportedRoute).map((route) => {
    return {
      loc: getCanonicalUrl(route, CONFIG.link),
    }
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
  const entries = dedupeEntries([
    ...buildStaticEntries(),
    ...(await buildManifestEntries()),
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
