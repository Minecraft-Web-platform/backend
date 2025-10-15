import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { NewsCategory } from './news-category.entity';
import { NewsBlock } from './news-block.entity';
import { User } from 'src/users/entities/user.entity';

@Entity('news')
export class News {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ default: false })
  isApproved: boolean;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  created_at: Date;

  @Column({ length: 255 })
  author: string; // user.username

  @Column({ nullable: true })
  authorId?: number; // (FK → users.id)

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  user?: User;

  @ManyToOne(() => NewsCategory, (category) => category.news, { onDelete: 'CASCADE' })
  category: NewsCategory;

  @OneToMany(() => NewsBlock, (block) => block.news, { cascade: true })
  blocks: NewsBlock[];
}
