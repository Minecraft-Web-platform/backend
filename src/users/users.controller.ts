import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserType } from 'src/auth/types/create-user.type';

@Controller('users')
export class UsersController {
  private readonly usersService: UsersService;

  constructor(usersService: UsersService) {
    this.usersService = usersService;
  }

  @Get()
  public async getAll() {
    return this.usersService.getAll();
  }

  @Post()
  public async create(@Body() userData: CreateUserType) {
    return this.usersService.create(userData);
  }

  @Get(':username')
  public async getByUsername(@Param('username') username: string) {
    const usernameLowercase = username.toLowerCase();

    return this.usersService.getByUsername(usernameLowercase);
  }
}
