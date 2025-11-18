import styled from "@emotion/styled"
import Link from "next/link"
import useLanguage from "src/hooks/useLanguage"
import { buildPostPath } from "src/libs/utils/paths"

const NavBar: React.FC = () => {
  const [language] = useLanguage()
  const links = [{ id: 1, name: "About", slug: "about", category: "about" }]
  return (
    <StyledWrapper className="">
      <ul>
        {links.map((link) => (
          <li key={link.id}>
            <Link
              href={buildPostPath(
                { slug: link.slug, category: [link.category] },
                language
              )}
            >
              {link.name}
            </Link>
          </li>
        ))}
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
