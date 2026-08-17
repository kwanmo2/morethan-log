import styled from "@emotion/styled"
import Link from "next/link"
import useLanguage from "src/hooks/useLanguage"

type Props = {
  children: string
}

const Tag: React.FC<Props> = ({ children }) => {
  const [language] = useLanguage()

  return (
    <StyledLink
      href={`/${language}?tag=${encodeURIComponent(children)}`}
      data-nosnippet
    >
      {children}
    </StyledLink>
  )
}

export default Tag

const StyledLink = styled(Link)`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.625rem;
  border-radius: 50px;
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 500;
  white-space: nowrap;
  color: ${({ theme }) => theme.colors.gray12};
  background-color: ${({ theme }) => theme.colors.gray3};
  cursor: pointer;
  transition: background-color 0.2s ease;

  :hover {
    background-color: ${({ theme }) => theme.colors.gray4};
  }
`
