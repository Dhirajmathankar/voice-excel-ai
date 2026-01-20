import { Component, OnInit, NgZone, AfterViewInit, ViewChild } from '@angular/core';
import { ExcelService } from '../services/excel.service';
import { GeminiService } from '../services/gemini.service';
declare var luckysheet: any;
type CellDataObject = { r: number; c: number; v?: any };
declare var google: any;
import { AI_KEYS } from '../../environments/iconfig';
import { CommandCenterComponent } from '../command-center/command-center.component';

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


accessToken: string = '';
spreadsheetId: string = '';
  activeSheetName: any;


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
  
  isManualStop = false;
  startListening() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { return alert('Speech recognition not supported.'); }
     this.isManualStop = false;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-US';
    this.recognition.onstart = () => this.zone.run(() => this.listening = true);
    this.recognition.onend = () => this.zone.run(() => {
       if (!this.isManualStop) {
        this.recognition.start();           // ✅ auto restart
      } else {
        this.listening = false;
      }
    });
    this.recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      this.zone.run(() => {
        this.transcript = text;
        if (['go left','go right','go up','go down'].includes(text.toLowerCase())) {
          this.moveSelection(text as 'go left'|'go right'|'go up'|'go down');
        }
        // else if (this.excelOps.some((op : any) => text.toLowerCase().includes(op))) {
        //   this.onVoiceCommand(text);
        // } 
        else if (this.excelOps.some((op: any) => text.toLowerCase().includes(op))) {
          this.onVoiceCommand(text.toLowerCase());
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

  async onVoiceCommandold(text: string) {
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

  async onVoiceCommand(command: string) {

  // 🔹 STEP 1: Try LOCAL (Rule-based) execution first
  const handledLocally = this.handleLocalExcelCommand(command.toLowerCase());
  if (handledLocally) {
    return; // ✅ Gemini call skipped
  }

  // 🔹 STEP 2: FALLBACK to OLD Gemini logic (UNCHANGED)
  if (this.isLoading) return;

  this.transcript = command;
  const prompt = this.buildCommandPrompt(command);

  try {
    this.isLoading = true;
    const res: any = await this.geminiSvc.parseCommand(prompt);
    const parsed = this.extractJsonFromModelResponse(res);
    this.lastParsedAction = parsed;

    if (parsed) {
      this.executeAction(parsed);
    } else {
      alert('Could not understand the command.');
    }
  } catch (err) {
    console.error('Gemini error', err);
  } finally {
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
     this.isManualStop = true;
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


// loginWithGoogle() {
//   const tokenClient = google.accounts.oauth2.initTokenClient({
//     client_id: AI_KEYS.googleClientId,
//     scope: `
// https://www.googleapis.com/auth/drive.file
// https://www.googleapis.com/auth/spreadsheets
// `
// ,
//     callback: (resp: any) => {
//       this.accessToken = resp.access_token;
//       this.openPicker();
//     }
//   });

//   tokenClient.requestAccessToken();
// }
loginWithGoogle() {
  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: AI_KEYS.googleClientId,
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
    callback: (resp: any) => {
      this.accessToken = resp.access_token;
      this.openPicker();
    }
  });

  tokenClient.requestAccessToken();
}

// openPicker() {
//   const picker = new google.picker.PickerBuilder()
//     .addView(google.picker.ViewId.SPREADSHEETS)
//     .setOAuthToken(this.accessToken)
//     .setDeveloperKey(AI_KEYS.googleClientId) // blank ok
//     .setCallback((data: any) => {
//       if (data.action === google.picker.Action.PICKED) {
//         this.spreadsheetId = data.docs[0].id;
//         this.loadGoogleSheetData();
//       }
//     })
//     .build();

//   picker.setVisible(true);
// }
// async loadGoogleSheetData() {
//   const res = await fetch(
//     `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Sheet1`,
//     {
//       headers: {
//         Authorization: `Bearer ${this.accessToken}`
//       }
//     }
//   );

 


//   const json = await res.json();
//   const values = json.values || [];
//   this.refreshLuckysheet(this.convertToCelldata(values));
// }

 openPicker1() {
  const picker = new google.picker.PickerBuilder()
    .addView(google.picker.ViewId.SPREADSHEETS)
    .setOAuthToken(this.accessToken)
    .setDeveloperKey(AI_KEYS.googleApiKey) // 🔥 REQUIRED
    .setCallback(this.pickerCallback.bind(this))
    .build();

  picker.setVisible(true);
}
openPicker() {
  const view = new google.picker.View(google.picker.ViewId.DOCS);

  const picker = new google.picker.PickerBuilder()
    .setDeveloperKey(AI_KEYS.googleApiKey) // 👈 API KEY HERE
    .setOAuthToken(this.accessToken)        // 👈 Access Token
    .addView(view)
    .setCallback(this.pickerCallback.bind(this))
    .build();

  picker.setVisible(true);
}

pickerCallback(data: any) {
  if (data.action === google.picker.Action.PICKED) {
    this.spreadsheetId = data.docs[0].id;
    this.loadGoogleSheetData();
  }
}
async loadGoogleSheetData() {
  // 1️⃣ get spreadsheet metadata
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}`,
    {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    }
  );
  const meta = await metaRes.json();
  const sheetName = meta.sheets[0].properties.title;

  // 2️⃣ load values
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${sheetName}`,
    {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    }
  );

  const json = await res.json();
  const values = json.values || [];

  this.activeSheetName = sheetName;
  this.refreshLuckysheet(this.convertToCelldata(values));
}

saveTimeout: any;

refreshLuckysheet(celldata: any[]) {
  if (luckysheet?.destroy) {
    luckysheet.destroy();
  }

  luckysheet.create({
    container: 'luckysheet',
    showinfobar: false,
    hook: {
      updated: () => {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
          const file = luckysheet.getluckysheetfile();
          const grid = file?.[0]?.data || [];
          const values = this.convertFromGridToSimpleArray(grid);
          this.autoSaveToGoogleSheets(values);
        }, 800); // debounce
      }
    },
    data: [{ name: this.activeSheetName, celldata }]
  });
}

