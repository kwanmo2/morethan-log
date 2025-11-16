import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import * as gtag from "src/libs/gtag"
import { CONFIG } from "site.config"

const useGtagEffect = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    if (!(CONFIG.isProd && CONFIG?.googleAnalytics?.enable)) return

    const url = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`
    gtag.pageview(url)
  }, [pathname, searchParams])
  return null
}
export default useGtagEffect
