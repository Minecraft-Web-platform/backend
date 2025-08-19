import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { OwnJwtService } from 'src/own-jwt/own-jwt.service';
import { JwtPayload } from 'src/own-jwt/types/payload.type';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly jwtService: OwnJwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Access token missing');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.jwtService.verifyToken<JwtPayload>(token, 'accessToken');
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
