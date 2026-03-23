/**
 * SvelteKit param matcher for product slugs.
 * Matches any string that does NOT look like a version (e.g., v1.0.0).
 * This prevents the [product]/[version] route from capturing URLs
 * meant for the [version]/[...slug] route.
 */
export function match(param: string): boolean {
  // Version patterns start with 'v' followed by a digit
  return !/^v\d/.test(param);
}
