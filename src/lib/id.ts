/** Small dependency-free unique id generator (good enough for locally stored records). */
export function generateId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${random}`;
}
