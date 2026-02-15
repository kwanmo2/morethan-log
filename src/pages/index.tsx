import { GetStaticProps } from "next"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import { buildLanguageSegment } from "src/libs/utils/paths"

export const getStaticProps: GetStaticProps = async () => {
  const redirectTo = `/${buildLanguageSegment(DEFAULT_LANGUAGE)}`

  return {
    redirect: {
      destination: redirectTo,
      permanent: true,
    },
  }
}

const IndexPage = () => null

export default IndexPage
