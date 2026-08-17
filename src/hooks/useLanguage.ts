import { useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getCookie, setCookie } from "cookies-next"
import { useEffect, useMemo } from "react"
import { useRouter } from "next/router"
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "src/constants/language"
import { queryKey } from "src/constants/queryKey"
import { deriveDefaultLanguage } from "src/libs/utils/language"
import { buildLanguageSegment } from "src/libs/utils/paths"

type SetLanguage = (language: string) => void

const LANGUAGE_COOKIE_KEY = "language"

const useLanguage = (): [string, SetLanguage] => {
  const queryClient = useQueryClient()
  const router = useRouter()
  const routeLanguage = useMemo(() => {
    const queryLanguage = router.query.lang
    if (typeof queryLanguage === "string") {
      return buildLanguageSegment(queryLanguage)
    }

    const [pathLanguage] = (router.asPath || "")
      .split("?")[0]
      .split("/")
      .filter(Boolean)

    return SUPPORTED_LANGUAGES.includes(
      pathLanguage as (typeof SUPPORTED_LANGUAGES)[number]
    )
      ? pathLanguage
      : undefined
  }, [router.asPath, router.query.lang])

  const { data } = useQuery<string>({
    queryKey: queryKey.language(),
    enabled: false,
    initialData: DEFAULT_LANGUAGE,
  })

  const setLanguage = useCallback(
    (language: string) => {
      setCookie(LANGUAGE_COOKIE_KEY, language)
      queryClient.setQueryData(queryKey.language(), language)
    },
    [queryClient]
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    if (routeLanguage) {
      setCookie(LANGUAGE_COOKIE_KEY, routeLanguage)
      queryClient.setQueryData(queryKey.language(), routeLanguage)
      return
    }

    const cachedLanguage = getCookie(LANGUAGE_COOKIE_KEY) as string | undefined
    if (cachedLanguage) {
      setLanguage(cachedLanguage)
      return
    }

    const availableLanguages =
      Array.isArray(navigator.languages) && navigator.languages.length > 0
        ? navigator.languages
        : navigator.language
        ? [navigator.language]
        : []

    const normalizedLanguage = availableLanguages
      .map((language) => deriveDefaultLanguage(language))
      .find((language) => language === "ko" || language === "en")

    setLanguage(normalizedLanguage ?? DEFAULT_LANGUAGE)
  }, [queryClient, routeLanguage, setLanguage])

  return [routeLanguage ?? data ?? DEFAULT_LANGUAGE, setLanguage]
}

export default useLanguage
