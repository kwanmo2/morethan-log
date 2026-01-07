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
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "src/constants/language"
import useLanguage from "src/hooks/useLanguage"
import {
  collectPostContents,
  selectContentByLanguage,
  extractPostLanguage,
} from "src/libs/utils/language"
import { syncAiTranslations } from "src/libs/server/aiTranslations"
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
    const supportedLangs = new Set(
      SUPPORTED_LANGUAGES.map((lang) => buildLanguageSegment(lang))
    )

    contents.forEach((content) =>
      supportedLangs.add(buildLanguageSegment(extractPostLanguage(content)))
    )

    return Array.from(supportedLangs).map((lang) => {
      const matched = contents.find(
        (content) => buildLanguageSegment(extractPostLanguage(content)) === lang
      )
      const base = matched ?? post
      return {
        params: {
          lang,
          category: buildCategorySlug(base.category),
          slug: buildPostSlug(base.slug),
        },
      }
    })
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
    const matchesSlugAndCategory = contents.some((content) => {
      return (
        buildPostSlug(content.slug) === normalizedSlug &&
        buildCategorySlug(content.category) === normalizedCategory
      )
    })
    if (!matchesSlugAndCategory) return false

    const hasRequestedLanguage = contents.some(
      (content) =>
        buildLanguageSegment(extractPostLanguage(content)) ===
        normalizedLanguage
    )

    return hasRequestedLanguage || matchesSlugAndCategory
  })

  if (!postDetail) {
    return {
      notFound: true,
      revalidate: CONFIG.revalidateTime,
    }
  }

  const contents = [postDetail, ...(postDetail.translations ?? [])]

  // Fetch recordMaps for all content versions (including AI translations stored in Notion)
  const recordMaps = await Promise.all(
    contents.map(async (content) => {
      try {
        return await getRecordMap(content.id)
      } catch (error) {
        console.warn(
          `[getStaticProps] Failed to get recordMap for ${content.id}: ${
            (error as Error).message
          }`
        )
        return null
      }
    })
  )

  const [baseRecordMap, ...translationRecordMaps] = recordMaps

  // Filter out translations that don't have a valid recordMap
  const translationsWithRecordMap = (postDetail.translations ?? [])
    .map((translation, index) => {
      const recordMap = translationRecordMaps[index]
      if (!recordMap) return null
      return {
        ...translation,
        slug: buildPostSlug(translation.slug),
        recordMap,
      }
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)

  const hydratedPost = {
    ...postDetail,
    slug: buildPostSlug(postDetail.slug),
    recordMap: baseRecordMap,
    translations:
      translationsWithRecordMap.length > 0 ? translationsWithRecordMap : [],
  }

  const postCacheKey = buildPostCacheKey({
    slug: normalizedSlug,
    category: normalizedCategory,
    language: normalizedLanguage,
  })

  await queryClient.prefetchQuery(
    queryKey.post(postCacheKey),
    () => hydratedPost
  )

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
    `${CONFIG.ogImageGenerateURL}/${encodeURIComponent(
      activeContent.title
    )}.png`

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
