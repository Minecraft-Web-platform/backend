import { Injectable } from '@nestjs/common';
import { CreateUserDTO } from './dtos/create-user.dto';
import { hash } from 'bcrypt';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  public async register(user: CreateUserDTO) {
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
      }
    }

    return this.usersService.create(dataForNewUser);
  }
}
