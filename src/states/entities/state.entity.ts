import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { CityEntity } from './city.entity';
import { User } from '../../users/entities/user.entity';
import { StateDecreeEntity } from './state-decree.entity';
import { StateTreasuryItemEntity } from './state-treasury-item.entity';

@Entity('states')
export class StateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'flag_url', type: 'varchar', length: 500, nullable: true })
  flagUrl: string | null;

  @Column({ name: 'coat_of_arms_url', type: 'varchar', length: 500, nullable: true })
  coatOfArmsUrl?: string | null;

  @Column({ name: 'nationality_male', type: 'varchar', length: 100, nullable: true })
  nationalityMale?: string | null;

  @Column({ name: 'nationality_female', type: 'varchar', length: 100, nullable: true })
  nationalityFemale?: string | null;

  @Column({ name: 'citizenship_name', type: 'varchar', length: 100, nullable: true })
  citizenshipName?: string | null;

  @Column({ name: 'leader_username', type: 'varchar', length: 255, nullable: true })
  leaderUsername: string | null;

  @Column({ name: 'capital_city_id', type: 'uuid', nullable: true })
  capitalCityId: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @OneToMany(() => CityEntity, (city) => city.state)
  cities?: CityEntity[];

  @OneToMany(() => User, (user) => user.state)
  citizens?: User[];

  @Column({ type: 'varchar', nullable: true })
  treasuryAccountNumber?: string;

  @Column({ type: 'float', default: 5.0 })
  taxRate: number;

  @OneToMany(() => StateDecreeEntity, (decree) => decree.state, { cascade: true })
  decrees?: StateDecreeEntity[];

  @OneToMany(() => StateTreasuryItemEntity, (item) => item.state, { cascade: true })
  treasuryItems?: StateTreasuryItemEntity[];
}