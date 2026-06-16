import type { Plaza, PlazaEntry } from "../../types/plaza";

export type ArchiveRecord = {
  id: string;
  plaza: Plaza;
  entry: PlazaEntry;
};

export type MyPageView = "createdPlazas" | "writtenObjects";