async autoSaveToGoogleSheets(values: any[][]) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    }
  );
}

// refreshLuckysheet(celldata: any[]) {
//   // Destroy previous instance if exists
//   if (luckysheet?.destroy) {
//     luckysheet.destroy();
//   }

//   luckysheet.create({
//     container: 'luckysheet',
//     showinfobar: false,
//     hook: {
//       updated: () => {
//         const file = luckysheet.getluckysheetfile();
//         if (file && file.length) {
//           const grid = file[0].data;
//           const values = this.convertFromGridToSimpleArray(grid);
//           this.autoSaveToGoogleSheets(values);
//         }
//       }
//     },
//     data: [
//       {
//         name: 'Sheet1',
//         celldata: celldata
//       }
//     ]
//   });
// }


convertFromGridToSimpleArray(grid: any[][]): any[][] {
  return grid.map(row =>
    row.map(cell => cell?.v ?? '')
  );
}


handleLocalExcelCommand(command: string): boolean {

  // ===== Formatting =====
  if (command.includes('bold')) return this.makeBold(), true;
  if (command.includes('italic')) return this.makeItalic(), true;
  if (command.includes('underline')) return this.makeUnderline(), true;
  if (command.includes('strikethrough')) return this.makeStrike(), true;

  if (command.includes('font size')) return this.changeFontSize(command), true;
  if (command.includes('text color')) return this.changeTextColor(command), true;
  if (command.includes('background color') || command.includes('fill color'))
    return this.changeBackgroundColor(command), true;

  // ===== Insert / Delete =====
  if (command.includes('insert row') || command.includes('add row'))
    return this.insertRow(), true;

  if (command.includes('insert column') || command.includes('add column'))
    return this.insertColumn(), true;

  if (command.includes('delete row') || command.includes('remove row'))
    return this.deleteRow(), true;

  if (command.includes('delete column') || command.includes('remove column'))
    return this.deleteColumn(), true;

  // ===== Alignment =====
  if (command.includes('left align')) return this.alignCell('left'), true;
  if (command.includes('center align')) return this.alignCell('center'), true;
  if (command.includes('right align')) return this.alignCell('right'), true;
  if (command.includes('top align')) return this.alignVertical('top'), true;
  if (command.includes('bottom align')) return this.alignVertical('bottom'), true;

  // ===== Merge / Split =====
  if (command.includes('merge')) return this.mergeCells(), true;
  if (command.includes('unmerge') || command.includes('split cell'))
    return this.unmergeCells(), true;

  // ===== Clipboard =====
  if (command.includes('copy')) return this.copyCell(), true;
  if (command.includes('paste')) return this.pasteCell(), true;
  if (command.includes('cut')) return this.cutCell(), true;

  // ===== Visibility =====
  if (command.includes('hide row')) return this.hideRow(), true;
  if (command.includes('hide column')) return this.hideColumn(), true;
  if (command.includes('unhide row') || command.includes('show row'))
    return this.unhideRow(), true;
  if (command.includes('unhide column') || command.includes('show column'))
    return this.unhideColumn(), true;

  // ===== Freeze =====
  if (command.includes('freeze')) return this.freezeRowOrColumn(), true;
  if (command.includes('unfreeze')) return this.unfreeze(), true;

  // ===== Data =====
  if (command.includes('clear')) return this.clearCell(), true;
  if (command.includes('wrap text')) return this.wrapText(), true;

  // ===== Formulas =====
  if (command.includes('sum')) return this.applyFormula('SUM'), true;
  if (command.includes('average')) return this.applyFormula('AVERAGE'), true;
  if (command.includes('count')) return this.applyFormula('COUNT'), true;
  if (command.includes('max')) return this.applyFormula('MAX'), true;
  if (command.includes('min')) return this.applyFormula('MIN'), true;

  return false; // ❌ Not handled locally → Gemini will handle
}


