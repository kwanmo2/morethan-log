import Head from "next/head"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import { buildLanguageSegment } from "src/libs/utils/paths"
import { CONFIG } from "site.config"

const IndexPage = () => {
  const redirectTo = `/${buildLanguageSegment(DEFAULT_LANGUAGE)}`
  const canonical = `${CONFIG.link.replace(/\/+$/, "")}${redirectTo}`

  return (
    <Head>
      <title>{CONFIG.blog.title}</title>
      <meta name="robots" content="noindex, follow" />
      <link rel="canonical" href={canonical} />
      <meta httpEquiv="refresh" content={`0;url=${redirectTo}`} />
    </Head>
  )
}

export default IndexPage
