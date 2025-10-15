import { NewsCategory } from '../entities/news-category.entity';

export interface INewsCategoryService {
  create(dto: { name: string; description?: string; publish_permission: 'all' | 'admins' }): Promise<NewsCategory>;

  findAll(): Promise<NewsCategory[]>;

  findOne(id: string): Promise<NewsCategory>;

  update(
    id: string,
    dto: {
      name?: string;
      description?: string;
      publish_permission?: 'all' | 'admins';
    },
  ): Promise<NewsCategory>;

  remove(id: string): Promise<void>;
}
