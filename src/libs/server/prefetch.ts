import { dehydrate } from "@tanstack/react-query"
import { getPosts, getRecordMap } from "src/apis"
import { queryKey } from "src/constants/queryKey"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import { filterPosts, mergePostsByLanguage } from "src/libs/utils/notion"
import { FilterPostsOptions } from "src/libs/utils/notion/filterPosts"
import { loadAiTranslationRecordMap, syncAiTranslations } from "./aiTranslations"
import { createQueryClient } from "src/libs/react-query/createQueryClient"

const filter: FilterPostsOptions = {
  acceptStatus: ["Public", "PublicOnDetail"],
  acceptType: ["Paper", "Post", "Page"],
}

export const prefetchFeed = async () => {
  const client = createQueryClient()
  const posts = await getPosts()
  const postsWithTranslations = await syncAiTranslations(posts)
  const filteredPosts = filterPosts(postsWithTranslations)
  const mergedPosts = mergePostsByLanguage(filteredPosts, DEFAULT_LANGUAGE)
  await client.prefetchQuery(queryKey.posts(), () => mergedPosts)

  return { dehydratedState: dehydrate(client) }
}

export const prefetchPostDetail = async (slug: string) => {
  const client = createQueryClient()
  const posts = await getPosts()
  const postsWithTranslations = await syncAiTranslations(posts)
  const feedPosts = mergePostsByLanguage(
    filterPosts(postsWithTranslations),
    DEFAULT_LANGUAGE
  )
  await client.prefetchQuery(queryKey.posts(), () => feedPosts)

  const detailPosts = mergePostsByLanguage(
    filterPosts(postsWithTranslations, filter),
    DEFAULT_LANGUAGE
  )
  const postDetail = detailPosts.find((post) => post.slug === slug)

  if (!postDetail) {
    return { dehydratedState: dehydrate(client), post: null }
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

  await client.prefetchQuery(queryKey.post(`${slug}`), () => hydratedPost)

  return { dehydratedState: dehydrate(client), post: hydratedPost }
}
