import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { StateEntity } from './state.entity';
import { User } from '../../users/entities/user.entity';
import { CitizenshipRequestEntity } from './citizenship-request.entity';
import { TerritoryEntity } from './territory.entity';
import { SettlementTypeEntity } from './settlement-type.entity';

@Entity('settlements')
export class SettlementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'flag_url', type: 'varchar', length: 500, nullable: true })
  flagUrl: string | null;

  @Column({ type: 'varchar', length: 9, nullable: true })
  color?: string | null;

  @Column({ name: 'mayor_username', type: 'varchar', length: 255, nullable: true })
  mayorUsername: string | null;

  @Column({ name: 'state_id', type: 'uuid', nullable: true })
  stateId: string | null;

  @Column({ type: 'varchar', default: 'settlement' })
  status: 'capital' | 'settlement' | 'rural';

  @Column({ name: 'center_x', type: 'int', default: 0 })
  centerX: number;

  @Column({ name: 'center_z', type: 'int', default: 0 })
  centerZ: number;

  @Column({ name: 'rural_sub_type_id', type: 'uuid', nullable: true })
  ruralSubTypeId: string | null;

  @ManyToOne(() => SettlementTypeEntity, { nullable: true })
  @JoinColumn({ name: 'rural_sub_type_id' })
  ruralSubType?: SettlementTypeEntity;

  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  @ManyToOne(() => StateEntity, (state) => state.settlements, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'state_id' })
  state?: StateEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => User, (user) => user.settlement)
  citizens?: User[];

  @Column({ type: 'varchar', nullable: true })
  treasuryAccountNumber?: string;

  @OneToMany(() => CitizenshipRequestEntity, (req) => req.settlement, { cascade: true })
  citizenshipRequests?: CitizenshipRequestEntity[];

  @OneToMany(() => TerritoryEntity, (t) => t.settlement, { cascade: true })
  territories?: TerritoryEntity[];
}
