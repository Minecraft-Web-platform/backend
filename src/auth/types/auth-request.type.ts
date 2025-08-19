import { JwtPayload } from 'src/own-jwt/types/payload.type';

export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
