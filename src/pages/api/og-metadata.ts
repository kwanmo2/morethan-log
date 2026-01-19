import { fetchOgMetadata } from "src/libs/server/fetchOgMetadata"
import type { NextApiRequest, NextApiResponse } from "next"

type Data = {
  data: ReturnType<typeof fetchOgMetadata> extends Promise<infer T> ? T : never
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== "GET") {
    return res.status(405).json({ data: null, error: "Method not allowed" })
  }

  const { url } = req.query

  if (!url || typeof url !== "string") {
    return res.status(400).json({ data: null, error: "URL is required" })
  }

  try {
    const metadata = await fetchOgMetadata(url)
    res.status(200).json({ data: metadata })
  } catch {
    res.status(500).json({ data: null, error: "Failed to fetch OG metadata" })
  }
}
