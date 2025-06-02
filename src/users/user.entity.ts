import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

type Data = {
  password: string;
  last_authenticated_date: Date;
  login_tries: number;
  last_kicked_date: Date;
  online_account: string;
  registration_date: Date;
};

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  username: string;

  @Column('username_lower')
  usernameLower: string;

  @Column()
  data: Data;
}
