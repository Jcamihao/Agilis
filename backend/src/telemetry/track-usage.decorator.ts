import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';

export const TRACK_EVENT_KEY = 'trackEvent';

/**
 * Marca um endpoint de mutação para emitir um evento de produto no sucesso.
 * Usado nos módulos sob observação até o dia 60 do piloto, mais os momentos
 * que viram decisão comercial (convite aceito, onboarding, aprovação).
 * `event` é um nome estável em inglês (ex.: 'invite.accepted').
 */
export const TrackUsage = (event: string) => SetMetadata(TRACK_EVENT_KEY, event);

/** Extrae { companyId, userId } do usuário autenticado injetado pelo JwtStrategy. */
export const AuthContext = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    return { companyId: req.user?.companyId as string | undefined, userId: req.user?.userId as string | undefined };
  },
);
