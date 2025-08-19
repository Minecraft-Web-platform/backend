import { Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('governments')
export class Government {
  @PrimaryGeneratedColumn('uuid')
  id: string;
}
