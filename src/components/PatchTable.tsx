import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PatchGroup } from "@/types/worksheet";

interface PatchTableProps {
  groups: PatchGroup[];
}

export function PatchTable({ groups }: PatchTableProps) {
  // Arvutame kogusumma
  const totalCount = groups.reduce((sum, group) => sum + group.kogus, 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Paikade kulu</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-8">
        <div className="text-4xl font-bold text-primary mb-2">
          {totalCount}
        </div>
        <div className="text-sm text-muted-foreground text-center">
          paika kulus kokku
        </div>
      </CardContent>
    </Card>
  );
}
