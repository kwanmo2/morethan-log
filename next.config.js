const { CONFIG } = require("./site.config")

const deriveDefaultLanguage = (value) => {
  const normalized = String(value || "ko").toLowerCase()
  if (normalized.startsWith("en")) return "en"
  if (normalized.startsWith("ko")) return "ko"
  return "ko"
}

const defaultLanguage = deriveDefaultLanguage(CONFIG.lang)

module.exports = {
  images: {
    domains: [
      "slowbeam.dev",
      "slowbeam.vercel.app",
      "www.notion.so",
      "images.unsplash.com",
      "prod-files-secure.s3.us-west-2.amazonaws.com",
    ],
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: `/${defaultLanguage}`,
        permanent: true,
      },
    ]
  },
}
