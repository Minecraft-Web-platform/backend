import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcrypt';

import { AuthServiceContract } from './auth.service.contract';

import { UsersService } from 'src/users/users.service';
import { OwnJwtService } from 'src/own-jwt/own-jwt.service';
import { ConfirmCodeService } from 'src/users/confirm-code.service';
import { EmailService } from 'src/email/email.service';

import { EmailConfirmationStrategy } from 'src/email/strategies/email-confirmation.strategy';

import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { UserResponseDto } from 'src/users/dtos/user-response.dto';

import { JwtPayload } from 'src/own-jwt/types/payload.type';
import { TokenPair } from './types/token-pair.type';

import { ConfirmationCode } from 'src/users/entities/confirmation-code.entity';
import { PasswordRecoveryStrategy } from 'src/email/strategies/password-recovery.strategy';

@Injectable()
export class AuthService implements AuthServiceContract {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: OwnJwtService,
    private readonly emailService: EmailService,
    private readonly confirmCodeService: ConfirmCodeService,
  ) {}

  public async register(user: RegisterDto): Promise<UserResponseDto> {
    const userInDB = await this.usersService.getByUsername(user.username);

    if (userInDB) {
      throw new ConflictException('The user with this username is already exists!');
    }

    if (user.password !== user.repeatPassword) {
      throw new BadRequestException('The passwords do not match!');
    }

    const hashedPassword = await hash(user.password, 12);
    const lowerUsername = user.username.toLowerCase();
    const codes: ConfirmationCode[] = [];
    const dataForNewUser = {
      username: user.username,
      username_lower: lowerUsername,
      codes,
      email: null,
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

    const createdUser = await this.usersService.create(dataForNewUser);

    return new UserResponseDto(createdUser);
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

  public async refreshToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.generateAccessToken(payload);
  }

  public async initEmailConfirmation(email: string, username: string): Promise<{ message: string }> {
    const userInDBWithUsername = await this.usersService.getByUsername(username);
    const userInDBWithEmail = await this.usersService.getByEmail(email);

    if (!userInDBWithUsername) {
      throw new NotFoundException('The user was not found');
    }

    if (userInDBWithEmail && userInDBWithUsername.email !== email) {
      throw new ConflictException('The email is already taken');
    }

    const codeEntity = await this.confirmCodeService.createCode(username, 'email_confirmation');
    await this.usersService.update(username, { email });

    const confirmEmailTemplate = new EmailConfirmationStrategy(codeEntity.code, username);
    await this.emailService.send(email, confirmEmailTemplate);

    return { message: 'Confirmation code sent' };
  }

  public async confirmEmail(code: string, username: string): Promise<void> {
    const userInDB = await this.usersService.getByUsername(username);

    if (!userInDB) {
      throw new NotFoundException('The user was not found');
    }

    const codeEntityInDB = userInDB.codes?.find((codeOfUser) => codeOfUser.type === 'email_confirmation');

    if (!codeEntityInDB) {
      throw new BadRequestException('Init the email confirmation first');
    }

    if (codeEntityInDB.code !== code) {
      throw new BadRequestException('Invalid code confirmation');
    }

    this.confirmCodeService.deactivateCode(username, 'email_confirmation');
    this.usersService.update(username, { emailIsConfirmed: true });
  }

  public async getInfoAboutMe(username: string): Promise<UserResponseDto> {
    const userInDB = await this.usersService.getByUsername(username);

    if (!userInDB) {
      throw new NotFoundException('The user was not found');
    }

    return new UserResponseDto(userInDB);
  }

  public async initPasswordReset(username: string): Promise<{ message: string }> {
    const userInDBWithUsername = await this.usersService.getByUsername(username);

    if (!userInDBWithUsername) {
      throw new NotFoundException('The user was not found');
    }

    if (userInDBWithUsername.email === null || !userInDBWithUsername.emailIsConfirmed) {
      throw new ForbiddenException('You need to confirm your email first');
    }

    const codeEntity = await this.confirmCodeService.createCode(username, 'password_reset');
    const mailTemplate = new PasswordRecoveryStrategy(codeEntity.code);

    await this.emailService.send(userInDBWithUsername.email, mailTemplate);

    return { message: 'Confirmation code sent' };
  }

  public async resetPassword(username: string, confirmCode: string, newPassword: string): Promise<{ message: string }> {
    const userInDB = await this.usersService.getByUsername(username);

    if (!userInDB) {
      throw new NotFoundException('The user was not found');
    }

    const codeEntityInDB = userInDB.codes?.find((codeOfUser) => codeOfUser.type === 'password_reset');

    if (!codeEntityInDB) {
      throw new BadRequestException('Init the password resetting first!');
    }

    if (codeEntityInDB.code !== confirmCode) {
      throw new BadRequestException('Invalid code confirmation');
    }

    const newHashedPassword = await hash(newPassword, 12);
    const newDataWithHashedPassword = { ...userInDB.data, password: newHashedPassword };

    await this.usersService.update(username, { data: newDataWithHashedPassword });

    return { message: 'The password has been changed succesfully!' };
  }
}
