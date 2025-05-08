// src/market/market.service.ts
import { Injectable } from '@nestjs/common';
import { ExchangeAdapter } from './adapters/exchange-adapter.interface';
import { BinanceAdapter } from './adapters/binance.adapter';
import { BybitAdapter } from './adapters/bybit.adapter';
import { OkxAdapter } from './adapters/okx.adapter';
import { GateAdapter } from './adapters/gate.adapter';
import { MexcAdapter } from './adapters/mexc.adapter';
import { BitgetAdapter } from './adapters/bitget.adapter';

@Injectable()
export class MarketService {
  private readonly adapters: ExchangeAdapter[];

  constructor() {
    this.adapters = [
      new BinanceAdapter(),
      new BybitAdapter(),
      new OkxAdapter(),
      new GateAdapter(),
    // new MexcAdapter(),
      new BitgetAdapter(),
    ];
  }

  getAdapters(): ExchangeAdapter[] {
    return this.adapters;
  }

  getAdapterByName(name: string): ExchangeAdapter | undefined {
    return this.adapters.find(adapter => adapter.getName() === name);
  }
}
