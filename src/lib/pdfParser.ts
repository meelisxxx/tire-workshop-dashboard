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

    // UUS LOOGIKA: Grupeerime read "tolerantsiga"
    // See aitab püüda kinni teksti, mis on natuke nihkes (nagu kommentaarid)
    const rows: { y: number; items: { text: string; x: number }[] }[] = [];
    const Y_TOLERANCE = 5; // Lubame 5 ühikut kõikumist üles-alla

    items.forEach((item) => {
      const y = item.transform[5];
      // Otsime olemasolevat rida, mis on samal kõrgusel (või väga lähedal)
      let row = rows.find(r => Math.abs(r.y - y) < Y_TOLERANCE);
      
      if (!row) {
        // Kui ei leia, teeme uue rea
        row = { y, items: [] };
        rows.push(row);
      }
      row.items.push({ text: item.str, x: item.transform[4] });
    });

    // Sorteerime read ülalt alla
    const sortedRows = rows.sort((a, b) => b.y - a.y);

    sortedRows.forEach((row) => {
      // Sorteerime rea siseselt vasakult paremale
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

  // Filtreerime välja päised
  if (cleanText.includes("Klient") && cleanText.includes("Mõõt")) return null;
  if (cleanText.length < 10) return null;
  if (cleanText.toLowerCase().includes("page")) return null;

  // 1. MÕÕT
  const mootMatch = cleanText.match(/\b\d{3}\/\d{2,3}(\/\d{2,3})?\b/);
  const moot = mootMatch ? mootMatch[0] : "";

  if (!moot && !cleanText.toLowerCase().includes("utiil")) return null;

  // 2. LINT
  const lintMatch = cleanText.match(/\b(nrd|wts|wmp|kdy|mix|kzy|ipd|za|bus100|bus400|r100|r400|bdr|bdl)\b/i);
  const lint = lintMatch ? lintMatch[0].toUpperCase() : "-";

  // 3. LAIUS
  const numbers = cleanText.match(/\b([1-4]\d{2})\b/g);
  let laius = "-";
  
  if (numbers) {
      const validWidths = numbers.filter(n => {
        const val = parseInt(n);
        
        // KRIIILINE PARANDUS: Välistame numbri, kui see sisaldub Mõõt stringis!
        // See takistab 225 valimist stringist 385/65/225
        if (moot.includes(n)) return false;

        return val >= 101 && val <= 499; 
      });

      if (validWidths.length > 0) {
        // Eelistame laiust, mis on lindi järel
        if (lint !== "-" && cleanText.toUpperCase().includes(lint)) {
            const afterLint = cleanText.toUpperCase().split(lint)[1];
            const widthMatch = afterLint.match(/\b([1-4]\d{2})\b/);
            if (widthMatch) {
                const wVal = parseInt(widthMatch[0]);
                 // Topeltkontroll, et see poleks mõõdu osa
                if (wVal >= 101 && wVal <= 499 && !moot.includes(widthMatch[0])) {
                    laius = widthMatch[0];
                }
            }
        } 
        
        // Kui ikka pole, võtame esimese sobiva
        if (laius === "-") {
             const bestGuess = validWidths[0]; 
             if (bestGuess) laius = bestGuess;
        }
      }
  }

  // 4. KLIENT
  const klient = cleanText.split(moot)[0].trim().replace(/^\d+\s+/, '').replace(/,/g, '');

  // 5. PAIGAD
  const paigadMatch = cleanText.match(/\b(Ct\d+|C\d+|up\d+)\b/gi);
  const paigad = paigadMatch ? paigadMatch.join(', ') : "-";

  // 6. UTIIL / PRAAK
  // Lisasin siia veel märksõnu igaks juhuks
  const utiilKeywords = /lõhki|vigastatud|munas|auk|praak|utiil|karestamist|traat|niidid|separatsioon/i;
  const onKommentaar = utiilKeywords.test(cleanText);
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

    // Lisakontroll: kui laius on ikka "-", siis ära pane gruppi (või pane eraldi)
    // Hetkel jätame sisse, aga "-" laiusega.
    
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
