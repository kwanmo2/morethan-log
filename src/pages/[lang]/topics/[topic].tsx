import styled from "@emotion/styled"
import { dehydrate } from "@tanstack/react-query"
import { GetStaticPaths, GetStaticProps } from "next"
import { useMemo } from "react"
import { CONFIG } from "site.config"
import { getPosts } from "src/apis"
import MetaConfig from "src/components/MetaConfig"
import { queryKey } from "src/constants/queryKey"
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "src/constants/language"
import {
  getLocalizedTopic,
  getTopic,
  postMatchesTopic,
  TOPICS,
} from "src/constants/topics"
import usePostsQuery from "src/hooks/usePostsQuery"
import { createQueryClient } from "src/libs/react-query"
import { syncAiTranslations } from "src/libs/server/aiTranslations"
import { filterPosts, mergePostsByLanguage } from "src/libs/utils/notion"
import { buildLanguageSegment, getCanonicalUrl } from "src/libs/utils/paths"
import PostCard from "src/routes/Feed/PostList/PostCard"
import { NextPageWithLayout } from "src/types"

export const getStaticPaths: GetStaticPaths = () => ({
  paths: SUPPORTED_LANGUAGES.flatMap((language) =>
    TOPICS.map((topic) => ({
      params: { lang: language, topic: topic.key },
    }))
  ),
  fallback: false,
})

export const getStaticProps: GetStaticProps = async (context) => {
  const languageParam = context.params?.lang
  const topicParam = context.params?.topic

  if (
    typeof languageParam !== "string" ||
    typeof topicParam !== "string" ||
    !getTopic(topicParam)
  ) {
    return { notFound: true }
  }

  const language = buildLanguageSegment(languageParam)
  const queryClient = createQueryClient()
  const posts = await getPosts()
  const translatedPosts = await syncAiTranslations(posts)
  const mergedPosts = mergePostsByLanguage(
    filterPosts(translatedPosts),
    DEFAULT_LANGUAGE
  )

  queryClient.setQueryData(queryKey.language(), language)
  queryClient.setQueryData(queryKey.posts(), mergedPosts)

  return {
    props: {
      dehydratedState: dehydrate(queryClient),
      language,
      topicKey: topicParam,
    },
    revalidate: CONFIG.revalidateTime,
  }
}

type TopicPageProps = {
  language: string
  topicKey: string
}

const TopicPage: NextPageWithLayout<TopicPageProps> = ({
  language,
  topicKey,
}) => {
  const posts = usePostsQuery()
  const topic = getTopic(topicKey)

  const topicPosts = useMemo(
    () => (topic ? posts.filter((post) => postMatchesTopic(post, topic)) : []),
    [posts, topic]
  )

  if (!topic) return null

  const localizedTopic = getLocalizedTopic(topic, language)
  const path = `/${language}/topics/${topic.key}`
  const alternates = SUPPORTED_LANGUAGES.map((alternateLanguage) => ({
    hrefLang: alternateLanguage,
    href: getCanonicalUrl(
      `/${alternateLanguage}/topics/${topic.key}`,
      CONFIG.link
    ),
  }))

  return (
    <>
      <MetaConfig
        title={`${localizedTopic.title} | ${CONFIG.blog.title}`}
        description={localizedTopic.description}
        pageKind="website"
        url={path}
        canonical={path}
        language={language}
        alternates={[
          ...alternates,
          {
            hrefLang: "x-default",
            href: getCanonicalUrl(`/en/topics/${topic.key}`, CONFIG.link),
          },
        ]}
        breadcrumbs={[
          {
            name: CONFIG.blog.title,
            url: getCanonicalUrl(`/${language}`, CONFIG.link),
          },
          {
            name: localizedTopic.title,
            url: getCanonicalUrl(path, CONFIG.link),
          },
        ]}
      />
      <StyledSection>
        <header>
          <h1>{localizedTopic.title}</h1>
          <p>{localizedTopic.description}</p>
        </header>
        <div>
          {topicPosts.map((post) => (
            <PostCard key={post.id} data={post} />
          ))}
        </div>
      </StyledSection>
    </>
  )
}

export default TopicPage

const StyledSection = styled.section`
  max-width: 48rem;
  margin: 0 auto;
  padding: 2rem 0;

  header {
    margin-bottom: 2rem;

    h1 {
      font-size: 2rem;
      line-height: 2.5rem;
      font-weight: 700;
    }

    p {
      color: ${({ theme }) => theme.colors.gray11};
      line-height: 1.75;
    }
  }
`
