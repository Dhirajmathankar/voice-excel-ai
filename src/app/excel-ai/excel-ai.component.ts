// // import { Component } from '@angular/core';

// // @Component({
// //   selector: 'app-excel-ai',
// //   templateUrl: './excel-ai.component.html',
// //   styleUrls: ['./excel-ai.component.css']
// // })
// // export class ExcelAiComponent {

// // }

// import { Component, OnInit, NgZone, AfterViewInit } from '@angular/core';
// import { ExcelService } from '../services/excel.service';
// import { GeminiService } from '../services/gemini.service';
// import * as luckysheet from 'luckysheet';
// // import * as $ from 'jquery';
// import * as $ from 'jquery';


// @Component({
//   selector: 'app-excel-ai',
//   templateUrl: './excel-ai.component.html',
//   styleUrls: ['./excel-ai.component.css']
// })
// export class ExcelAiComponent implements OnInit, AfterViewInit {
//   transcript = '';
//   listening = false;
//   recognition: any;
//   workbookHandle: any = null; // optional file handle if saved via File System Access
//   luckysheetId = 'luckysheet';
//   sheetData: any[] = []; // luckysheet internal data structure
//   currentColumns: string[] = [];
//   currentRows: any[][] = [];
//   lastParsedAction: any = null;
//   constructor(
//     private zone: NgZone,
//     private excelSvc: ExcelService,
//     private geminiSvc: GeminiService
//   ) {}

//   ngOnInit(): void {
//     // nothing heavy here
//   }

//   ngAfterViewInit(): void {
//     // initialize luckysheet with empty sheet
//     (window as any).luckysheet.create({
//       container: this.luckysheetId,
//       title: 'Sheet1',
//       lang: 'en',
//       cellRightClickConfig: false,
//       data: [{
//         name: 'Sheet1',
//         celldata: [],
//         config: {},
//         index: 0
//       }],
//       allowEdit: true,
//       plugin: ['chart']
//     });
//   }

//   // --- Voice methods ---
//   startListening() {
//     // use Web Speech API
//     const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
//     if (!SpeechRecognition) {
//       alert('Speech recognition not supported in this browser. Use Chrome/Edge.');
//       return;
//     }
//     this.recognition = new SpeechRecognition();
//     this.recognition.lang = 'en-US';
//     this.recognition.interimResults = false;
//     this.recognition.maxAlternatives = 1;
//     this.recognition.onstart = () => { this.zone.run(() => this.listening = true); };
//     this.recognition.onerror = (e: any) => {
//       console.error('speech error', e);
//       this.zone.run(() => this.listening = false);
//     };
//     this.recognition.onend = () => {
//       this.zone.run(() => this.listening = false);
//     };
//     this.recognition.onresult = (event: any) => {
//       const text = event.results[0][0].transcript;
//       this.zone.run(() => this.transcript = text);
//       this.onVoiceCommand(text);
//     };
//     this.recognition.start();
//   }

//   stopListening() {
//     if (this.recognition) this.recognition.stop();
//     this.listening = false;
//   }

//   // --- File operations ---
//   async onUploadFile(ev: any) {
//     const file: File = ev.target.files[0];
//     if (!file) return;
//     const parsed = await this.excelSvc.readFileFromFile(file);
//     // parsed: {columns, rows}
//     this.currentColumns = parsed.columns;
//     this.currentRows = parsed.rows;
//     this.loadToLuckysheet(this.currentColumns, this.currentRows);
//   }

//   loadToLuckysheet(columns: string[], rows: any[][]) {
//     // convert to luckysheet celldata
//     const celldata: any[] = [];
//     // write header row
//     for (let r = 0; r <= rows.length; r++) {
//       for (let c = 0; c < columns.length; c++) {
//         const value = (r === 0) ? columns[c] : (rows[r-1] ? rows[r-1][c] : '');
//         celldata.push({
//           r: r, c: c, v: value
//         });
//       }
//     }
//     // build sheet object
//     const sheet = [{
//       name: 'Sheet1',
//       celldata,
//       config: {},
//       index: 0
//     }];
//     (window as any).luckysheet.create({ container: this.luckysheetId, data: sheet });
//   }

