import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { StateEntity } from './state.entity';

@Entity('state_decrees')
export class StateDecreeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'state_id', type: 'uuid' })
  stateId: string;

  @ManyToOne(() => StateEntity, (state) => state.decrees, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'state_id' })
  state?: StateEntity;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'author_username', type: 'varchar', length: 255 })
  authorUsername: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
