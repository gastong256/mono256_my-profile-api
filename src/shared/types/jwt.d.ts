import '@fastify/jwt';
import type { JwtUserPayload } from '../../modules/auth/auth.types';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtUserPayload;
    user: JwtUserPayload;
  }
}
