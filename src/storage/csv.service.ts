import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CsvService {
  private readonly filePath: string;

  constructor() {
    const outputDir = path.resolve(process.cwd(), 'csv');

    // Создаём папку, если её нет
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`✅ Created folder: ${outputDir}`);
    }

    this.filePath = path.join(outputDir, 'arbitrage.csv');

    // Создаём файл с заголовками, если его нет
    if (!fs.existsSync(this.filePath)) {
      const header = [
        'timestamp',
        'exchange_with_lower_price',
        'lower_price',
        'lower_latency(ms)',
        'exchange_with_higher_price',
        'higher_price',
        'higher_latency(ms)',
        'max_price_diff(%)',
        'duration(ms)',
        'ticker'
      ].join(',') + '\n';

      fs.writeFileSync(this.filePath, header);
      console.log(`✅ Created file: ${this.filePath}`);
    } else {
      console.log(`ℹ️ Using existing file: ${this.filePath}`);
    }
  }

  saveRecord(record: any) {
    const line = [
      record.timestamp,
      record.exchange_with_lower_price,
      record.lower_price,
      record.lower_latency,
      record.exchange_with_higher_price,
      record.higher_price,
      record.higher_latency,
      record.max_price_diff.toFixed(6),
      record.duration,
      record.ticker,
    ].join(',') + '\n';

    try {
      fs.appendFileSync(this.filePath, line);
      console.log(`✅ Saved to CSV: ${record.ticker} ${record.max_price_diff.toFixed(6)}%`);
    } catch (error) {
      console.error('❌ Failed to save record to CSV:', error.message);
    }
  }
}