import { forwardRef, Module } from '@nestjs/common';
import { ArbitrageManagerService } from './arbitrage-manager.service';
import { MarketModule } from '../market/market.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [forwardRef(() => MarketModule), StorageModule],
  providers: [ArbitrageManagerService],
  exports: [ArbitrageManagerService],
})
export class ArbitrageModule {}
