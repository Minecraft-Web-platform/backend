import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { StateEntity } from './state.entity';
import { User } from '../../users/entities/user.entity';
import { CitizenshipRequestEntity } from './citizenship-request.entity';

@Entity('cities')
export class CityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'flag_url', type: 'varchar', length: 500, nullable: true })
  flagUrl: string | null;

  @Column({ name: 'mayor_username', type: 'varchar', length: 255, nullable: true })
  mayorUsername: string | null;

  @Column({ name: 'state_id', type: 'uuid', nullable: true })
  stateId: string | null;

  @Column({ default: false })
  isCapital: boolean;

  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  @ManyToOne(() => StateEntity, (state) => state.cities, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'state_id' })
  state?: StateEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => User, (user) => user.city)
  citizens?: User[];

  @Column({ type: 'varchar', nullable: true })
  treasuryAccountNumber?: string;

  @Column({ type: 'float', default: 3.0 })
  taxRate: number;

  @OneToMany(() => CitizenshipRequestEntity, (req) => req.city, { cascade: true })
  citizenshipRequests?: CitizenshipRequestEntity[];
}
