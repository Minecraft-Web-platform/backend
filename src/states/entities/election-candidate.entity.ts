import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ElectionEntity } from './election.entity';

@Entity('election_candidates')
export class ElectionCandidateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'election_id', type: 'uuid' })
  electionId: string;

  @ManyToOne(() => ElectionEntity, (el) => el.candidates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'election_id' })
  election?: ElectionEntity;

  @Column({ length: 255 })
  username: string;

  @Column({ name: 'program_text', type: 'text', nullable: true })
  programText: string;

  @Column({ name: 'votes_count', default: 0 })
  votesCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
