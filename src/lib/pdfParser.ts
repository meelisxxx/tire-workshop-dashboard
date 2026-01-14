import * as pdfjsLib from 'pdfjs-dist';
import type { WorksheetRow, WorksheetData, MaterialGroup, PatchGroup } from '@/types/worksheet';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;

export async function parsePDF(file: File): Promise<WorksheetData> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  const rows: WorksheetRow[] = [];
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // Extract text items and their positions
    const items = textContent.items.map((item: any) => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      width: item.width,
      height: item.height
    }));
    
    // Group by Y position (rows)
    const rowMap = new Map<number, typeof items>();
    items.forEach(item => {
      // Round Y to group items in same row
      const roundedY = Math.round(item.y / 10) * 10;
      if (!rowMap.has(roundedY)) {
        rowMap.set(roundedY, []);
      }
      rowMap.get(roundedY)!.push(item);
    });
    
    // Sort rows by Y (descending, as PDF coordinates are bottom-up)
    const sortedRows = Array.from(rowMap.entries())
      .sort((a, b) => b[0] - a[0]);
    
    // Process each row
    sortedRows.forEach(([_, rowItems], index) => {
      // Sort items in row by X position
      rowItems.sort((a, b) => a.x - b.x);
      const rowText = rowItems.map(item => item.text).join(' ');
      
      // Try to extract data from row
      const parsedRow = parseRow(rowText, index);
      if (parsedRow) {
        rows.push(parsedRow);
      }
    });
  }
  
  // Calculate material groups
  const materialMap = new Map<string, number>();
  rows.forEach(row => {
    if (row.moot && row.lint && row.laius) {
      const key = `${row.moot}|${row.lint}|${row.laius}`;
      materialMap.set(key, (materialMap.get(key) || 0) + 1);
    }
  });
  
  const materialGroups: MaterialGroup[] = Array.from(materialMap.entries()).map(([key, count]) => {
    const [moot, lint, laius] = key.split('|');
    return { moot, lint, laius, count };
  });
  
  // Calculate patch groups
  const patchMap = new Map<string, number>();
  rows.forEach(row => {
    if (row.paigad && row.paigad.trim()) {
      const patches = row.paigad.split(/[,;\/]/).map(p => p.trim()).filter(p => p);
      patches.forEach(patch => {
        patchMap.set(patch, (patchMap.get(patch) || 0) + 1);
      });
    }
  });
  
  const patchGroups: PatchGroup[] = Array.from(patchMap.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
  
  return { rows, materialGroups, patchGroups };
}

function parseRow(text: string, index: number): WorksheetRow | null {
  // Skip header rows and empty rows
  if (!text.trim() || text.toLowerCase().includes('klient') || text.toLowerCase().includes('mõõt')) {
    return null;
  }
  
  // Pattern for tire size (e.g., 315/80/225, 315/70R22.5)
  const sizePattern = /(\d{2,3}[\/]\d{2,3}[\/R]?\d{2,3}(?:\.\d+)?)/i;
  
  // Pattern for width (3 digit number)
  const widthPattern = /\b(\d{3})\b/g;
  
  // Pattern for patches (Ct followed by number, or similar codes)
  const patchPattern = /\b(Ct\d+|CT\d+|ct\d+|[A-Z]{2}\d{2,3})\b/gi;
  
  // Pattern for lint/pattern names (common tire pattern names)
  const lintPatterns = ['NRD', 'WMP', 'HTR', 'HSR', 'XDA', 'XDN', 'XZE', 'XTE', 'KMax', 'FuelMax', 'Marathon'];
  
  const sizeMatch = text.match(sizePattern);
  const patchMatches = text.match(patchPattern);
  const widthMatches = text.match(widthPattern);
  
  // Find lint pattern
  let lint = '';
  for (const pattern of lintPatterns) {
    if (text.toUpperCase().includes(pattern.toUpperCase())) {
      lint = pattern;
      break;
    }
  }
  // If no known pattern found, try to find any 2-3 letter code
  if (!lint) {
    const lintMatch = text.match(/\b([A-Z]{2,4})\b/);
    if (lintMatch) {
      lint = lintMatch[1];
    }
  }
  
  // Extract width - find the number that comes after lint or is likely width
  let laius = '';
  if (widthMatches) {
    // Filter out sizes that are part of tire size
    const sizeStr = sizeMatch ? sizeMatch[0] : '';
    const validWidths = widthMatches.filter(w => !sizeStr.includes(w));
    if (validWidths.length > 0) {
      laius = validWidths[0];
    }
  }
  
  // If we found at least size or lint, consider it a valid row
  if (sizeMatch || lint) {
    // Extract client name (usually at the beginning)
    const textBeforeSize = sizeMatch ? text.split(sizeMatch[0])[0] : text.slice(0, 30);
    const klient = textBeforeSize.replace(/^\d+[\s\-\.]*/, '').trim().split(/\s{2,}/)[0] || '';
    
    return {
      id: `row-${Date.now()}-${index}`,
      klient: klient.slice(0, 50),
      moot: sizeMatch ? sizeMatch[1] : '',
      lint,
      laius,
      paigad: patchMatches ? patchMatches.join(', ') : ''
    };
  }
  
  return null;
}
