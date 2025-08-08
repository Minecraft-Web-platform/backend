import { CreateUserType } from 'src/auth/types/create-user.type';
import { User } from './entities/user.entity';

export interface UsersServiceContract {
  getAll(): Promise<User[]>;

  getByUsername(username: string): Promise<User | null>;

  create(userData: CreateUserType): Promise<User>;

  delete(id: number): Promise<boolean>;
}
