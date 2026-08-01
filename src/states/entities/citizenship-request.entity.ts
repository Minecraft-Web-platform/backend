import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CityEntity } from './city.entity';

export type CitizenshipRequestStatus = 'pending' | 'approved' | 'rejected';

@Entity('citizenship_requests')
export class CitizenshipRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  username: string;

  @Column({ name: 'city_id', type: 'uuid' })
  cityId: string;

  @ManyToOne(() => CityEntity, (city) => city.citizenshipRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'city_id' })
  city?: CityEntity;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status: CitizenshipRequestStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
