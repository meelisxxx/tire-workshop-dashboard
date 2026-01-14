import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Box, Trash2 } from "lucide-react";
import type { WorksheetData } from "@/types/worksheet";

interface SummaryCardsProps {
  data: WorksheetData;
}

export function SummaryCards({ data }: SummaryCardsProps) {
  // Arvutame utiili koguse ridade põhjal
  const utiilCount = data.rows.filter(row => row.isScrap).length;
  
  // Arvutame tootmisridade arvu (read, mis POLE utiil)
  const productionRows = data.rows.length - utiilCount;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* 1. Tööread kokku */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tööread kokku</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.rows.length}</div>
          <p className="text-xs text-muted-foreground">
            Sellest tootmine: {productionRows}, Utiil: {utiilCount}
          </p>
        </CardContent>
      </Card>

      {/* 2. Utiil kokku (UUS KAART) */}
      <Card className={utiilCount > 0 ? "border-red-200 bg-red-50" : ""}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-red-700">Utiil kokku</CardTitle>
          <Trash2 className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-700">{utiilCount}</div>
          <p className="text-xs text-red-600/80">
            Rehvi läks praaki
          </p>
        </CardContent>
      </Card>

      {/* 3. Materjalid (Kombinatsioonid) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Erinevad tooted</CardTitle>
          <Box className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.materialGroups.length}</div>
          <p className="text-xs text-muted-foreground">
            Unikaalsed kombinatsioonid
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
