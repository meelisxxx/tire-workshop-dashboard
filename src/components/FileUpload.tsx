import { useCallback, useState } from 'react';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export function FileUpload({ onFileSelect, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type === 'application/pdf') {
      setFileName(files[0].name);
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setFileName(files[0].name);
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  return (
    <Card className={`transition-all duration-200 ${isDragging ? 'border-primary border-2 bg-primary/5' : ''}`}>
      <CardContent className="p-6">
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className="relative"
        >
          <label className="flex flex-col items-center justify-center gap-4 cursor-pointer py-8">
            <input
              type="file"
              accept=".pdf"
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isLoading}
            />
            
            {isLoading ? (
              <>
                <Loader2 className="w-12 h-12 text-muted animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Töötlen faili...</p>
                  <p className="text-xs text-muted-foreground mt-1">See võib võtta mõne sekundi</p>
                </div>
              </>
            ) : fileName ? (
              <>
                <FileText className="w-12 h-12 text-primary" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">{fileName}</p>
                  <p className="text-xs text-muted-foreground mt-1">Kliki või lohista uus fail siia</p>
                </div>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 text-muted" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">Lohista PDF siia</p>
                  <p className="text-xs text-muted-foreground mt-1">või kliki faili valimiseks</p>
                </div>
              </>
            )}
          </label>
        </div>
      </CardContent>
    </Card>
  );
}
