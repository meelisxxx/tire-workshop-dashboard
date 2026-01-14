import { useState, useCallback } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { SummaryCards } from '@/components/SummaryCards';
import { MaterialTable } from '@/components/MaterialTable';
import { PatchTable } from '@/components/PatchTable';
import { DetailTable } from '@/components/DetailTable';
import { Filters } from '@/components/Filters';
import { parsePDF } from '@/lib/pdfParser';
import type { WorksheetData } from '@/types/worksheet';
import { useToast } from '@/hooks/use-toast';
import { CircleDot } from 'lucide-react';

const Index = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<WorksheetData | null>(null);
  const [mootFilter, setMootFilter] = useState('');
  const [lintFilter, setLintFilter] = useState('');
  const [laiusFilter, setLaiusFilter] = useState('');
  const { toast } = useToast();

  const handleFileSelect = useCallback(async (file: File) => {
    setIsLoading(true);
    try {
      const result = await parsePDF(file);
      setData(result);
      
      if (result.rows.length === 0) {
        toast({
          title: 'Hoiatus',
          description: 'PDF-ist ei leitud tabeliandmeid. Kontrollige faili formaati.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Fail laetud',
          description: `Leiti ${result.rows.length} rida ja ${result.materialGroups.length} unikaalset materjali.`,
        });
      }
    } catch (error) {
      console.error('PDF parsing error:', error);
      toast({
        title: 'Viga',
        description: 'PDF faili lugemisel tekkis viga. Proovige uuesti.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container py-4 flex items-center gap-3">
          <div className="p-2 bg-primary text-primary-foreground">
            <CircleDot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Ahjuleht</h1>
            <p className="text-xs text-muted-foreground">Rehvitöökoja materjalikulu jälgimine</p>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Upload Section */}
        <section>
          <FileUpload onFileSelect={handleFileSelect} isLoading={isLoading} />
        </section>

        {data && (
          <>
            {/* Summary Cards */}
            <section>
              <SummaryCards data={data} />
            </section>

            {/* Filters */}
            <section>
              <Filters
                mootFilter={mootFilter}
                setMootFilter={setMootFilter}
                lintFilter={lintFilter}
                setLintFilter={setLintFilter}
                laiusFilter={laiusFilter}
                setLaiusFilter={setLaiusFilter}
              />
            </section>

            {/* Material and Patch Tables */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MaterialTable
                  groups={data.materialGroups}
                  mootFilter={mootFilter}
                  lintFilter={lintFilter}
                  laiusFilter={laiusFilter}
                />
              </div>
              <div>
                <PatchTable groups={data.patchGroups} />
              </div>
            </section>

            {/* Detail Table */}
            <section>
              <DetailTable
                rows={data.rows}
                mootFilter={mootFilter}
                lintFilter={lintFilter}
                laiusFilter={laiusFilter}
              />
            </section>
          </>
        )}

        {/* Empty State */}
        {!data && !isLoading && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">
              Laadi üles PDF-vormingus ahjuleht, et näha kokkuvõtet
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
