import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { News } from './news.entity';

export type NewsBlockType = 'text' | 'image';

@Entity('news_blocks')
export class NewsBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ['text', 'image'] })
  type: NewsBlockType;

  @Column('text')
  content: string; // text or url

  @Column()
  order: number;

  @ManyToOne(() => News, (news) => news.blocks, { onDelete: 'CASCADE' })
  news: News;
}
