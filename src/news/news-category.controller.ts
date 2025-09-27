import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

import { NewsCategoryService } from './news-category.service';

import { AccessTokenGuard } from 'src/auth/guards/access-token.guard';
import { AdminGuard } from 'src/auth/guards/is-admin.guard';

@Controller('categories')
export class NewsCategoryController {
  constructor(private readonly categoryService: NewsCategoryService) {}

  @Post()
  @UseGuards(AccessTokenGuard, AdminGuard)
  public async create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Get()
  public async findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  public async findOne(@Param('id') id: string) {
    return this.categoryService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AccessTokenGuard, AdminGuard)
  public async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AccessTokenGuard, AdminGuard)
  public async remove(@Param('id') id: string) {
    return this.categoryService.remove(id);
  }
}
