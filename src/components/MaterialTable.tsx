import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MaterialGroup } from "@/types/worksheet";

interface MaterialTableProps {
  groups: MaterialGroup[];
  mootFilter: string;
  lintFilter: string;
  laiusFilter: string;
}

export function MaterialTable({ groups, mootFilter, lintFilter, laiusFilter }: MaterialTableProps) {
  // Filtreerimine
  const filteredGroups = groups.filter((group) => {
    const matchesMoot = group.moot.toLowerCase().includes(mootFilter.toLowerCase());
    const matchesLint = group.lint.toLowerCase().includes(lintFilter.toLowerCase());
    const matchesLaius = group.laius.toLowerCase().includes(laiusFilter.toLowerCase());
    return matchesMoot && matchesLint && matchesLaius;
  });

  // Arvutame kogusumma
  const totalPieces = filteredGroups.reduce((sum, group) => sum + (group.kogus || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Materjali kulu</CardTitle>
        <div className="text-sm text-muted-foreground font-medium">
          Kokku: {totalPieces} tk
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mõõt</TableHead>
                <TableHead>Lint</TableHead>
                <TableHead>Laius</TableHead>
                <TableHead className="text-right">Kogus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Andmed puuduvad
                  </TableCell>
                </TableRow>
              ) : (
                filteredGroups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.moot}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {group.lint}
                      </span>
                    </TableCell>
                    <TableCell>{group.laius}</TableCell>
                    <TableCell className="text-right font-bold">
                      {group.kogus} tk
                    </TableCell>
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
