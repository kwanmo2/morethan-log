import styled from "@emotion/styled"
import Link from "next/link"
import useLanguage from "src/hooks/useLanguage"
import { getLocalizedTopic, TOPICS } from "src/constants/topics"

const SeoIntro = () => {
  const [language] = useLanguage()
  const isKorean = language === "ko"

  return (
    <StyledSection>
      <h1>
        {isKorean
          ? "머신비전·임베디드 비전 엔지니어링"
          : "Machine Vision & Embedded Vision Engineering"}
      </h1>
      <p>
        {isKorean
          ? "산업용 카메라, 이미지 센서와 엣지 AI 하드웨어를 실제 설계·문제 해결 경험으로 정리합니다."
          : "Practical engineering notes on industrial cameras, image sensors, embedded vision, and edge AI hardware."}
      </p>
      <nav
        aria-label={isKorean ? "주요 기술 주제" : "Featured engineering topics"}
      >
        {TOPICS.map((topic) => {
          const localizedTopic = getLocalizedTopic(topic, language)
          return (
            <Link key={topic.key} href={`/${language}/topics/${topic.key}`}>
              {localizedTopic.title}
            </Link>
          )
        })}
      </nav>
    </StyledSection>
  )
}

export default SeoIntro

const StyledSection = styled.section`
  margin-bottom: 2rem;
  padding: 1.5rem;
  border: 1px solid ${({ theme }) => theme.colors.gray5};
  border-radius: 1rem;
  background-color: ${({ theme }) => theme.colors.gray3};

  h1 {
    font-size: 1.75rem;
    line-height: 2.25rem;
    font-weight: 700;
  }

  p {
    margin: 0.75rem 0 1rem;
    line-height: 1.7;
    color: ${({ theme }) => theme.colors.gray11};
  }

  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;

    a {
      padding: 0.5rem 0.75rem;
      border-radius: 0.75rem;
      background-color: ${({ theme }) => theme.colors.gray5};
      font-size: 0.875rem;
      font-weight: 600;
    }
  }
`
