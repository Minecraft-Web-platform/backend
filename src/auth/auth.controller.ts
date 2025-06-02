import { Controller, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('register')
  public async register() {}

  @Post('login')
  public async login() {}
}
