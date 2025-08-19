import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('credit-cards')
export class CreditCard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  number: string;

  @Column()
  cvv: string;
}
