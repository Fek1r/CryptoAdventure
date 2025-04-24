import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CsvService {
  saveRecord(record: any) {
    const filePath = path.join(__dirname, '../../output.csv');
    const line = Object.values(record).join(',') + '\n';
    fs.appendFileSync(filePath, line);
  }
}