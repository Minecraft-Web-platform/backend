import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OwnJwtService } from 'src/own-jwt/own-jwt.service';
import { JwtPayload } from 'src/own-jwt/types/payload.type';
import { User } from 'src/users/entities/user.entity';
import { ALLOW_BANNED_KEY } from '../decorators/allow-banned.decorator';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: OwnJwtService,
    private reflector: Reflector,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (request.query && request.query.token) {
      token = request.query.token;
    }

    if (!token) {
      throw new UnauthorizedException('Access token missing');
    }

    try {
      const payload = await this.jwtService.verifyToken<JwtPayload>(token, 'accessToken');
      request.user = payload;

      const allowBanned = this.reflector.getAllAndOverride<boolean>(ALLOW_BANNED_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (!allowBanned) {
        const user = await this.userRepo.findOne({ where: { uuid: payload.uuid } });
        if (user && user.isBanned) {
          throw new ForbiddenException({
            message: 'BANNED',
            reason: user.banReason || 'Без причины',
          });
        }
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
