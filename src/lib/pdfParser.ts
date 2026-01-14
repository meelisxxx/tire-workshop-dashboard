import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import type { WorksheetData, RowData, MaterialGroup, PatchGroup } from '@/types/worksheet';

// Määrame worker faili asukoha (vajalik, et PDF lugemine töötaks brauseris)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const parsePDF = async (file: File): Promise<WorksheetData> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let allRows: RowData[] = [];

  // Loeme läbi kõik lehed (mitte ainult esimese!)
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as TextItem[];

    // 1. Grupeerime tekstid ridade kaupa Y-koordinaadi alusel
    // PDF-is ei ole "ridu", on vaid tekstid koordinaatidega. Me peame ise read kokku panema.
    const rowsMap = new Map<number, { text: string; x: number }[]>();

    items.forEach((item) => {
      // Ümardame Y koordinaadi, et väikesed nihked ei teeks uut rida
      const y = Math.round(item.transform[5]); 
      if (!rowsMap.has(y)) {
        rowsMap.set(y, []);
      }
      rowsMap.get(y)?.push({ text: item.str, x: item.transform[4] });
    });

    // Sorteerime read ülalt alla (suurem Y on üleval pool)
    const sortedY = Array.from(rowsMap.keys()).sort((a, b) => b - a);

    sortedY.forEach((y) => {
      // Sorteerime rea sees olevad tekstid vasakult paremale (X järgi)
      const rowItems = rowsMap.get(y)?.sort((a, b) => a.x - b.x);
      
      // Paneme rea tekstiks kokku
      const fullRowText = rowItems?.map(item => item.text).join(' ') || "";
      
      // Analüüsime rida
      const parsedRow = parseRowText(fullRowText);
      if (parsedRow) {
        // Lisame rea numbri (jooksev number üle kõigi lehtede)
        parsedRow.id = allRows.length + 1;
        allRows.push(parsedRow);
      }
    });
  }

  // Teeme kokkuvõtted
  const materialGroups = calculateMaterialGroups(allRows);
  const patchGroups = calculatePatchGroups(allRows);

  return {
    rows: allRows,
    materialGroups,
    patchGroups
  };
};

// See funktsioon on "aju", mis saab aru, mis on mis
function parseRowText(text: string): RowData | null {
  // Eemaldame liigsed tühikud
  const cleanText = text.replace(/\s+/g, ' ').trim();

  // Filtreerime välja päised ja tühjad read
  if (cleanText.includes("Klient") && cleanText.includes("Mõõt")) return null;
  if (cleanText.length < 10) return null;
  if (cleanText.toLowerCase().includes("page")) return null;

  // Kasutame REGEX-it (mustrituvastust), et leida andmed usaldusväärselt
  
  // 1. MÕÕT: Otsime mustrit nagu 315/80 või 315/80/225
  const mootMatch = cleanText.match(/\b\d{3}\/\d{2,3}(\/\d{2,3})?\b/);
  const moot = mootMatch ? mootMatch[0] : "";

  // Kui mõõtu pole, siis tõenäoliselt pole see andmerida (või on päis/jalus), jätame vahele
  if (!moot && !cleanText.toLowerCase().includes("utiil")) return null;

  // 2. LINT: Otsime levinud lindi koode. Lisa siia nimekirja, kui uusi tuleb.
  // Otsime sõna, mis on üks neist: nrd, wts, wmp, kdy, ipd jne (tõstutundetu)
  const lintMatch = cleanText.match(/\b(nrd|wts|wmp|kdy|mix|kzy|ipd|za|v|bus100|bus400)\b/i);
  const lint = lintMatch ? lintMatch[0].toUpperCase() : "-";

  // 3. LAIUS: Otsime 3-kohalist numbrit, mis on tavaliselt lindi järel (vahemik 100-500)
  // Välistame 315, 385 jne, kui need on juba mõõdus. 
  // Lihtsam viis: otsime numbrit lindi koodi lähedalt või rea lõpust.
  const numbers = cleanText.match(/\b(1\d{2}|2\d{2}|3\d{2}|4\d{2})\b/g);
  // Kui leiame numbreid, proovime leida sellise, mis EI OLE mõõdu sees (nt mitte 315 ega 225)
  let laius = "-";
  if (numbers) {
      // Võtame viimase sobiva numbri, mis tõenäoliselt on laius (kuna laius on tabelis tagapool)
      // Või kui lint leiti, siis otsime numbrit vahetult lindi järelt.
      const lastNum = numbers[numbers.length - 1];
      if (lastNum) laius = lastNum;
  }

  // 4. KLIENT: Kõik, mis on rea alguses enne mõõtu (lihtsustatud)
  // See pole ideaalne, aga parem kui mitte midagi.
  const klient = cleanText.split(moot)[0].trim().replace(/^\d+\s+/, '').replace(/,/g, '');

  // 5. PAIGAD: Otsime koode nagu Ct20, Ct22, C120
  const paigadMatch = cleanText.match(/\b(Ct\d+|C\d+|up\d+)\b/gi);
  const paigad = paigadMatch ? paigadMatch.join(', ') : "-";

  return {
    id: 0, // Täidetakse hiljem
    klient: klient || "Määramata",
    moot: moot,
    lint: lint,
    laius: laius,
    paigad: paigad
  };
}

// Grupeerimise loogika (Promptist: Mõõt + Lint + Laius)
function calculateMaterialGroups(rows: RowData[]): MaterialGroup[] {
  const groups = new Map<string, MaterialGroup>();

  rows.forEach(row => {
    // Jätame vahele read, kus materjali pole
    if (row.lint === "-" || row.lint === "") return;

    // Loome unikaalse võtme: "315/80/225-NRD-260"
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

// Paikade kokkuvõte
function calculatePatchGroups(rows: RowData[]): PatchGroup[] {
  const groups = new Map<string, number>();

  rows.forEach(row => {
    if (!row.paigad || row.paigad === "-") return;
    
    // Kui real on mitu paika (nt "Ct20, Ct22"), teeme need eraldi
    const paigad = row.paigad.split(',').map(p => p.trim());
    
    paigad.forEach(paik => {
      const current = groups.get(paik) || 0;
      groups.set(paik, current + 1);
    });
  });

  return Array.from(groups.entries()).map(([kood, kogus]) => ({
    kood,
    kogus
  })).sort((a, b) => b.kogus - a.kogus);
}
