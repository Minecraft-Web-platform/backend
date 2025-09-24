import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from './types/payload.type';

@Injectable()
export class OwnJwtService {
  constructor(private readonly jwtService: JwtService) {}

  public async generateAccessToken(payload: JwtPayload): Promise<string> {
    const { username_lower, id, uuid } = payload;

    return this.jwtService.signAsync(
      {
        username_lower,
        id,
        uuid,
      },
      {
        expiresIn: '2h',
        secret: 'accessToken',
      },
    );
  }

  public async generateRefreshToken(payload: JwtPayload): Promise<string> {
    const { username_lower, id, uuid } = payload;
    return this.jwtService.signAsync(
      {
        username_lower,
        id,
        uuid,
      },
      {
        expiresIn: '30d',
        secret: 'refreshToken',
      },
    );
  }

  public async verifyToken<T extends object>(token: string, secret: string): Promise<T> {
    try {
      return await this.jwtService.verifyAsync<T>(token, { secret });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  public decode<T extends object>(token: string): T | null {
    return this.jwtService.decode(token) as T | null;
  }
}