//   async saveToXlsxAndDownload() {
//     // read back from luckysheet
//     // get range as 2D array
//     const data = (window as any).luckysheet.getluckysheetdata(0); // returns 2D matrix
//     // convert to columns+rows
//     const rows = data.slice(1);
//     // ensure arrays of primitives
//     const cols = (data[0] || []).map((c: any) => c || '');
//     const rows2 = rows.map((r: any[]) => r.map(cell => cell && cell.v !== undefined ? cell.v : cell));
//     const { blob, filename } = this.excelSvc.exportToFile(cols, rows2, 'export.xlsx');
//     // Use File System Access API if available:
//     if ((window as any).showSaveFilePicker) {
//       try {
//         // @ts-ignore
//         const handle = await (window as any).showSaveFilePicker({
//           suggestedName: filename,
//           types: [{ description: 'Excel File', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }}]
//         });
//         const writable = await handle.createWritable();
//         await writable.write(blob);
//         await writable.close();
//         alert('Saved to chosen location.');
//       } catch (err) {
//         console.error(err);
//         // fallback
//         this.forceDownloadBlob(blob, filename);
//       }
//     } else {
//       // fallback to download
//       this.forceDownloadBlob(blob, filename);
//     }
//   }

//   forceDownloadBlob(blob: Blob, filename: string) {
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement('a');
//     a.href = url;
//     a.download = filename;
//     a.click();
//     URL.revokeObjectURL(url);
//   }

//   // --- Command integration with Gemini (LLM) ---
//   async onVoiceCommand(text: string) {
//     // show on UI
//     this.transcript = text;

//     // Craft prompt with examples (system prompt + user text)
//     const prompt = this.buildCommandPrompt(text);

//     try {
//       // send to gemini proxy
//       const res: any = await this.geminiSvc.parseCommand(prompt);
//       // The proxy should return JSON or model answer; you may need to extract .choices[0].text or similar depending on API
//       const parsed = this.extractJsonFromModelResponse(res);
//       this.lastParsedAction = parsed;
//       if (parsed) {
//         this.executeAction(parsed);
//       } else {
//         alert('Could not parse command. Try again.');
//       }
//     } catch (err) {
//       console.error('Gemini error', err);
//       // alert('Command parse failed: ' + (err.message || err));
//     }
//   }

//   buildCommandPrompt(userText: string) {
//     // Clear, deterministic prompt that instructs the LLM to return only JSON.
//     // You will adapt keys & actions as needed.
//     return `
// You are a JSON command parser for an Excel-like web app. Input is a user's spoken command. Output ONLY valid JSON (no extra text) with the schema:

// {
//   "action": "sort|filter|find_replace|insert_row|delete_row|update_cell|save|load|add_column|delete_column|clear_filter|undo",
//   "sheet": "Sheet1",
//   "column": "A|B|C|... or column name",
//   "columnIndex": 0,             // zero-based column index if known
//   "order": "asc|desc",          // for sort
//   "value": "...",               // value for filter/find/replace/update_cell
//   "from": {"r":0,"c":0},        // optional cell coords zero-based
//   "to": {"r":1,"c":2},          // optional range
//   "filename": "optional.xlsx"   // for save/load
// }

// Examples:
// "Sort column A descending" => {"action":"sort","column":"A","columnIndex":0,"order":"desc"}
// "Find all rows where column 'Name' contains John" => {"action":"filter","column":"Name","value":"John"}
// "Replace 2024 with 2025 in column C" => {"action":"find_replace","column":"C","value":"2025","replaceWith":"2025"}
// "Insert a row after row 3" => {"action":"insert_row","from":{"r":3,"c":0}}
// "Save file as monthly-report.xlsx" => {"action":"save","filename":"monthly-report.xlsx"}

// Now parse this command:
// "${userText}"
// `;
//   }

