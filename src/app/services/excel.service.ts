import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({ providedIn: 'root' })
export class ExcelService {

  // Read file (File object) => returns {columns: string[], rows: any[][]}
  async readFileFromFile(file: File) {
    return new Promise<any>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1 }); // array of arrays
        const columns = Array.isArray(json[0]) ? json[0].map((c: any, i: number) => c || `Col${i+1}`) : [];
        const rows = json.slice(1);
        resolve({ columns, rows });
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  // Export rows+columns to xlsx and return blob
  exportToFile(columns: string[], rows: any[][], filename = 'export.xlsx') {
    const aoa = [columns, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    return { blob, filename };
  }
}
