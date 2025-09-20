import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserResponseDto } from './dtos/user-response.dto';

@Controller('users')
export class UsersController {
  private readonly usersService: UsersService;

  constructor(usersService: UsersService) {
    this.usersService = usersService;
  }

  @Get()
  public async getAll() {
    const users = await this.usersService.getAll();

    return users.map((user) => new UserResponseDto(user));
  }

  @Get(':username')
  public async getByUsername(@Param('username') username: string) {
    const usernameLowercase = username.toLowerCase();
    const user = await this.usersService.getByUsername(usernameLowercase);

    if (!user) {
      throw new NotFoundException('The user was not found');
    }

    return new UserResponseDto(user);
  }
}