makeBold() { this.applyStyle({ fontWeight: 'bold' }); }
makeItalic() { this.applyStyle({ fontStyle: 'italic' }); }
makeUnderline() { this.applyStyle({ textDecoration: 'underline' }); }
makeStrike() { this.applyStyle({ textDecoration: 'line-through' }); }
insertRow() { console.log('Row inserted'); }
insertColumn() { console.log('Column inserted'); }
deleteRow() { console.log('Row deleted'); }
deleteColumn() { console.log('Column deleted'); }
alignCell(type: 'left' | 'center' | 'right') {
  console.log('Horizontal Align:', type);
}

alignVertical(type: 'top' | 'bottom') {
  console.log('Vertical Align:', type);
}
mergeCells() { console.log('Cells merged'); }
unmergeCells() { console.log('Cells unmerged'); }
copyCell() { console.log('Copied'); }
pasteCell() { console.log('Pasted'); }
cutCell() { console.log('Cut'); }
hideRow() { console.log('Row hidden'); }
hideColumn() { console.log('Column hidden'); }
unhideRow() { console.log('Row shown'); }
unhideColumn() { console.log('Column shown'); }
freezeRowOrColumn() { console.log('Freeze applied'); }
unfreeze() { console.log('Unfreeze applied'); }
clearCell() {
  this.insertTextInCurrentCell('');
}

wrapText() {
  console.log('Wrap text enabled');
}
applyFormula(type: string) {
  const formula = `=${type}(A1:A10)`;
  this.insertTextInCurrentCell(formula);
}
applyStyle(style: any) {
  console.log('Applying style:', style);
}
changeTextColor(command: string) {
  const color = this.extractColor(command);
  console.log('Text color:', color);
  // apply style to selected cell
  this.applyStyle({ color });
}
changeBackgroundColor(command: string) {
  const color = this.extractColor(command);
  console.log('Background color:', color);
  this.applyStyle({ backgroundColor: color });
}
extractColor(command: string): string {
  const colors = [
    'red','blue','green','yellow','orange',
    'black','white','pink','purple','gray'
  ];

  return colors.find(c => command.includes(c)) || 'black';
}
changeFontSize(command: string) {
  const size = this.extractFontSize(command);
  console.log('Font size:', size);
  this.applyStyle({ fontSize: `${size}px` });
}
extractFontSize(command: string): number {

  // 1️⃣ Direct number: "font size 16"
  const match = command.match(/\d+/);
  if (match) {
    return Number(match[0]);
  }

  // 2️⃣ Semantic sizes
  if (command.includes('small')) return 12;
  if (command.includes('medium')) return 16;
  if (command.includes('large')) return 20;
  if (command.includes('extra large')) return 24;

  // 3️⃣ Increase / decrease
  if (command.includes('increase')) return 18;
  if (command.includes('decrease')) return 12;

  // default
  return 14;
}


  @ViewChild('commandCenter')
  commandCenter!: CommandCenterComponent;

  openCommandCenter() {
    this.commandCenter.open();
  }

  closeCommandCenter() {
    this.commandCenter.close();
  }

  startHelpTour() {
    this.commandCenter.runTour();
  }

}