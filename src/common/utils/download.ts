function save(content: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

function csvCell(value: unknown) {
  let text = '';

  if (typeof value === 'string') text = value;
  else if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    text = String(value);
  } else if (value instanceof Date) text = value.toISOString();
  else if (value !== null && value !== undefined) text = JSON.stringify(value);

  return `"${text.replaceAll('"', '""')}"`;
}

export function downloadCsv(
  filename: string,
  headers: readonly string[],
  rows: readonly (readonly unknown[])[],
) {
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  save(`\uFEFF${content}`, 'text/csv;charset=utf-8', filename);
}

export function downloadJson(filename: string, value: unknown) {
  save(JSON.stringify(value, null, 2), 'application/json;charset=utf-8', filename);
}
