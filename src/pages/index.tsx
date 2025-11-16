import Feed from "src/routes/Feed"
import { CONFIG } from "../../site.config"
import { NextPageWithLayout } from "../types"
import MetaConfig from "src/components/MetaConfig"
import { GetStaticProps } from "next"
import { prefetchFeed } from "src/libs/server/prefetch"

export const getStaticProps: GetStaticProps = async () => {
  const { dehydratedState } = await prefetchFeed()
  return {
    props: {
      dehydratedState,
    },
    revalidate: CONFIG.revalidateTime,
  }
}

const FeedPage: NextPageWithLayout = () => {
  const meta = {
    title: CONFIG.blog.title,
    description: CONFIG.blog.description,
    type: "website",
    url: CONFIG.link,
  }

  return (
    <>
      <MetaConfig {...meta} />
      <Feed />
    </>
  )
}

export default FeedPage