//   extractJsonFromModelResponse(res: any) {
//     // model proxy may return different structure. Try to find a JSON substring.
//     try {
//       // if res is an object with text in res.choices[0].text:
//       const candidate = (res?.choices?.[0]?.text) || res?.text || res?.result || JSON.stringify(res);
//       // extract JSON block
//       const m = candidate.match(/({[\s\S]*})/);
//       if (m) {
//         return JSON.parse(m[1]);
//       }
//       // if candidate is raw JSON
//       return JSON.parse(candidate);
//     } catch (err) {
//       console.error('parse model response error', err, res);
//       return null;
//     }
//   }
  

//   // --- Map parsed command to luckysheet operations ---
//   executeAction(cmd: any) {
//     if (!cmd || !cmd.action) return;
//     switch (cmd.action) {
//       case 'sort':
//         this.doSort(cmd);
//         break;
//       case 'filter':
//         this.doFilter(cmd);
//         break;
//       case 'find_replace':
//         this.doFindReplace(cmd);
//         break;
//       case 'insert_row':
//         this.doInsertRow(cmd);
//         break;
//       case 'delete_row':
//         this.doDeleteRow(cmd);
//         break;
//       case 'update_cell':
//         this.doUpdateCell(cmd);
//         break;
//       case 'save':
//         this.saveToXlsxAndDownload();
//         break;
//       case 'load':
//         // instruct user to upload the file if no FS access
//         alert('To load a file, use the upload button.');
//         break;
//       default:
//         console.warn('action not implemented', cmd);
//         alert('Action not implemented: ' + cmd.action);
//     }
//   }

//   // Implementations using luckysheet APIs (simplified)
//   doSort(cmd: any) {
//     // convert column (A->0) or columnIndex
//     const colIndex = this.parseColumnIndex(cmd);
//     if (colIndex == null) return alert('Cannot find column to sort');
//     // Luckysheet sorting: use luckysheet.sortRangeBy
//     try {
//       // This is a simplified approach — adjust depending on luckysheet API
//       (window as any).luckysheet.sortRangeBy({
//         range: [{ row: [0, 10000], column: [colIndex, colIndex] }],
//         sorttype: cmd.order === 'desc' ? 'desc' : 'asc'
//       });
//       alert(`Sorted column ${cmd.column || colIndex} ${cmd.order}`);
//     } catch (err) {
//       console.error(err);
//       alert('Sort failed: ' + err);
//     }
//   }

//   doFilter(cmd: any) {
//     const colIndex = this.parseColumnIndex(cmd);
//     if (colIndex == null) return alert('Cannot find column to filter');
//     const val = cmd.value;
//     if (val == null) return alert('No filter value provided');
//     // Simple filter: iterate rows, hide rows not matching; luckysheet has filter plugin but we do a simple approach.
//     // We'll transform the data into an in-memory filter and reload sheet with filtered rows.
//     const data = (window as any).luckysheet.getluckysheetdata(0); // 2D array
//     const headers = data[0].map((cell: any) => cell.v ?? cell);
//     const col = colIndex;
//     const filtered = [data[0], ...data.slice(1).filter((row:any[]) => {
//       const cell = row[col];
//       const v = (cell && cell.v !== undefined) ? String(cell.v) : String(cell);
//       return v.toLowerCase().includes(String(val).toLowerCase());
//     })];
//     // convert filtered to celldata format:
//     const celldata: any[] = [];
//     for (let r = 0; r < filtered.length; r++) {
//       for (let c = 0; c < filtered[0].length; c++) {
//         celldata.push({ r, c, v: (filtered[r][c] && filtered[r][c].v !== undefined) ? filtered[r][c].v : filtered[r][c]});
//       }
//     }
//     (window as any).luckysheet.create({ container: this.luckysheetId, data: [{ name:'Sheet1', celldata, index:0 }]});
//     alert(`Filtered column ${cmd.column || colIndex} by '${val}'`);
//   }

