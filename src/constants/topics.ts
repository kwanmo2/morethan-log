import { buildCategorySlug } from "src/libs/utils/paths"
import { TPostBase } from "src/types"

export type TTopicKey =
  | "machine-vision"
  | "cameras-image-sensors"
  | "embedded-edge-ai"

type TLocalizedTopic = {
  title: string
  description: string
}

export type TTopic = {
  key: TTopicKey
  ko: TLocalizedTopic
  en: TLocalizedTopic
  categories: string[]
  tags: string[]
}

export const TOPICS: TTopic[] = [
  {
    key: "machine-vision",
    ko: {
      title: "머신비전",
      description:
        "컴퓨터 비전과 산업용 머신비전 시스템의 설계, 통합, 실패 사례를 현장 관점에서 정리합니다.",
    },
    en: {
      title: "Machine Vision",
      description:
        "Field notes on computer vision, industrial machine vision system design, integration, and failure cases.",
    },
    categories: ["computer-vision", "embedded-vision"],
    tags: ["machine vision", "machinevision", "computer vision", "genicam"],
  },
  {
    key: "cameras-image-sensors",
    ko: {
      title: "카메라·이미지 센서",
      description:
        "산업용 카메라, 이미지 센서, SWIR·NIR과 광학 시스템을 선택하고 검증하는 데 필요한 자료를 모았습니다.",
    },
    en: {
      title: "Cameras & Image Sensors",
      description:
        "Practical references for selecting and validating industrial cameras, image sensors, SWIR, NIR, and optical systems.",
    },
    categories: ["camera"],
    tags: ["camera", "image sensor", "swir", "nir", "cmos", "ingaas"],
  },
  {
    key: "embedded-edge-ai",
    ko: {
      title: "임베디드 비전·엣지 AI",
      description:
        "임베디드 비전 보드, 엣지 AI 반도체와 카메라 통합을 실제 구축·문제 해결 기록으로 설명합니다.",
    },
    en: {
      title: "Embedded Vision & Edge AI",
      description:
        "Hands-on guides to embedded vision boards, edge AI silicon, camera integration, and field troubleshooting.",
    },
    categories: ["embedded-vision", "devboard"],
    tags: ["embedded vision", "edge ai", "axera", "axelera ai", "arducam"],
  },
]

export const getTopic = (key?: string) =>
  TOPICS.find((topic) => topic.key === key)

export const getLocalizedTopic = (topic: TTopic, language: string) =>
  language === "ko" ? topic.ko : topic.en

export const postMatchesTopic = (post: TPostBase, topic: TTopic) => {
  const category = buildCategorySlug(post.category)
  const tags = new Set((post.tags ?? []).map((tag) => tag.toLowerCase()))

  return (
    topic.categories.includes(category) ||
    topic.tags.some((tag) => tags.has(tag.toLowerCase()))
  )
}

export const getTopicForCategory = (category?: string) => {
  const categorySlug = buildCategorySlug(category ? [category] : undefined)
  return TOPICS.find((topic) => topic.categories.includes(categorySlug))
}
