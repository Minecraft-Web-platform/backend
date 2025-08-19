import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthenticatedRequest } from './types/auth-request.type';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  public async register(@Body() user: RegisterDto) {
    return this.authService.register(user);
  }

  @Post('login')
  public async login(@Body() loginData: LoginDto) {
    return this.authService.login(loginData);
  }

  @Post('init-email-confirmation')
  @UseGuards(AccessTokenGuard)
  public async initEmailConfirmation(@Req() request: AuthenticatedRequest, @Body('email') email: string) {
    const username_lower = request.user.username_lower;

    return this.authService.initEmailConfirmation(email, username_lower);
  }
}
