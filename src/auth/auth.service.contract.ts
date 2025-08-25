import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { TokenPair } from './types/token-pair.type';
import { UserResponseDto } from 'src/users/dtos/user-response.dto';
import { JwtPayload } from 'src/own-jwt/types/payload.type';

export interface AuthServiceContract {
  register(user: RegisterDto): Promise<UserResponseDto>;
  login(data: LoginDto): Promise<TokenPair>;
  refreshToken(payload: JwtPayload): Promise<string>;
  initEmailConfirmation(email: string, username: string): Promise<{ message: string }>;
  confirmEmail(code: string, username: string): Promise<void>;
  getInfoAboutMe(username: string): Promise<UserResponseDto>;
  initPasswordReset(username: string): Promise<{ message: string }>;
  resetPassword(username: string, confirmCode: string, newPassword: string): Promise<{ message: string }>;
}
