import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserResponseDto } from './dtos/user-response.dto';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';

@Controller('users')
export class UsersController {
  private readonly usersService: UsersService;

  constructor(usersService: UsersService) {
    this.usersService = usersService;
  }

  @UseGuards(AccessTokenGuard)
  @Get()
  public async getAll() {
    const users = await this.usersService.getAll();

    return users.map((user) => new UserResponseDto(user));
  }

  @UseGuards(AccessTokenGuard)
  @Get(':username')
  public async getByUsername(@Param('username') username: string) {
    const usernameLowercase = username.toLowerCase();

    return this.usersService.getByUsername(usernameLowercase);
  }
}
