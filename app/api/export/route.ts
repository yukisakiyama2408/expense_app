import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import path from "path";
import fs from "fs";

interface ConfirmedEntry {
  id: string;
  fileName: string;
  paymentDate: string | null;
  paymentDestination: string | null;
  amount: string | null;
  accountItem?: string;
  purpose?: string;
}

const ACCOUNT_ITEM_COL: Record<string, number> = {
  "飛行機": 10,
  "宿泊": 11,
  "食事代": 12,
  "電車・バス": 13,
  "タクシー": 14,
  "駐車場・高速料金": 15,
  "会議費": 16,
  "交際費": 17,
  "消耗品費": 18,
  "新聞図書費": 19,
  "通信費": 20,
  "その他": 21,
};

const COL_LETTERS = ["","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"];

function colLetter(n: number): string { return COL_LETTERS[n] ?? ""; }
function cellRef(col: number, row: number): string { return `${colLetter(col)}${row}`; }

function parseAmount(amount: string | null): number {
  if (!amount) return 0;
  return parseInt(amount.replace(/[¥¥,\s]/g, ""), 10) || 0;
}

function toFullwidth(n: number): string {
  return String(n).replace(/[0-9]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xFEE0));
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  const [, m, d] = iso.split("-");
  return `${parseInt(m)}/${parseInt(d)}`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Find the cell element for `ref` in the XML string.
 * Returns { start, end } where xml.substring(start, end) is the full element,
 * or null if not found.
 */
function findCell(xml: string, ref: string): { start: number; end: number } | null {
  const startTag = `<c r="${ref}"`;
  const start = xml.indexOf(startTag);
  if (start === -1) return null;

  // Find closing > of the opening tag
  const gtPos = xml.indexOf(">", start + startTag.length);
  if (gtPos === -1) return null;

  // Self-closing (<c ... />)?
  if (xml[gtPos - 1] === "/") {
    return { start, end: gtPos + 1 };
  }

  // Element with children — find </c>
  const closeTag = "</c>";
  const closePos = xml.indexOf(closeTag, gtPos);
  if (closePos === -1) return null;
  return { start, end: closePos + closeTag.length };
}

/**
 * Replace the cell `ref` in the XML string with `newCell`.
 * Preserves the cell's original `s="..."` style attribute.
 */
function patchCell(
  xml: string,
  ref: string,
  value: string | number | null,
  isFormula = false
): string {
  const pos = findCell(xml, ref);
  if (!pos) return xml;

  const originalCell = xml.substring(pos.start, pos.end);
  const sMatch = originalCell.match(/\s+s="([^"]*)"/);
  const sAttr = sMatch ? ` s="${sMatch[1]}"` : "";

  let newCell: string;
  if (isFormula && typeof value === "string") {
    newCell = `<c r="${ref}"${sAttr} t="n"><f>${escapeXml(value)}</f></c>`;
  } else if (typeof value === "string") {
    if (value === "") {
      newCell = `<c r="${ref}"${sAttr} t="n" />`;
    } else {
      newCell = `<c r="${ref}"${sAttr} t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
    }
  } else {
    // numeric
    if (!value) {
      newCell = `<c r="${ref}"${sAttr} t="n" />`;
    } else {
      newCell = `<c r="${ref}"${sAttr} t="n"><v>${value}</v></c>`;
    }
  }

  return xml.substring(0, pos.start) + newCell + xml.substring(pos.end);
}

export async function POST(req: NextRequest) {
  const { entries, name, department, employeeId, approver, accountant, selectedMonth } = (await req.json()) as {
    entries: ConfirmedEntry[];
    name?: string;
    department?: string;
    employeeId?: string;
    approver?: string;
    accountant?: string;
    selectedMonth?: { year: number; month: number } | null;
  };

  const templatePath = path.join(process.cwd(), "public", "expense_template.xlsx");
  const templateBuffer = fs.readFileSync(templatePath);

  const zip = await JSZip.loadAsync(templateBuffer);
  let xml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");

  // ── メタデータ ────────────────────────────────────────────────
  xml = patchCell(xml, "F6", name ?? "");
  xml = patchCell(xml, "K6", "TODAY()", true);
  xml = patchCell(xml, "T6", approver ?? "");
  xml = patchCell(xml, "F7", department ?? "");
  xml = patchCell(xml, "F8", employeeId ?? "");

  if (selectedMonth) {
    const { year, month } = selectedMonth;
    const lastDay = new Date(year, month, 0).getDate();
    xml = patchCell(xml, "K8", `${year}/${month}/1`);
    xml = patchCell(xml, "N8", `${year}/${month}/${lastDay}`);
  } else {
    xml = patchCell(xml, "K8", "");
    xml = patchCell(xml, "N8", "");
  }

  xml = patchCell(xml, "T8", accountant ?? "");

  // ── データ行 (Row 12–29) ─────────────────────────────────────
  const DATA_START = 12;
  const MAX_ROWS = 18;
  const colTotals: number[] = new Array(23).fill(0);

  for (let i = 0; i < MAX_ROWS; i++) {
    const rowNum = DATA_START + i;
    const entry = entries[i] ?? null;
    const amount = entry ? parseAmount(entry.amount) : 0;

    xml = patchCell(xml, cellRef(5, rowNum), toFullwidth(i + 1));
    xml = patchCell(xml, cellRef(6, rowNum), entry ? fmtDate(entry.paymentDate) : "");
    xml = patchCell(xml, cellRef(7, rowNum), "");
    xml = patchCell(xml, cellRef(8, rowNum), entry?.paymentDestination ?? "");
    xml = patchCell(xml, cellRef(9, rowNum), entry?.purpose ?? "");

    for (let c = 10; c <= 22; c++) {
      xml = patchCell(xml, cellRef(c, rowNum), null);
    }

    if (amount && entry) {
      const colIdx = ACCOUNT_ITEM_COL[entry.accountItem ?? "その他"] ?? 21;
      xml = patchCell(xml, cellRef(colIdx, rowNum), amount);
      xml = patchCell(xml, cellRef(22, rowNum), amount);
      colTotals[colIdx] += amount;
      colTotals[22] += amount;
    }
  }

  // ── 小計行 (Row 30) ──────────────────────────────────────────
  const subtotalRow = DATA_START + MAX_ROWS;
  for (let c = 10; c <= 21; c++) {
    xml = patchCell(xml, cellRef(c, subtotalRow), colTotals[c] || null);
  }

  // ── 経費清算合計 (Row 31) ─────────────────────────────────────
  xml = patchCell(xml, "V31", colTotals[22] || null);

  // ── ZIPに書き戻し（sheet1.xmlのみ更新） ─────────────────────
  zip.file("xl/worksheets/sheet1.xml", xml);

  const outputBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return new NextResponse(new Uint8Array(outputBuffer as unknown as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("経費精算申請書")}.xlsx`,
    },
  });
}
