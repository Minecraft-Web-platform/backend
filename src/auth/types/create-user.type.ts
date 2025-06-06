import { User } from 'src/users/user.entity';

export type CreateUserType = Omit<Omit<User, 'id'>, 'uuid'>;
