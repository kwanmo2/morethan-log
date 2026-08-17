import Detail from "src/routes/Detail"
import { filterPosts, mergePostsByLanguage } from "src/libs/utils/notion"
import { CONFIG } from "site.config"
import { NextPageWithLayout } from "src/types"
import CustomError from "src/routes/Error"
import { getRecordMap, getPosts } from "src/apis"
import MetaConfig from "src/components/MetaConfig"
import { GetStaticProps } from "next"
import { createQueryClient } from "src/libs/react-query"
import { queryKey } from "src/constants/queryKey"
import { dehydrate } from "@tanstack/react-query"
import usePostQuery from "src/hooks/usePostQuery"
import { FilterPostsOptions } from "src/libs/utils/notion/filterPosts"
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "src/constants/language"
import {
  collectPostContents,
  extractPostLanguage,
  getPostLanguages,
  sanitizePostBase,
  selectContentByLanguage,
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

const filter: FilterPostsOptions = {
  acceptStatus: ["Public", "PublicOnDetail"],
  acceptType: ["Paper", "Post", "Page"],
}

export const getStaticPaths = async () => {
  const posts = await getPosts()
  const postsWithTranslations = await syncAiTranslations(posts)
  const filteredPost = filterPosts(postsWithTranslations, filter)
  const mergedPosts = mergePostsByLanguage(filteredPost, DEFAULT_LANGUAGE)
  const pathMap = new Map<
    string,
    {
      params: {
        lang: string
        category: string
        slug: string
      }
    }
  >()

  mergedPosts.forEach((post) => {
    const contents = [post, ...(post.translations ?? [])]

    contents.forEach((content) => {
      const contentLanguages = getPostLanguages(content)
      const languages = contentLanguages.length
        ? contentLanguages
        : [DEFAULT_LANGUAGE]

      languages.forEach((language) => {
        const lang = buildLanguageSegment(language)
        if (
          !SUPPORTED_LANGUAGES.includes(
            lang as (typeof SUPPORTED_LANGUAGES)[number]
          )
        ) {
          return
        }

        const category = buildCategorySlug(content.category)
        const slug = buildPostSlug(content.slug)
        const key = `${lang}/${category}/${slug}`

        if (!pathMap.has(key)) {
          pathMap.set(key, {
            params: {
              lang,
              category,
              slug,
            },
          })
        }
      })
    })
  })

  return {
    paths: Array.from(pathMap.values()),
    fallback: "blocking",
  }
}

export const getStaticProps: GetStaticProps = async (context) => {
  const queryClient = createQueryClient()
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
  queryClient.setQueryData(queryKey.language(), normalizedLanguage)

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

  const matchedPost = detailPosts.find((post) => {
    const contents = [post, ...(post.translations ?? [])]
    return contents.some((content) => {
      const isSameLanguage = getPostLanguages(content).some(
        (language) => buildLanguageSegment(language) === normalizedLanguage
      )

      if (!isSameLanguage) return false

      return (
        buildPostSlug(content.slug) === normalizedSlug &&
        buildCategorySlug(content.category) === normalizedCategory
      )
    })
  })

  if (!matchedPost) {
    const fallbackMatchedPost = detailPosts.find((post) => {
      const contents = [post, ...(post.translations ?? [])]
      return contents.some((content) => {
        return (
          buildPostSlug(content.slug) === normalizedSlug &&
          buildCategorySlug(content.category) === normalizedCategory
        )
      })
    })

    if (fallbackMatchedPost) {
      const contents = [
        fallbackMatchedPost,
        ...(fallbackMatchedPost.translations ?? []),
      ]
      const requestedLanguageContent = contents.find((content) =>
        getPostLanguages(content).some(
          (language) => buildLanguageSegment(language) === normalizedLanguage
        )
      )

      const redirectContent = requestedLanguageContent ?? contents[0]
      const redirectLanguage = buildLanguageSegment(
        extractPostLanguage(redirectContent)
      )
      const destination = buildPostPath(redirectContent, redirectLanguage)

      return {
        redirect: {
          destination,
          permanent: true,
        },
      }
    }

    return {
      notFound: true,
      revalidate: CONFIG.revalidateTime,
    }
  }

  const matchedContents = [matchedPost, ...(matchedPost.translations ?? [])]
  const activeContent = selectContentByLanguage(
    matchedContents,
    normalizedLanguage,
    DEFAULT_LANGUAGE
  )
  const normalizedPathForRequestedLanguage = buildPostPath(
    activeContent,
    normalizedLanguage
  )

  const requestedPath = `/${normalizedLanguage}/${normalizedCategory}/${normalizedSlug}`
  if (normalizedPathForRequestedLanguage !== requestedPath) {
    return {
      redirect: {
        destination: normalizedPathForRequestedLanguage,
        permanent: true,
      },
    }
  }

  let activeRecordMap
  try {
    activeRecordMap = await getRecordMap(activeContent.id)
  } catch (error) {
    console.warn(
      `[getStaticProps] Failed to get recordMap for ${activeContent.id}: ${
        (error as Error).message
      }`
    )
  }

  if (!activeRecordMap) {
    return {
      notFound: true,
      revalidate: 60,
    }
  }

  const alternateContents = matchedContents
    .filter((content) => content.id !== activeContent.id)
    .map((content) => ({
      ...sanitizePostBase(content),
      slug: buildPostSlug(content.slug),
    }))

  const hydratedPost = {
    ...sanitizePostBase(activeContent),
    id: matchedPost.id,
    slug: buildPostSlug(activeContent.slug),
    recordMap: activeRecordMap,
    translations: alternateContents,
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
      language: normalizedLanguage,
    },
    revalidate: CONFIG.revalidateTime,
  }
}

