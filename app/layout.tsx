import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  metadataBase: new URL("https://slowbeam.vercel.app"),
  title: {
    default: "Slowbeam.dev – Machine Vision & Embedded Notes",
    template: "%s | Slowbeam.dev",
  },
  description:
    "Machine vision, embedded vision, FPGA, edge AI, 그리고 개발 일상을 천천히 그러나 정확하게 기록하는 기술 블로그입니다.",
  openGraph: {
    siteName: "Slowbeam.dev",
    type: "website",
    locale: "ko_KR",
  },
  alternates: {
    canonical: "https://slowbeam.vercel.app",
  },
}

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="ko">
      <body>
        {children}
        {/* TODO: In future iterations, consider /ko and /en route prefixes with hreflang metadata when moving beyond the current UI-only language toggle. */}
      </body>
    </html>
  )
}

export default RootLayout
