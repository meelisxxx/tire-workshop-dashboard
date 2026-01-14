export interface WorksheetRow {
  id: string;
  klient: string;
  moot: string;
  lint: string;
  laius: string;
  paigad: string;
}

export interface MaterialGroup {
  moot: string;
  lint: string;
  laius: string;
  count: number;
}

export interface PatchGroup {
  code: string;
  count: number;
}

export interface WorksheetData {
  rows: WorksheetRow[];
  materialGroups: MaterialGroup[];
  patchGroups: PatchGroup[];
}
