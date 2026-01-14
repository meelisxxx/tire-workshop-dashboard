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
  // Otsime kindlaid teadaolevaid koode (3+ tähte + erandid)
  const lintMatch = cleanText.match(/\b(nrd|wts|wmp|kdy|mix|kzy|ipd|za|bus100|bus400|r100|r400|bdr|bdl)\b/i);
  const lint = lintMatch ? lintMatch[0].toUpperCase() : "-";

  // 3. LAIUS (UUS VAHEMIK 101-499)
  // Otsime kolmekohalisi numbreid, mis algavad 1, 2, 3 või 4-ga.
  const numbers = cleanText.match(/\b([1-4]\d{2})\b/g);
  let laius = "-";
  
  if (numbers) {
      // Filtreerime välja numbrid, mis on täpselt vahemikus 101 kuni 499
      const validWidths = numbers.filter(n => {
        const val = parseInt(n);
        
        // Välistame levinud rehvimõõdud (315, 385, 295), KUI need on juba "Mõõt" veerus kirjas.
        // Aga kuna 295 võib olla ka laius (nt WTS 295), siis peame olema ettevaatlikud.
        // Lihtne kontroll: kui number on Mõõt stringi sees täpselt sellisena, siis pigem välistame,
        // AGA ainult siis, kui meil on alternatiive.
        
        // Põhikontroll: Vahemik 101 - 499
        return val >= 101 && val <= 499; 
      });

      if (validWidths.length > 0) {
        // MUUDATUS: Võtame ESIMESE sobiva numbri, mitte viimase.
        // Põhjus: Tabeli järjekord on Lint -> Laius -> Prot -> ID.
        // Laius (nt 295) tuleb tekstis enne kui ID (nt 411).
        
        // Siiski peame olema kindlad, et me ei võta rehvi mõõtu (nt 315) uuesti laiuseks.
        // Otsime numbrit, mis ei sisaldu otseselt "Mõõt" stringis või asub tekstis lindi järel.
        
        // Lihtsaim toimiv lahendus: Eeldame, et laius on esimene sobiv number pärast linti (kui lint on olemas).
        if (lint !== "-" && cleanText.toUpperCase().includes(lint)) {
            // Leiame teksti osa pärast linti
            const afterLint = cleanText.toUpperCase().split(lint)[1];
            const widthMatch = afterLint.match(/\b([1-4]\d{2})\b/);
            if (widthMatch) {
                const wVal = parseInt(widthMatch[0]);
                if (wVal >= 101 && wVal <= 499) {
                    laius = widthMatch[0];
                }
            }
        } 
        
        // Kui lindi kaudu ei leidnud, kasutame vana meetodit (võtame esimese sobiva, mis pole 315/385 jne algus)
        if (laius === "-") {
             // Eelistame numbrit, mis ei ole 315 või 385 (kuna need on tüüpilised laiused rehvil endal)
             const bestGuess = validWidths.find(n => n !== "315" && n !== "385");
             laius = bestGuess || validWidths[0];
        }
      }
  }

  // 4. KLIENT
  const klient = cleanText.split(moot)[0].trim().replace(/^\d+\s+/, '').replace(/,/g, '');

  // 5. PAIGAD
  const paigadMatch = cleanText.match(/\b(Ct\d+|C\d+|up\d+)\b/gi);
  const paigad = paigadMatch ? paigadMatch.join(', ') : "-";

  // 6. UTIIL / PRAAK
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
