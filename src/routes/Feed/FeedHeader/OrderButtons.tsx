import styled from "@emotion/styled"
import Link from "next/link"
import { useRouter } from "next/router"
import useLanguage from "src/hooks/useLanguage"

type TOrder = "asc" | "desc"

const OrderButtons = () => {
  const router = useRouter()
  const [language] = useLanguage()
  const currentOrder = router.query.order === "asc" ? "asc" : "desc"

  const getHref = (order: TOrder) => {
    const query = new URLSearchParams()
    if (typeof router.query.tag === "string") {
      query.set("tag", router.query.tag)
    }
    if (typeof router.query.category === "string") {
      query.set("category", router.query.category)
    }
    query.set("order", order)
    return `/${language}?${query.toString()}`
  }

  return (
    <StyledWrapper data-nosnippet>
      <Link href={getHref("desc")} data-active={currentOrder === "desc"}>
        Desc
      </Link>
      <Link href={getHref("asc")} data-active={currentOrder === "asc"}>
        Asc
      </Link>
    </StyledWrapper>
  )
}

export default OrderButtons

const StyledWrapper = styled.div`
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.25rem;

  a {
    cursor: pointer;
    color: ${({ theme }) => theme.colors.gray10};

    &[data-active="true"] {
      font-weight: 700;
      color: ${({ theme }) => theme.colors.gray12};
    }
  }
`
