export interface RowData {
  id: number;
  klient: string;
  moot: string;
  lint: string;
  laius: string;
  paigad: string;
  isScrap: boolean; // See on uus vajalik rida!
}

export interface MaterialGroup {
  id: string;
  moot: string;
  lint: string;
  laius: string;
  kogus: number;
}

export interface PatchGroup {
  kood: string;
  kogus: number;
}

export interface WorksheetData {
  rows: RowData[];
  materialGroups: MaterialGroup[];
  patchGroups: PatchGroup[];
}
