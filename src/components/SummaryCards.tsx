import { Package, Wrench, FileText, Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { WorksheetData } from '@/types/worksheet';

interface SummaryCardsProps {
  data: WorksheetData;
}

export function SummaryCards({ data }: SummaryCardsProps) {
  const totalRows = data.rows.length;
  const uniqueMaterials = data.materialGroups.length;
  const totalPatches = data.patchGroups.reduce((sum, g) => sum + g.count, 0);
  const uniquePatches = data.patchGroups.length;

  const cards = [
    {
      title: 'Tööread kokku',
      value: totalRows,
      icon: FileText,
      description: 'Analüüsitud ridade arv'
    },
    {
      title: 'Materjalid',
      value: uniqueMaterials,
      icon: Package,
      description: 'Unikaalsed kombinatsioonid'
    },
    {
      title: 'Paigad kokku',
      value: totalPatches,
      icon: Wrench,
      description: `${uniquePatches} erinevat tüüpi`
    },
    {
      title: 'Keskmine/lint',
      value: uniqueMaterials > 0 ? Math.round(totalRows / uniqueMaterials) : 0,
      icon: Layers,
      description: 'Tükki materjali kohta'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="bg-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {card.title}
                </p>
                <p className="text-3xl font-semibold text-foreground mt-2">
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </div>
              <div className="p-2 bg-primary/10 text-primary">
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
