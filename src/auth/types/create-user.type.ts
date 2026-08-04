import { User, UserRole } from 'src/users/entities/user.entity';

export type CreateUserType = Omit<
  User,
  'id' | 'uuid' | 'isAdmin' | 'isEconomist' | 'is_admin' | 'role'
> & {
  is_admin?: boolean;
  role?: UserRole;
};
