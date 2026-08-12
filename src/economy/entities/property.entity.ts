import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StreetEntity } from '../../states/entities/street.entity';

export type PropertyCategory = 'real_estate' | 'special_object';
export type PropertyOwnerType = 'personal' | 'company' | 'government';

@Entity('economy_properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar' })
  @Index()
  propertyCategory: PropertyCategory;

  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'varchar', nullable: true })
  subType: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  cityId: string | null;

  @Column({ type: 'varchar' })
  @Index()
  stateId: string;

  @Column({ type: 'varchar' })
  @Index()
  ownerId: string;

  @Column({ type: 'varchar' })
  ownerType: PropertyOwnerType;

  @Column({ default: false })
  @Index()
  isForSale: boolean;

  @Column({ type: 'float', nullable: true })
  price: number | null;

  @Column({ type: 'varchar', nullable: true })
  centerCoordinates: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  parentPropertyId: string | null;

  @Column({ type: 'varchar', nullable: true })
  @Index()
  streetId: string | null;

  @ManyToOne(() => StreetEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'streetId' })
  street?: StreetEntity;

  @Column({ type: 'varchar', nullable: true })
  houseNumber: string | null;

  @Column({ type: 'float', nullable: true })
  area: number | null;

  @Column({ type: 'simple-array', nullable: true })
  photoUrls: string[] | null;

  @CreateDateColumn()
  createdAt: Date;
}
