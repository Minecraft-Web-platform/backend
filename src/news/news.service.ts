import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';

import { News } from './entities/news.entity';

import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

import { UsersService } from 'src/users/users.service';
import { INewsService } from './contracts/news.service.contract';

import { NewsCategoryService } from './news-category.service';
import { NewsBlockService } from './news-blocks.service';

@Injectable()
export class NewsService implements INewsService {
  constructor(
    @InjectRepository(News)
    private readonly newsRepo: Repository<News>,

    private readonly usersService: UsersService,
    private readonly categoryService: NewsCategoryService,
    private readonly blockService: NewsBlockService,
  ) {}

  async create(dto: CreateNewsDto): Promise<News> {
    const category = await this.categoryService.findOne(dto.categoryId);
    const author = await this.usersService.getByUsername(dto.author);

    if (!author) {
      throw new ForbiddenException('Author not found or not authenticated');
    }

    if (category.publish_permission === 'admins' && !author.isAdmin) {
      throw new ForbiddenException('Only admins can publish in this category');
    }

    const isApproved = author.isAdmin;

    const news = this.newsRepo.create({
      title: dto.title,
      author: author.username,
      authorId: author.id,
      category,
      isApproved,
    });

    const savedNews = await this.newsRepo.save(news);

    for (let i = 0; i < dto.blocks.length; i++) {
      const block = dto.blocks[i];

      await this.blockService.create({
        newsId: savedNews.id,
        type: block.type,
        content: block.content,
        order: i,
      });
    }

    return this.findOne(savedNews.id);
  }

  async findAll(options?: { categoryId?: string; onlyApproved?: boolean }): Promise<News[]> {
    const where: FindOptionsWhere<News> = {};

    if (options?.categoryId) {
      where.category = { id: options.categoryId };
    }

    if (options?.onlyApproved) {
      where.isApproved = true;
    }

    return this.newsRepo.find({
      where,
      relations: ['category', 'blocks'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string, options?: { onlyApproved?: boolean }): Promise<News> {
    const where: FindOptionsWhere<News> = { id };

    if (options?.onlyApproved) {
      where.isApproved = true;
    }

    const news = await this.newsRepo.findOne({
      where,
      relations: ['category', 'blocks'],
    });

    if (!news) {
      throw new NotFoundException('News not found');
    }

    return news;
  }

  async approve(id: string): Promise<News> {
    const news = await this.newsRepo.findOneBy({ id });

    if (!news) {
      throw new NotFoundException('News not found');
    }

    news.isApproved = true;

    return this.newsRepo.save(news);
  }

  async update(id: string, dto: UpdateNewsDto): Promise<News> {
    const news = await this.newsRepo.findOne({
      where: { id },
      relations: ['blocks', 'category'],
    });

    if (!news) {
      throw new NotFoundException('News not found');
    }

    if (dto.title) {
      news.title = dto.title;
    }

    if (dto.categoryId) {
      const category = await this.categoryService.findOne(dto.categoryId);
      news.category = category;
    }

    if (dto.blocks) {
      const oldBlocks = await this.blockService.findByNews(id);

      for (const oldBlock of oldBlocks) {
        await this.blockService.remove(oldBlock.id);
      }

      for (let i = 0; i < dto.blocks.length; i++) {
        const block = dto.blocks[i];

        await this.blockService.create({
          newsId: id,
          type: block.type,
          content: block.content,
          order: i,
        });
      }
    }

    await this.newsRepo.save(news);

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.newsRepo.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('News not found');
    }
  }
}
