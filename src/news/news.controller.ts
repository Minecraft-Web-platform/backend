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
  UnauthorizedException,
} from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { AdminGuard } from 'src/auth/guards/is-admin.guard';
import { AuthenticatedRequest } from 'src/auth/types/auth-request.type';
import { UsersService } from 'src/users/users.service';
import { NewsCategoryService } from './news-category.service';
import { News } from './entities/news.entity';

@Controller('news')
export class NewsController {
  constructor(
    private readonly newsService: NewsService,
    private readonly usersService: UsersService,
    private readonly categoryService: NewsCategoryService,
  ) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  async create(@Body() dto: CreateNewsDto, @Req() req: AuthenticatedRequest): Promise<News> {
    const actor = await this.usersService.getByUsername(req.user.username_lower);

    if (!actor) {
      throw new UnauthorizedException('Авторизуйся!');
    }

    if (!actor.email || !actor.emailIsConfirmed) {
      throw new ForbiddenException('Сначала подтверди свою почту!')
    }

    const category = await this.categoryService.findOne(dto.categoryId);

    if (category.publish_permission === 'admins' && !actor?.isAdmin) {
      throw new ForbiddenException('Только администратор может публиковать новости в этой категории!');
    }

    return this.newsService.create({
      ...dto,
      author: actor.username,
    });
  }

  @Get()
  async findAll(@Query('categoryId') categoryId?: string): Promise<News[]> {
    return this.newsService.findAll({ categoryId, onlyApproved: true });
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<News> {
    return this.newsService.findOne(id, { onlyApproved: true });
  }

  @Patch(':id/approve')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async approve(@Param('id') id: string): Promise<News> {
    return this.newsService.approve(id);
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateNewsDto): Promise<News> {
    return this.newsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard, AdminGuard)
  async remove(@Param('id') id: string): Promise<void> {
    return this.newsService.remove(id);
  }
}
