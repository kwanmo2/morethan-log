import { GetStaticPaths, GetStaticProps } from "next"
import Feed from "src/routes/Feed"
import { CONFIG } from "../../../site.config"
import { NextPageWithLayout } from "src/types"
import { getPosts } from "src/apis"
import MetaConfig from "src/components/MetaConfig"
import { createQueryClient } from "src/libs/react-query"
import { queryKey } from "src/constants/queryKey"
import { dehydrate } from "@tanstack/react-query"
import { filterPosts, mergePostsByLanguage } from "src/libs/utils/notion"
import { syncAiTranslations } from "src/libs/server/aiTranslations"
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "src/constants/language"
import { buildLanguageSegment, getCanonicalUrl } from "src/libs/utils/paths"

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: SUPPORTED_LANGUAGES.map((lang) => ({ params: { lang } })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps = async (context) => {
  const queryClient = createQueryClient()
  const langParam = context.params?.lang

  if (!langParam || Array.isArray(langParam)) {
    return {
      notFound: true,
    }
  }

  const posts = await getPosts()
  const postsWithTranslations = await syncAiTranslations(posts)
  const filteredPosts = filterPosts(postsWithTranslations)
  const mergedPosts = mergePostsByLanguage(filteredPosts, DEFAULT_LANGUAGE)
  const normalizedLanguage = buildLanguageSegment(langParam)
  queryClient.setQueryData(queryKey.language(), normalizedLanguage)
  await queryClient.prefetchQuery(queryKey.posts(), () => mergedPosts)

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
      language: normalizedLanguage,
    },
    revalidate: CONFIG.revalidateTime,
  }
}

type FeedPageProps = {
  language: string
}

const FeedPage: NextPageWithLayout<FeedPageProps> = ({
  language: languageProp,
}) => {
  const routeLanguage = buildLanguageSegment(languageProp)
  const path = `/${routeLanguage}`
  const alternates = SUPPORTED_LANGUAGES.map((lang) => {
    const langSegment = buildLanguageSegment(lang)
    return {
      hrefLang: langSegment,
      href: getCanonicalUrl(`/${langSegment}`, CONFIG.link),
    }
  })
  const meta = {
    title:
      routeLanguage === "ko"
        ? `${CONFIG.blog.title} | 머신비전·임베디드 비전 엔지니어링`
        : `${CONFIG.blog.title} | Machine Vision & Embedded Vision Engineering`,
    description:
      routeLanguage === "ko"
        ? CONFIG.blog.descriptions.ko
        : CONFIG.blog.descriptions.en,
    pageKind: "website" as const,
    url: getCanonicalUrl(path, CONFIG.link),
    canonical: path,
    language: routeLanguage,
    alternates: [
      ...alternates,
      {
        hrefLang: "x-default",
        href: getCanonicalUrl(
          `/${buildLanguageSegment(DEFAULT_LANGUAGE)}`,
          CONFIG.link
        ),
      },
    ],
  }

  return (
    <>
      <MetaConfig {...meta} />
      <Feed />
    </>
  )
}

export default FeedPage
