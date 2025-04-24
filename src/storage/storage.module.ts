import { Module } from '@nestjs/common';
import { CsvService } from './csv.service';
import { PostgresService } from './postgres.service';

@Module({
  providers: [CsvService, PostgresService],
  exports: [CsvService, PostgresService],
})
export class StorageModule {}