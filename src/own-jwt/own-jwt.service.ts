import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { JwtPayload } from './types/payload.type';

@Injectable()
export class OwnJwtService {
  constructor(private readonly jwtService: JwtService) {}

  public async generateAccessToken(payload: JwtPayload): Promise<string> {
    const signOptions: JwtSignOptions = {
      expiresIn: '2h',
      secret: 'accessToken',
    };

    return this.jwtService.signAsync(payload, signOptions);
  }

  public async generateRefreshToken(payload: JwtPayload): Promise<string> {
    const signOptions: JwtSignOptions = {
      expiresIn: '30d',
      secret: 'refreshToken',
    };

    return this.jwtService.signAsync(payload, signOptions);
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
