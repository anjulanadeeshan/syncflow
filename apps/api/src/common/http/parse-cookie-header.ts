export function parseCookieHeader(
  header: string | undefined,
): Record<string, string> {
  if (!header) return {};

  return Object.fromEntries(
    header.split(';').flatMap((part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex < 0) return [];

      const key = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      if (!key) return [];

      try {
        return [[key, decodeURIComponent(value)]];
      } catch {
        return [[key, value]];
      }
    }),
  );
}
