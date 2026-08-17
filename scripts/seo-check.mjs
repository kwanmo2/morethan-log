import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const projectRoot = process.cwd()
const sitemapPath = join(projectRoot, "public", "sitemap.xml")
const pagesRoot = join(projectRoot, ".next", "server", "pages")

const fail = (message) => {
  throw new Error(`[seo:check] ${message}`)
}

if (!existsSync(sitemapPath))
  fail("public/sitemap.xml is missing; run yarn build first")
if (!existsSync(pagesRoot))
  fail(".next/server/pages is missing; run yarn build first")

const sitemap = readFileSync(sitemapPath, "utf8")
const urls = Array.from(
  sitemap.matchAll(/<loc>(.*?)<\/loc>/g),
  (match) => match[1]
)

if (urls.length === 0) fail("sitemap contains no URLs")
if (new Set(urls).size !== urls.length) fail("sitemap contains duplicate URLs")
if (/<lastmod>/i.test(sitemap))
  fail("sitemap contains an unverified lastmod value")

const findHtmlFile = (pathname) => {
  const normalized = pathname.replace(/^\//, "")
  const candidates = [
    join(pagesRoot, `${normalized}.html`),
    join(pagesRoot, normalized, "index.html"),
  ]
  return candidates.find(existsSync)
}

const getAttribute = (html, tagPattern, attribute) => {
  const tag = html.match(tagPattern)?.[0]
  if (!tag) return null
  return (
    tag.match(new RegExp(`${attribute}=["']([^"']+)["']`, "i"))?.[1] ?? null
  )
}

const errors = []

for (const rawUrl of urls) {
  const url = new URL(rawUrl)
  const htmlFile = findHtmlFile(url.pathname)
  if (!htmlFile) {
    errors.push(`${url.pathname}: generated HTML was not found`)
    continue
  }

  const html = readFileSync(htmlFile, "utf8")
  const [, language] = url.pathname.split("/")
  const htmlLanguage = getAttribute(html, /<html\b[^>]*>/i, "lang")
  const canonical = getAttribute(
    html,
    /<link\b[^>]*rel=["']canonical["'][^>]*>/i,
    "href"
  )
  const robots = getAttribute(
    html,
    /<meta\b[^>]*name=["']robots["'][^>]*>/i,
    "content"
  )
  const description = getAttribute(
    html,
    /<meta\b[^>]*name=["']description["'][^>]*>/i,
    "content"
  )
  const title = html.match(/<title>(.*?)<\/title>/is)?.[1]
  const jsonLdBlocks = Array.from(
    html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis
    ),
    (match) => match[1]
  )

  if (language !== "ko" && language !== "en") {
    errors.push(`${url.pathname}: unsupported language segment`)
  }
  if (htmlLanguage !== language) {
    errors.push(`${url.pathname}: html lang is ${htmlLanguage ?? "missing"}`)
  }
  if (canonical !== rawUrl) {
    errors.push(`${url.pathname}: canonical is ${canonical ?? "missing"}`)
  }
  const robotsDirectives =
    robots?.split(",").map((directive) => directive.trim().toLowerCase()) ?? []
  if (!robotsDirectives.includes("index")) {
    errors.push(`${url.pathname}: page is not indexable`)
  }
  if (!title?.trim()) errors.push(`${url.pathname}: title is missing`)
  if (!description?.trim())
    errors.push(`${url.pathname}: description is missing`)
  if (!/<h1\b[^>]*>/i.test(html)) errors.push(`${url.pathname}: H1 is missing`)
  if (jsonLdBlocks.length === 0)
    errors.push(`${url.pathname}: JSON-LD is missing`)

  for (const jsonLd of jsonLdBlocks) {
    try {
      JSON.parse(jsonLd)
    } catch {
      errors.push(`${url.pathname}: JSON-LD is invalid`)
    }
  }

  const selfAlternate = Array.from(
    html.matchAll(/<link\b[^>]*rel=["']alternate["'][^>]*>/gi),
    (match) => match[0]
  ).some(
    (tag) =>
      getAttribute(tag, /<link\b[^>]*>/i, "hrefLang") === language &&
      getAttribute(tag, /<link\b[^>]*>/i, "href") === rawUrl
  )

  if (!selfAlternate) {
    errors.push(`${url.pathname}: self-referencing hreflang is missing`)
  }
}

if (errors.length) {
  errors.forEach((error) => console.error(`- ${error}`))
  fail(`${errors.length} SEO invariant(s) failed`)
}

console.log(`[seo:check] ${urls.length} sitemap URLs passed`)
