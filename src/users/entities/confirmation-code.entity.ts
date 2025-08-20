import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { User } from './user.entity';
import { ConfirmCodeActions } from '../types/confirm-code-actions.type';

@Entity('confirmation_codes')
export class ConfirmationCode {
  @PrimaryColumn('char', { length: 36 })
  id: string; // UUID v4

  @Column({ length: 255 })
  player_username: string;

  @Column({ length: 6 })
  code: string;

  @Column({ length: 32 })
  type: ConfirmCodeActions;

  @Column({ default: false })
  used: boolean;

  @Column({ type: 'datetime', nullable: true, default: null })
  expires_at?: Date;

  @ManyToOne(() => User, (user) => user.codes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'player_username', referencedColumnName: 'username' })
  user: User;
}
