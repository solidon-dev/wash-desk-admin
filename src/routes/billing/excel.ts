/**
 * 순수 JavaScript로 .xlsx 파일 생성 유틸리티
 * 외부 라이브러리 없이 Open XML 스펙을 직접 구현
 * 브라우저에서 바로 다운로드 가능
 */

// ── 타입 정의 ─────────────────────────────────────────────────────

export type CellValue = string | number | null | undefined;

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;           // pt 단위, 기본 11
  fontColor?: string;          // hex (e.g. 'FF0000')
  bgColor?: string;            // hex (e.g. 'EEF2FF')
  align?: 'left' | 'center' | 'right';
  wrapText?: boolean;
  border?: boolean;            // 전체 테두리
  borderTop?: boolean;
  borderBottom?: boolean;
  borderLeft?: boolean;
  borderRight?: boolean;
  borderThick?: boolean;       // 굵은 테두리
  numFmt?: string;             // 숫자 포맷 (e.g. '#,##0')
}

export interface Cell {
  value: CellValue;
  style?: CellStyle;
  colSpan?: number;  // 병합 (xlsx에서는 merge region으로 처리)
  rowSpan?: number;
}

export interface SheetRow {
  cells: (Cell | CellValue)[];
  height?: number;  // pt 단위
}

export interface MergeRegion {
  r1: number; c1: number;
  r2: number; c2: number;
}

export interface ColumnDef {
  width?: number;  // 문자 단위 (기본 ~10)
}

export interface Sheet {
  name: string;
  rows: SheetRow[];
  merges?: MergeRegion[];
  columns?: ColumnDef[];
  freezeRow?: number;   // 이 행까지 고정 (1-based)
  freezeCol?: number;   // 이 열까지 고정 (1-based)
}

// ── 내부 헬퍼 ─────────────────────────────────────────────────────

function escXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function hexColor(hex: string): string {
  // 'RRGGBB' → 'FFRRGGBB' (alpha=FF)
  const h = hex.replace('#', '');
  return h.length === 6 ? 'FF' + h.toUpperCase() : h.toUpperCase();
}

// ── 스타일 레지스트리 ──────────────────────────────────────────────

interface StyleDef {
  numFmtId: number;
  fontId: number;
  fillId: number;
  borderId: number;
  xfId: number;
  align?: { horizontal?: string; vertical?: string; wrapText?: boolean };
}

class StyleRegistry {
  private numFmts: Map<string, number> = new Map();
  private fonts: string[] = [];
  private fills: string[] = [];
  private borders: string[] = [];
  private cellXfs: StyleDef[] = [];

  // 기본 스타일 초기화
  constructor() {
    // fill 0, 1은 예약됨 (xlsx 스펙)
    this.fills.push('<fill><patternFill patternType="none"/></fill>');
    this.fills.push('<fill><patternFill patternType="gray125"/></fill>');
    // border 0: 빈 테두리
    this.borders.push('<border><left/><right/><top/><bottom/><diagonal/></border>');
    // font 0: 기본 폰트
    this.fonts.push(
      '<font><sz val="11"/><color theme="1"/><name val="맑은 고딕"/><family val="2"/><scheme val="minor"/></font>'
    );
    // xf 0: 기본
    this.cellXfs.push({ numFmtId: 0, fontId: 0, fillId: 0, borderId: 0, xfId: 0 });
  }

  private getOrAddFont(s: CellStyle): number {
    const bold = s.bold ? '<b/>' : '';
    const italic = s.italic ? '<i/>' : '';
    const sz = `<sz val="${s.fontSize ?? 11}"/>`;
    const color = s.fontColor
      ? `<color rgb="${hexColor(s.fontColor)}"/>`
      : '<color theme="1"/>';
    const xml = `<font>${bold}${italic}${sz}${color}<name val="맑은 고딕"/><family val="2"/></font>`;
    const idx = this.fonts.indexOf(xml);
    if (idx >= 0) return idx;
    this.fonts.push(xml);
    return this.fonts.length - 1;
  }

  private getOrAddFill(bgColor?: string): number {
    if (!bgColor) return 0;
    const xml = `<fill><patternFill patternType="solid"><fgColor rgb="${hexColor(bgColor)}"/><bgColor indexed="64"/></patternFill></fill>`;
    const idx = this.fills.indexOf(xml);
    if (idx >= 0) return idx;
    this.fills.push(xml);
    return this.fills.length - 1;
  }

  private borderSide(thick: boolean): string {
    const style = thick ? 'medium' : 'thin';
    return `<border style="${style}"><color rgb="FF94A3B8"/></border>`;
  }

