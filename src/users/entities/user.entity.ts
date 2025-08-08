import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ConfirmationCode } from './confirmation-code.entity';

export type UserDataField = {
  password: string;
  last_authenticated_date: string;
  login_tries: number;
  last_kicked_date: string;
  online_account: string;
  registration_date: string;
};

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column()
  username_lower: string;

  @Column()
  uuid: string;

  @Column()
  data: UserDataField;

  @OneToMany(() => ConfirmationCode, (code) => code.user, {
    cascade: true,
  })
  codes: ConfirmationCode[];
}
