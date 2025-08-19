import { Injectable, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcrypt';
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dtos/register.dto';
import { ConfirmationCode } from 'src/users/entities/confirmation-code.entity';
import { LoginDto } from './dtos/login.dto';
import { OwnJwtService } from 'src/own-jwt/own-jwt.service';
import { JwtPayload } from 'src/own-jwt/types/payload.type';
import { TokenPair } from './types/token-pair.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: OwnJwtService,
  ) {}

  public async register(user: RegisterDto) {
    const hashedPassword = await hash(user.password, 12);
    const lowerUsername = user.username.toLowerCase();
    const codes: ConfirmationCode[] = [];
    const dataForNewUser = {
      username: user.username,
      username_lower: lowerUsername,
      codes,
      email: user.email,
      emailIsConfirmed: false,
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

  public async login(data: LoginDto): Promise<TokenPair> {
    const userInDB = await this.usersService.getByUsername(data.username);

    if (!userInDB) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(data.password, userInDB.data.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      username_lower: userInDB.username_lower,
      id: userInDB.id,
      uuid: userInDB.uuid,
    };

    const accessToken = await this.jwtService.generateAccessToken(payload);
    const refreshToken = await this.jwtService.generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
    };
  }
}
