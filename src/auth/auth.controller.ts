import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

import { AuthService } from './auth.service';

import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { ResetPasswordDto } from './dtos/reset-password.dto';
import { initEmailConfirmationDto } from './dtos/init-email-confirmation.dto';

import { AccessTokenGuard } from './guards/access-token.guard';
import { AuthenticatedRequest } from './types/auth-request.type';
import { RefreshTokenGuard } from './guards/refresh-token.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('ping')
  public async ping() {
    return 'Pong!';
  }

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
  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  public async refreshAccessToken(@Req() request: AuthenticatedRequest) {
    const payload = request.user;

    return this.authService.refreshToken(payload);
  }

  @HttpCode(200)
  @Post('init-email-confirmation')
  @UseGuards(AccessTokenGuard)
  @ApiResponse({ status: 200 })
  public async initEmailConfirmation(
    @Req() request: AuthenticatedRequest,
    @Body() body: initEmailConfirmationDto,
  ): Promise<{ message: string }> {
    const username_lower = request.user.username_lower;

    return this.authService.initEmailConfirmation(body.email, username_lower);
  }

  @HttpCode(200)
  @Post('confirm-email')
  @UseGuards(AccessTokenGuard)
  public async confirmEmail(@Req() request: AuthenticatedRequest, @Body('confirmationCode') confirmCode: string) {
    const username_lower = request.user.username_lower;

    return this.authService.confirmEmail(confirmCode, username_lower);
  }

  @HttpCode(200)
  @Get('me')
  @UseGuards(AccessTokenGuard)
  public async getInfoAboutMe(@Req() request: AuthenticatedRequest) {
    const username_lower = request.user.username_lower;

    return this.authService.getInfoAboutMe(username_lower);
  }

  @HttpCode(200)
  @Post('init-password-resetting')
  public async initPasswordReset(@Body('username') username: string) {
    const username_lower = username.toLowerCase();

    return this.authService.initPasswordReset(username_lower);
  }

  @HttpCode(200)
  @Post('reset-password')
  public async resetPassword(@Body() { username, code, newPassword }: ResetPasswordDto) {
    const username_lower = username.toLowerCase();

    return this.authService.resetPassword(username_lower, code, newPassword);
  }
}
