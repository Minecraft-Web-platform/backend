import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';
import { ConfirmCodeActions } from '../types/confirm-code-actions.type';

@Entity()
export class ConfirmationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string; //uuid v4

  @Column()
  code: string; // 6 digits

  @Column()
  type: ConfirmCodeActions;

  @Column()
  userId: string;

  @Column({ default: false })
  used: boolean;

  @Column({ type: 'datetime', nullable: true, default: null })
  expiresAt?: Date;

  @ManyToOne(() => User, (user) => user.codes, { onDelete: 'CASCADE' })
  user: User;
}
