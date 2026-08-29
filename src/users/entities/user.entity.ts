import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ConfirmationCode } from './confirmation-code.entity';
import { SettlementEntity } from '../../states/entities/settlement.entity';
import { StateEntity } from '../../states/entities/state.entity';
import { UserAchievement } from '../../achievements/entities/user-achievement.entity';

export type UserDataField = {
  password: string;
  last_authenticated_date: string;
  login_tries: number;
  last_kicked_date: string;
  last_ip?: string;
  online_account: string;
  registration_date: string;
};

export type UserRole = 'player' | 'economist' | 'admin';

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
  is_admin: boolean;

  @Column({ name: 'role', type: 'varchar', default: 'player' })
  role: UserRole;

  @Column({ default: false })
  isBanned: boolean;

  @Column({ type: 'varchar', nullable: true })
  banReason: string | null;

  get isAdmin(): boolean {
    return this.role === 'admin' || this.is_admin;
  }

  get isEconomist(): boolean {
    return this.role === 'economist' || this.role === 'admin' || this.isAdmin;
  }

  @Column()
  uuid: string;

  @Column({ type: 'simple-json' })
  data: UserDataField;

  @Column({ name: 'settlement_id', type: 'uuid', nullable: true, default: null })
  settlementId?: string | null;

  @Column({ name: 'state_id', type: 'uuid', nullable: true, default: null })
  stateId?: string | null;

  @ManyToOne(() => SettlementEntity, (settlement) => settlement.citizens, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'settlement_id' })
  settlement?: SettlementEntity;

  @ManyToOne(() => StateEntity, (state) => state.citizens, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'state_id' })
  state?: StateEntity;

  @OneToMany(() => ConfirmationCode, (code) => code.user, {
    cascade: true,
  })
  codes?: ConfirmationCode[];

  @OneToMany(() => UserAchievement, (ua) => ua.user)
  userAchievements?: UserAchievement[];
}
