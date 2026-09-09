/** XLSX viewer using SheetJS and safe React table rendering. */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { read, utils, type WorkBook } from 'xlsx';
import { Button } from '@/components/ui/button';
import { fetchPreviewBytes, type PreviewSource } from './preview-source';

interface Props {
  source: PreviewSource;
}

const MAX_ROWS = 500;
const MAX_COLS = 50;

export function XlsxViewer({ source }: Props) {
  const { t } = useTranslation();
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  const { data: workbook, error, isLoading } = useQuery({
    queryKey: ['preview-xlsx', source],
    queryFn: async () => {
      const { buffer } = await fetchPreviewBytes(source);
      return read(buffer, { type: 'array' });
    },
  });

  // Auto-select first sheet when workbook changes
  const [prevWorkbook, setPrevWorkbook] = useState<WorkBook | null>(null);
  if (workbook && workbook !== prevWorkbook) {
    setPrevWorkbook(workbook);
    setActiveSheet(workbook.SheetNames[0] ?? null);
  }

  const sheetName = activeSheet ?? workbook?.SheetNames[0] ?? null;
  const rows = useMemo(() => {
    if (!workbook || !sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    const data = utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      blankrows: false,
      defval: '',
    });
    return data.slice(0, MAX_ROWS).map((row) => row.slice(0, MAX_COLS));
  }, [workbook, sheetName]);

  if (error) return <XlsxMessage message={t('Failed to load spreadsheet')} />;
  if (isLoading || !workbook || !sheetName) {
    return <XlsxMessage icon={<Loader2 className="h-4 w-4 animate-spin" />} message={t('Loading...')} />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-2 py-1">
        {workbook.SheetNames.map((name) => (
          <Button key={name} size="sm" variant={name === sheetName ? 'default' : 'ghost'} className="h-7" onClick={() => setActiveSheet(name)}>
            {name}
          </Button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t('Empty sheet')}</div>
        ) : (
          <table className="border-collapse text-xs">
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, columnIndex) => (
                    <td key={columnIndex} className="max-w-80 truncate border border-border px-2 py-1" title={String(cell)}>
                      {String(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-2 text-xs text-muted-foreground">
          {t('Preview limited to {{rows}} rows and {{cols}} columns', { rows: MAX_ROWS, cols: MAX_COLS })}
        </div>
      </div>
    </div>
  );
}

function XlsxMessage({ icon, message }: { icon?: React.ReactNode; message: string }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
      {icon ?? <FileSpreadsheet className="h-5 w-5 opacity-50" />}
      {message}
    </div>
  );
}
