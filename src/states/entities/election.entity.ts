import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ElectionCandidateEntity } from './election-candidate.entity';
import { ElectionVoteEntity } from './election-vote.entity';

export type ElectionTargetType = 'state' | 'city';
export type ElectionStatus = 'nomination' | 'voting' | 'completed';

@Entity('elections')
export class ElectionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'target_type', type: 'varchar', length: 32 })
  targetType: ElectionTargetType;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId: string;

  @Column({ type: 'varchar', length: 32, default: 'nomination' })
  status: ElectionStatus;

  @Column({ name: 'starts_at', type: 'timestamp' })
  startsAt: Date;

  @Column({ name: 'ends_at', type: 'timestamp' })
  endsAt: Date;

  @Column({ name: 'winner_username', type: 'varchar', length: 255, nullable: true })
  winnerUsername: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => ElectionCandidateEntity, (cand) => cand.election, { cascade: true })
  candidates?: ElectionCandidateEntity[];

  @OneToMany(() => ElectionVoteEntity, (vote) => vote.election, { cascade: true })
  votes?: ElectionVoteEntity[];
}
