import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FiltersProps {
  mootFilter: string;
  setMootFilter: (value: string) => void;
  lintFilter: string;
  setLintFilter: (value: string) => void;
  laiusFilter: string;
  setLaiusFilter: (value: string) => void;
}

export function Filters({
  mootFilter,
  setMootFilter,
  lintFilter,
  setLintFilter,
  laiusFilter,
  setLaiusFilter,
}: FiltersProps) {
  const hasFilters = mootFilter || lintFilter || laiusFilter;

  const clearFilters = () => {
    setMootFilter('');
    setLintFilter('');
    setLaiusFilter('');
  };

  return (
    <Card className="bg-card">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Search className="w-4 h-4" />
            <span>Filtrid:</span>
          </div>
          
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative">
              <Input
                placeholder="Mõõt"
                value={mootFilter}
                onChange={(e) => setMootFilter(e.target.value)}
                className="w-32 h-9 text-sm"
              />
            </div>
            
            <div className="relative">
              <Input
                placeholder="Lint"
                value={lintFilter}
                onChange={(e) => setLintFilter(e.target.value)}
                className="w-28 h-9 text-sm"
              />
            </div>
            
            <div className="relative">
              <Input
                placeholder="Laius"
                value={laiusFilter}
                onChange={(e) => setLaiusFilter(e.target.value)}
                className="w-24 h-9 text-sm"
              />
            </div>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
              Tühjenda
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
