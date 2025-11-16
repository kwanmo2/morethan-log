import Detail from "src/routes/Detail"
import { filterPosts, mergePostsByLanguage } from "src/libs/utils/notion"
import { CONFIG } from "site.config"
import { NextPageWithLayout } from "../types"
import CustomError from "src/routes/Error"
import MetaConfig from "src/components/MetaConfig"
import { GetStaticProps } from "next"
import usePostQuery from "src/hooks/usePostQuery"
import { FilterPostsOptions } from "src/libs/utils/notion/filterPosts"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import useLanguage from "src/hooks/useLanguage"
import {
  collectPostContents,
  selectContentByLanguage,
} from "src/libs/utils/language"
import { prefetchPostDetail } from "src/libs/server/prefetch"
import { getPosts } from "src/apis"
import { syncAiTranslations } from "src/libs/server/aiTranslations"

const filter: FilterPostsOptions = {
  acceptStatus: ["Public", "PublicOnDetail"],
  acceptType: ["Paper", "Post", "Page"],
}

export const getStaticPaths = async () => {
  const posts = await getPosts()
  const postsWithTranslations = await syncAiTranslations(posts)
  const filteredPost = filterPosts(postsWithTranslations, filter)
  const mergedPosts = mergePostsByLanguage(filteredPost, DEFAULT_LANGUAGE)

  return {
    paths: mergedPosts.map((row) => `/${row.slug}`),
    fallback: true,
  }
}

export const getStaticProps: GetStaticProps = async (context) => {
  const slugParam = context.params?.slug

  if (!slugParam || Array.isArray(slugParam)) {
    return {
      notFound: true,
      revalidate: CONFIG.revalidateTime,
    }
  }

  const { dehydratedState, post } = await prefetchPostDetail(slugParam)

  if (!post) {
    return {
      notFound: true,
      revalidate: CONFIG.revalidateTime,
    }
  }

  return {
    props: {
      dehydratedState,
    },
    revalidate: CONFIG.revalidateTime,
  }
}

const DetailPage: NextPageWithLayout = () => {
  const post = usePostQuery()
  const [language] = useLanguage()

  if (!post) return <CustomError />

  const contents = collectPostContents(post)
  const activeContent = selectContentByLanguage(
    contents,
    language,
    DEFAULT_LANGUAGE
  )

  const image =
    activeContent.thumbnail ??
    post.thumbnail ??
    CONFIG.ogImageGenerateURL ??
    `${CONFIG.ogImageGenerateURL}/${encodeURIComponent(activeContent.title)}.png`

  const date =
    activeContent.date?.start_date ||
    activeContent.createdTime ||
    post.createdTime

  const meta = {
    title: activeContent.title,
    date: new Date(date).toISOString(),
    image,
    description: activeContent.summary || post.summary || "",
    type: activeContent.type[0],
    url: `${CONFIG.link}/${post.slug}`,
  }

  return (
    <>
      <MetaConfig {...meta} />
      <Detail />
    </>
  )
}

DetailPage.getLayout = (page) => {
  return <>{page}</>
}

export default DetailPage
