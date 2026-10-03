import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Family } from './entities/family.entity';
import { FamilyContextService } from './family-context.service';

/** Лише резолв сім'ї користувача: від нього залежать Ledger, Workouts, Realtime (без циклів між модулями) */
@Module({
  imports: [TypeOrmModule.forFeature([Family])],
  providers: [FamilyContextService],
  exports: [FamilyContextService],
})
export class FamilyContextModule {}
