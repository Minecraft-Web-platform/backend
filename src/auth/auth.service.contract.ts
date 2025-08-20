import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { TokenPair } from './types/token-pair.type';
import { UserResponseDto } from 'src/users/dtos/user-response.dto';

export interface AuthServiceContract {
  register(user: RegisterDto): Promise<UserResponseDto>;
  login(data: LoginDto): Promise<TokenPair>;
  initEmailConfirmation(email: string, username: string): Promise<{ message: string }>;
  confirmEmail(code: string, username: string): Promise<void>;
}
