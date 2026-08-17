# Slowbeam.dev SEO Operations

## Publishing contract

Every public post must have a Korean or English language value, a unique title,
summary, publication date, category, slug, author, and translation review state.
Use `Auto`, `Reviewed`, or `NeedsFix` for `translationReviewStatus` in Notion.
`Auto` translations are published immediately; `NeedsFix` pages remain noindex
until corrected.

After publishing or materially updating content, call the authenticated endpoint:

```bash
curl -X POST https://slowbeam.dev/api/revalidate \
  -H "Authorization: Bearer $TOKEN_FOR_REVALIDATE" \
  -H "Content-Type: application/json" \
  -d '{"paths":["/ko/category/slug","/en/category/slug"]}'
```

The endpoint revalidates the supplied pages, both language feeds and all topic
hubs, then submits successfully rebuilt URLs to Naver IndexNow. The older
`?secret=...&path=...` GET form remains available for existing integrations.

## Translation review

- Review every monthly pillar article in full.
- Review one automatically translated article each week.
- Review the five English URLs with the most Search Console impressions.
- Always verify product names, specifications, units, code and safety claims.
- Mark a broken translation `NeedsFix`, correct it, then change it to `Reviewed`
  and revalidate both localized URLs.

## 90-day editorial cadence

1. Month 1: one machine-vision system design pillar and four updates covering
   computer-vision integration, GenFeA and field failure cases.
2. Month 2: one camera/image-sensor selection pillar and four updates covering
   SWIR/NIR, LSSTCam, Arducam and interface or bandwidth comparisons.
3. Month 3: one embedded-vision/edge-AI selection pillar and four updates
   covering AX650N, Axelera, Raspberry Pi and board-selection evidence.

Each article should answer the target question in its opening paragraph and
include firsthand setup details, measurements, original images or code,
failure conditions, sources, an updated date and contextual links to one topic
hub and at least two related posts.

## Weekly measurement

Track Google Search Console and Naver Search Advisor separately for Korean and
English: indexed canonical URLs, impressions, clicks, CTR, average position,
top non-brand queries and pages excluded from indexing. Inspect the two feeds,
six topic hubs and newest priority posts after a deployment. Do not request
manual indexing for every URL.

Run `yarn seo:check` after every production build. The check requires every
sitemap URL to have generated HTML, the correct language, a self canonical,
indexable robots metadata, title, description, H1, JSON-LD and a self-referencing
hreflang link.
