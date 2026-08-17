import { CONFIG } from "site.config"
import { getCanonicalUrl } from "src/libs/utils/paths"

const DEFAULT_INDEXNOW_KEY = "6a51bd78fdd94a1a92f7427ecf7cb8e3"
const INDEXNOW_ENDPOINT = "https://searchadvisor.naver.com/indexnow"

export const submitIndexNow = async (paths: string[]) => {
  const key = process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY
  const host = new URL(CONFIG.link).host
  const keyLocation =
    process.env.INDEXNOW_KEY_LOCATION ||
    getCanonicalUrl(`/${key}.txt`, CONFIG.link)
  const urlList = Array.from(new Set(paths)).map((path) =>
    getCanonicalUrl(path, CONFIG.link)
  )

  if (urlList.length === 0) return null

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      host,
      key,
      keyLocation,
      urlList,
    }),
  })

  if (!response.ok && response.status !== 202) {
    throw new Error(`IndexNow request failed with ${response.status}`)
  }

  return response.status
}