  private getOrAddBorder(s: CellStyle): number {
    if (!s.border && !s.borderTop && !s.borderBottom && !s.borderLeft && !s.borderRight) return 0;
    const thick = s.borderThick ?? false;
    const left   = (s.border || s.borderLeft)   ? this.borderSide(thick) : '';
    const right  = (s.border || s.borderRight)  ? this.borderSide(thick) : '';
    const top    = (s.border || s.borderTop)    ? this.borderSide(thick) : '';
    const bottom = (s.border || s.borderBottom) ? this.borderSide(thick) : '';
    const xml = `<border><left${left ? '' : '/'}>${left}</left><right${right ? '' : '/'}>${right}</right><top${top ? '' : '/'}>${top}</top><bottom${bottom ? '' : '/'}>${bottom}</bottom><diagonal/></border>`;
    const idx = this.borders.indexOf(xml);
    if (idx >= 0) return idx;
    this.borders.push(xml);
    return this.borders.length - 1;
  }

  private getOrAddNumFmt(fmt?: string): number {
    if (!fmt) return 0;
    if (fmt === '#,##0') return 3;   // 내장 포맷
    if (this.numFmts.has(fmt)) return this.numFmts.get(fmt)!;
    const id = 164 + this.numFmts.size;
    this.numFmts.set(fmt, id);
    return id;
  }

  getStyleId(style?: CellStyle): number {
    if (!style) return 0;
    const fontId   = this.getOrAddFont(style);
    const fillId   = this.getOrAddFill(style.bgColor);
    const borderId = this.getOrAddBorder(style);
    const numFmtId = this.getOrAddNumFmt(style.numFmt);
    const align = (style.align || style.wrapText)
      ? { horizontal: style.align, wrapText: style.wrapText }
      : undefined;

    // xf 찾기 또는 생성
    const match = this.cellXfs.findIndex(
      (x) =>
        x.fontId === fontId &&
        x.fillId === fillId &&
        x.borderId === borderId &&
        x.numFmtId === numFmtId &&
        JSON.stringify(x.align) === JSON.stringify(align)
    );
    if (match >= 0) return match;

    this.cellXfs.push({ numFmtId, fontId, fillId, borderId, xfId: 0, align });
    return this.cellXfs.length - 1;
  }

