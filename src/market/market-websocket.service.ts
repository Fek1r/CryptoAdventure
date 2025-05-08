// src/market/market-websocket.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { MarketService } from './market.service';
import { TICKERS } from './tickers';
import { TickerAnalyzerService } from './ticker-analyzer.service';
import * as WebSocket from 'ws';

@Injectable()
export class MarketWebsocketService implements OnModuleInit {
  constructor(
    private readonly marketService: MarketService,
    private readonly analyzer: TickerAnalyzerService,
  ) {}

  onModuleInit() {
    this.connectAll();
  }

  private connectAll() {
    const adapters = this.marketService.getAdapters();

    for (const adapter of adapters) {
      const wsUrl = adapter.getWebSocketUrl();
      if (!wsUrl) {
        console.warn(`❌ No WebSocket URL for ${adapter.getName()}`);
        continue;
      }

      const ws = new WebSocket(wsUrl);
      const start = Date.now();

      ws.on('open', () => {
        console.log(`🔌 Connected to ${adapter.getName()}`);
        for (const ticker of TICKERS) {
          const formattedTicker = adapter.formatTicker(ticker);
          if(formattedTicker){
            const message = adapter.getSubscribeMessage(formattedTicker);
          if (message) {
            ws.send(message);
          }
          }
          
        }
      });

      ws.on('message', (msg) => {
        const latency = Date.now() - start;
        const parsed = adapter.parseMessage(msg.toString(), latency);
        if (parsed) {
          this.analyzer.collectPrice(parsed);
        }
      });

      ws.on('error', (err) => {
        console.error(`❌ WS error on ${adapter.getName()}:`, err.message);
      });

      ws.on('close', () => {
        console.warn(`🔌 Disconnected from ${adapter.getName()}`);
        // Optional: автоматическое переподключение
        setTimeout(() => this.connectAll(), 5000);
      });
    }
  }
}
