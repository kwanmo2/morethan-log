import { NotionAPI } from "notion-client"

const getNotionAuthToken = () => {
  return process.env.NOTION_TOKEN
}

export const createNotionApi = () => {
  const authToken = getNotionAuthToken()

  return new NotionAPI(authToken ? { authToken } : undefined)
}
