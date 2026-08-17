import { NextApiRequest, NextApiResponse } from "next"
import { clearPostsCache, getPosts } from "src/apis/notion-client/getPosts"
import { TOPICS } from "src/constants/topics"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import { submitIndexNow } from "src/libs/indexnow"
import { syncAiTranslations } from "src/libs/server/aiTranslations"
import { extractPostLanguage, getPostLanguages } from "src/libs/utils/language"
import { buildPostPath } from "src/libs/utils/paths"

const getBearerToken = (request: NextApiRequest) => {
  const authorization = request.headers.authorization
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length)
  }

  return typeof request.query.secret === "string"
    ? request.query.secret
    : undefined
}

const normalizePath = (value: unknown) => {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return null
  }

  return value.split(/[?#]/)[0]
}

const getRequestedPaths = (request: NextApiRequest) => {
  const bodyPaths: unknown[] = Array.isArray(request.body?.paths)
    ? request.body.paths
    : []
  const queryPath = normalizePath(request.query.path)
  const normalizedPaths = bodyPaths
    .map(normalizePath)
    .filter((path): path is string => Boolean(path))

  if (queryPath) normalizedPaths.push(queryPath)
  return normalizedPaths
}

const getAllPublishedPaths = async () => {
  clearPostsCache()
  const posts = await getPosts()
  const translatedPosts = await syncAiTranslations(posts)

  return translatedPosts.flatMap((post) => {
    const contents = [post, ...(post.translations ?? [])]
    return contents.flatMap((content) => {
      const languages = getPostLanguages(content)
      const resolvedLanguages = languages.length
        ? languages
        : [extractPostLanguage(content) ?? DEFAULT_LANGUAGE]

      return resolvedLanguages
        .filter((language): language is string => Boolean(language))
        .map((language) => buildPostPath(content, language))
    })
  })
}

export default async function handler(
  request: NextApiRequest,
  response: NextApiResponse
) {
  if (request.method !== "POST" && request.method !== "GET") {
    response.setHeader("Allow", "POST, GET")
    return response.status(405).json({ message: "Method not allowed" })
  }

  const expectedToken = process.env.TOKEN_FOR_REVALIDATE
  if (!expectedToken || getBearerToken(request) !== expectedToken) {
    return response.status(401).json({ message: "Invalid token" })
  }

  try {
    const requestedPaths = getRequestedPaths(request)
    const contentPaths = requestedPaths.length
      ? requestedPaths
      : await getAllPublishedPaths()
    const dependentPaths = [
      "/ko",
      "/en",
      ...TOPICS.flatMap((topic) => [
        `/ko/topics/${topic.key}`,
        `/en/topics/${topic.key}`,
      ]),
    ]
    const paths = Array.from(new Set([...contentPaths, ...dependentPaths]))

    const results = await Promise.allSettled(
      paths.map(async (path) => {
        await response.revalidate(path)
        return path
      })
    )
    const revalidated = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : []
    )
    const failed = paths.filter((path) => !revalidated.includes(path))

    let indexNowStatus: number | null = null
    try {
      indexNowStatus = await submitIndexNow(revalidated)
    } catch (error) {
      console.warn(`[IndexNow] ${(error as Error).message}`)
    }

    return response.status(failed.length ? 207 : 200).json({
      revalidated,
      failed,
      indexNowStatus,
    })
  } catch (error) {
    console.error(`[revalidate] ${(error as Error).message}`)
    return response.status(500).json({ message: "Error revalidating" })
  }
}
