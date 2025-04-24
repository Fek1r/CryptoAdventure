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
    this.client.connect();
  }

  async saveRecord(record: any) {
    await this.client.query(
      `INSERT INTO price_diff(timestamp, exchange_with_lower_price, exchange_with_lower_price_api_response_time,
        exchange_with_higher_price, exchange_with_higher_price_api_response_time, max_price_diff,
        total_price_diff_duration, ticker) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        record.timestamp,
        record.exchange_with_lower_price,
        record.exchange_with_lower_price_api_response_time,
        record.exchange_with_higher_price,
        record.exchange_with_higher_price_api_response_time,
        record.max_price_diff,
        record.total_price_diff_duration,
        record.ticker,
      ]
    );
  }
}




// CREATE TABLE price_diff (
//   id SERIAL PRIMARY KEY,
//   timestamp TIMESTAMPTZ NOT NULL,
//   exchange_with_lower_price VARCHAR(255) NOT NULL,
//   exchange_with_lower_price_api_response_time DOUBLE PRECISION NOT NULL,
//   exchange_with_higher_price VARCHAR(255) NOT NULL,
//   exchange_with_higher_price_api_response_time DOUBLE PRECISION NOT NULL,
//   max_price_diff NUMERIC(18,8) NOT NULL,
//   total_price_diff_duration BIGINT NOT NULL,
//   ticker VARCHAR(50) NOT NULL
// );
