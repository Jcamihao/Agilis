import { createHash, randomBytes } from 'crypto';

export const RESET_INVALID_MESSAGE = 'Link de recuperação inválido ou expirado. Solicite um novo.';

// Token cru só existe no e-mail enviado. O banco guarda apenas o hash (pattern do convite).
export const generateResetToken = (): string => randomBytes(32).toString('base64url');

export const hashResetToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
