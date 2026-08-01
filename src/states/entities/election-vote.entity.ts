import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ElectionEntity } from './election.entity';

@Entity('election_votes')
@Unique(['electionId', 'voterUsername'])
export class ElectionVoteEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'election_id', type: 'uuid' })
  electionId: string;

  @ManyToOne(() => ElectionEntity, (el) => el.votes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'election_id' })
  election?: ElectionEntity;

  @Column({ name: 'voter_username', type: 'varchar', length: 255 })
  voterUsername: string;

  @Column({ name: 'candidate_id', type: 'uuid' })
  candidateId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
