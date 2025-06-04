import { Body, Controller, Post } from '@nestjs/common';
import { CreateUserDTO } from './dtos/create-user.dto';
import { hash } from 'bcrypt';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  public async register(@Body() user: CreateUserDTO) {
    return this.authService.register(user);
  }

  @Post('login')
  public async login() {}
}
