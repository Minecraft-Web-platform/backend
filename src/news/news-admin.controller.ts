import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { AdminGuard } from 'src/auth/guards/is-admin.guard';
import { NewsService } from './news.service';
import { NewsCategoryService } from './news-category.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@UseGuards(AccessTokenGuard, AdminGuard)
@Controller('admin/news')
export class NewsAdminController {
  constructor(
    private readonly newsService: NewsService,
    private readonly categoryService: NewsCategoryService,
  ) {}

  @Post('categories')
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get('categories')
  async getAllCategories() {
    return this.categoryService.findAll();
  }

  @Get('categories/:id')
  async getCategory(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Patch('categories/:id')
  async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete('categories/:id')
  async removeCategory(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }

  @Get()
  async getAllNews() {
    return this.newsService.findAll();
  }

  @Get(':id')
  async getNews(@Param('id') id: string) {
    return this.newsService.findOne(id);
  }

  @Post()
  async createNews(@Body() dto: CreateNewsDto) {
    return this.newsService.create(dto);
  }

  @Patch(':id')
  async updateNews(@Param('id') id: string, @Body() dto: UpdateNewsDto) {
    return this.newsService.update(id, dto);
  }

  @Patch(':id/approve')
  async approveNews(@Param('id') id: string) {
    return this.newsService.approve(id);
  }

  @Delete(':id')
  async removeNews(@Param('id') id: string) {
    return this.newsService.remove(id);
  }
}
