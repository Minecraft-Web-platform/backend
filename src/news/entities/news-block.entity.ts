import { Column, Entity, ManyToOne, PrimaryColumn } from 'typeorm';
import { News } from './news.entity';

export type NewsBlockType = 'text' | 'image';

@Entity('news_blocks')
export class NewsBlock {
  @PrimaryColumn('char', { length: 36 })
  id: string; // UUID v4

  @Column({ type: 'enum', enum: ['text', 'image'] })
  type: NewsBlockType;

  @Column('text')
  content: string;
  // if type = 'text' → text
  // if type = 'image' → image URL

  @Column()
  order: number; // block order of a news

  @ManyToOne(() => News, (news) => news.blocks, { onDelete: 'CASCADE' })
  news: News;
}
