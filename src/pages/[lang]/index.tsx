import { GetStaticPaths, GetStaticProps } from "next"
import Feed from "src/routes/Feed"
import { CONFIG } from "../../../site.config"
import { NextPageWithLayout } from "src/types"
import { getPosts } from "src/apis"
import MetaConfig from "src/components/MetaConfig"
import { queryClient } from "src/libs/react-query"
import { queryKey } from "src/constants/queryKey"
import { dehydrate } from "@tanstack/react-query"
import { filterPosts, mergePostsByLanguage } from "src/libs/utils/notion"
import { syncAiTranslations } from "src/libs/server/aiTranslations"
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "src/constants/language"
import useLanguage from "src/hooks/useLanguage"
import { useEffect, useMemo } from "react"
import { useRouter } from "next/router"
import { buildLanguageSegment, getCanonicalUrl } from "src/libs/utils/paths"

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: SUPPORTED_LANGUAGES.map((lang) => ({ params: { lang } })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps = async (context) => {
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
  await queryClient.prefetchQuery(queryKey.posts(), () => mergedPosts)

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
      language: buildLanguageSegment(langParam),
    },
    revalidate: CONFIG.revalidateTime,
  }
}

type FeedPageProps = {
  language: string
}

const FeedPage: NextPageWithLayout<FeedPageProps> = ({ language: languageProp }) => {
  const [language, setLanguage] = useLanguage()
  const router = useRouter()

  useEffect(() => {
    const langParam = router.query.lang
    if (typeof langParam === "string") {
      setLanguage(buildLanguageSegment(langParam))
      return
    }

    setLanguage(languageProp)
  }, [languageProp, router.query.lang, setLanguage])

  const meta = useMemo(() => {
    const path = `/${buildLanguageSegment(language)}`
    return {
      title: `${CONFIG.blog.title} (${language.toUpperCase()})`,
      description: CONFIG.blog.description,
      type: "Website",
      url: getCanonicalUrl(path, CONFIG.link),
      canonical: path,
      language,
    }
  }, [language])

  return (
    <>
      <MetaConfig {...meta} />
      <Feed />
    </>
  )
}

export default FeedPage
