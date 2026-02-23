import Head from "next/head"
import { NextPage } from "next"
import { useRouter } from "next/router"
import { useEffect } from "react"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import { buildLanguageSegment } from "src/libs/utils/paths"

const FeedPage: NextPage = () => {
  const router = useRouter()
  const redirectTo = `/${buildLanguageSegment(DEFAULT_LANGUAGE)}`

  useEffect(() => {
    router.replace(redirectTo)
  }, [redirectTo, router])

  return (
    <Head>
      <meta name="robots" content="noindex, follow" />
      <meta httpEquiv="refresh" content={`0;url=${redirectTo}`} />
    </Head>
  )
}

export default FeedPage
