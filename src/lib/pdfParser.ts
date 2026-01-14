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

    const rows: { y: number; items: { text: string; x: number }[] }[] = [];
    const Y_TOLERANCE = 5;

    items.forEach((item) => {
      const y = item.transform[5];
      let row = rows.find(r => Math.abs(r.y - y) < Y_TOLERANCE);
      if (!row) {
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ text: item.str, x: item.transform[4] });
    });

    const sortedRows = rows.sort((a, b) => b.y - a.y);

    sortedRows.forEach((row) => {
      const rowItems = row.items.sort((a, b) => a.x - b.x);
      const fullRowText = rowItems.map(item => item.text).join(' ');
      
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

  if (cleanText.includes("Klient") && cleanText.includes("Mõõt")) return null;
  if (cleanText.length < 10) return null;
  if (cleanText.toLowerCase().includes("page")) return null;

  // 1. MÕÕT
  const mootMatch = cleanText.match(/\b\d{3}\/\d{2,3}(\/\d{2,3})?\b/);
  const moot = mootMatch ? mootMatch[0] : "";

  if (!moot && !cleanText.toLowerCase().includes("utiil")) return null;

  // 2. LAIUS
  const numbers = cleanText.match(/\b([1-4]\d{2})\b/g);
  let laius = "-";
  let widthIndexInString = -1; 

  if (numbers) {
      const validWidths = numbers.filter(n => {
        const val = parseInt(n);
        if (moot.includes(n)) return false; 
        return val >= 101 && val <= 499; 
      });

      if (validWidths.length > 0) {
         laius = validWidths[validWidths.length - 1];
         widthIndexInString = cleanText.lastIndexOf(laius);
      }
  }

  // 3. LINT
  let lint = "-";
  
  if (laius !== "-" && widthIndexInString > 0) {
      const textBeforeWidth = cleanText.substring(0, widthIndexInString).trim();
      const words = textBeforeWidth.split(" ");
      const candidate = words[words.length - 1];

      const blackList = [
          "originaal", "taastamine", "klient", "rm", 
          "michelin", "bridgestone", "goodyear", "continental", "nokian", "dunlop", 
          "yokohama", "hankook", "kumho", "barum", "sava", "fulda", "kelly", "kama", 
          "roadx", "triangle", "sailun", "linglong", "aeolus", "leao", "cordiant", "westlake",
          "hifly", "falken", "firestone", "windpower"
      ];
      
      if (candidate.length >= 2 && !blackList.includes(candidate.toLowerCase())) {
          lint = candidate.toUpperCase();
      }
  }
  
  if (lint === "-") {
     const backupMatch = cleanText.match(/\b(nrd|wts|wmp|kdy|mix|kzy|ipd|za|bus100|bus400|da2|hm2|wrd|bza65)\b/i);
     if (backupMatch) lint = backupMatch[0].toUpperCase();
  }

  // 4. KLIENT
  const klient = cleanText.split(moot)[0].trim().replace(/^\d+\s+/, '').replace(/,/g, '');

  // 5. PAIGAD
  const paigadMatch = cleanText.match(/\b(Ct\d+|C\d+|up\d+)\b/gi);
  const paigad = paigadMatch ? paigadMatch.join(', ') : "-";

  // 6. UTIIL / PRAAK (PARANDATUD - Eemaldatud ohtlikud sõnad)
  // Eemaldasime: serv (Service), äär, külg, must, kanna
  // Jätsime alles ainult konkreetsed vead.
  const badWords = [
      "katki", "lõhed", "lõhe", "vigastatud", "viga", "praak", "auk", "munas", "muhk", 
      "traat", "niidid", "separatsioon", "karestamist", "utiil", "rebend", "siil"
  ];
  
  const utiilRegex = new RegExp(badWords.join("|"), "i");
  
  let textToCheckForScrap = cleanText;
  
  // Kontrollime ainult teksti PÄRAST mõõtu
  if (mootMatch && mootMatch.index !== undefined) {
      textToCheckForScrap = cleanText.substring(mootMatch.index + mootMatch[0].length);
  }
  
  const onKommentaar = utiilRegex.test(textToCheckForScrap);
  const onPealeAhju = /peale ahju/i.test(cleanText);

  const isScrap = onKommentaar && !onPealeAhju;

  return {
    id: 0,
    klient: klient || "Määramata",
    moot: moot,
    lint: lint,
    laius: laius,
    paigad: paigad,
    isScrap: isScrap
  } as RowData & { isScrap: boolean };
}

function calculateMaterialGroups(rows: RowData[]): MaterialGroup[] {
  const groups = new Map<string, MaterialGroup>();

  rows.forEach((row: any) => {
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
