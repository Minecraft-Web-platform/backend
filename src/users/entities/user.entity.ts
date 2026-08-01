import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ConfirmationCode } from './confirmation-code.entity';
import { CityEntity } from '../../states/entities/city.entity';
import { StateEntity } from '../../states/entities/state.entity';

export type UserDataField = {
  password: string;
  last_authenticated_date: string;
  login_tries: number;
  last_kicked_date: string;
  last_ip?: string;
  online_account: string;
  registration_date: string;
};

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  username_lower: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 255, nullable: true })
  avatarUrl: string | null;

  @Column({ default: false })
  emailIsConfirmed: boolean;

  @Column({ name: 'is_admin', default: false })
  isAdmin: boolean;

  @Column()
  uuid: string;

  @Column({ type: 'simple-json' })
  data: UserDataField;

  @Column({ name: 'city_id', type: 'uuid', nullable: true, default: null })
  cityId?: string | null;

  @Column({ name: 'state_id', type: 'uuid', nullable: true, default: null })
  stateId?: string | null;

  @ManyToOne(() => CityEntity, (city) => city.citizens, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'city_id' })
  city?: CityEntity;

  @ManyToOne(() => StateEntity, (state) => state.citizens, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'state_id' })
  state?: StateEntity;

  @OneToMany(() => ConfirmationCode, (code) => code.user, {
    cascade: true,
  })
  codes?: ConfirmationCode[];
}
