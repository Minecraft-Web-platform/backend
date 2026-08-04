import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class EconomistGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const username = req.user?.username_lower;

    if (!username) {
      throw new ForbiddenException('Invalid token payload');
    }

    const user = await this.usersService.getByUsername(username);

    if (!user?.isEconomist) {
      throw new ForbiddenException('You are not an economist or admin');
    }

    return true;
  }
}
