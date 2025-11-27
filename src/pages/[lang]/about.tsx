import { GetStaticPaths, GetStaticProps } from "next"
import styled from "@emotion/styled"
import { useEffect, useMemo } from "react"
import { CONFIG } from "site.config"
import MetaConfig from "src/components/MetaConfig"
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from "src/constants/language"
import useLanguage from "src/hooks/useLanguage"
import ContactCard from "src/routes/Feed/ContactCard"
import ProfileCard from "src/routes/Feed/ProfileCard"
import { NextPageWithLayout } from "src/types"
import { buildLanguageSegment, getCanonicalUrl } from "src/libs/utils/paths"

export const getStaticPaths: GetStaticPaths = () => {
  return {
    paths: SUPPORTED_LANGUAGES.map((lang) => ({ params: { lang } })),
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps<AboutPageProps> = async (
  context
) => {
  const langParam = context.params?.lang

  if (!langParam || Array.isArray(langParam)) {
    return {
      notFound: true,
    }
  }

  return {
    props: { language: buildLanguageSegment(langParam) },
    revalidate: CONFIG.revalidateTime,
  }
}

type AboutPageProps = {
  language: string
}

const AboutPage: NextPageWithLayout<AboutPageProps> = ({ language: languageProp }) => {
  const [language, setLanguage] = useLanguage()

  useEffect(() => {
    setLanguage(buildLanguageSegment(languageProp ?? DEFAULT_LANGUAGE))
  }, [languageProp, setLanguage])

  const meta = useMemo(() => {
    const path = `/${buildLanguageSegment(language)}/about`
    return {
      title: `${CONFIG.profile.name} | About`,
      description: CONFIG.profile.bio ?? CONFIG.blog.description,
      type: "website",
      url: getCanonicalUrl(path, CONFIG.link),
      canonical: path,
      language,
    }
  }, [language])

  return (
    <StyledWrapper>
      <MetaConfig {...meta} />
      <div className="page-title">About</div>
      <div className="cards">
        <ProfileCard />
        <ContactCard />
      </div>
    </StyledWrapper>
  )
}

export default AboutPage

const StyledWrapper = styled.div`
  display: flex;
  gap: 1.5rem;
  flex-direction: column;
  padding: 1.5rem 0;

  .page-title {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 2rem;
  }

  .cards {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  }
`
