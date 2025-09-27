import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { News } from './news.entity';

@Entity('news_categories')
export class NewsCategory {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 20, default: 'all' })
  publish_permission: 'all' | 'admins';

  @OneToMany(() => News, (news) => news.category)
  news: News[];
}
