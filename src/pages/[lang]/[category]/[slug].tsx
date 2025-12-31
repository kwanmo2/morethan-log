import Detail from "src/routes/Detail"
import { filterPosts, mergePostsByLanguage } from "src/libs/utils/notion"
import { CONFIG } from "site.config"
import { NextPageWithLayout } from "src/types"
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
  extractPostLanguage,
} from "src/libs/utils/language"
import {
  loadAiTranslationRecordMap,
  syncAiTranslations,
} from "src/libs/server/aiTranslations"
import {
  buildCategorySlug,
  buildPostPath,
  buildPostSlug,
  buildLanguageSegment,
  buildPostCacheKey,
  getCanonicalUrl,
} from "src/libs/utils/paths"
import { useEffect, useMemo } from "react"
import { useRouter } from "next/router"

const filter: FilterPostsOptions = {
  acceptStatus: ["Public", "PublicOnDetail"],
  acceptType: ["Paper", "Post", "Page"],
}

export const getStaticPaths = async () => {
  const posts = await getPosts()
  const postsWithTranslations = await syncAiTranslations(posts)
  const filteredPost = filterPosts(postsWithTranslations, filter)
  const mergedPosts = mergePostsByLanguage(filteredPost, DEFAULT_LANGUAGE)

  const paths = mergedPosts.flatMap((post) => {
    const contents = [post, ...(post.translations ?? [])]
    return contents.map((content) => ({
      params: {
        lang: buildLanguageSegment(extractPostLanguage(content)),
        category: buildCategorySlug(content.category),
        slug: buildPostSlug(content.slug),
      },
    }))
  })

  return {
    paths,
    fallback: true,
  }
}

export const getStaticProps: GetStaticProps = async (context) => {
  const slugParam = context.params?.slug
  const langParam = context.params?.lang
  const categoryParam = context.params?.category

  if (
    !slugParam ||
    Array.isArray(slugParam) ||
    !langParam ||
    Array.isArray(langParam) ||
    !categoryParam ||
    Array.isArray(categoryParam)
  ) {
    return {
      notFound: true,
      revalidate: CONFIG.revalidateTime,
    }
  }

  const normalizedSlug = buildPostSlug(slugParam)
  const normalizedCategory = buildCategorySlug([categoryParam])
  const normalizedLanguage = buildLanguageSegment(langParam)

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

  const postDetail = detailPosts.find((post) => {
    const contents = [post, ...(post.translations ?? [])]
    return contents.some((content) => {
      const languageSegment = buildLanguageSegment(extractPostLanguage(content))
      return (
        buildPostSlug(content.slug) === normalizedSlug &&
        buildCategorySlug(content.category) === normalizedCategory &&
        languageSegment === normalizedLanguage
      )
    })
  })

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

  const translationsWithRecordMap = (postDetail.translations ?? []).flatMap(
    (translation, index) => {
      const recordMap = translationRecordMaps[index]
      if (!recordMap) return []
      return [
        {
          ...translation,
          slug: buildPostSlug(translation.slug),
          recordMap,
        },
      ]
    }
  )

  const hydratedPost: any = {
    ...postDetail,
    slug: buildPostSlug(postDetail.slug),
    recordMap: baseRecordMap,
  }

  if (translationsWithRecordMap.length) {
    hydratedPost.translations = translationsWithRecordMap
  }

  const postCacheKey = buildPostCacheKey({
    slug: normalizedSlug,
    category: normalizedCategory,
    language: normalizedLanguage,
  })

  await queryClient.prefetchQuery(queryKey.post(postCacheKey), () => hydratedPost)

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
    },
    revalidate: CONFIG.revalidateTime,
  }
}

const DetailPage: NextPageWithLayout = () => {
  const post = usePostQuery()
  const [language, setLanguage] = useLanguage()
  const router = useRouter()
  const pathLanguage = useMemo(() => {
    const langParam = router.query.lang
    if (typeof langParam !== "string") return undefined
    return buildLanguageSegment(langParam)
  }, [router.query.lang])

  useEffect(() => {
    if (pathLanguage) {
      setLanguage(pathLanguage)
    }
  }, [pathLanguage, setLanguage])

  if (!post) return <CustomError />

  const contents = collectPostContents(post)
  const activeContent = selectContentByLanguage(
    contents,
    pathLanguage ?? language,
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

  const path = buildPostPath(post, pathLanguage ?? language)

  const meta = {
    title: activeContent.title,
    date: new Date(date).toISOString(),
    image,
    description: activeContent.summary || post.summary || "",
    type: activeContent.type[0],
    url: getCanonicalUrl(path, CONFIG.link),
    canonical: path,
    keywords: activeContent.tags ?? post.tags ?? [],
    language: pathLanguage ?? language,
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
