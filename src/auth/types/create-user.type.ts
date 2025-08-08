import { User } from 'src/users/entities/user.entity';

export type CreateUserType = Omit<Omit<User, 'id'>, 'uuid'>;
