import Head from "next/head"
import { CONFIG } from "site.config"
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "src/constants/language"
import { getAbsoluteUrl, getCanonicalUrl } from "src/libs/utils/paths"

export type MetaConfigProps = {
  title: string
  description: string
  pageKind: "website" | "article" | "profile"
  url: string
  canonical?: string
  image?: string
  keywords?: string[]
  language?: string
  indexable?: boolean
  datePublished?: string
  dateModified?: string
  authorName?: string
  alternates?: {
    hrefLang: string
    href: string
  }[]
  breadcrumbs?: {
    name: string
    url?: string
  }[]
}

const OG_LOCALES: Record<string, string> = {
  ko: "ko_KR",
  en: "en_US",
}

const serializeJsonLd = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c")

const MetaConfig: React.FC<MetaConfigProps> = ({
  indexable = true,
  ...props
}) => {
  const canonicalUrl = getCanonicalUrl(
    props.canonical ?? props.url,
    CONFIG.link
  )
  const language = props.language ?? DEFAULT_LANGUAGE
  const ogLocale = OG_LOCALES[language] ?? language
  const alternateLocales = SUPPORTED_LANGUAGES.filter(
    (supportedLanguage) => supportedLanguage !== language
  )
  const image = props.image
    ? getAbsoluteUrl(props.image, CONFIG.link)
    : getAbsoluteUrl(CONFIG.profile.image, CONFIG.link)
  const authorName = props.authorName || CONFIG.profile.name
  const authorUrl = getCanonicalUrl(`/${language}/about/about`, CONFIG.link)

  const entity =
    props.pageKind === "article"
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: props.title,
          description: props.description,
          url: canonicalUrl,
          mainEntityOfPage: canonicalUrl,
          inLanguage: language,
          datePublished: props.datePublished,
          dateModified: props.dateModified ?? props.datePublished,
          image: [image],
          keywords: props.keywords?.join(", "),
          author: {
            "@type": "Person",
            name: authorName,
            url: authorUrl,
          },
          publisher: {
            "@type": "Organization",
            name: CONFIG.blog.title,
            logo: {
              "@type": "ImageObject",
              url: getAbsoluteUrl(CONFIG.profile.image, CONFIG.link),
            },
          },
        }
      : props.pageKind === "profile"
      ? {
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          name: props.title,
          description: props.description,
          url: canonicalUrl,
          inLanguage: language,
          mainEntity: {
            "@type": "Person",
            name: authorName,
            url: canonicalUrl,
          },
        }
      : {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: CONFIG.blog.title,
          headline: props.title,
          description: props.description,
          url: canonicalUrl,
          inLanguage: language,
          author: {
            "@type": "Person",
            name: authorName,
            url: authorUrl,
          },
        }

  const breadcrumbEntity = props.breadcrumbs?.length
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: props.breadcrumbs.map((breadcrumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: breadcrumb.name,
          item: breadcrumb.url,
        })),
      }
    : null

  return (
    <Head>
      <title>{props.title}</title>
      <meta
        name="robots"
        content={indexable ? "index, follow" : "noindex, follow"}
      />
      <meta charSet="UTF-8" />
      <meta name="description" content={props.description} />
      <meta name="author" content={authorName} />
      <meta name="application-name" content={CONFIG.blog.title} />
      <link rel="canonical" href={canonicalUrl} />
      {props.alternates?.map((alternate) => (
        <link
          key={`${alternate.hrefLang}:${alternate.href}`}
          rel="alternate"
          hrefLang={alternate.hrefLang}
          href={alternate.href}
        />
      ))}
      <meta
        property="og:type"
        content={props.pageKind === "article" ? "article" : "website"}
      />
      <meta property="og:title" content={props.title} />
      <meta property="og:description" content={props.description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content={CONFIG.blog.title} />
      <meta property="og:locale" content={ogLocale} />
      {alternateLocales.map((locale) => (
        <meta
          key={locale}
          property="og:locale:alternate"
          content={OG_LOCALES[locale] ?? locale}
        />
      ))}
      <meta property="og:image" content={image} />
      <meta name="twitter:title" content={props.title} />
      <meta name="twitter:description" content={props.description} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:image" content={image} />
      {props.pageKind === "article" ? (
        <>
          <meta
            property="article:published_time"
            content={props.datePublished}
          />
          <meta
            property="article:modified_time"
            content={props.dateModified ?? props.datePublished}
          />
          <meta property="article:author" content={authorName} />
        </>
      ) : null}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(entity) }}
      />
      {breadcrumbEntity ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(breadcrumbEntity),
          }}
        />
      ) : null}
    </Head>
  )
}

export default MetaConfig
