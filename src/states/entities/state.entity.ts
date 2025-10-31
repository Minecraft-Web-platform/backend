import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('states')
export class StateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  citizens: string

  @Column()
  cities: string;

  @Column()
  capital: string;
}