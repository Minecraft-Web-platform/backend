import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { AdminGuard } from 'src/auth/guards/is-admin.guard';
import { AuthenticatedRequest } from 'src/auth/types/auth-request.type';
import { UsersService } from 'src/users/users.service';
import { NewsCategoryService } from './news-category.service';
import { User } from 'src/users/entities/user.entity';

@Controller('news')
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly usersService: UsersService,
    private readonly categoryService: NewsCategoryService,
  ) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  async create(@Body() dto: CreateNewsDto, @Req() req: AuthenticatedRequest) {
    const actor = (await this.usersService.getByUsername(req.user.username_lower)) as User;
    const category = await this.categoryService.findOne(dto.categoryId);

    if (category.publish_permission === 'admins' && !actor?.isAdmin) {
      throw new ForbiddenException('Only admins can publish in this category');
    }

    return this.newsService.create({
      ...dto,
      author: actor.username,
    });
  }

  @Get()
  async findAll(@Query('categoryId') categoryId?: string) {
    return this.newsService.findAll({ categoryId, onlyApproved: true });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.newsService.findOne(id, { onlyApproved: true });
  }

  @Patch(':id/approve')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async approve(@Param('id') id: string) {
    return this.newsService.approve(id);
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateNewsDto) {
    return this.newsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async remove(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
