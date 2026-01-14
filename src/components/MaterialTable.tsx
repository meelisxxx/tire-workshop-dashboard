import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MaterialGroup } from '@/types/worksheet';

interface MaterialTableProps {
  groups: MaterialGroup[];
  mootFilter: string;
  lintFilter: string;
  laiusFilter: string;
}

export function MaterialTable({ groups, mootFilter, lintFilter, laiusFilter }: MaterialTableProps) {
  const filteredGroups = groups.filter(group => {
    if (mootFilter && !group.moot.toLowerCase().includes(mootFilter.toLowerCase())) return false;
    if (lintFilter && !group.lint.toLowerCase().includes(lintFilter.toLowerCase())) return false;
    if (laiusFilter && !group.laius.toLowerCase().includes(laiusFilter.toLowerCase())) return false;
    return true;
  });

  const totalCount = filteredGroups.reduce((sum, g) => sum + g.count, 0);

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          <span>Materjali kulu</span>
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
                <TableHead className="font-semibold">Mõõt</TableHead>
                <TableHead className="font-semibold">Lint</TableHead>
                <TableHead className="font-semibold">Laius</TableHead>
                <TableHead className="font-semibold text-right">Kogus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Andmed puuduvad
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.map((group, index) => (
                  <TableRow key={`${group.moot}-${group.lint}-${group.laius}-${index}`}>
                    <TableCell className="font-mono">{group.moot}</TableCell>
                    <TableCell>{group.lint}</TableCell>
                    <TableCell>{group.laius}</TableCell>
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