//   doFindReplace(cmd: any) {
//     const colIndex = this.parseColumnIndex(cmd);
//     const findVal = cmd.value;
//     const replaceVal = cmd.replaceWith ?? (cmd.replace || '');
//     if (colIndex == null) return alert('Column not found');
//     const data = (window as any).luckysheet.getluckysheetdata(0);
//     // do replace in-place
//     for (let r = 1; r < data.length; r++) {
//       const cell = data[r][colIndex];
//       const v = (cell && cell.v !== undefined) ? String(cell.v) : String(cell);
//       if (v && v.includes(findVal)) {
//         // replace
//         const newVal = v.split(findVal).join(replaceVal);
//         // set back using luckysheet setCellValue API or direct data manipulation
//         (window as any).luckysheet.setcellvalue(r, colIndex, newVal, 0); // 0 means no recalc
//       }
//     }
//     alert(`Replaced '${findVal}' with '${replaceVal}' in column ${cmd.column || colIndex}`);
//   }

//   doInsertRow(cmd: any) {
//     const at = cmd.from?.r ?? 0;
//     // luckysheet.insertRow is available
//     try {
//       (window as any).luckysheet.insertRow(at, 1);
//       alert('Inserted a row at ' + at);
//     } catch (err) {
//       console.error(err);
//       alert('Insert row failed: ' + err);
//     }
//   }

//   doDeleteRow(cmd: any) {
//     const at = cmd.from?.r ?? 0;
//     try {
//       (window as any).luckysheet.deleteRow(at, 1);
//       alert('Deleted row ' + at);
//     } catch (err) {
//       console.error(err);
//       alert('Delete row failed: ' + err);
//     }
//   }

//   doUpdateCell(cmd: any) {
//     const r = cmd.from?.r;
//     const c = cmd.from?.c;
//     if (r == null || c == null) return alert('Cell coordinates not provided');
//     try {
//       (window as any).luckysheet.setcellvalue(r, c, cmd.value, 0);
//       alert('Updated cell');
//     } catch (err) {
//       console.error(err);
//       alert('Update cell failed: ' + err);
//     }
//   }

//   parseColumnIndex(cmd: any): number | null {
//     if (typeof cmd.columnIndex === 'number') return cmd.columnIndex;
//     if (cmd.column) {
//       // if column like 'A' convert to 0
//       const c = cmd.column.toString().trim();
//       if (/^[A-Z]+$/i.test(c)) {
//         // convert letters to index e.g. A->0, B->1
//         let index = 0;
//         const s = c.toUpperCase();
//         for (let i = 0; i < s.length; i++) {
//           index = index * 26 + (s.charCodeAt(i) - 65 + 1);
//         }
//         return index - 1;
//       } else {
//         // column as header name: find header row
//         const data = (window as any).luckysheet.getluckysheetdata(0);
//         const headers = (data[0] || []).map((cell:any) => (cell && cell.v !== undefined) ? String(cell.v) : String(cell));
//         const idx = headers.findIndex((h : any) => h.toLowerCase() === c.toLowerCase());
//         return idx >= 0 ? idx : null;
//       }
//     }
//     return null;
//   }
// }

// ---------------------------------------------------------------------------------



// excel-ai.component.ts
// excel-ai.component.ts

// import { Component, OnInit, NgZone, AfterViewViewInit } from '@angular/core';
// import { Component, OnInit, NgZone, AfterViewViewInit } from '@angular/core';
import { Component, OnInit, NgZone, AfterViewInit } from '@angular/core';

import { ExcelService } from '../services/excel.service';
import { GeminiService } from '../services/gemini.service';
declare var luckysheet: any;

// A type definition for clarity, though not strictly necessary
type CellDataObject = { r: number; c: number; v?: any };

@Component({
  selector: 'app-excel-ai',
  templateUrl: './excel-ai.component.html',
  styleUrls: ['./excel-ai.component.css']
})
export class ExcelAiComponent implements OnInit, AfterViewInit {
  transcript = '';
  listening = false;
  recognition: any;
  lastParsedAction: any = null;
  isLoading = false;
  luckysheetId = 'luckysheet';
  // Excel operations list  
 excelOps: string[] = [
  // Formatting
  'bold', 'italic', 'underline', 'strikethrough', 'font', 'font size', 'color', 
  'background color', 'text color', 'fill color', 'border', 'style', 'format',

  // Insert/Delete actions
  'insert', 'delete', 'add row', 'add column', 'remove row', 'remove column',
  'insert row', 'insert column',

  // Alignment
  'align', 'left align', 'center align', 'right align', 'top align', 'bottom align',
  
  // Merging / Splitting
  'merge', 'merge cells', 'unmerge', 'split cell',

  // Data
  'copy', 'paste', 'cut', 'filter', 'sort', 'find', 'replace',

  // Others
  'freeze', 'unfreeze', 'hide row', 'hide column', 'show row', 'show column',
  'wrap text', 'unhide row', 'unhide column', 'clear', 'clear contents',

  // Formulas
  'sum', 'average', 'count', 'max', 'min', 'formula'
];


