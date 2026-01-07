# AGENTS.md

This file provides development guidelines for AI coding agents working on the morethan-log project.

## Project Overview

**morethan-log** is a Next.js 14 TypeScript blog platform using Notion as a headless CMS.

- **Framework**: Next.js 14, React 18, TypeScript (strict mode)
- **Styling**: Emotion (CSS-in-JS) with light/dark theme support
- **Data Fetching**: TanStack Query
- **CMS**: Notion API
- **Package Manager**: Yarn
- **Deployment**: Vercel

---

## Development Commands

### Core Commands

```bash
yarn dev                    # Start development server (localhost:3000)
yarn build                  # Build for production (includes sitemap generation)
yarn start                  # Start production server
yarn lint                   # Run ESLint (next/core-web-vitals)
yarn generate:translations  # Generate AI translations using OpenAI
```

### Docker Support

```bash
make setup NOTION_PAGE_ID=<id>  # Setup Docker environment
make dev                         # Run dev server in Docker (port 8001)
make run                         # Run shell in Docker container
```

### Testing

No test framework is currently configured. See "Testing Strategy" section for recommendations.

---

## Code Style Guidelines

### Formatting (Prettier)

- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Double quotes (`"`)
- **Semicolons**: None
- **Trailing commas**: ES5 compatible
- **Bracket spacing**: Enabled

### TypeScript

- **Strict mode**: Enabled
- **Target**: ESNext
- **Base URL**: `.` (use absolute imports from `src/`)

### Import Order

```typescript
// 1. External libraries
import React from "react"
import { useRouter } from "next/router"
import styled from "@emotion/styled"
import { useQuery } from "@tanstack/react-query"

// 2. Internal modules (absolute paths)
import { TPost } from "src/types"
import { queryKey } from "src/constants/queryKey"
import useLanguage from "src/hooks/useLanguage"
```

### Component Pattern

```typescript
import styled from "@emotion/styled"
import React from "react"

type Props = {
  children: string
  onClick?: () => void
}

const Component: React.FC<Props> = ({ children, onClick }) => {
  return (
    <StyledWrapper onClick={onClick}>
      {children}
    </StyledWrapper>
  )
}

export default Component

// Styled components at bottom of file
const StyledWrapper = styled.div`
  padding: 1rem;
  color: ${({ theme }) => theme.colors.gray10};
  background-color: ${({ theme }) => theme.colors.gray5};
`
```

### Custom Hook Pattern

```typescript
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { queryKey } from "src/constants/queryKey"
import { TPost } from "src/types"

const useCustomHook = () => {
  const { data } = useQuery({
    queryKey: queryKey.posts(),
    initialData: [] as TPost[],
  })

  const processed = useMemo(() => {
    return data.map((item) => processItem(item))
  }, [data])

  return processed
}

export default useCustomHook
```

### Type Definitions

- Use `T` prefix for complex types: `TPost`, `TPostStatus`, `TCategories`
- Use PascalCase for type/interface names
- Define types in `src/types/` directory
- Use union types for status enums: `"light" | "dark"`

---

## File Naming & Structure

| Type       | Convention                  | Example                              |
| ---------- | --------------------------- | ------------------------------------ |
| Components | PascalCase                  | `PostCard.tsx`, `ThemeToggle.tsx`    |
| Hooks      | camelCase with `use` prefix | `usePostsQuery.ts`, `useLanguage.ts` |
| Utilities  | camelCase                   | `filterPosts.ts`, `getMetadata.ts`   |
| Constants  | camelCase                   | `queryKey.ts`, `language.ts`         |
| Types      | camelCase (index.ts)        | `src/types/index.ts`                 |

### Directory Structure

```
src/
├── apis/          # API integrations (Notion client)
├── assets/        # Static assets (fonts, images)
├── components/    # Reusable React components
├── constants/     # Application constants
├── hooks/         # Custom React hooks
├── layouts/       # Layout components
├── libs/          # Utility libraries
├── pages/         # Next.js pages and API routes
├── routes/        # Page route components
├── styles/        # Theme, colors, variables
└── types/         # TypeScript type definitions
```

---

## Environment Variables

| Variable                               | Required | Description             |
| -------------------------------------- | -------- | ----------------------- |
| `NOTION_PAGE_ID`                       | Yes      | Notion database page ID |
| `OPENAI_API_KEY`                       | No       | AI translations         |
| `NEXT_PUBLIC_GOOGLE_MEASUREMENT_ID`    | No       | Google Analytics        |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | No       | Google Search Console   |
| `NEXT_PUBLIC_UTTERANCES_REPO`          | No       | GitHub comments         |

---

## Git Conventions

### Commit Messages

```
feat: add new feature
fix: fix bug
refactor: refactor code
style: styling changes
test: add tests
ci: CI/CD changes
docs: documentation
build: build system
chore: maintenance
```

### Branch Naming

- Feature: `feat/feature-name`
- Bugfix: `fix/issue-description`

---

## Testing Strategy (Recommended)

### Recommended Tools

- **Unit/Integration**: Jest or Vitest
- **Component Testing**: React Testing Library
- **E2E Testing**: Playwright
- **API Mocking**: MSW (Mock Service Worker)

### Test File Naming

```
ComponentName.test.tsx    # Component tests
useHookName.test.ts       # Hook tests
utilityName.test.ts       # Utility tests
```

### Test Types

1. **Unit Tests**: Pure functions, utilities in `src/libs/`
2. **Component Tests**: React components with user interactions
3. **Integration Tests**: API integrations, data flow
4. **E2E Tests**: Critical user journeys (post viewing, navigation)

---

## Special Features

### AI Translation

- Uses OpenAI API for Korean-to-English translations
- Generated files stored in `data/ai-translations/`
- Run `yarn generate:translations` before deployment

### Notion Integration

- All content fetched from Notion CMS
- Handle API errors gracefully
- Use TanStack Query for caching

### SEO & i18n

- Dynamic OG images via `@vercel/og`
- Automatic sitemap generation on build
- Bilingual support (Korean/English) with language toggle

---

## Configuration Files

| File               | Purpose                         |
| ------------------ | ------------------------------- |
| `site.config.js`   | Site settings, plugins, profile |
| `next.config.js`   | Next.js configuration           |
| `tsconfig.json`    | TypeScript settings             |
| `.prettierrc.json` | Code formatting                 |
| `.eslintrc.json`   | Linting rules                   |
