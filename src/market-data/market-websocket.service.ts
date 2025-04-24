import { Injectable } from '@nestjs/common';
import * as WebSocket from 'ws';
import { TickerAnalyzerService } from './ticker-analyzer.service';

@Injectable()
export class MarketWebsocketService {
  private readonly tickersPerExchange = {
    binance: ['trxusdt', 'adausdt', 'dogeusdt'],
    bybit: ['TRXUSDT', 'ADAUSDT', 'DOGEUSDT'],
    okx: ['TRX-USDT', 'ADA-USDT', 'DOGE-USDT'],
  };

  constructor(private readonly analyzer: TickerAnalyzerService) {
    this.connectToExchanges();
  }

  connectToExchanges() {
    Object.entries(this.tickersPerExchange).forEach(([exchange, tickers]) => {
      tickers.forEach((ticker) => {
        const url = this.getUrl(exchange, ticker);
        if (!url) return;

        const ws = new WebSocket(url);
        const start = Date.now();

        ws.on('open', () => {
          const subscribeMessage = this.getSubscribeMessage(exchange, ticker);
          if (subscribeMessage) {
            ws.send(subscribeMessage);
          }
        });

        ws.on('message', (data) => {
          const latency = Date.now() - start;
          const parsed = this.parseMessage(exchange, data.toString(), ticker, latency);

          if (parsed) {
            this.analyzer.collectPrice(parsed);
          }
        });

        ws.on('error', (err) => {
          console.error(`[${exchange}] WebSocket error:`, err.message);
        });
      });
    });
  }

  getUrl(exchange: string, ticker: string): string {
    switch (exchange) {
      case 'binance':
        return `wss://stream.binance.com:9443/ws/${ticker.toLowerCase()}@ticker`;
      case 'bybit':
        return `wss://stream.bybit.com/v5/public/spot`;
      case 'okx':
        return `wss://wspap.okx.com:8443/ws/v5/public`;
      default:
        return '';
    }
  }

  getSubscribeMessage(exchange: string, ticker: string): string | null {
    switch (exchange) {
      case 'bybit':
        return JSON.stringify({
          op: 'subscribe',
          args: [`tickers.${ticker}`],
        });
      case 'okx':
        return JSON.stringify({
          op: 'subscribe',
          args: [{ channel: 'tickers', instId: ticker }],
        });
      default:
        return null;
    }
  }

  parseMessage(exchange: string, msg: string, expectedTicker: string, latency: number) {
    try {
      const data = JSON.parse(msg);
      const now = Date.now();
      const normalizedTicker = expectedTicker.toUpperCase();

      if (exchange === 'binance' && data?.s?.toUpperCase() === normalizedTicker && data?.c) {
        return {
          price: parseFloat(data.c),
          timestamp: now,
          exchange,
          latency,
          ticker: expectedTicker,
        };
      }

      if (exchange === 'bybit' && data?.data?.symbol === normalizedTicker && data?.data?.lastPrice) {
        return {
          price: parseFloat(data.data.lastPrice),
          timestamp: now,
          exchange,
          latency,
          ticker: expectedTicker,
        };
      }

      if (
        exchange === 'okx' &&
        data?.arg?.instId === expectedTicker &&
        data?.data?.[0]?.last
      ) {
        return {
          price: parseFloat(data.data[0].last),
          timestamp: now,
          exchange,
          latency,
          ticker: expectedTicker,
        };
      }

      return null;
    } catch (e) {
      console.error(`Parse error from ${exchange}:`, e.message);
      return null;
    }
  }

  isValidPrice(price: number): boolean {
    return !isNaN(price) && price > 0;
  }
}
