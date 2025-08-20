import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthenticatedRequest } from './types/auth-request.type';
import { initEmailConfirmationDto } from './dtos/init-email-confirmation.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(201)
  @Post('register')
  public async register(@Body() user: RegisterDto) {
    return this.authService.register(user);
  }

  @HttpCode(200)
  @Post('login')
  public async login(@Body() loginData: LoginDto) {
    return this.authService.login(loginData);
  }

  @HttpCode(200)
  @Post('init-email-confirmation')
  @UseGuards(AccessTokenGuard)
  public async initEmailConfirmation(@Req() request: AuthenticatedRequest, @Body() body: initEmailConfirmationDto) {
    const username_lower = request.user.username_lower;

    return this.authService.initEmailConfirmation(body.email, username_lower);
  }

  @HttpCode(200)
  @Post('confirm-email')
  @UseGuards(AccessTokenGuard)
  public async confirmEmail(@Req() request: AuthenticatedRequest, @Body('confirmation-code') confirmCode: string) {
    const username_lower = request.user.username_lower;

    return this.authService.confirmEmail(confirmCode, username_lower);
  }

  @HttpCode(200)
  @Get('me')
  @UseGuards(AccessTokenGuard)
  public async getInfoAboutMe(@Req() request: AuthenticatedRequest) {
    const username_lower = request.user.username_lower;
  }
}
