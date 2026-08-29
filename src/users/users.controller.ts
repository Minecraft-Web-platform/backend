import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserResponseDto } from './dtos/user-response.dto';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { AdminGuard } from 'src/auth/guards/is-admin.guard';
import { FileInterceptor } from '@nestjs/platform-express';

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
    const userInDB = await this.usersService.getByUsername(usernameLowercase);

    if (!userInDB) {
      throw new NotFoundException('Игрок не найден');
    }

    const normalizedUser = new UserResponseDto(userInDB);

    return normalizedUser;
  }

  @Post('avatar')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req) {
    const avatarUrl = await this.usersService.uploadAvatar(req.user.id, file);
    return { avatarUrl };
  }

  @Post(':username/ban')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async banUser(@Param('username') username: string, @Body('reason') reason: string) {
    if (!reason || reason.trim() === '') {
      throw new BadRequestException('Причина бана обязательна');
    }
    const user = await this.usersService.banUser(username, reason);
    return new UserResponseDto(user);
  }

  @Post(':username/unban')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async unbanUser(@Param('username') username: string) {
    const user = await this.usersService.unbanUser(username);
    return new UserResponseDto(user);
  }
}

