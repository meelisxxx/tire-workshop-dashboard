import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { WorksheetRow } from '@/types/worksheet';

interface DetailTableProps {
  rows: WorksheetRow[];
  mootFilter: string;
  lintFilter: string;
  laiusFilter: string;
}

export function DetailTable({ rows, mootFilter, lintFilter, laiusFilter }: DetailTableProps) {
  const filteredRows = rows.filter(row => {
    if (mootFilter && !row.moot.toLowerCase().includes(mootFilter.toLowerCase())) return false;
    if (lintFilter && !row.lint.toLowerCase().includes(lintFilter.toLowerCase())) return false;
    if (laiusFilter && !row.laius.toLowerCase().includes(laiusFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span>Detailne nimekiri</span>
          <span className="text-sm font-normal text-muted-foreground">
            {filteredRows.length} rida
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold sticky top-0 bg-card">#</TableHead>
                <TableHead className="font-semibold sticky top-0 bg-card">Klient</TableHead>
                <TableHead className="font-semibold sticky top-0 bg-card">Mõõt</TableHead>
                <TableHead className="font-semibold sticky top-0 bg-card">Lint</TableHead>
                <TableHead className="font-semibold sticky top-0 bg-card">Laius</TableHead>
                <TableHead className="font-semibold sticky top-0 bg-card">Paigad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Andmed puuduvad
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="max-w-32 truncate">{row.klient || '-'}</TableCell>
                    <TableCell className="font-mono">{row.moot || '-'}</TableCell>
                    <TableCell>{row.lint || '-'}</TableCell>
                    <TableCell>{row.laius || '-'}</TableCell>
                    <TableCell className="font-mono text-sm">{row.paigad || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
