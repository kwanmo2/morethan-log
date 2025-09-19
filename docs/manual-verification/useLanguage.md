# Manual Verification - Language Auto-Detection

These steps verify the language initialization logic when no language cookie is present.

## Prerequisites

- Run the application locally via `yarn dev`.
- Open the site in a private/incognito browsing session so no previous language cookie exists.

## Scenario: Browser reports `en-US`

1. In the browser DevTools console, execute `navigator.__defineGetter__('languages', () => ['en-US'])` and `navigator.__defineGetter__('language', () => 'en-US')`.
2. Reload the page.
3. Confirm that the interface renders in English (e.g., headings and navigation labels appear in English).

## Scenario: Browser reports `ko-KR`

1. In the DevTools console, execute `navigator.__defineGetter__('languages', () => ['ko-KR'])` and `navigator.__defineGetter__('language', () => 'ko-KR')`.
2. Reload the page.
3. Confirm that the interface remains in Korean (e.g., headings and navigation labels appear in Korean).

Reset your DevTools overrides or restart the browser session after completing the checks.
