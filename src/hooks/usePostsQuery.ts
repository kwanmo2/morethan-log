import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { queryKey } from "src/constants/queryKey"
import { TPost, TPostBase } from "src/types"
import useLanguage from "./useLanguage"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import { selectPostBaseByLanguage } from "src/libs/utils/language"

const usePostsQuery = () => {
  const [language] = useLanguage()
  const { data } = useQuery({
    queryKey: queryKey.posts(),
    initialData: [] as TPost[],
    enabled: false,
  })

  if (!data) throw new Error("Posts data is not found")

  const posts = useMemo<TPostBase[]>(
    () =>
      data.map((post) => {
        const selected = selectPostBaseByLanguage(
          post,
          language,
          DEFAULT_LANGUAGE
        )

        return {
          ...selected,
          id: post.id,
          slug: post.slug,
        }
      }),
    [data, language]
  )

  return posts
}

export default usePostsQuery
