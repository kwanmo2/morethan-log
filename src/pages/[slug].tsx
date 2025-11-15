import Detail from "src/routes/Detail"
import { filterPosts, mergePostsByLanguage } from "src/libs/utils/notion"
import { CONFIG } from "site.config"
import { NextPageWithLayout } from "../types"
import CustomError from "src/routes/Error"
import { getRecordMap, getPosts } from "src/apis"
import MetaConfig from "src/components/MetaConfig"
import { GetStaticProps } from "next"
import { queryClient } from "src/libs/react-query"
import { queryKey } from "src/constants/queryKey"
import { dehydrate } from "@tanstack/react-query"
import usePostQuery from "src/hooks/usePostQuery"
import { FilterPostsOptions } from "src/libs/utils/notion/filterPosts"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import useLanguage from "src/hooks/useLanguage"
import {
  collectPostContents,
  selectContentByLanguage,
} from "src/libs/utils/language"
import {
  loadAiTranslationRecordMap,
  syncAiTranslations,
} from "src/libs/server/aiTranslations"

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

  const posts = await getPosts()
  const postsWithTranslations = await syncAiTranslations(posts)
  const feedPosts = mergePostsByLanguage(
    filterPosts(postsWithTranslations),
    DEFAULT_LANGUAGE
  )
  await queryClient.prefetchQuery(queryKey.posts(), () => feedPosts)

  const detailPosts = mergePostsByLanguage(
    filterPosts(postsWithTranslations, filter),
    DEFAULT_LANGUAGE
  )
  const postDetail = detailPosts.find((post) => post.slug === slugParam)

  if (!postDetail) {
    return {
      notFound: true,
      revalidate: CONFIG.revalidateTime,
    }
  }

  const contents = [postDetail, ...(postDetail.translations ?? [])]

  const recordMaps = await Promise.all(
    contents.map((content) => {
      if (content.isAiTranslation) {
        return loadAiTranslationRecordMap(content.id)
      }
      return getRecordMap(content.id)
    })
  )

  const ensuredRecordMaps = recordMaps.map((recordMap, index) => {
    if (!recordMap) {
      throw new Error(
        `Missing recordMap for ${contents[index].title}. Regenerate AI translations to continue.`
      )
    }
    return recordMap
  })

  const [baseRecordMap, ...translationRecordMaps] = ensuredRecordMaps

  const translationsWithRecordMap = (postDetail.translations ?? []).map(
    (translation, index) => ({
      ...translation,
      recordMap: translationRecordMaps[index],
    })
  )

  const hydratedPost = {
    ...postDetail,
    recordMap: baseRecordMap,
    translations: translationsWithRecordMap.length
      ? translationsWithRecordMap
      : undefined,
  }

  await queryClient.prefetchQuery(queryKey.post(`${slugParam}`), () => hydratedPost)

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
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
