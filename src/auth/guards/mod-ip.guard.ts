import { CanActivate, ExecutionContext, Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ModIpGuard implements CanActivate {
  private readonly logger = new Logger(ModIpGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const allowedIp = process.env.MOD_ALLOWED_IP;

    if (!allowedIp) {
      this.logger.warn('MOD_ALLOWED_IP is not set in environment variables. Denying all mod requests for security.');

      throw new ForbiddenException('Mod access is restricted.');
    }

    let clientIp =
      request.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
      request.socket.remoteAddress ||
      request.ip;

    console.log('clientIp var: ' + clientIp)

    if (clientIp && clientIp.startsWith('::ffff:')) {
      clientIp = clientIp.replace('::ffff:', '');
    }

    this.logger.log(`Request client IP: ${clientIp}, Allowed: ${allowedIp}`);

    const isLocalhost =
      (allowedIp === '127.0.0.1' || allowedIp === 'localhost') &&
      (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp === 'localhost' || (clientIp && (clientIp.startsWith('172.19.') || clientIp.startsWith('172.'))));

    console.log('isLocalhost var: ' + isLocalhost)

    if (clientIp !== allowedIp && !isLocalhost) {
      console.log('AHAHHAHA')

      this.logger.warn(`Blocked unauthorized mod request from IP: ${clientIp} (Expected: ${allowedIp})`);
      throw new ForbiddenException('Access denied.');
    }

    console.log('allowed!')

    return true;
  }
}
