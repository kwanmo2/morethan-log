import Head from "next/head"
import { GetStaticProps, NextPage } from "next"
import { useRouter } from "next/router"
import { useEffect } from "react"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import { buildLanguageSegment } from "src/libs/utils/paths"

type IndexPageProps = {
  redirectTo: string
}

export const getStaticProps: GetStaticProps<IndexPageProps> = async () => {
  const redirectTo = `/${buildLanguageSegment(DEFAULT_LANGUAGE)}`

  return {
    props: {
      redirectTo,
    },
  }
}

const FeedPage: NextPage<IndexPageProps> = ({ redirectTo }) => {
  const router = useRouter()

  useEffect(() => {
    router.replace(redirectTo)
  }, [redirectTo, router])

  return (
    <Head>
      <meta httpEquiv="refresh" content={`0;url=${redirectTo}`} />
    </Head>
  )
}

export default FeedPage
