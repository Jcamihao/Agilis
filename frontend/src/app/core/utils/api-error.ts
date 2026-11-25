/** Mensagem de erro vinda do backend (HttpErrorResponse), com fallback local. */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { error?: { message?: string } } | null)?.error?.message;
  return msg || fallback;
}
