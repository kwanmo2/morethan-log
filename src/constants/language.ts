import { CONFIG } from "site.config"
import { deriveDefaultLanguage } from "src/libs/utils/language"

export const DEFAULT_LANGUAGE = deriveDefaultLanguage(CONFIG.lang)
export const SUPPORTED_LANGUAGES = ["ko", "en"] as const
