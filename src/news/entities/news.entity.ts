import { Column, Entity, ManyToOne, OneToMany, PrimaryColumn } from 'typeorm';
import { NewsCategory } from './news-category.entity';
import { NewsBlock } from './news-block.entity';

@Entity('news')
export class News {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ default: false })
  isApproved: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ length: 255 })
  author: string;

  @ManyToOne(() => NewsCategory, (category) => category.news, { onDelete: 'CASCADE' })
  category: NewsCategory;

  @OneToMany(() => NewsBlock, (block) => block.news, { cascade: true })
  blocks: NewsBlock[];
}
