import React from "react"
import { COLOR_SET } from "./constants"
import styled from "@emotion/styled"
import { colors } from "src/styles"
import Link from "next/link"
import useLanguage from "src/hooks/useLanguage"
import { getTopicForCategory } from "src/constants/topics"

export const getColorClassByName = (name: string): string => {
  try {
    let sum = 0
    name.split("").forEach((alphabet) => (sum = sum + alphabet.charCodeAt(0)))
    const colorKey = sum
      .toString(16)
      ?.[sum.toString(16).length - 1].toUpperCase()
    return COLOR_SET[colorKey]
  } catch {
    return COLOR_SET[0]
  }
}

type Props = {
  children: string
  readOnly?: boolean
}

const Category: React.FC<Props> = ({ readOnly = false, children }) => {
  const [language] = useLanguage()
  const topic = getTopicForCategory(children)
  const href = topic
    ? `/${language}/topics/${topic.key}`
    : `/${language}?category=${encodeURIComponent(children)}`
  const styles = {
    backgroundColor: getColorClassByName(children),
    cursor: readOnly ? "default" : "pointer",
  }

  if (readOnly) {
    return <StyledLabel css={styles}>{children}</StyledLabel>
  }

  return (
    <StyledLink
      href={href}
      css={{
        ...styles,
      }}
    >
      {children}
    </StyledLink>
  )
}

export default Category

const categoryStyles = `
  padding-top: 0.25rem;
  padding-bottom: 0.25rem;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  border-radius: 9999px;
  width: fit-content;
  font-size: 0.875rem;
  line-height: 1.25rem;
  opacity: 0.9;
  color: ${colors.dark.gray1};
`

const StyledLink = styled(Link)`
  ${categoryStyles}
`

const StyledLabel = styled.span`
  ${categoryStyles}
`
