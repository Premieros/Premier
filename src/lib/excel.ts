export async function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Sheet1'): Promise<void> {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
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
