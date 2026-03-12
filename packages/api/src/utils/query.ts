// Helper to safely extract string query params from Express request
export function qs(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  if (Array.isArray(val) && typeof val[0] === "string") return val[0];
  return undefined;
}

// Helper to safely extract route params (string | string[] → string)
export function p(val: string | string[]): string {
  return Array.isArray(val) ? val[0]! : val;
}
