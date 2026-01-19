import ogs from "open-graph-scraper"

export type TOgMetadata = {
  url: string
  title: string
  description: string
  image: string
  favicon: string
}

export const fetchOgMetadata = async (
  url: string
): Promise<TOgMetadata | null> => {
  try {
    const data = await ogs({ url })

    const ogData = data.result

    return {
      url,
      title: ogData.ogTitle || ogData.twitterTitle || "",
      description: ogData.ogDescription || ogData.twitterDescription || "",
      image: ogData.ogImage?.[0]?.url || ogData.twitterImage?.[0]?.url || "",
      favicon: ogData.favicon || "",
    }
  } catch {
    return null
  }
}
