import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** id (uuid) + createdAt. Для незмінних записів (журнали, токени). */
export abstract class AppBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

/** + updatedAt. Для записів, що змінюються. */
export abstract class UpdatableEntity extends AppBaseEntity {
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
