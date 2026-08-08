import { NotionAPI } from "notion-client"

const DEFAULT_NOTION_API_BASE_URL = "https://www.notion.so/api/v3"

const getNotionAuthToken = () => {
  return process.env.NOTION_TOKEN
}

const getNotionApiBaseUrl = () => {
  const apiBaseUrl =
    process.env.NOTION_API_BASE_URL?.trim() || DEFAULT_NOTION_API_BASE_URL

  return apiBaseUrl.replace(/\/+$/, "")
}

export const createNotionApi = () => {
  const authToken = getNotionAuthToken()
  const apiBaseUrl = getNotionApiBaseUrl()

  return new NotionAPI({
    apiBaseUrl,
    ...(authToken ? { authToken } : {}),
  })
}
