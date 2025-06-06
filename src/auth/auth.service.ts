import { Injectable } from '@nestjs/common';
import { hash } from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dtos/register.dto';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  public async register(user: RegisterDto) {
    const hashedPassword = await hash(user.password, 12);
    const lowerUsername = user.username.toLowerCase();
    const dataForNewUser = {
      username: user.username,
      username_lower: lowerUsername,
      data: {
        password: hashedPassword,
        login_tries: 0,
        last_authenticated_date: new Date(0).toISOString(),
        last_kicked_date: new Date(0).toISOString(),
        online_account: 'UNKNOWN',
        registration_date: new Date().toISOString(),
      },
    };

    return this.usersService.create(dataForNewUser);
  }
}
