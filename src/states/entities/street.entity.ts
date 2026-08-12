import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CityEntity } from './city.entity';

@Entity('streets')
export class StreetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'city_id', type: 'uuid' })
  cityId: string;

  @ManyToOne(() => CityEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'city_id' })
  city: CityEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;
}
