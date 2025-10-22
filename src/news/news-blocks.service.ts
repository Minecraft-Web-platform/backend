import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsBlock } from './entities/news-block.entity';
import { INewsBlockService } from './contracts/news-block.service.contract';
import { News } from './entities/news.entity';

@Injectable()
export class NewsBlockService implements INewsBlockService {
  constructor(
    @InjectRepository(NewsBlock)
    private readonly blockRepo: Repository<NewsBlock>,

    @InjectRepository(News)
    private readonly newsRepo: Repository<News>,
  ) {}

  async create(dto: { newsId: string; type: 'text' | 'image'; content: string; order: number }): Promise<NewsBlock> {
    const news = await this.newsRepo.findOneBy({ id: dto.newsId });

    if (!news) {
      throw new NotFoundException('News not found');
    }

    const block = this.blockRepo.create({
      ...dto,
      news,
    });
    return this.blockRepo.save(block);
  }

  async findByNews(newsId: string): Promise<NewsBlock[]> {
    return this.blockRepo.find({
      where: { news: { id: newsId } },
      order: { order: 'ASC' },
    });
  }

  async update(id: string, dto: { content?: string; order?: number }): Promise<NewsBlock> {
    const block = await this.blockRepo.findOneBy({ id });
    if (!block) throw new NotFoundException('Block not found');

    Object.assign(block, dto);
    return this.blockRepo.save(block);
  }

  async remove(id: string): Promise<void> {
    const result = await this.blockRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Block not found');
    }
  }
}
