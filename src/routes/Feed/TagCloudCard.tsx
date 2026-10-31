import styled from "@emotion/styled"
import Link from "next/link"
import { useRouter } from "next/router"
import React, { useMemo, useState } from "react"
import { Emoji } from "src/components/Emoji"
import { useTagsQuery } from "src/hooks/useTagsQuery"
import useLanguage from "src/hooks/useLanguage"

const VISIBLE_COUNT = 12
const MIN_FONT_REM = 0.8
const MAX_FONT_REM = 1.25

const TagCloudCard: React.FC = () => {
  const router = useRouter()
  const [language] = useLanguage()
  const [expanded, setExpanded] = useState(false)
  const currentTag = router.query.tag || undefined
  const data = useTagsQuery()

  const sortedTags = useMemo(
    () => Object.entries(data).sort((a, b) => b[1] - a[1]),
    [data]
  )

  if (sortedTags.length === 0) return null

  const maxCount = sortedTags[0][1]
  const minCount = sortedTags[sortedTags.length - 1][1]
  const range = Math.max(maxCount - minCount, 1)

  // Keep the active tag visible even when the list is collapsed
  const visibleTags = expanded
    ? sortedTags
    : sortedTags.filter(
        ([tag], index) => index < VISIBLE_COUNT || tag === currentTag
      )
  const hasMore = sortedTags.length > VISIBLE_COUNT

  return (
    <div data-nosnippet>
      <StyledTitle>
        <span>
          <Emoji>🏷️</Emoji> Tags
        </span>
        {hasMore && (
          <button type="button" onClick={() => setExpanded((prev) => !prev)}>
            {expanded
              ? language === "ko"
                ? "접기"
                : "Show less"
              : `${language === "ko" ? "모두 보기" : "Show all"} (${
                  sortedTags.length
                })`}
          </button>
        )}
      </StyledTitle>
      <StyledWrapper>
        {visibleTags.map(([tag, count]) => {
          const ratio = (count - minCount) / range
          const isActive = tag === currentTag
          return (
            <Link
              key={tag}
              data-active={isActive}
              title={`${tag} (${count})`}
              href={
                isActive
                  ? `/${language}`
                  : `/${language}?tag=${encodeURIComponent(tag)}`
              }
              style={{
                fontSize: `${
                  MIN_FONT_REM + ratio * (MAX_FONT_REM - MIN_FONT_REM)
                }rem`,
                fontWeight: ratio > 0.5 ? 600 : 400,
                opacity: isActive ? 1 : 0.6 + ratio * 0.4,
              }}
            >
              {tag}
            </Link>
          )
        })}
      </StyledWrapper>
    </div>
  )
}

export default TagCloudCard

const StyledTitle = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem;
  margin-top: 2.25rem;
  margin-bottom: 0.75rem;

  button {
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.gray10};

    :hover {
      color: ${({ theme }) => theme.colors.gray12};
    }
  }
`

const StyledWrapper = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem 0.5rem;
  padding: 0.75rem;
  border-radius: 1rem;
  line-height: 1.5;
  background-color: ${({ theme }) =>
    theme.scheme === "light" ? "white" : theme.colors.gray4};

  a {
    padding: 0.125rem 0.375rem;
    border-radius: 0.5rem;
    color: ${({ theme }) => theme.colors.gray11};
    word-break: keep-all;

    :hover {
      color: ${({ theme }) => theme.colors.gray12};
      background-color: ${({ theme }) => theme.colors.gray5};
    }

    &[data-active="true"] {
      color: ${({ theme }) => theme.colors.gray12};
      background-color: ${({ theme }) => theme.colors.gray5};
      font-weight: 700 !important;
    }
  }
`