  constructor(
    private zone: NgZone,
    private excelSvc: ExcelService,
    private geminiSvc: GeminiService
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    // Initialize with an empty sheet
    luckysheet.create({
      container: this.luckysheetId,
      title: 'Sheet1',
      lang: 'en',
      plugins: ['chart']
    });
  }

  // --- Central function to reliably load data ---
  // This is the key to the solution: it destroys the old sheet and creates a new one.
  loadCelldataToLuckysheet(celldata: CellDataObject[], sheetName = 'Sheet1') {
    this.isLoading = true;
    // The timeout gives the browser a moment to show the loading state
    setTimeout(() => {
      luckysheet.destroy();
      luckysheet.create({
        container: this.luckysheetId,
        plugins: ['chart'],
        data: [{
          name: sheetName,
          celldata: celldata,
          config: {}
        }]
      });
      this.isLoading = false;
    }, 50); // A small delay for better UX
  }
  
  // --- Voice & File Operations (No major changes) ---
  
  startListening() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { return alert('Speech recognition not supported.'); }
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.onstart = () => this.zone.run(() => this.listening = true);
    this.recognition.onend = () => this.zone.run(() => this.listening = false);
    this.recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      this.zone.run(() => {
        this.transcript = text;
        if (['go left','go right','go up','go down'].includes(text.toLowerCase())) {
          this.moveSelection(text as 'go left'|'go right'|'go up'|'go down');
        }
        else if (this.excelOps.some((op : any) => text.toLowerCase().includes(op))) {
          this.onVoiceCommand(text);
        } 
        else {
          this.insertTextInCurrentCell(text.toLowerCase());
        }
        //  else {
        //               this.onVoiceCommand(text);
        //         }
              });
    };
    this.recognition.start();
  }

  async onUploadFile(ev: any) {
    const file: File = ev.target.files[0];
    if (!file) return;
    const { columns, rows } = await this.excelSvc.readFileFromFile(file);
    const celldata = this.convertToCelldata([columns, ...rows]);
    this.loadCelldataToLuckysheet(celldata);
  }

  // --- AI Command Processing ---

  async onVoiceCommand(text: string) {
    if (this.isLoading) return;
    this.transcript = text;
    const prompt = this.buildCommandPrompt(text);

    try {
      this.isLoading = true;
      const res: any = await this.geminiSvc.parseCommand(prompt);
      const parsed = this.extractJsonFromModelResponse(res);
      this.lastParsedAction = parsed;

      if (parsed) {
        this.executeAction(parsed);
      } else {
        alert('Could not understand the command.');
        this.isLoading = false;
      }
    } catch (err) {
      console.error('Gemini error', err);
      this.isLoading = false;
    }
  }

  buildCommandPrompt(userText: string): string {
    // This is the same powerful prompt from before
    return `
You are a JSON command parser. Output ONLY valid JSON.
Schema: { "action": "sort|filter|clear_filter|color_range|format_text", "column": "Column Name or A,B,C", "rangeString": "A1, header, row 5", "order": "asc|desc", "value": "text to find", "color": "red", "style": "bold" }
Examples:
"Sort the 'Sales' column descending" => {"action":"sort","column":"Sales","order":"desc"}
"Filter the status column to show 'Complete'" => {"action":"filter","column":"Status","value":"Complete"}
"Make the header row light gray" => {"action":"color_range","rangeString":"header","color":"lightgray"}
"Make column 'Product' bold" => {"action":"format_text","rangeString":"column Product","style":"bold"}
"Clear all filters" => {"action":"clear_filter"}
Now parse: "${userText}"
`;
  }

  extractJsonFromModelResponse(res: any): any {
    try {
      const candidate = res?.text || res;
      const match = candidate.match(/({[\s\S]*})/);
      return match ? JSON.parse(match[1]) : JSON.parse(candidate);
    } catch {
      return null;
    }
  }

  executeAction(cmd: any) {
    // Get all the current sheet data. All operations will modify this data.
    const allSheets = luckysheet.getAllSheets();
    let originalCelldata = allSheets[0].celldata;

    // We will store the original data for the "clear filter" action
    if (cmd.action !== 'clear_filter') {
      sessionStorage.setItem('unfiltered_data', JSON.stringify(originalCelldata));
    }
    
    let modifiedCelldata;

    switch (cmd.action) {
      case 'sort':
        modifiedCelldata = this.doSort(originalCelldata, cmd);
        break;
      case 'filter':
        modifiedCelldata = this.doFilter(originalCelldata, cmd);
        break;
      case 'clear_filter':
        const storedData = sessionStorage.getItem('unfiltered_data');
        modifiedCelldata = storedData ? JSON.parse(storedData) : originalCelldata;
        break;
      case 'color_range':
        modifiedCelldata = this.doColorRange(originalCelldata, cmd);
        break;
      case 'format_text':
        modifiedCelldata = this.doFormatText(originalCelldata, cmd);
        break;
      default:
        alert('Action not implemented: ' + cmd.action);
        this.isLoading = false;
        return;
    }
    
    this.loadCelldataToLuckysheet(modifiedCelldata);
  }

  // --- ROBUST ACTION IMPLEMENTATIONS ---

  doSort(celldata: CellDataObject[], cmd: any): CellDataObject[] {
    const data = this.convertFromCelldata(celldata);
    const header = data[0];
    const rows = data.slice(1);
    
    const colIndex = this.getColumnIndex(header, cmd.column);
    if (colIndex === null) {
        alert(`Column '${cmd.column}' not found.`);
        return celldata;
    }

    rows.sort((a, b) => {
        const valA = a[colIndex];
        const valB = b[colIndex];
        if (valA < valB) return cmd.order === 'asc' ? -1 : 1;
        if (valA > valB) return cmd.order === 'asc' ? 1 : -1;
        return 0;
    });

    return this.convertToCelldata([header, ...rows]);
  }

  doFilter(celldata: CellDataObject[], cmd: any): CellDataObject[] {
    const data = this.convertFromCelldata(celldata);
    const header = data[0];
    const rows = data.slice(1);

    const colIndex = this.getColumnIndex(header, cmd.column);
    if (colIndex === null) {
        alert(`Column '${cmd.column}' not found.`);
        return celldata;
    }

    const filteredRows = rows.filter(row => {
        const cellValue = String(row[colIndex] || '').toLowerCase();
        return cellValue.includes(String(cmd.value).toLowerCase());
    });
    
    return this.convertToCelldata([header, ...filteredRows]);
  }

  doColorRange(celldata: CellDataObject[], cmd: any): CellDataObject[] {
    const { startRow, endRow, startCol, endCol } = this.parseRange(celldata, cmd.rangeString);
    const hexColor = this.colorNameToHex(cmd.color);

    return celldata.map(cell => {
        if (cell.r >= startRow && cell.r <= endRow && cell.c >= startCol && cell.c <= endCol) {
            // Create a copy and modify it to avoid changing the original object
            const newCell = { ...cell, v: { ...cell.v } };
            newCell.v.bg = hexColor;
            return newCell;
        }
        return cell;
    });
  }

  doFormatText(celldata: CellDataObject[], cmd: any): CellDataObject[] {
    const { startRow, endRow, startCol, endCol } = this.parseRange(celldata, cmd.rangeString);
    
    let format = {};
    if (cmd.style === 'bold') format = { bl: 1 };
    if (cmd.style === 'italic') format = { it: 1 };

    return celldata.map(cell => {
        if (cell.r >= startRow && cell.r <= endRow && cell.c >= startCol && cell.c <= endCol) {
            const newCell = { ...cell, v: { ...cell.v, ...format } };
            return newCell;
        }
        return cell;
    });
  }

  // --- Helper Functions ---

  convertToCelldata(data: any[][]): CellDataObject[] {
    const celldata: CellDataObject[] = [];
    data.forEach((row, r) => {
        row.forEach((cellValue, c) => {
            if (cellValue !== null && cellValue !== undefined) {
                celldata.push({ r, c, v: { v: cellValue, m: String(cellValue) } });
            }
        });
    });
    return celldata;
  }

  convertFromCelldata(celldata: CellDataObject[]): any[][] {
      if (!celldata || celldata.length === 0) return [];
      const maxRow = Math.max(...celldata.map(c => c.r));
      const maxCol = Math.max(...celldata.map(c => c.c));
      const grid: any[][] = Array(maxRow + 1).fill(null).map(() => Array(maxCol + 1).fill(null));
      celldata.forEach(cell => {
          if (cell.v && typeof cell.v === 'object') {
              grid[cell.r][cell.c] = cell.v.v;
          } else {
              grid[cell.r][cell.c] = cell.v;
          }
      });
      return grid;
  }

  getColumnIndex(header: string[], columnName: string): number | null {
    let idx = header.findIndex(h => h.toLowerCase() === columnName.toLowerCase());
    if (idx !== -1) return idx;
    // Fallback for "A", "B", etc.
    if (/^[A-Z]+$/i.test(columnName)) {
        let index = 0;
        const s = columnName.toUpperCase();
        for (let i = 0; i < s.length; i++) { index = index * 26 + (s.charCodeAt(i) - 64); }
        return index - 1;
    }
    return null;
  }
  
  parseRange(celldata: CellDataObject[], rangeString: string): { startRow: number, endRow: number, startCol: number, endCol: number } {
    const maxRow = Math.max(...celldata.map(c => c.r));
    const maxCol = Math.max(...celldata.map(c => c.c));
    rangeString = (rangeString || '').toLowerCase();

    if (rangeString === 'header' || rangeString === 'row 1') {
        return { startRow: 0, endRow: 0, startCol: 0, endCol: maxCol };
    }
    const colMatch = rangeString.match(/column (.*)/);
    if (colMatch) {
      const data = this.convertFromCelldata(celldata);
      const header = data[0];
      const col = this.getColumnIndex(header, colMatch[1].trim());
      if (col !== null) return { startRow: 0, endRow: maxRow, startCol: col, endCol: col };
    }
    // Add more parsing for "A1", "C5:D10" etc. if needed
    return { startRow: -1, endRow: -1, startCol: -1, endCol: -1 }; // Default no-op
  }
  
  colorNameToHex(color: string): string {
    const colors :any = { "red": "#ff0000", "green": "#00ff00", "blue": "#0000ff", "yellow": "#ffff00", "lightgray": "#d3d3d3" };
    return colors[color.toLowerCase()] || color;
  }
  stopListening() {
  if (this.recognition) {
    this.recognition.stop();
  }
  this.listening = false;
}

saveToXlsxAndDownload() {
  const allSheets = luckysheet.getAllSheets();
  if (!allSheets || allSheets.length === 0) {
    alert('No sheet data to export.');
    return;
  }
  // Built-in export (if supported by your Luckysheet version)
  luckysheet.excel.exportExcel({ data: allSheets });
}

moveSelection(direction: 'go left'|'go right'|'go up'|'go down') {
  // get current range
  const range = window.luckysheet.getRange()[0];
  let r = range.row[0];
  let c = range.column[0];

  // boundaries check
  switch (direction) {
    case 'go left':
      c = Math.max(0, c - 1);
      break;
    case 'go right':
      c = c + 1;
      break;
    case 'go up':
      r = Math.max(0, r - 1);
      break;
    case 'go down':
      r = r + 1;
      break;
  }

  // Luckysheet API to show new selection
  window.luckysheet.setRangeShow({ row: [r, r], column: [c, c] });
}

insertTextInCurrentCell(value: string) {
  const range = (window as any).luckysheet.getRange()[0];
  const r = range.row[0];
  const c = range.column[0];
  (window as any).luckysheet.setCellValue(r, c, value);
}


}