import { GetStaticProps } from "next"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import { buildLanguageSegment } from "src/libs/utils/paths"

export const getStaticProps: GetStaticProps = async () => {
  const lang = buildLanguageSegment(DEFAULT_LANGUAGE)

  return {
    redirect: {
      destination: `/${lang}`,
      permanent: false,
    },
  }
}

const FeedPage = () => null

export default FeedPage
