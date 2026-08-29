import { User } from 'src/users/entities/user.entity';

export class UserResponseDto {
  public id: number;
  public username: string;
  public uuid: string;
  public email: string | null;
  public emailIsConfirmed: boolean;
  public avatar_img: string | null;
  public lastLoginDate: string;
  public registrationDate: string;
  public settlementId: string | null;
  public stateId: string | null;
  public settlementName: string | null;
  public stateName: string | null;
  public citizenshipName: string | null;
  public stateFlagUrl: string | null;
  public stateCoatOfArmsUrl: string | null;
  public nationalityMale: string | null;
  public nationalityFemale: string | null;
  public role: string;
  public isAdmin: boolean;
  public isEconomist: boolean;
  public isBanned: boolean;
  public banReason: string | null;

  constructor(user: User) {
    this.id = user.id;
    this.username = user.username;
    this.uuid = user.uuid;
    this.email = user.email;
    this.emailIsConfirmed = user.emailIsConfirmed;
    this.avatar_img = user.avatarUrl;
    this.lastLoginDate = user.data.last_authenticated_date;
    this.registrationDate = user.data.registration_date;
    this.settlementId = user.settlementId || null;
    this.stateId = user.stateId || null;
    this.settlementName = user.settlement?.name || null;
    this.stateName = user.state?.name || null;
    this.citizenshipName = user.state?.citizenshipName || user.state?.name || null;
    this.stateFlagUrl = user.state?.flagUrl || null;
    this.stateCoatOfArmsUrl = user.state?.coatOfArmsUrl || null;
    this.nationalityMale = user.state?.nationalityMale || null;
    this.nationalityFemale = user.state?.nationalityFemale || null;
    this.role = user.role || (user.isAdmin ? 'admin' : 'player');
    this.isAdmin = this.role === 'admin' || user.isAdmin;
    this.isEconomist = this.role === 'economist' || this.role === 'admin' || user.isAdmin;
    this.isBanned = user.isBanned || false;
    this.banReason = user.banReason || null;
  }
}
