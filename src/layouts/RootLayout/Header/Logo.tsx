import Link from "next/link"
import { CONFIG } from "site.config"
import styled from "@emotion/styled"
import useLanguage from "src/hooks/useLanguage"
import { buildLanguageSegment } from "src/libs/utils/paths"

const Logo = () => {
  const [language] = useLanguage()
  const homePath = `/${buildLanguageSegment(language)}`

  return (
    <StyledWrapper href={homePath} aria-label={CONFIG.blog.title}>
      {CONFIG.blog.title}
    </StyledWrapper>
  )
}

export default Logo

const StyledWrapper = styled(Link)``
