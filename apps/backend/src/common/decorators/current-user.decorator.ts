import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithUser } from '../../modules/auth/auth.controller';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  },
);
