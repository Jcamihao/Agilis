import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// Login: balde por IP + e-mail, então tentar senhas numa conta trava só essa conta, mesmo
// se o IP visto for o do proxy. Demais rotas: balde por IP.
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected errorMessage = 'Muitas tentativas. Aguarde um minuto e tente de novo.';

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const email = req.path?.endsWith('/login') ? String(req.body?.email ?? '').trim().toLowerCase() : '';
    return email ? `${req.ip}|${email}` : req.ip;
  }
}
