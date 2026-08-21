import Papa from "papaparse";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParsedLeads {
  emails: string[];
  invalidCount: number;
}

/**
 * Accepts a CSV or plain-text file of leads. Looks for a column literally
 * named "email" (case-insensitive) if the file is structured CSV; falls
 * back to scanning every cell/line for anything that looks like an email
 * address, so a bare newline-separated list of addresses works too.
 */
export function parseLeadsFile(fileText: string): Promise<ParsedLeads> {
  return new Promise((resolve) => {
    Papa.parse<Record<string, string> | string[]>(fileText.trim(), {
      header: fileText.includes(","),
      skipEmptyLines: true,
      complete: (result) => {
        const found: string[] = [];
        let invalidCount = 0;

        for (const row of result.data) {
          const cells = Array.isArray(row) ? row : Object.values(row ?? {});
          for (const cell of cells) {
            const value = String(cell ?? "").trim();
            if (!value) continue;
            if (EMAIL_RE.test(value)) {
              found.push(value.toLowerCase());
            } else if (value.includes("@")) {
              invalidCount += 1;
            }
          }
        }

        resolve({ emails: Array.from(new Set(found)), invalidCount });
      },
    });
  });
}
