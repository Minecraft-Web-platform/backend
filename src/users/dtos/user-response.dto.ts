import { User } from 'src/users/entities/user.entity';

export class UserResponseDto {
  public id: number;
  public username: string;
  public uuid: string;
  public email: string | null;
  public emailIsConfirmed: boolean;
  public lastIp: string;
  public avatar_img: string | null;
  public registrationDate: string;
  public cityId: string | null;
  public stateId: string | null;
  public cityName: string | null;
  public stateName: string | null;

  constructor(user: User) {
    this.id = user.id;
    this.username = user.username;
    this.uuid = user.uuid;
    this.email = user.email;
    this.emailIsConfirmed = user.emailIsConfirmed;
    this.lastIp = user.data.last_ip || '';
    this.avatar_img = user.avatarUrl;
    this.registrationDate = user.data.registration_date;
    this.cityId = user.cityId || null;
    this.stateId = user.stateId || null;
    this.cityName = user.city?.name || null;
    this.stateName = user.state?.name || null;
  }
}
