import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

interface ConfirmedEntry {
  id: string;
  fileName: string;
  paymentDate: string | null;
  paymentDestination: string | null;
  amount: string | null;
  accountItem?: string;
}

// 勘定項目 → 列番号 (1-indexed, F=6 〜 Q=17)
const ACCOUNT_ITEM_COL: Record<string, number> = {
  "飛行機": 6,
  "宿泊": 7,
  "食事代": 8,
  "電車・バス": 9,
  "タクシー": 10,
  "駐車場・高速料金": 11,
  "会議費": 12,
  "交際費": 13,
  "消耗品費": 14,
  "新聞図書費": 15,
  "通信費": 16,
  "その他": 17,
};

function parseAmount(amount: string | null): number {
  if (!amount) return 0;
  return parseInt(amount.replace(/[¥¥,\s]/g, ""), 10) || 0;
}

// セルスタイルのヘルパー
type Alignment = ExcelJS.Alignment;
type Border = ExcelJS.Border;

const CENTER: Partial<Alignment> = { horizontal: "center", vertical: "middle", wrapText: true };
const LEFT: Partial<Alignment> = { horizontal: "left", vertical: "middle" };
const RIGHT: Partial<Alignment> = { horizontal: "right", vertical: "middle" };
const THIN: Partial<Border> = { style: "thin" };
const MEDIUM: Partial<Border> = { style: "medium" };

function borders(t = THIN, r = THIN, b = THIN, l = THIN): Partial<ExcelJS.Borders> {
  return { top: t, right: r, bottom: b, left: l };
}


const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9E1F2" },
};

const SUB_HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFDAE8FC" },
};

