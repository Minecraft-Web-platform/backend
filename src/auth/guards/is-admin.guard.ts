import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const username = req.user?.username_lower;

    if (!username) {
      throw new ForbiddenException('Invalid token payload');
    }

    const user = await this.usersService.getByUsername(username);

    if (!user?.isAdmin) {
      throw new ForbiddenException('You are not an admin');
    }

    return true;
  }
}
