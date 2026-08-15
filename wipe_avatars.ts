import { DataSource } from 'typeorm';
import { typeOrmOptions } from './src/database/database.config';
import { User } from './src/users/entities/user.entity';

async function main() {
  const ds = new DataSource(typeOrmOptions as any);
  await ds.initialize();
  
  const repo = ds.getRepository(User);
  const result = await repo.update({}, { avatarUrl: null });
  console.log('Updated users:', result.affected);
  
  await ds.destroy();
}

main().catch(console.error);
