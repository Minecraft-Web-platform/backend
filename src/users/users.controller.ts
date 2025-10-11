import { Controller, Get, Param, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserResponseDto } from './dtos/user-response.dto';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
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

    return this.usersService.getByUsername(usernameLowercase);
  }

  @Post('avatar')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req) {
    const avatarUrl = await this.usersService.uploadAvatar(req.user.id, file);
    return { avatarUrl };
  }
}
