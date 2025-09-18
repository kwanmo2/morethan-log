import { useCallback } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { getCookie, setCookie } from "cookies-next"
import { useEffect } from "react"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import { queryKey } from "src/constants/queryKey"

type SetLanguage = (language: string) => void

const LANGUAGE_COOKIE_KEY = "language"

const useLanguage = (): [string, SetLanguage] => {
  const queryClient = useQueryClient()

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

    const cachedLanguage = getCookie(LANGUAGE_COOKIE_KEY) as string | undefined
    setLanguage(cachedLanguage || DEFAULT_LANGUAGE)
  }, [setLanguage])

  return [data ?? DEFAULT_LANGUAGE, setLanguage]
}

export default useLanguage