  toXml(): string {
    const numFmtsXml = this.numFmts.size > 0
      ? `<numFmts count="${this.numFmts.size}">${[...this.numFmts.entries()].map(([fmt, id]) => `<numFmt numFmtId="${id}" formatCode="${escXml(fmt)}"/>`).join('')}</numFmts>`
      : '<numFmts count="0"/>';

    const fontsXml = `<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts>`;
    const fillsXml = `<fills count="${this.fills.length}">${this.fills.join('')}</fills>`;
    const bordersXml = `<borders count="${this.borders.length}">${this.borders.join('')}</borders>`;

    const xfsXml = this.cellXfs.map((x) => {
      const alignXml = x.align
        ? `<alignment${x.align.horizontal ? ` horizontal="${x.align.horizontal}"` : ''}${x.align.wrapText ? ' wrapText="1"' : ''} vertical="center"/>`
        : '';
      const applyFont   = x.fontId   > 0 ? ' applyFont="1"' : '';
      const applyFill   = x.fillId   > 0 ? ' applyFill="1"' : '';
      const applyBorder = x.borderId > 0 ? ' applyBorder="1"' : '';
      const applyNumFmt = x.numFmtId > 0 ? ' applyNumberFormat="1"' : '';
      const applyAlign  = alignXml       ? ' applyAlignment="1"' : '';
      return `<xf numFmtId="${x.numFmtId}" fontId="${x.fontId}" fillId="${x.fillId}" borderId="${x.borderId}" xfId="${x.xfId}"${applyFont}${applyFill}${applyBorder}${applyNumFmt}${applyAlign}>${alignXml}</xf>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
            xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
            mc:Ignorable="x14ac x16r2 xr"
            xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac"
            xmlns:x16r2="http://schemas.microsoft.com/office/spreadsheetml/2015/02/main"
            xmlns:xr="http://schemas.microsoft.com/office/spreadsheetml/2014/revision">
  ${numFmtsXml}
  ${fontsXml}
  ${fillsXml}
  ${bordersXml}
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="${this.cellXfs.length}">${xfsXml}</cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  }
}

// ── 열 번호 → 엑셀 알파벳 변환 ────────────────────────────────────

function colLetter(col: number): string {
  let s = '';
  let c = col;
  while (c > 0) {
    c--;
    s = String.fromCharCode(65 + (c % 26)) + s;
    c = Math.floor(c / 26);
  }
  return s;
}

function cellRef(row: number, col: number): string {
  return colLetter(col) + row;
}

// ── 시트 XML 생성 ──────────────────────────────────────────────────

function buildSheetXml(sheet: Sheet, registry: StyleRegistry): string {
  const rows: string[] = [];
  const normalizedRows: { cells: Cell[]; height?: number }[] = sheet.rows.map((r) => ({
    height: r.height,
    cells: r.cells.map((c): Cell =>
      c !== null && typeof c === 'object' && 'value' in c
        ? (c as Cell)
        : { value: c as CellValue }
    ),
  }));

  for (let ri = 0; ri < normalizedRows.length; ri++) {
    const row = normalizedRows[ri];
    const rowNum = ri + 1;
    const cells: string[] = [];

    for (let ci = 0; ci < row.cells.length; ci++) {
      const cell = row.cells[ci];
      const colNum = ci + 1;
      const ref = cellRef(rowNum, colNum);
      const sIdx = registry.getStyleId(cell.style);
      const val = cell.value;

      if (val === null || val === undefined || val === '') {
        // 스타일만 있으면 빈 셀도 출력 (배경색 등 표시 위해)
        if (cell.style?.bgColor || cell.style?.border || cell.style?.bold) {
          cells.push(`<c r="${ref}" s="${sIdx}"/>`);
        }
        continue;
      }

      if (typeof val === 'number') {
        cells.push(`<c r="${ref}" s="${sIdx}" t="n"><v>${val}</v></c>`);
      } else {
        // 문자열 — shared strings 대신 인라인 문자열 사용
        const escaped = escXml(String(val));
        cells.push(`<c r="${ref}" s="${sIdx}" t="inlineStr"><is><t>${escaped}</t></is></c>`);
      }
    }

    const htAttr = row.height ? ` ht="${row.height}" customHeight="1"` : '';
    rows.push(`<row r="${rowNum}"${htAttr}>${cells.join('')}</row>`);
  }

  // 열 너비
  let colsXml = '';
  if (sheet.columns && sheet.columns.length > 0) {
    const colDefs = sheet.columns
      .map((col, i) =>
        col.width != null
          ? `<col min="${i + 1}" max="${i + 1}" width="${col.width}" customWidth="1"/>`
          : ''
      )
      .filter(Boolean)
      .join('');
    if (colDefs) colsXml = `<cols>${colDefs}</cols>`;
  }

  // 셀 병합
  let mergesXml = '';
  if (sheet.merges && sheet.merges.length > 0) {
    const mCells = sheet.merges
      .map((m) => `<mergeCell ref="${cellRef(m.r1, m.c1)}:${cellRef(m.r2, m.c2)}"/>`)
      .join('');
    mergesXml = `<mergeCells count="${sheet.merges.length}">${mCells}</mergeCells>`;
  }

  // 틀 고정
  let freezeXml = '';
  if (sheet.freezeRow || sheet.freezeCol) {
    const fr = sheet.freezeRow ?? 0;
    const fc = sheet.freezeCol ?? 0;
    const topLeft = cellRef(fr + 1, fc + 1);
    const state = 'frozen';
    freezeXml = `<pane ySplit="${fr}" xSplit="${fc}" topLeftCell="${topLeft}" activePane="bottomRight" state="${state}"/>`;
  }

  // 페이지 설정 (A4 가로 → 품목이 많으므로)
  const pageSetup = `<pageSetup paperSize="9" orientation="landscape" fitToPage="1" fitToWidth="1" fitToHeight="0" r:id="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>`;
  const pageSetupPr = `<pageSetUpPr fitToPage="1"/>`;
  const sheetPr = `<sheetPr>${pageSetupPr}</sheetPr>`;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
           xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  ${sheetPr}
  <sheetViews>
    <sheetView workbookViewId="0">
      ${freezeXml}
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="16" customHeight="1"/>
  ${colsXml}
  <sheetData>${rows.join('')}</sheetData>
  ${mergesXml}
  ${pageSetup}
</worksheet>`;
}

// ── ZIP 생성 (순수 JS) ────────────────────────────────────────────
// xlsx는 ZIP 컨테이너. 여기서는 DEFLATE 없이 Stored 방식으로 구현.
// 파일이 커도 Excel이 정상 열 수 있음 (ZIP Stored 허용).

function strToBytes(s: string): Uint8Array {
  const enc = new TextEncoder();
  return enc.encode(s);
}

function u32le(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
}
function u16le(n: number): number[] {
  return [n & 0xff, (n >> 8) & 0xff];
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  const table = getCrc32Table();
  for (const byte of data) {
    crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let _crc32Table: number[] | null = null;
function getCrc32Table(): number[] {
  if (_crc32Table) return _crc32Table;
  _crc32Table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    _crc32Table.push(c >>> 0);
  }
  return _crc32Table;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
  crc: number;
  offset: number;
}

function buildZip(files: { name: string; content: string }[]): Uint8Array {
  const entries: ZipEntry[] = [];
  const parts: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const data = strToBytes(f.content);
    const crc = crc32(data);
    const nameBytes = strToBytes(f.name);

    // Local file header
    const localHeader = new Uint8Array([
      0x50, 0x4b, 0x03, 0x04, // signature
      0x14, 0x00,             // version needed: 2.0
      0x00, 0x00,             // general purpose bit flag
      0x00, 0x00,             // compression: stored
      0x00, 0x00, 0x00, 0x00, // last mod time/date (dummy)
      ...u32le(crc),
      ...u32le(data.length),
      ...u32le(data.length),
      ...u16le(nameBytes.length),
      0x00, 0x00,             // extra field length
      ...nameBytes,
    ]);

    entries.push({ name: f.name, data, crc, offset });
    parts.push(localHeader, data);
    offset += localHeader.length + data.length;
  }

  // Central directory
  const cdParts: Uint8Array[] = [];
  const cdStart = offset;

  for (const entry of entries) {
    const nameBytes = strToBytes(entry.name);
    const cd = new Uint8Array([
      0x50, 0x4b, 0x01, 0x02, // signature
      0x14, 0x00,             // version made by
      0x14, 0x00,             // version needed
      0x00, 0x00,             // flags
      0x00, 0x00,             // compression: stored
      0x00, 0x00, 0x00, 0x00, // last mod
      ...u32le(entry.crc),
      ...u32le(entry.data.length),
      ...u32le(entry.data.length),
      ...u16le(nameBytes.length),
      0x00, 0x00,             // extra field
      0x00, 0x00,             // comment
      0x00, 0x00,             // disk start
      0x00, 0x00,             // internal attrs
      0x00, 0x00, 0x00, 0x00, // external attrs
      ...u32le(entry.offset),
      ...nameBytes,
    ]);
    cdParts.push(cd);
  }

  const cdBytes = concat(cdParts);
  const cdSize = cdBytes.length;

  // End of central directory
  const eocd = new Uint8Array([
    0x50, 0x4b, 0x05, 0x06,
    0x00, 0x00,
    0x00, 0x00,
    ...u16le(entries.length),
    ...u16le(entries.length),
    ...u32le(cdSize),
    ...u32le(cdStart),
    0x00, 0x00,
  ]);

  return concat([...parts, cdBytes, eocd]);
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const a of arrays) {
    out.set(a, pos);
    pos += a.length;
  }
  return out;
}

// ── xlsx 패키지 파일들 ─────────────────────────────────────────────

function buildContentTypes(sheetNames: string[]): string {
  const sheets = sheetNames
    .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml"           ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml"             ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml"      ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  ${sheets}
</Types>`;
}

function buildRootRels(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function buildWorkbookXml(sheets: Sheet[]): string {
  const sheetsXml = sheets
    .map((s, i) => `<sheet name="${escXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <fileVersion appName="xl" lastEdited="7" lowestEdited="7" rupBuild="24703"/>
  <workbookPr defaultThemeVersion="166925"/>
  <sheets>${sheetsXml}</sheets>
</workbook>`;
}

function buildWorkbookRels(sheets: Sheet[]): string {
  const rels = sheets
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${rels}
  <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId${sheets.length + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>`;
}

const SHARED_STRINGS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"/>`;

// ── 공개 API ──────────────────────────────────────────────────────

/**
 * Sheet 배열을 받아 .xlsx Blob 반환
 */
export function buildXlsx(sheets: Sheet[]): Blob {
  const registry = new StyleRegistry();

  // 시트 XML 미리 생성 (스타일 등록 완료 후 styles.xml 생성)
  const sheetXmls = sheets.map((s) => buildSheetXml(s, registry));
  const stylesXml = registry.toXml();

  const files: { name: string; content: string }[] = [
    { name: '[Content_Types].xml',         content: buildContentTypes(sheets.map((s) => s.name)) },
    { name: '_rels/.rels',                 content: buildRootRels() },
    { name: 'xl/workbook.xml',             content: buildWorkbookXml(sheets) },
    { name: 'xl/_rels/workbook.xml.rels',  content: buildWorkbookRels(sheets) },
    { name: 'xl/styles.xml',               content: stylesXml },
    { name: 'xl/sharedStrings.xml',        content: SHARED_STRINGS_XML },
    ...sheetXmls.map((xml, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      content: xml,
    })),
  ];

  const zipBytes = buildZip(files);
  return new Blob([zipBytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/**
 * Blob을 파일명으로 다운로드
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * 편의 함수: 바로 xlsx 다운로드
 */
export function downloadXlsx(sheets: Sheet[], filename: string): void {
  const blob = buildXlsx(sheets);
  downloadBlob(blob, filename);
}