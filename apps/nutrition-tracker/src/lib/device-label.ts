/** Turns a user agent into a short label like "iPhone, Safari". */
export function describeDevice(userAgent: string): string {
  const device = /iPhone/.test(userAgent)
    ? "iPhone"
    : /iPad/.test(userAgent)
      ? "iPad"
      : /Android/.test(userAgent)
        ? "Android"
        : /Macintosh/.test(userAgent)
          ? "Mac"
          : /Windows/.test(userAgent)
            ? "Windows"
            : "Unknown device";

  // Order matters: Chrome and Firefox on iOS also claim to be Safari.
  const browser = /CriOS|Chrome/.test(userAgent)
    ? "Chrome"
    : /FxiOS|Firefox/.test(userAgent)
      ? "Firefox"
      : /Safari/.test(userAgent)
        ? "Safari"
        : null;

  return browser ? `${device}, ${browser}` : device;
}
