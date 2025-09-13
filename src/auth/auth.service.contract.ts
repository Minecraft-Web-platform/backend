import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { TokenPair } from './types/token-pair.type';
import { UserResponseDto } from 'src/users/dtos/user-response.dto';
import { JwtPayload } from 'src/own-jwt/types/payload.type';

export interface AuthServiceContract {
  /**
   * @description register user, after this user can sign in but for all features it must confirm its email.
   */
  register(user: RegisterDto): Promise<UserResponseDto>;

  /**
   * @description user sign in, gets AT and RT, in order to use all features must confirm its email
   */
  login(data: LoginDto): Promise<TokenPair>;

  /**
   * @description refreshes AT, requires RT
   */
  refreshToken(payload: JwtPayload): Promise<string>;

  /**
   * @description initializes the email confirmation and sends xxx-xxx code to the mail
   */
  initEmailConfirmation(email: string, username: string): Promise<{ message: string }>;

  /**
   * @description confirm an email. Now user can use all features
   */
  confirmEmail(code: string, username: string): Promise<void>;

  /**
   * @description sends info about the user
   */
  getInfoAboutMe(username: string): Promise<UserResponseDto>;

  /**
   * @description initializes the password resetting and sends xxx-xxx code to the mail
   */
  initPasswordReset(username: string): Promise<{ message: string }>;

  /**
   * @description sets new password
   */
  resetPassword(username: string, confirmCode: string, newPassword: string): Promise<{ message: string }>;
}
