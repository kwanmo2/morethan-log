import Head from "next/head"
import { GetStaticProps, NextPage } from "next"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import { buildLanguageSegment } from "src/libs/utils/paths"

type IndexPageProps = {
  redirectTo: string
}

export const getStaticProps: GetStaticProps<IndexPageProps> = async () => {
  const redirectTo = `/${buildLanguageSegment(DEFAULT_LANGUAGE)}`

  return {
    redirect: {
      destination: redirectTo,
      permanent: true,
    },
  }
}

const FeedPage: NextPage<IndexPageProps> = () => {
  return (
    <Head>
      <meta name="robots" content="noindex, follow" />
    </Head>
  )
}

export default FeedPage
