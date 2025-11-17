import { CONFIG } from "site.config"
import Head from "next/head"
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "src/constants/language"
import { getCanonicalUrl } from "src/libs/utils/paths"

export type MetaConfigProps = {
  title: string
  description: string
  type: "Website" | "Post" | "Page" | string
  date?: string
  image?: string
  url: string
  canonical?: string
  keywords?: string[]
  language?: string
}

const MetaConfig: React.FC<MetaConfigProps> = (props) => {
  const canonicalUrl = getCanonicalUrl(props.canonical ?? props.url, CONFIG.link)
  const ogLocale = props.language ?? CONFIG.lang ?? DEFAULT_LANGUAGE
  const alternateLocales = SUPPORTED_LANGUAGES.filter((lang) => lang !== ogLocale)

  return (
    <Head>
      <title>{props.title}</title>
      <meta name="robots" content="follow, index" />
      <meta charSet="UTF-8" />
      <meta name="description" content={props.description} />
      <meta name="keywords" content={props.keywords?.join(", ") ?? CONFIG.blog.title} />
      <meta name="author" content={CONFIG.profile.name} />
      <meta name="application-name" content={CONFIG.blog.title} />
      <link rel="canonical" href={canonicalUrl} />
      {/* og */}
      <meta property="og:type" content={props.type} />
      <meta property="og:title" content={props.title} />
      <meta property="og:description" content={props.description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={CONFIG.blog.title} />
      <meta property="og:locale" content={ogLocale} />
      {alternateLocales.map((locale) => (
        <meta key={locale} property="og:locale:alternate" content={locale} />
      ))}
      {props.image && <meta property="og:image" content={props.image} />}
      {/* twitter */}
      <meta name="twitter:title" content={props.title} />
      <meta name="twitter:description" content={props.description} />
      <meta name="twitter:card" content="summary_large_image" />
      {props.image && <meta name="twitter:image" content={props.image} />}
      {/* post */}
      {props.type === "Post" && (
        <>
          <meta property="article:published_time" content={props.date} />
          <meta property="article:author" content={CONFIG.profile.name} />
        </>
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': props.type === "Post" ? 'BlogPosting' : 'WebSite',
            headline: props.title,
            description: props.description,
            url: canonicalUrl,
            inLanguage: ogLocale,
            datePublished: props.date,
            author: {
              '@type': 'Person',
              name: CONFIG.profile.name,
            },
            image: props.image,
            publisher: {
              '@type': 'Organization',
              name: CONFIG.blog.title,
            },
          }),
        }}
      />
    </Head>
  )
}

export default MetaConfig
