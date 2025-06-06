import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
}
