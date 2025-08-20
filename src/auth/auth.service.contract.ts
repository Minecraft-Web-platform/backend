import { User } from 'src/users/entities/user.entity';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { TokenPair } from './types/token-pair.type';

export interface AuthServiceContract {
  register(user: RegisterDto): Promise<User>;
  login(data: LoginDto): Promise<TokenPair>;
  initEmailConfirmation(email: string, username: string): Promise<{ message: string }>;
  confirmEmail(code: string, username: string): Promise<void>;
}