export async function POST(req: NextRequest) {
  const { entries } = (await req.json()) as { entries: ConfirmedEntry[] };

  const wb = new ExcelJS.Workbook();
  wb.creator = "expense-app";
  const ws = wb.addWorksheet("経費精算申請書", {
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // ── 列定義 ──────────────────────────────────────────────────────
  // A:No B:日付 C:CC D:支払先 E:目的 F:飛行機 G:宿泊 H:食事 I:電車 J:タクシー K:駐車場 L:会議費 M:交際費 N:消耗品費 O:図書費 P:通信費 Q:その他 R:合計
  ws.columns = [
    { width: 4.5 },  // A
    { width: 9 },    // B
    { width: 8 },    // C
    { width: 20 },   // D
    { width: 22 },   // E
    { width: 7 },    // F
    { width: 7 },    // G
    { width: 7 },    // H
    { width: 8 },    // I
    { width: 7 },    // J
    { width: 8 },    // K
    { width: 7 },    // L
    { width: 7 },    // M
    { width: 8 },    // N
    { width: 8 },    // O
    { width: 7 },    // P
    { width: 7 },    // Q
    { width: 9 },    // R
  ];

  // ── Row1: タイトル ────────────────────────────────────────────
  ws.mergeCells("A1:R1");
  const title = ws.getCell("A1");
  title.value = "経費精算申請書";
  title.font = { size: 16, bold: true };
  title.alignment = CENTER;
  ws.getRow(1).height = 28;

  // ── Row2: 名前 / 提出日 ──────────────────────────────────────
  ws.getRow(2).height = 18;
  ws.mergeCells("A2:B2"); ws.getCell("A2").value = "名　前";
  ws.mergeCells("C2:E2"); ws.getCell("C2").value = "";
  ws.mergeCells("F2:J2");
  ws.mergeCells("K2:L2"); ws.getCell("K2").value = "提出日";
  ws.mergeCells("M2:O2"); ws.getCell("M2").value = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
  ws.mergeCells("P2:R2"); ws.getCell("P2").value = "㊞";
  for (const c of ["A2","C2","K2","M2","P2"]) {
    ws.getCell(c).alignment = LEFT;
    ws.getCell(c).border = borders();
  }

  // ── Row3: 所属部署 / 対象期 ──────────────────────────────────
  ws.getRow(3).height = 18;
  ws.mergeCells("A3:B3"); ws.getCell("A3").value = "所属部署";
  ws.mergeCells("C3:E3");
  ws.mergeCells("F3:J3");
  ws.mergeCells("K3:L3"); ws.getCell("K3").value = "対象期";

  // 対象期を確定データから算出
  const dates = entries.map(e => e.paymentDate).filter(Boolean).sort() as string[];
  if (dates.length > 0) {
    ws.mergeCells("M3:R3");
    ws.getCell("M3").value = `${dates[0]} ～ ${dates[dates.length - 1]}`;
  } else {
    ws.mergeCells("M3:R3");
  }
  for (const c of ["A3","C3","K3","M3"]) {
    ws.getCell(c).alignment = LEFT;
    ws.getCell(c).border = borders();
  }

  // ── Row4: 社員番号 / 経理担当者 / 承認者 ─────────────────────
  ws.getRow(4).height = 18;
  ws.mergeCells("A4:B4"); ws.getCell("A4").value = "社員番号";
  ws.mergeCells("C4:E4");
  ws.mergeCells("F4:J4");
  ws.mergeCells("K4:L4"); ws.getCell("K4").value = "経理担当者";
  ws.mergeCells("M4:N4");
  ws.getCell("M4").value = "㊞";
  ws.mergeCells("O4:P4"); ws.getCell("O4").value = "承認者氏名";
  ws.mergeCells("Q4:R4");
  ws.getCell("Q4").value = "㊞";
  for (const c of ["A4","C4","K4","M4","O4","Q4"]) {
    ws.getCell(c).alignment = LEFT;
    ws.getCell(c).border = borders();
  }

  // ── Row5: 空白 ───────────────────────────────────────────────
  ws.getRow(5).height = 8;

  // ── Row6 & 7: テーブルヘッダー ───────────────────────────────
  ws.getRow(6).height = 30;
  ws.getRow(7).height = 26;

  // 縦方向にマージするセル（Row6-7）
  const vMergeCols: [string, string][] = [
    ["A6","A7"], ["B6","B7"], ["C6","C7"], ["D6","D7"], ["E6","E7"],
    ["L6","L7"], ["M6","M7"], ["N6","N7"], ["O6","O7"], ["P6","P7"], ["Q6","Q7"], ["R6","R7"],
  ];
  for (const [s, e] of vMergeCols) ws.mergeCells(`${s}:${e}`);

  // 旅費交通費 横マージ
  ws.mergeCells("F6:K6");

  const hLabels: [string, string][] = [
    ["A6","No."], ["B6","日　付"], ["C6","チャージ\nコード"], ["D6","支払先・内容"],
    ["E6","目的・同席者・目的地　など"], ["F6","旅費交通費"],
    ["L6","会議費"], ["M6","交際費"], ["N6","消耗品費"],
    ["O6","新聞\n図書費"], ["P6","通信費"], ["Q6","その他"], ["R6","合　計"],
  ];
  for (const [addr, val] of hLabels) {
    const cell = ws.getCell(addr);
    cell.value = val;
    cell.font = { size: 8, bold: true };
    cell.alignment = CENTER;
    cell.fill = HEADER_FILL;
    cell.border = borders(MEDIUM, MEDIUM, MEDIUM, MEDIUM);
  }

  const subLabels: [number, string][] = [
    [6,"飛行機"], [7,"宿泊"], [8,"食事代"], [9,"電車・バス"], [10,"タクシー"], [11,"駐車場\n高速料金"],
  ];
  for (const [col, val] of subLabels) {
    const cell = ws.getRow(7).getCell(col);
    cell.value = val;
    cell.font = { size: 8, bold: true };
    cell.alignment = CENTER;
    cell.fill = SUB_HEADER_FILL;
    cell.border = borders();
  }

  // ── データ行 (Row8〜) ────────────────────────────────────────
  const DATA_START = 8;
  const MAX_ROWS = 18;

  for (let i = 0; i < MAX_ROWS; i++) {
    const rowNum = DATA_START + i;
    ws.getRow(rowNum).height = 18;
    const entry = entries[i] ?? null;
    const amount = entry ? parseAmount(entry.amount) : null;

    const row = ws.getRow(rowNum);

    // No.
    const noCell = row.getCell(1);
    noCell.value = i + 1;
    noCell.alignment = CENTER;
    noCell.font = { size: 9 };

    // 日付
    const dateCell = row.getCell(2);
    dateCell.value = entry?.paymentDate ?? "";
    dateCell.alignment = CENTER;
    dateCell.font = { size: 9 };

    // チャージコード
    row.getCell(3).alignment = CENTER;

    // 支払先・内容
    const payeeCell = row.getCell(4);
    payeeCell.value = entry?.paymentDestination ?? "";
    payeeCell.alignment = LEFT;
    payeeCell.font = { size: 9 };

    // 目的
    row.getCell(5).alignment = LEFT;

    // 金額列 F〜Q (F=6, Q=17)
    for (let c = 6; c <= 17; c++) {
      const cell = row.getCell(c);
      cell.numFmt = '#,##0';
      cell.alignment = RIGHT;
      cell.font = { size: 9 };
    }
    if (amount && entry) {
      const colIdx = ACCOUNT_ITEM_COL[entry.accountItem ?? "その他"] ?? 17;
      row.getCell(colIdx).value = amount;
    }

    // 合計 (R=18)
    const totalCell = row.getCell(18);
    if (amount) totalCell.value = amount;
    totalCell.numFmt = '#,##0';
    totalCell.alignment = RIGHT;
    totalCell.font = { size: 9, bold: !!amount };

    // ボーダー
    for (let c = 1; c <= 18; c++) {
      row.getCell(c).border = borders();
    }
  }

  // ── 小計行 ───────────────────────────────────────────────────
  const subtotalRow = DATA_START + MAX_ROWS;
  ws.getRow(subtotalRow).height = 18;

  const colTotals: number[] = new Array(18).fill(0);
  for (const entry of entries) {
    const colIdx = ACCOUNT_ITEM_COL[entry.accountItem ?? "その他"] ?? 17;
    colTotals[colIdx - 1] += parseAmount(entry.amount);
    colTotals[17] += parseAmount(entry.amount); // 合計(18列目, 0-indexed:17)
  }

  for (let c = 1; c <= 18; c++) {
    const cell = ws.getRow(subtotalRow).getCell(c);
    const val = colTotals[c - 1];
    if (val) {
      cell.value = val;
      cell.numFmt = '#,##0';
      cell.font = { size: 9, bold: true };
    }
    cell.alignment = RIGHT;
    cell.border = borders(MEDIUM, THIN, MEDIUM, THIN);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
  }

  // ── 経費清算合計 ─────────────────────────────────────────────
  const grandTotalRow = subtotalRow + 1;
  ws.getRow(grandTotalRow).height = 20;
  ws.mergeCells(`A${grandTotalRow}:Q${grandTotalRow}`);
  const gtLabel = ws.getCell(`A${grandTotalRow}`);
  gtLabel.value = "経費清算合計";
  gtLabel.alignment = RIGHT;
  gtLabel.font = { size: 10, bold: true };

  const gtCell = ws.getCell(`R${grandTotalRow}`);
  gtCell.value = colTotals[17];
  gtCell.numFmt = '#,##0';
  gtCell.alignment = RIGHT;
  gtCell.font = { size: 10, bold: true };
  gtCell.border = borders(MEDIUM, MEDIUM, MEDIUM, MEDIUM);

  // ── 注釈 ─────────────────────────────────────────────────────
  const notesRow = grandTotalRow + 2;
  const notes = [
    "* 消耗品費：文房具その他の消耗品 / 新聞図書費：仕事の情報収集のための新聞・雑誌・書籍代他",
    "* 宿泊　ホテルの名前を支払い先名欄へ必ず記入すること。ホテルでの食事や電話代などは宿泊費へは含まないこと",
    "* 会議　1人当たり1万円未満とする",
    "* 1項目につき、30万円以上の場合は、稟議書を提出のこと",
    "* すべての経費について、支払先名/内容を記入すること",
    "* 領収書は別紙に添付し、番号を振ること",
  ];
  for (let i = 0; i < notes.length; i++) {
    ws.mergeCells(`A${notesRow + i}:R${notesRow + i}`);
    const cell = ws.getCell(`A${notesRow + i}`);
    cell.value = notes[i];
    cell.font = { size: 8, color: { argb: "FF666666" } };
  }

  // ── レスポンス ────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("経費精算申請書")}.xlsx`,
    },
  });
}
