import { UserResponseDto } from 'src/users/dtos/user-response.dto';
import { User } from 'src/users/entities/user.entity';

export class MeResponseDto extends UserResponseDto {
  public lastIp: string;

  constructor(user: User) {
    super(user);
    this.lastIp = user.data.last_ip || '';
  }
}
