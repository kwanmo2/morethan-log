import { notFound } from "next/navigation"
import type { Metadata } from "next"

import Detail from "src/routes/Detail"
import RootLayout from "src/layouts/RootLayout"
import QueryProvider from "src/components/QueryProvider"
import { prefetchPostDetail } from "src/libs/server/prefetch"
import { collectPostContents, selectContentByLanguage } from "src/libs/utils/language"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import { filterPosts, mergePostsByLanguage } from "src/libs/utils/notion"
import { getPosts } from "src/apis"
import { syncAiTranslations } from "src/libs/server/aiTranslations"

interface PageProps {
  params: { slug: string }
}

export async function generateStaticParams() {
  const posts = await getPosts()
  const postsWithTranslations = await syncAiTranslations(posts)
  const filteredPosts = mergePostsByLanguage(filterPosts(postsWithTranslations), DEFAULT_LANGUAGE)

  return filteredPosts.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { post } = await prefetchPostDetail(params.slug)
  if (!post) {
    return {
      title: "포스트를 찾을 수 없습니다",
      description: "요청하신 글을 찾을 수 없습니다.",
      alternates: {
        canonical: `https://slowbeam.vercel.app/${params.slug}`,
      },
    }
  }

  const contents = collectPostContents(post)
  const primaryContent = selectContentByLanguage(contents, DEFAULT_LANGUAGE, DEFAULT_LANGUAGE)
  const canonical = `https://slowbeam.vercel.app/${params.slug}`
  const description =
    primaryContent.summary ||
    primaryContent.description ||
    `${primaryContent.title} 문제 해결 과정을 정리한 포스트입니다.`

  return {
    title: primaryContent.title,
    description,
    openGraph: {
      title: primaryContent.title,
      description,
      type: "article",
      url: canonical,
      siteName: "Slowbeam.dev",
      locale: "ko_KR",
      images: post.thumbnail ? [post.thumbnail] : undefined,
    },
    alternates: {
      canonical,
    },
  }
}

const PostPage = async ({ params }: PageProps) => {
  const { dehydratedState, post } = await prefetchPostDetail(params.slug)

  if (!post) {
    notFound()
  }

  return (
    <QueryProvider dehydratedState={dehydratedState}>
      <RootLayout>
        <Detail />
      </RootLayout>
    </QueryProvider>
  )
}

export default PostPage
