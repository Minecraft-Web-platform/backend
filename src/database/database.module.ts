import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmOptions } from './database.config';

@Module({
  imports: [TypeOrmModule.forRoot(typeOrmOptions)],
})
export class DatabaseModule {}
