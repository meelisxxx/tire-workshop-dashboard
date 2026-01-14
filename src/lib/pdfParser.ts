import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { WorksheetData, RowData, MaterialGroup, PatchGroup } from '@/types/worksheet';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const parsePDF = async (file: File): Promise<WorksheetData> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let allRows: RowData[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as TextItem[];

    const rowsMap = new Map<number, { text: string; x: number }[]>();

    items.forEach((item) => {
      const y = Math.round(item.transform[5]); 
      if (!rowsMap.has(y)) {
        rowsMap.set(y, []);
      }
      rowsMap.get(y)?.push({ text: item.str, x: item.transform[4] });
    });

    const sortedY = Array.from(rowsMap.keys()).sort((a, b) => b - a);

    sortedY.forEach((y) => {
      const rowItems = rowsMap.get(y)?.sort((a, b) => a.x - b.x);
      const fullRowText = rowItems?.map(item => item.text).join(' ') || "";
      
      const parsedRow = parseRowText(fullRowText);
      if (parsedRow) {
        parsedRow.id = allRows.length + 1;
        allRows.push(parsedRow);
      }
    });
  }

  const materialGroups = calculateMaterialGroups(allRows);
  const patchGroups = calculatePatchGroups(allRows);

  return {
    rows: allRows,
    materialGroups,
    patchGroups
  };
};

function parseRowText(text: string): RowData | null {
  const cleanText = text.replace(/\s+/g, ' ').trim();

  // Filtreerime välja päised
  if (cleanText.includes("Klient") && cleanText.includes("Mõõt")) return null;
  if (cleanText.length < 10) return null;
  if (cleanText.toLowerCase().includes("page")) return null;

  // 1. MÕÕT
  const mootMatch = cleanText.match(/\b\d{3}\/\d{2,3}(\/\d{2,3})?\b/);
  const moot = mootMatch ? mootMatch[0] : "";

  if (!moot && !cleanText.toLowerCase().includes("utiil")) return null;

  // 2. LINT
  const lintMatch = cleanText.match(/\b(nrd|wts|wmp|kdy|mix|kzy|ipd|za|v|bus100|bus400)\b/i);
  const lint = lintMatch ? lintMatch[0].toUpperCase() : "-";

  // 3. LAIUS
  const numbers = cleanText.match(/\b(1\d{2}|2\d{2}|3\d{2}|4\d{2})\b/g);
  let laius = "-";
  if (numbers) {
      const lastNum = numbers[numbers.length - 1];
      if (lastNum) laius = lastNum;
  }

  // 4. KLIENT
  const klient = cleanText.split(moot)[0].trim().replace(/^\d+\s+/, '').replace(/,/g, '');

  // 5. PAIGAD
  const paigadMatch = cleanText.match(/\b(Ct\d+|C\d+|up\d+)\b/gi);
  const paigad = paigadMatch ? paigadMatch.join(', ') : "-";

  // 6. UTIIL / PRAAK (UUS LOOGIKA)
  // Otsime märksõnu, mis viitavad praagile/utiilile
  const utiilKeywords = /lõhki|vigastatud|munas|auk|praak|utiil|karestamist|traat|niidid|separatsioon/i;
  const onKommentaar = utiilKeywords.test(cleanText);
  
  // Kontrollime erandit "peale ahju"
  const onPealeAhju = /peale ahju/i.test(cleanText);

  // Rehv on "Scrap", kui on kommentaar JA EI OLE "peale ahju"
  const isScrap = onKommentaar && !onPealeAhju;

  return {
    id: 0,
    klient: klient || "Määramata",
    moot: moot,
    lint: lint,
    laius: laius,
    paigad: paigad,
    isScrap: isScrap // Lisasime selle lipukese
  } as RowData & { isScrap: boolean };
}

function calculateMaterialGroups(rows: RowData[]): MaterialGroup[] {
  const groups = new Map<string, MaterialGroup>();

  rows.forEach((row: any) => {
    // UUS KONTROLL: Kui rehv on praak (ja mitte "peale ahju"), siis materjali ei arvesta!
    if (row.isScrap) return;

    if (row.lint === "-" || row.lint === "") return;

    const key = `${row.moot}-${row.lint}-${row.laius}`;

    if (!groups.has(key)) {
      groups.set(key, {
        id: key,
        moot: row.moot,
        lint: row.lint,
        laius: row.laius,
        kogus: 0
      });
    }
    
    const group = groups.get(key)!;
    group.kogus += 1;
  });

  return Array.from(groups.values()).sort((a, b) => b.kogus - a.kogus);
}

function calculatePatchGroups(rows: RowData[]): PatchGroup[] {
  const groups = new Map<string, number>();

  rows.forEach((row: any) => {
    // Paikade puhul sama loogika - kui läks utiili enne ahju, siis paika ei kulunud (või võeti ära)
    if (row.isScrap) return;

    if (!row.paigad || row.paigad === "-") return;
    
    const paigad = row.paigad.split(',').map((p: string) => p.trim());
    
    paigad.forEach((paik: string) => {
      const current = groups.get(paik) || 0;
      groups.set(paik, current + 1);
    });
  });

  return Array.from(groups.entries()).map(([kood, kogus]) => ({
    kood,
    kogus
  })).sort((a, b) => b.kogus - a.kogus);
}
