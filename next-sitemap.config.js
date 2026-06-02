const { CONFIG } = require("./site.config")

const SUPPORTED_LANGUAGES = ["ko", "en"]

const isSupportedRoute = (path) => {
  const [language, category, slug, ...rest] = path.split("/").filter(Boolean)

  if (!SUPPORTED_LANGUAGES.includes(language)) return false
  if (!category && !slug) return true

  return Boolean(category && slug && rest.length === 0)
}

module.exports = {
  siteUrl: CONFIG.link,
  generateRobotsTxt: true,
  sitemapSize: 7000,
  generateIndexSitemap: false,
  autoLastmod: true,
  transform: async (_config, path) => {
    if (!isSupportedRoute(path)) return null

    return {
      loc: path,
      lastmod: new Date().toISOString(),
    }
  },
}
