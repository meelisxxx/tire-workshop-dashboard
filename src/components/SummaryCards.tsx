import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Trash2, Wrench } from "lucide-react";
import type { WorksheetData } from "@/types/worksheet";

interface SummaryCardsProps {
  data: WorksheetData;
}

export function SummaryCards({ data }: SummaryCardsProps) {
  // Arvutused
  const utiilCount = data.rows.filter(row => row.isScrap).length;
  const productionRows = data.rows.length - utiilCount;
  
  // Arvutame paigad kokku (ainult tootmisrehvidel)
  let totalPatches = 0;
  data.rows.forEach(row => {
    if (!row.isScrap && row.paigad && row.paigad !== "-" && row.paigad !== "") {
      // Kui on komaga eraldatud mitu paika (nt "Ct20, Ct22"), loeme need kokku
      const patches = row.paigad.split(',');
      totalPatches += patches.length;
    }
  });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* 1. Tööread kokku (Tootmine + Utiil) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tootmine kokku</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{productionRows} tk</div>
          <p className="text-xs text-muted-foreground">
             Lisaks {utiilCount} rehvi läks utiili
          </p>
        </CardContent>
      </Card>

      {/* 2. Utiil */}
      <Card className={utiilCount > 0 ? "border-red-200 bg-red-50" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-red-700">Utiil</CardTitle>
          <Trash2 className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700">{utiilCount} tk</div>
          <p className="text-xs text-red-600/80">
            Kogu reast ({data.rows.length})
          </p>
        </CardContent>
      </Card>

      {/* 3. Paigad kokku (UUS) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paigad kokku</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPatches} tk</div>
          <p className="text-xs text-muted-foreground">
            Kulus tootmises
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
