import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsCategory } from './entities/news-category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class NewsCategoryService {
  constructor(
    @InjectRepository(NewsCategory)
    private categoryRepo: Repository<NewsCategory>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<NewsCategory> {
    const category = this.categoryRepo.create(dto);

    return this.categoryRepo.save(category);
  }

  async findAll(): Promise<NewsCategory[]> {
    return this.categoryRepo.find({ relations: ['news'] });
  }

  async findOne(id: string): Promise<NewsCategory> {
    const category = await this.categoryRepo.findOne({
      where: { id },
      relations: ['news'],
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<NewsCategory> {
    const category = await this.findOne(id);

    Object.assign(category, dto);

    return this.categoryRepo.save(category);
  }

  async remove(id: string): Promise<void> {
    const result = await this.categoryRepo.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Category not found');
    }
  }
}
