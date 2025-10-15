import { NewsBlock } from '../entities/news-block.entity';

export interface INewsBlockService {
  create(dto: { newsId: string; type: 'text' | 'image'; content: string; order: number }): Promise<NewsBlock>;

  findByNews(newsId: string): Promise<NewsBlock[]>;

  update(id: string, dto: { content?: string; order?: number }): Promise<NewsBlock>;

  remove(id: string): Promise<void>;
}
