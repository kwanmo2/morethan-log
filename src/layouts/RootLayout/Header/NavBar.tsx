import styled from "@emotion/styled"
import Link from "next/link"
import useLanguage from "src/hooks/useLanguage"
import { buildLanguageSegment } from "src/libs/utils/paths"

const NavBar: React.FC = () => {
  const [language] = useLanguage()
  const aboutPath = `/${buildLanguageSegment(language)}/about`
  return (
    <StyledWrapper className="">
      <ul>
        <li>
          <Link href={aboutPath}>About</Link>
        </li>
      </ul>
    </StyledWrapper>
  )
}

export default NavBar

const StyledWrapper = styled.div`
  flex-shrink: 0;
  ul {
    display: flex;
    flex-direction: row;
    li {
      display: block;
      margin-left: 1rem;
      color: ${({ theme }) => theme.colors.gray11};
    }
  }
`
