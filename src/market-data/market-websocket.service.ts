import { Injectable } from '@nestjs/common';
import * as WebSocket from 'ws';
import { TickerAnalyzerService } from './ticker-analyzer.service';

@Injectable()
export class MarketWebsocketService {
  private readonly tickersPerExchange = {
    binance: ['btcusdt', 'ltcusdt', 'ethusdt'], //['trxusdt', 'adausdt', 'dogeusdt'],
    bybit: ['BTCUSDT', 'LTCUSDT', 'ETHUSDT'], //['TRXUSDT', 'ADAUSDT', 'DOGEUSDT'],
    okx: ['BTC-USDT', 'LTC-USDT', 'ETH-USDT'],
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
          const parsed = this.parseMessage(exchange, data.toString(), ticker);

          if (parsed) {
            this.analyzer.collectPrice({
              price: parsed.price,
              timestamp: Date.parse(parsed.timestamp),
              exchange,
              latency,
              ticker,
            });
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

  parseMessage(exchange: string, msg: string, expectedTicker: string) {
    try {
      const data = JSON.parse(msg);

      if (exchange === 'binance' && data?.s?.toLowerCase() === expectedTicker.toLowerCase() && data?.c) {
        const price = parseFloat(data.c);
        return this.isValidPrice(price) ? { price, timestamp: new Date().toISOString() } : null;
      }

      if (exchange === 'bybit' && data?.data?.symbol === expectedTicker && data?.data?.lastPrice) {
        const price = parseFloat(data.data.lastPrice);
        return this.isValidPrice(price) ? { price, timestamp: new Date().toISOString() } : null;
      }

      if (exchange === 'okx' && data?.arg?.instId === expectedTicker && data?.data?.[0]?.last) {
        const price = parseFloat(data.data[0].last);
        return this.isValidPrice(price) ? { price, timestamp: new Date().toISOString() } : null;
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
