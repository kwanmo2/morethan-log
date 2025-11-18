import styled from "@emotion/styled"
import React, { useMemo } from "react"
import useLanguage from "src/hooks/useLanguage"
import usePostQuery from "src/hooks/usePostQuery"
import { DEFAULT_LANGUAGE } from "src/constants/language"
import {
  availableLanguagesFromContents,
  collectPostContents,
  normalizeLanguageCode,
  selectContentByLanguage,
  extractPostLanguage,
} from "src/libs/utils/language"
import { useRouter } from "next/router"
import {
  buildLanguageSegment,
  buildPostPath,
  buildPostSlug,
} from "src/libs/utils/paths"

const LanguageToggle: React.FC = () => {
  const [language, setLanguage] = useLanguage()
  const post = usePostQuery()
  const router = useRouter()

  const availableLanguages = useMemo(() => {
    if (!post) return null
    const contents = collectPostContents(post)
    const languages = availableLanguagesFromContents(contents)
    return new Set(languages)
  }, [post])

  const handleChange = (nextLanguage: string) => {
    const normalizedLanguage = buildLanguageSegment(nextLanguage)
    setLanguage(normalizedLanguage)

    if (post) {
      const contents = collectPostContents(post)
      const activeContent = selectContentByLanguage(
        contents,
        normalizedLanguage,
        DEFAULT_LANGUAGE
      )
      const path = buildPostPath(
        { ...activeContent, slug: buildPostSlug(activeContent.slug) },
        normalizedLanguage
      )
      router.push(path)
      return
    }

    const [, currentCategory, currentSlug] = (router.asPath || "")
      .split("?")[0]
      .split("/")
      .filter(Boolean)

    if (!currentCategory || !currentSlug) {
      router.push(`/${normalizedLanguage}`)
      return
    }

    const targetPath = buildPostPath(
      { slug: buildPostSlug(currentSlug), category: [currentCategory] },
      normalizedLanguage
    )
    router.push(targetPath)
  }

  const isDisabled = (target: string) => {
    if (!availableLanguages) return false
    const normalized = normalizeLanguageCode(target) ?? target
    if (!availableLanguages.size) return false
    return !availableLanguages.has(normalized)
  }

  const normalizedLanguage =
    normalizeLanguageCode(language) ?? DEFAULT_LANGUAGE

  const activeLanguage = useMemo(() => {
    if (!post) return normalizedLanguage
    const contents = collectPostContents(post)
    const activeContent = selectContentByLanguage(
      contents,
      language,
      DEFAULT_LANGUAGE
    )
    return (
      extractPostLanguage(activeContent) ??
      normalizeLanguageCode(language) ??
      DEFAULT_LANGUAGE
    )
  }, [post, language, normalizedLanguage])

  return (
    <StyledWrapper role="group" aria-label="Language toggle">
      <button
        type="button"
        data-active={activeLanguage === "ko"}
        onClick={() => handleChange("ko")}
        disabled={isDisabled("ko")}
      >
        한글
      </button>
      <span className="divider">/</span>
      <button
        type="button"
        data-active={activeLanguage === "en"}
        onClick={() => handleChange("en")}
        disabled={isDisabled("en")}
      >
        ENG
      </button>
    </StyledWrapper>
  )
}

export default LanguageToggle

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  line-height: 1rem;
  color: ${({ theme }) => theme.colors.gray11};

  button {
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
    color: inherit;
    transition: color 0.2s ease;

    &[data-active="true"] {
      font-weight: 600;
      color: ${({ theme }) => theme.colors.gray12};
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.4;
    }

    &:not(:disabled):hover {
      color: ${({ theme }) => theme.colors.gray12};
    }
  }

  .divider {
    color: ${({ theme }) => theme.colors.gray9};
  }
`
