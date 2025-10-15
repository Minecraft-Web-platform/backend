import { News } from '../entities/news.entity';

export interface INewsService {
  create(dto: {
    title: string;
    author: string;
    categoryId: string;
    blocks: { type: 'text' | 'image'; content: string }[];
  }): Promise<News>;

  findAll(options?: { categoryId?: string; onlyApproved?: boolean }): Promise<News[]>;

  findOne(id: string, options?: { onlyApproved?: boolean }): Promise<News>;

  approve(id: string): Promise<News>;

  update(
    id: string,
    dto: {
      title?: string;
      categoryId?: string;
      blocks?: { type: 'text' | 'image'; content: string }[];
    },
  ): Promise<News>;

  remove(id: string): Promise<void>;
}
