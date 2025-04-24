import { Injectable } from '@nestjs/common';
import { Client } from 'pg';

@Injectable()
export class PostgresService {
  private client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '10021711',
    port: 5433,
  });

  constructor() {
    this.client.connect().catch((err) => {
      console.error('❌ Failed to connect to PostgreSQL:', err.message);
    });
  }

  async saveRecord(record: any) {
    try {
      await this.client.query(
        `INSERT INTO price_diff(
          timestamp,
          exchange_with_lower_price,
          exchange_with_lower_price_api_response_time,
          exchange_with_higher_price,
          exchange_with_higher_price_api_response_time,
          max_price_diff,
          total_price_diff_duration,
          ticker
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          record.timestamp,
          record.exchange_with_lower_price,
          record.lower_latency,
          record.exchange_with_higher_price,
          record.higher_latency,
          record.max_price_diff,
          record.duration,
          record.ticker,
        ]
      );
    } catch (err) {
      console.error('❌ Error saving record to PostgreSQL:', err.message);
    }
  }
}
