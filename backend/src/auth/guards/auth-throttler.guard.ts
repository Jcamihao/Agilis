import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Login e recuperação de senha: balde por IP + e-mail, então tentativas numa conta travam só
// essa conta, mesmo se o IP visto for o do proxy. Demais rotas: balde por IP.
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected errorMessage = 'Muitas tentativas. Aguarde um minuto e tente de novo.';

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const keyedByEmail = req.path?.endsWith('/login') || req.path?.endsWith('/forgot-password');
    const email = keyedByEmail ? String(req.body?.email ?? '').trim().toLowerCase() : '';
    return email ? `${req.ip}|${email}` : req.ip;
  }
}
