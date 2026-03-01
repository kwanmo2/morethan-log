import { GetStaticPaths, GetStaticProps } from "next"
import styled from "@emotion/styled"
import { useEffect, useMemo } from "react"
import { CONFIG } from "site.config"
import MetaConfig from "src/components/MetaConfig"
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from "src/constants/language"
import useLanguage from "src/hooks/useLanguage"
import { NextPageWithLayout, PostContent } from "src/types"
import { getRecordMap, getPosts } from "src/apis"
import { filterPosts, mergePostsByLanguage } from "src/libs/utils/notion"
import { buildLanguageSegment, buildPostSlug, getCanonicalUrl } from "src/libs/utils/paths"
import { selectPostBaseByLanguage } from "src/libs/utils/language"
import NotionRenderer from "src/routes/Detail/components/NotionRenderer"
import { syncAiTranslations } from "src/libs/server/aiTranslations"

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: SUPPORTED_LANGUAGES.map((lang) => ({ params: { lang } })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps<AboutPageProps> = async (
  context
) => {
  const langParam = context.params?.lang

  if (!langParam || Array.isArray(langParam)) {
    return {
      notFound: true,
    }
  }

  const posts = await getPosts()
  const postsWithTranslations = await syncAiTranslations(posts)
  const filteredPosts = filterPosts(postsWithTranslations, {
    acceptStatus: ["Public", "PublicOnDetail"],
    acceptType: ["Page"],
  })
  const mergedPosts = mergePostsByLanguage(filteredPosts, DEFAULT_LANGUAGE)

  const aboutPost = mergedPosts.find((post) => {
    const contents = [post, ...(post.translations ?? [])]
    return contents.some((content) => buildPostSlug(content.slug) === "about")
  })

  if (!aboutPost) {
    return {
      notFound: true,
      revalidate: CONFIG.revalidateTime,
    }
  }

  const language = buildLanguageSegment(langParam)
  const aboutContent = selectPostBaseByLanguage(
    aboutPost,
    language,
    DEFAULT_LANGUAGE
  )

  const recordMap = await getRecordMap(aboutContent.id)

  return {
    props: {
      language,
      post: {
        ...aboutContent,
        slug: buildPostSlug(aboutContent.slug),
        recordMap,
      },
    },
    revalidate: CONFIG.revalidateTime,
  }
}

type AboutPageProps = {
  language: string
  post: PostContent
}

const AboutPage: NextPageWithLayout<AboutPageProps> = ({
  language: languageProp,
  post,
}) => {
  const [language, setLanguage] = useLanguage()

  useEffect(() => {
    setLanguage(buildLanguageSegment(languageProp ?? DEFAULT_LANGUAGE))
  }, [languageProp, setLanguage])

  const meta = useMemo(() => {
    const path = `/${buildLanguageSegment(language)}/about`
    return {
      title: post.title,
      description: post.summary ?? CONFIG.blog.description,
      type: "website",
      url: getCanonicalUrl(path, CONFIG.link),
      canonical: path,
      language,
    }
  }, [language, post.summary, post.title])

  return (
    <StyledWrapper>
      <MetaConfig {...meta} />
      <NotionRenderer recordMap={post.recordMap} />
    </StyledWrapper>
  )
}

export default AboutPage

const StyledWrapper = styled.div`
  margin: 0 auto;
  padding: 1.5rem 0;
  max-width: 56rem;
`
