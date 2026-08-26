import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CityEntity } from './city.entity';

@Entity('territories')
export class TerritoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CityEntity, (city) => city.territories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'city_id' })
  city?: CityEntity;

  @Column({ name: 'city_id', nullable: true })
  cityId: string | null;

  @Column({ type: 'varchar', default: 'city' })
  ownerType: 'player' | 'company' | 'city' | 'state';

  @Column({ type: 'varchar', nullable: true })
  ownerId: string | null;

  @Column({ default: false })
  isHiddenOnMap: boolean;

  @Column({ type: 'int' })
  minX: number;

  @Column({ type: 'int', default: -64 })
  minY: number;

  @Column({ type: 'int' })
  minZ: number;

  @Column({ type: 'int' })
  maxX: number;

  @Column({ type: 'int', default: 319 })
  maxY: number;

  @Column({ type: 'int' })
  maxZ: number;

  @CreateDateColumn()
  createdAt: Date;
}
