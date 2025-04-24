import { Injectable } from '@nestjs/common';
import * as WebSocket from 'ws';
import { TickerAnalyzerService } from './ticker-analyzer.service';

@Injectable()
export class MarketWebsocketService {
  private readonly tickers = ['ltcusdt'];
  private readonly exchanges = ['binance', 'bybit'];

  constructor(private readonly analyzer: TickerAnalyzerService) {
    this.connectToExchanges();
  }

  connectToExchanges() {
    this.tickers.forEach((ticker) => {
      this.exchanges.forEach((exchange) => {
        const url = this.getUrl(exchange, ticker);
        if (!url) return;

        const ws = new WebSocket(url);
        const start = Date.now();

        ws.on('open', () => {
          if (exchange === 'bybit') {
            const subscribeMessage = JSON.stringify({
              op: 'subscribe',
              args: [`tickers.${ticker.toUpperCase()}`],
            });
            ws.send(subscribeMessage);
          }
        });

        ws.on('message', (data) => {
          const latency = Date.now() - start;
          const parsed = this.parseMessage(exchange, data.toString());
          if (parsed) this.analyzer.collectPrice({
            price: parsed.price,
            timestamp: Date.parse(parsed.timestamp),
            exchange,
            latency,
          }); // parsed.timestamp уже строка
        });

        ws.on('error', (err) => {
          console.error(`[${exchange}] WebSocket error:`, err);
        });
      });
    });
  }

  getUrl(exchange: string, ticker: string): string {
    if (exchange === 'binance') return `wss://stream.binance.com:9443/ws/${ticker}@ticker`;
    if (exchange === 'bybit') return `wss://stream.bybit.com/v5/public/spot`;
    return '';
  }

  parseMessage(exchange: string, msg: string) {
    try {
      const data = JSON.parse(msg);
      if (exchange === 'binance') return { price: parseFloat(data.c), timestamp: new Date().toISOString() };
      if (exchange === 'bybit' && data?.data?.lastPrice) {
        return { price: parseFloat(data.data.lastPrice), timestamp: new Date().toISOString() };
      }
      return null;
    } catch (e) {
      console.error(`Parse error from ${exchange}:`, e.message);
      return null;
    }
  }
}