/** Short, collision-resistant ids that work without crypto.randomUUID (older WebViews). */
export function newId(prefix = ''): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } }
  if (g.crypto?.randomUUID) return prefix + g.crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  const rand = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
  return prefix + Date.now().toString(36) + rand
}
