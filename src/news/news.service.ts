import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { News } from './entities/news.entity';
import { NewsBlock } from './entities/news-block.entity';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { NewsCategory } from './entities/news-category.entity';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(News) private readonly newsRepo: Repository<News>,
    @InjectRepository(NewsBlock) private readonly blockRepo: Repository<NewsBlock>,
    @InjectRepository(NewsCategory) private readonly categoryRepo: Repository<NewsCategory>,
  ) {}

  async create(dto: CreateNewsDto): Promise<News> {
    const category = await this.categoryRepo.findOneBy({ id: dto.categoryId });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const news = this.newsRepo.create({
      title: dto.title,
      author: dto.author,
      category,
      isApproved: false,
      blocks: dto.blocks.map((block, i) =>
        this.blockRepo.create({
          type: block.type,
          content: block.content,
          order: i,
        }),
      ),
    });

    return this.newsRepo.save(news);
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
    const where: FindOptionsWhere<News> = {};

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
      const category = await this.categoryRepo.findOneBy({ id: dto.categoryId });

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      news.category = category;
    }

    if (dto.blocks) {
      await this.blockRepo.delete({ news: { id } });

      news.blocks = dto.blocks.map((block, i) =>
        this.blockRepo.create({
          type: block.type,
          content: block.content,
          order: i,
          news,
        }),
      );
    }

    return this.newsRepo.save(news);
  }

  async remove(id: string): Promise<void> {
    const result = await this.newsRepo.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('News not found');
    }
  }
}
