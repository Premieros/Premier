export async function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Sheet1'): Promise<void> {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
  const widths: number[] = [];
  for (let c = range.s.c; c <= range.e.c; c += 1) {
    let max = 12;
    for (let r = range.s.r; r <= Math.min(range.e.r, 250); r += 1) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      const value = cell?.v == null ? '' : String(cell.v);
      max = Math.max(max, Math.min(42, value.length + 2));
    }
    widths.push(max);
  }
  ws['!cols'] = widths.map((wch) => ({ wch }));
  ws['!autofilter'] = { ref: XLSX.utils.encode_range(range) };
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export async function importFromExcel(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import('xlsx');
  const data = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(data), { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
}

export async function downloadTemplate(columns: string[], filename: string): Promise<void> {
  const data = [columns.reduce((acc, col) => ({ ...acc, [col]: '' }), {})];
  await exportToExcel(data, filename, 'Template');
}
