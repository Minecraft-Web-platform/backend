import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, OneToOne } from 'typeorm';
import { SettlementEntity } from './settlement.entity';
import { Property } from '../../economy/entities/property.entity';

@Entity('territories')
export class TerritoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => SettlementEntity, (settlement) => settlement.territories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'settlement_id' })
  settlement?: SettlementEntity;

  @Column({ name: 'settlement_id', nullable: true })
  settlementId: string | null;

  @Column({ type: 'varchar', default: 'settlement' })
  ownerType: 'player' | 'company' | 'settlement' | 'state';

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

  @OneToOne(() => Property, (property) => property.territory)
  property?: Property;

  @CreateDateColumn()
  createdAt: Date;
}
