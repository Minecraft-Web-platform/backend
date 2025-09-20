import { User } from 'src/users/entities/user.entity';

export class UserResponseDto {
  public id: number;
  public username: string;
  public uuid: string;
  public email: string | null;
  public emailIsConfirmed: boolean;
  public lastIp: string;

  constructor(user: User) {
    this.id = user.id;
    this.username = user.username;
    this.uuid = user.uuid;
    this.email = user.email;
    this.emailIsConfirmed = user.emailIsConfirmed;
    this.lastIp = user.data.last_ip || '';
  }
}
