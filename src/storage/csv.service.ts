import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CsvService {
  private readonly filePath = path.join(__dirname, '../../output.csv');

  constructor() {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(
        this.filePath,
        'timestamp,exchange_with_lower_price,lower_price,lower_latency(ms),exchange_with_higher_price,higher_price,higher_latency(ms),max_price_diff(%),duration(ms),ticker\n'
      );
    }
  }

  saveRecord(record: any) {
    const line = [
      record.timestamp,
      record.exchange_with_lower_price,
      `${record.lower_price} $`,
      `${record.lower_latency} ms`,
      record.exchange_with_higher_price,
      `${record.higher_price} $`,
      `${record.higher_latency} ms`,
      `${record.max_price_diff.toFixed(6)} %`,
      `${record.duration} ms`,
      record.ticker,
    ].join(',') + '\n';

    fs.appendFileSync(this.filePath, line);
  }
}
