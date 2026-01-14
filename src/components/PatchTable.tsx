import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { PatchGroup } from '@/types/worksheet';

interface PatchTableProps {
  groups: PatchGroup[];
}

export function PatchTable({ groups }: PatchTableProps) {
  const totalCount = groups.reduce((sum, g) => sum + g.count, 0);

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span>Paikade kulu</span>
          <span className="text-sm font-normal text-muted-foreground">
            Kokku: {totalCount} tk
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Paiga kood</TableHead>
                <TableHead className="font-semibold text-right">Kogus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                    Paikade andmed puuduvad
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group.code}>
                    <TableCell className="font-mono">{group.code}</TableCell>
                    <TableCell className="text-right font-semibold">{group.count} tk</TableCell>
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
