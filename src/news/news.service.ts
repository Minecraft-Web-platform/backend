import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { FindOptionsWhere, Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { News } from './entities/news.entity';

import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

import { UsersService } from 'src/users/users.service';
import { INewsService } from './contracts/news.service.contract';

import { NewsCategoryService } from './news-category.service';
import { NewsBlockService } from './news-blocks.service';

@Injectable()
export class NewsService implements INewsService {
  private s3: S3Client;
  private bucketName = 'news-pics';

  constructor(
    @InjectRepository(News)
    private readonly newsRepo: Repository<News>,

    private readonly usersService: UsersService,
    private readonly categoryService: NewsCategoryService,
    private readonly blockService: NewsBlockService,
  ) {
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: 'https://df4312c11ddf0f2ed9b8fd51a8e570a3.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY!,
        secretAccessKey: process.env.R2_SECRET_KEY!,
      },
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    if (!file) throw new BadRequestException('Файл не передан');

    const ext = path.extname(file.originalname);
    const key = `${randomUUID()}${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return `https://pub-74cf945c6d0c4b15b79b8c1a19ab884a.r2.dev/${key}`;
  }

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
      news.category = await this.categoryService.findOne(dto.categoryId);
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
