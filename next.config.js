const { LEGACY_REDIRECTS } = require("./legacy-redirects")

module.exports = {
  async redirects() {
    return [
      {
        source: "/",
        destination: "/en",
        permanent: true,
      },
      ...LEGACY_REDIRECTS,
    ]
  },
  images: {
    domains: [
      "slowbeam.dev",
      "slowbeam.vercel.app",
      "www.notion.so",
      "images.unsplash.com",
      "prod-files-secure.s3.us-west-2.amazonaws.com",
    ],
  },
}
