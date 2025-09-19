import { ReactNode } from "react"

const emojiFontStack =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji", sans-serif'

type Props = {
  className?: string
  children?: ReactNode
}

export const Emoji = ({ className, children }: Props) => {
  return (
    <span className={className} style={{ fontFamily: emojiFontStack }}>
      {children}
    </span>
  )
}
