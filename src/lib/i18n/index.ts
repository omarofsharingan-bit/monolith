import ar from "./ar.json";

/**
 * Single-locale i18n. Arabic is the only shipped language, but every string is
 * looked up through this dictionary so a second locale is a file, not a rewrite.
 */
export const locales = ["ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";

const dictionaries = { ar } as const;

export type Dictionary = typeof ar;

export function getDictionary(locale: Locale = defaultLocale): Dictionary {
  return dictionaries[locale];
}

/** Convenience accessor: t("ledger.title"). Returns the key itself if missing. */
export function t(path: string, locale: Locale = defaultLocale): string {
  const dict = getDictionary(locale) as unknown as Record<string, unknown>;
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as object)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
  return typeof value === "string" ? value : path;
}

/** The dictionary object, for destructuring in components. */
export const dict = ar;
