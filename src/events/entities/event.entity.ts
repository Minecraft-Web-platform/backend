import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type EventType = 'election' | 'resignation' | 'citizenship' | 'diplomacy' | 'other';

@Entity('events')
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  targetUsername?: string | null;

  @Column({ type: 'varchar', nullable: true })
  type?: EventType | null;

  @Column({ type: 'uuid', nullable: true })
  stateId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  settlementId?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