type DetailPageProps = {
  language: string
}

const DetailPage: NextPageWithLayout<DetailPageProps> = ({ language }) => {
  const post = usePostQuery()

  if (!post) return <CustomError />

  const contents = collectPostContents(post)
  const activeContent = post
  const image = activeContent.thumbnail ?? "/apple-touch-icon.png"

  const date =
    activeContent.date?.start_date ||
    activeContent.createdTime ||
    post.createdTime

  const canonicalLanguage = buildLanguageSegment(language)
  const canonicalPath = buildPostPath(activeContent, canonicalLanguage)
  const alternateUrlMap = new Map<string, string>([
    [canonicalLanguage, getCanonicalUrl(canonicalPath, CONFIG.link)],
  ])

  contents.slice(1).forEach((content) => {
    getPostLanguages(content).forEach((contentLanguage) => {
      const language = buildLanguageSegment(contentLanguage)
      if (!alternateUrlMap.has(language)) {
        alternateUrlMap.set(
          language,
          getCanonicalUrl(buildPostPath(content, language), CONFIG.link)
        )
      }
    })
  })

  const alternates = Array.from(alternateUrlMap.entries()).map(
    ([hrefLang, href]) => ({
      hrefLang,
      href,
    })
  )

  const defaultLanguage = buildLanguageSegment(DEFAULT_LANGUAGE)
  const defaultAlternateHref =
    alternateUrlMap.get(defaultLanguage) ??
    getCanonicalUrl(canonicalPath, CONFIG.link)

  const meta = {
    title: `${activeContent.title} | ${CONFIG.blog.title}`,
    datePublished: new Date(date).toISOString(),
    dateModified: activeContent.updatedTime || new Date(date).toISOString(),
    image,
    description:
      activeContent.summary ||
      (canonicalLanguage === "ko"
        ? CONFIG.blog.descriptions.ko
        : CONFIG.blog.descriptions.en),
    pageKind:
      activeContent.type[0] === "Page"
        ? ("profile" as const)
        : ("article" as const),
    url: getCanonicalUrl(canonicalPath, CONFIG.link),
    canonical: canonicalPath,
    keywords: activeContent.tags ?? post.tags ?? [],
    language: canonicalLanguage,
    authorName: activeContent.author?.[0]?.name || CONFIG.profile.name,
    indexable: !activeContent.translationReviewStatus?.includes("NeedsFix"),
    alternates: [
      ...alternates,
      {
        hrefLang: "x-default",
        href: defaultAlternateHref,
      },
    ],
    breadcrumbs: [
      {
        name: CONFIG.blog.title,
        url: getCanonicalUrl(`/${canonicalLanguage}`, CONFIG.link),
      },
      {
        name: activeContent.title,
        url: getCanonicalUrl(canonicalPath, CONFIG.link),
      },
    ],
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
