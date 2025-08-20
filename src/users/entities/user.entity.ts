import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ConfirmationCode } from './confirmation-code.entity';

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

  @Column()
  username: string;

  @Column()
  username_lower: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ default: false })
  emailIsConfirmed: boolean;

  @Column()
  uuid: string;

  @Column({ type: 'simple-json' })
  data: UserDataField;

  @OneToMany(() => ConfirmationCode, (code) => code.user, {
    cascade: true,
  })
  codes?: ConfirmationCode[];
}
