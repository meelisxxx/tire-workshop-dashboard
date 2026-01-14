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

    // Grupeerime read tolerantsiga (5px)
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
      // Sorteerime vasakult paremale
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

  // Filtreerime välja päised ja tühjad read
  if (cleanText.includes("Klient") && cleanText.includes("Mõõt")) return null;
  if (cleanText.length < 10) return null;
  if (cleanText.toLowerCase().includes("page")) return null;

  // 1. MÕÕT
  const mootMatch = cleanText.match(/\b\d{3}\/\d{2,3}(\/\d{2,3})?\b/);
  const moot = mootMatch ? mootMatch[0] : "";

  // Kui mõõtu pole, kontrollime, kas on ehk utiili kommentaariga rida
  if (!moot && !cleanText.toLowerCase().includes("utiil")) return null;

  // 2. LAIUS (Leiame selle enne linti, sest lint sõltub laiusest)
  const numbers = cleanText.match(/\b([1-4]\d{2})\b/g);
  let laius = "-";
  let widthIndexInString = -1; // Jätame meelde koha, kus laius asub

  if (numbers) {
      const validWidths = numbers.filter(n => {
        const val = parseInt(n);
        if (moot.includes(n)) return false; // Ei tohi olla mõõdu sees
        return val >= 101 && val <= 499; 
      });

      if (validWidths.length > 0) {
         // Eelistame viimast sobivat numbrit, mis on tõenäoliselt laiuse veerg
         laius = validWidths[validWidths.length - 1];
         // Leiame selle numbri asukoha tekstis (et leida linti selle eest)
         widthIndexInString = cleanText.lastIndexOf(laius);
      }
  }

  // 3. LINT (Dünaamiline tuvastus)
  // Loogika: Lint on sõna, mis on VAHETULT laiuse ees.
  let lint = "-";
  
  if (laius !== "-" && widthIndexInString > 0) {
      // Võtame teksti kuni laiuse numbrini
      const textBeforeWidth = cleanText.substring(0, widthIndexInString).trim();
      // Võtame viimase sõna sellest tekstist
      const words = textBeforeWidth.split(" ");
      const candidate = words[words.length - 1];

      // Kontrollime, et see kandidaat ei oleks "keelatud sõna"
      const blackList = [
          "originaal", "taastamine", "klient", "rm", 
          "michelin", "bridgestone", "goodyear", "continental", "nokian", "dunlop", 
          "yokohama", "hankook", "kumho", "barum", "sava", "fulda", "kelly", "kama", 
          "roadx", "triangle", "sailun", "linglong", "aeolus", "leao", "cordiant", "westlake",
          "hifly", "falken", "firestone", "windpower"
      ];
      
      // Lint peab olema vähemalt 2 tähte pikk ja mitte mustas nimekirjas
      if (candidate.length >= 2 && !blackList.includes(candidate.toLowerCase())) {
          lint = candidate.toUpperCase();
      }
  }
  
  // Tagavara lint (kui dünaamiline ei töötanud, nt laius puudub)
  if (lint === "-") {
     const backupMatch = cleanText.match(/\b(nrd|wts|wmp|kdy|mix|kzy|ipd|za|bus100|bus400|da2|hm2|wrd|bza65)\b/i);
     if (backupMatch) lint = backupMatch[0].toUpperCase();
  }

  // 4. KLIENT
  const klient = cleanText.split(moot)[0].trim().replace(/^\d+\s+/, '').replace(/,/g, '');

  // 5. PAIGAD
  const paigadMatch = cleanText.match(/\b(Ct\d+|C\d+|up\d+)\b/gi);
  const paigad = paigadMatch ? paigadMatch.join(', ') : "-";

  // 6. UTIIL / PRAAK (Laiendatud loogika)
  // Sinu reegel: "Kui veerus on midagi kirjutatud".
  // Kuna meil pole veerge, otsime "halbu sõnu" ja välistame "peale ahju".
  
  const badWords = [
      "katki", "lõhed", "lõhe", "vigastatud", "viga", "praak", "auk", "munas", "muhk", 
      "traat", "niidid", "separatsioon", "karestamist", "utiil", "serv", "äär", "külg", 
      "must", "kanna", "protektor", "siil", "rebend"
  ];
  
  // Teeme regexi kõigist halbadest sõnadest
  const utiilRegex = new RegExp(badWords.join("|"), "i");
  
  const onKommentaar = utiilRegex.test(cleanText);
  const onPealeAhju = /peale ahju/i.test(cleanText);

  // Kui on kommentaar JA EI OLE "peale ahju", siis on praak
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
