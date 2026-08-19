export interface ExcelExportOptions {
  data: Record<string, unknown>[];
  filename: string;
  sheetName?: string;
  title?: string;
  subtitle?: string;
  currencyColumns?: string[];
  totalRow?: Record<string, unknown>;
  lang?: 'ar' | 'en';
}

function autoWidth(columns: string[], rows: Record<string, unknown>[]): number[] {
  return columns.map((col) => {
    let max = col.length;
    for (const row of rows) {
      const v = row[col];
      const len = v == null ? 0 : String(v).length;
      if (len > max) max = len;
    }
    return Math.min(max + 2, 40);
  });
}

export async function exportToExcelAdvanced(options: ExcelExportOptions): Promise<void> {
  const XLSX = await import('xlsx');
  const {
    data,
    filename,
    sheetName = 'Sheet1',
    title,
    subtitle,
    currencyColumns = [],
    totalRow,
    lang,
  } = options;

  const wb = XLSX.utils.book_new();

  if (title) {
    const summaryRows: [string, string][] = [[title, '']];
    if (subtitle) summaryRows.push([subtitle, '']);
    if (totalRow) {
      const entries = Object.entries(totalRow);
      for (const [k, v] of entries) summaryRows.push([k, v == null ? '' : String(v)]);
    }
    summaryRows.push([`${lang === 'ar' ? 'تاريخ الإنشاء' : 'Generated at'}: ${new Date().toLocaleString()}`, '']);
    const ws = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, ws, lang === 'ar' ? 'ملخص' : 'Summary');
  }

  const columns = data.length > 0 ? Object.keys(data[0]) : [];
  const allRows = totalRow ? [...data, totalRow] : data;

  const ws = XLSX.utils.json_to_sheet(allRows, { header: columns });

  const widths = autoWidth(columns, allRows);
  ws['!cols'] = widths.map((w) => ({ wch: w }));

  (wb as unknown as Record<string, unknown>)['Workbook'] = { Views: [{ state: 'frozen', ysplit: 1, xsplit: 0 }] };

  const range = XLSX.utils.decode_range(ws['!ref']!);

  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[addr];
    if (!cell) continue;
    cell.s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'F1F5F9' } },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };
  }

  if (currencyColumns.length > 0 && allRows.length > 0) {
    const colIdxMap = new Map(columns.map((col, i) => [col, i]));
    for (const col of currencyColumns) {
      const ci = colIdxMap.get(col);
      if (ci == null) continue;
      for (let r = range.s.r + 1; r <= range.e.r; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: ci });
        const cell = ws[addr];
        if (cell && typeof cell.v === 'number') {
          cell.t = 'n';
          cell.z = '#,##0.00';
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
