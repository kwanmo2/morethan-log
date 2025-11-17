"use client"

import styled from "@emotion/styled"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import React from "react"

type TOrder = "asc" | "desc"

type Props = {}

const OrderButtons: React.FC<Props> = () => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentOrder = (searchParams.get("order") || "desc") as TOrder

  const handleClickOrderBy = (value: TOrder) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("order", value)
    router.push(`${pathname}?${params.toString()}`)
  }
  return (
    <StyledWrapper>
      <a
        data-active={currentOrder === "desc"}
        onClick={() => handleClickOrderBy("desc")}
      >
        Desc
      </a>
      <a
        data-active={currentOrder === "asc"}
        onClick={() => handleClickOrderBy("asc")}
      >
        Asc
      </a>
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
