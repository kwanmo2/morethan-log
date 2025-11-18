import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/router"
import { queryKey } from "src/constants/queryKey"
import { PostDetail } from "src/types"
import { buildPostCacheKey } from "src/libs/utils/paths"

const usePostQuery = () => {
  const router = useRouter()
  const { slug, category, lang } = router.query
  const [pathLanguage, pathCategory, pathSlug] = (router.asPath || "")
    .split("?")[0]
    .split("/")
    .filter(Boolean)

  const cacheKey = buildPostCacheKey({
    slug: typeof slug === "string" ? slug : pathSlug ?? "",
    category:
      typeof category === "string"
        ? category
        : pathCategory
        ? pathCategory
        : undefined,
    language:
      typeof lang === "string"
        ? lang
        : pathLanguage
        ? pathLanguage
        : undefined,
  })
  const { data } = useQuery<PostDetail>({
    queryKey: queryKey.post(cacheKey),
    enabled: false,
  })

  return data
}

export default usePostQuery
