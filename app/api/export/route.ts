import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

interface ConfirmedEntry {
  id: string;
  fileName: string;
  paymentDate: string | null;
  paymentDestination: string | null;
  amount: string | null;
  accountItem?: string;
  purpose?: string;
}

// 勘定項目 → 列番号 (1-indexed, J=10 〜 U=21)
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

function parseAmount(amount: string | null): number {
  if (!amount) return 0;
  return parseInt(amount.replace(/[¥¥,\s]/g, ""), 10) || 0;
}

type Alignment = ExcelJS.Alignment;

const CENTER: Partial<Alignment> = { horizontal: "center", vertical: "middle", wrapText: true };
const LEFT: Partial<Alignment>   = { horizontal: "left",   vertical: "middle" };
const RIGHT: Partial<Alignment>  = { horizontal: "right",  vertical: "middle" };

// サンプルファイルの実測ボーダースタイル
const THIN: Partial<ExcelJS.Border>   = { style: "thin" };
const HAIR: Partial<ExcelJS.Border>   = { style: "hair" };
const THICK: Partial<ExcelJS.Border>  = { style: "thick" };

// データセル (thin top/bottom, hair left/right)
function dataBorders(lastCol = false): Partial<ExcelJS.Borders> {
  return {
    top: THIN, bottom: THIN,
    left: HAIR, right: lastCol ? undefined : HAIR,
  };
}
// ヘッダーセル rowspan=2 (thin top, hair left/right, no bottom)
function headerBorders(lastCol = false): Partial<ExcelJS.Borders> {
  return {
    top: THIN,
    left: HAIR, right: lastCol ? undefined : HAIR,
  };
}
// 旅費交通費 親ヘッダー (thin top, hair bottom separator, hair left/right)
function travelGroupBorders(): Partial<ExcelJS.Borders> {
  return { top: THIN, bottom: HAIR, left: HAIR };
}
// サブヘッダー (hair top, thin bottom, hair left/right)
function subHeaderBorders(): Partial<ExcelJS.Borders> {
  return { top: HAIR, bottom: THIN, left: HAIR, right: HAIR };
}
// メタデータ値セル: 下線のみ
function metaValBorders(withTop = false): Partial<ExcelJS.Borders> {
  return withTop ? { top: HAIR, bottom: HAIR } : { bottom: HAIR };
}

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" },
};
const SUB_HEADER_FILL: ExcelJS.Fill = {
  type: "pattern", pattern: "solid", fgColor: { argb: "FFDAE8FC" },
};
const SUBTOTAL_FILL: ExcelJS.Fill = {
  type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" },
};

export async function POST(req: NextRequest) {
  const { entries, name, department, employeeId, approver, accountant } = (await req.json()) as {
    entries: ConfirmedEntry[];
    name?: string;
    department?: string;
    employeeId?: string;
    approver?: string;
    accountant?: string;
  };

  const wb = new ExcelJS.Workbook();
  wb.creator = "expense-app";
  const ws = wb.addWorksheet("経費精算申請書", {
    pageSetup: {
      paperSize: 9, orientation: "landscape",
      fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    },
  });

  // ── 列定義 (A–V, サンプルと同一幅) ──────────────────────────
  ws.columns = [
    { width: 13.4 }, // A
    { width: 0.8 },  // B
    { width: 4.4 },  // C
    { width: 5.6 },  // D: 確認
    { width: 5.6 },  // E: 領収書No.
    { width: 5.6 },  // F: 日付
    { width: 10.2 }, // G: CC
    { width: 16.6 }, // H: 支払先
    { width: 26.0 }, // I: 目的
    { width: 8.6 },  // J: 飛行機
    { width: 8.6 },  // K: 宿泊
    { width: 8.6 },  // L: 食事代
    { width: 8.6 },  // M: 電車・バス
    { width: 8.6 },  // N: タクシー
    { width: 8.6 },  // O: 駐車場
    { width: 8.6 },  // P: 会議費
    { width: 8.6 },  // Q: 交際費
    { width: 8.6 },  // R: 消耗品費
    { width: 8.6 },  // S: 新聞図書費
    { width: 8.6 },  // T: 通信費
    { width: 8.6 },  // U: その他
    { width: 14.8 }, // V: 合計
  ];

  // ── Row 1–2: スペーサー ───────────────────────────────────────
  ws.getRow(1).height = 13;
  ws.getRow(2).height = 13.5;

  // ── Row 3: タイトル ───────────────────────────────────────────
  ws.getRow(3).height = 24.75;
  ws.mergeCells("D3:I3");
  const title = ws.getCell("D3");
  title.value = "経費精算申請書";
  title.font = { size: 16, bold: true };
  title.alignment = CENTER;
  title.border = { bottom: THICK };

  // ── Row 4–5: スペーサー ───────────────────────────────────────
  ws.getRow(4).height = 3;
  ws.getRow(5).height = 9.75;

  // ── Row 6: 名前 / 提出日 / 承認者 (フォームスタイル: 値に下線のみ) ──
  ws.getRow(6).height = 18;
  ws.mergeCells("D6:E6"); ws.getCell("D6").value = "名　前";
  ws.getCell("D6").alignment = LEFT;

  ws.mergeCells("F6:H6");
  ws.getCell("F6").value = name ?? "";
  ws.getCell("F6").alignment = LEFT;
  ws.getCell("F6").border = metaValBorders();

  ws.getCell("J6").value = "提出日";
  ws.getCell("J6").alignment = LEFT;

  ws.mergeCells("K6:L6");
  ws.getCell("K6").value = new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  ws.getCell("K6").alignment = LEFT;
  ws.getCell("K6").border = metaValBorders();

  ws.mergeCells("Q6:S6"); ws.getCell("Q6").value = "承認者氏名";
  ws.getCell("Q6").alignment = LEFT;

  ws.mergeCells("T6:U6");
  ws.getCell("T6").value = approver ?? "";
  ws.getCell("T6").alignment = LEFT;
  ws.getCell("T6").border = metaValBorders();

  ws.getCell("V6").value = "㊞";
  ws.getCell("V6").alignment = CENTER;

  // ── Row 7: 所属部署 ───────────────────────────────────────────
  ws.getRow(7).height = 14.25;
  ws.mergeCells("D7:E7"); ws.getCell("D7").value = "所属部署";
  ws.getCell("D7").alignment = LEFT;

  ws.mergeCells("F7:H7");
  ws.getCell("F7").value = department ?? "";
  ws.getCell("F7").alignment = LEFT;
  ws.getCell("F7").border = metaValBorders(true); // top+bottom

  // ── Row 8: 社員番号 / 対象期間 / 経理担当者 ─────────────────
  ws.getRow(8).height = 18;
  const dates = entries.map((e) => e.paymentDate).filter(Boolean).sort() as string[];

  ws.mergeCells("D8:E8"); ws.getCell("D8").value = "社員番号";
  ws.getCell("D8").alignment = LEFT;

  ws.mergeCells("F8:H8");
  ws.getCell("F8").value = employeeId ?? "";
  ws.getCell("F8").alignment = LEFT;
  ws.getCell("F8").border = metaValBorders(true);

  ws.getCell("J8").value = "対象期間";
  ws.getCell("J8").alignment = LEFT;

  ws.mergeCells("K8:L8");
  ws.getCell("K8").value = dates[0] ?? "";
  ws.getCell("K8").alignment = LEFT;
  ws.getCell("K8").border = metaValBorders();

  ws.mergeCells("N8:O8");
  ws.getCell("N8").value = dates[dates.length - 1] ?? "";
  ws.getCell("N8").alignment = LEFT;
  ws.getCell("N8").border = metaValBorders();

  ws.mergeCells("Q8:S8"); ws.getCell("Q8").value = "経理担当者";
  ws.getCell("Q8").alignment = LEFT;

  ws.mergeCells("T8:U8");
  ws.getCell("T8").value = accountant ?? "";
  ws.getCell("T8").alignment = LEFT;
  ws.getCell("T8").border = metaValBorders();

  ws.getCell("V8").value = "㊞";
  ws.getCell("V8").alignment = CENTER;

  // ── Row 9: スペーサー ─────────────────────────────────────────
  ws.getRow(9).height = 13;

  // ── Row 10 & 11: テーブルヘッダー ────────────────────────────
  ws.getRow(10).height = 20;
  ws.getRow(11).height = 20;

  // rowspan=2 merges
  for (const r of [
    "D10:D11", "E10:E11", "F10:F11", "G10:G11", "H10:H11", "I10:I11",
    "P10:P11", "Q10:Q11", "R10:R11", "S10:S11", "T10:T11", "U10:U11", "V10:V11",
  ]) {
    ws.mergeCells(r);
  }
  ws.mergeCells("J10:O10");

  // rowspan=2 headers (thin top, hair left/right, no bottom)
  const rowspanHeaders: [string, string, boolean][] = [
    ["D10", "確認", false],
    ["E10", "領収書\nNo.", false],
    ["F10", "日　付", false],
    ["G10", "チャージ\nコード", false],
    ["H10", "支払先・内容", false],
    ["I10", "目的・同席者・目的地　など", false],
    ["P10", "会議費", false],
    ["Q10", "交際費", false],
    ["R10", "消耗品費", false],
    ["S10", "新聞図書費", false],
    ["T10", "通信費", false],
    ["U10", "その他", false],
    ["V10", "合　計", true],
  ];
  for (const [addr, val, isLast] of rowspanHeaders) {
    const cell = ws.getCell(addr);
    cell.value = val;
    cell.font = { size: 8, bold: true };
    cell.alignment = CENTER;
    cell.fill = HEADER_FILL;
    cell.border = headerBorders(isLast);
  }

  // 旅費交通費 (colspan=6, thin top, hair bottom, hair left)
  const travelCell = ws.getCell("J10");
  travelCell.value = "旅費交通費";
  travelCell.font = { size: 8, bold: true };
  travelCell.alignment = CENTER;
  travelCell.fill = HEADER_FILL;
  travelCell.border = travelGroupBorders();

  // sub-headers (hair top, thin bottom, hair left/right)
  const subLabels: [string, string][] = [
    ["J11", "飛行機"], ["K11", "宿泊"], ["L11", "食事代"],
    ["M11", "電車・バス"], ["N11", "タクシー"], ["O11", "駐車場　　高速料金"],
  ];
  for (const [addr, val] of subLabels) {
    const cell = ws.getCell(addr);
    cell.value = val;
    cell.font = { size: 8, bold: false };
    cell.alignment = CENTER;
    cell.fill = SUB_HEADER_FILL;
    cell.border = subHeaderBorders();
  }

  // ── データ行 (Row 12–29) ──────────────────────────────────────
  const DATA_START = 12;
  const MAX_ROWS = 18;

  for (let i = 0; i < MAX_ROWS; i++) {
    const rowNum = DATA_START + i;
    ws.getRow(rowNum).height = 20;
    const entry = entries[i] ?? null;
    const amount = entry ? parseAmount(entry.amount) : null;
    const row = ws.getRow(rowNum);

    // D: 確認 (empty)
    row.getCell(4).border = dataBorders();
    row.getCell(4).alignment = CENTER;

    // E: 領収書No.
    const noCell = row.getCell(5);
    noCell.value = i + 1;
    noCell.alignment = CENTER;
    noCell.font = { size: 9 };
    noCell.border = dataBorders();

    // F: 日付
    const dateCell = row.getCell(6);
    dateCell.value = entry?.paymentDate ?? "";
    dateCell.alignment = CENTER;
    dateCell.font = { size: 9 };
    dateCell.border = dataBorders();

    // G: CC
    row.getCell(7).alignment = CENTER;
    row.getCell(7).border = dataBorders();

    // H: 支払先
    const payeeCell = row.getCell(8);
    payeeCell.value = entry?.paymentDestination ?? "";
    payeeCell.alignment = LEFT;
    payeeCell.font = { size: 9 };
    payeeCell.border = dataBorders();

    // I: 目的
    const purposeCell = row.getCell(9);
    purposeCell.value = entry?.purpose ?? "";
    purposeCell.alignment = LEFT;
    purposeCell.font = { size: 9 };
    purposeCell.border = dataBorders();

    // J–U: 金額列
    for (let c = 10; c <= 21; c++) {
      const cell = row.getCell(c);
      cell.numFmt = "#,##0";
      cell.alignment = RIGHT;
      cell.font = { size: 9 };
      cell.border = dataBorders();
    }
    if (amount && entry) {
      const colIdx = ACCOUNT_ITEM_COL[entry.accountItem ?? "その他"] ?? 21;
      row.getCell(colIdx).value = amount;
    }

    // V: 合計 (no right border = last column)
    const totalCell = row.getCell(22);
    if (amount) totalCell.value = amount;
    totalCell.numFmt = "#,##0";
    totalCell.alignment = RIGHT;
    totalCell.font = { size: 9, bold: !!amount };
    totalCell.border = dataBorders(true);
  }

  // ── 小計行 (Row 30) ───────────────────────────────────────────
  const subtotalRow = DATA_START + MAX_ROWS; // = 30
  ws.getRow(subtotalRow).height = 20;

  const colTotals: number[] = new Array(22).fill(0);
  for (const entry of entries) {
    const colIdx = ACCOUNT_ITEM_COL[entry.accountItem ?? "その他"] ?? 21;
    colTotals[colIdx - 1] += parseAmount(entry.amount);
    colTotals[21] += parseAmount(entry.amount);
  }

  for (let c = 10; c <= 21; c++) {
    const cell = ws.getRow(subtotalRow).getCell(c);
    cell.value = colTotals[c - 1]; // 0 も明示的に表示 (サンプルと同様)
    cell.numFmt = "#,##0";
    cell.font = { size: 9, bold: false };
    cell.alignment = RIGHT;
    cell.border = dataBorders();
    cell.fill = SUBTOTAL_FILL;
  }
  // V30 (合計列: 小計に合計は含めない → サンプルと同様に空)
  const v30 = ws.getRow(subtotalRow).getCell(22);
  v30.border = dataBorders(true);
  v30.fill = SUBTOTAL_FILL;

  // ── 経費清算合計 (Row 31) ─────────────────────────────────────
  const grandTotalRow = subtotalRow + 1; // = 31
  ws.getRow(grandTotalRow).height = 20;

  ws.mergeCells(`T${grandTotalRow}:U${grandTotalRow}`);
  const gtLabel = ws.getCell(`T${grandTotalRow}`);
  gtLabel.value = "経費清算合計";
  gtLabel.alignment = RIGHT;
  gtLabel.font = { size: 10, bold: false };
  gtLabel.border = { top: THIN };

  // V31: thick box (サンプルと同様)
  const gtCell = ws.getCell(`V${grandTotalRow}`);
  gtCell.value = colTotals[21];
  gtCell.numFmt = "#,##0";
  gtCell.alignment = RIGHT;
  gtCell.font = { size: 10, bold: true };
  gtCell.border = { top: THICK, bottom: THICK, left: THICK, right: THICK };

  // ── 注釈 (Row 32–38) ─────────────────────────────────────────
  const notesRow = grandTotalRow + 1;
  const notes: [string, string, string?][] = [
    ["*", "消耗品費：文房具その他の消耗品 / 新聞図書費：仕事の情報収集のための新聞・雑誌・書籍代他"],
    ["*", "宿泊費", "ホテルの名前を支払い先名欄へ必ず記入すること.ホテルでの食事や電話代などは宿泊費へは含まないこと"],
    ["*", "会議費", "1人当たり1万円未満とする"],
    ["*", "1項目につき、30万円以上の場合は、稟議書を提出のこと"],
    ["*", "すべての経費について、支払先名/内容を記入すること"],
    ["*", "領収書は別紙に添付し、番号を振ること"],
    ["*", "名刺作成費はその他へ記入する"],
  ];
  const noteFont = { size: 8, color: { argb: "FF666666" } };
  for (let i = 0; i < notes.length; i++) {
    const r = notesRow + i;
    const [star, e, f] = notes[i];
    ws.getCell(`D${r}`).value = star;
    ws.getCell(`D${r}`).font = noteFont;
    ws.getCell(`E${r}`).value = e;
    ws.getCell(`E${r}`).font = noteFont;
    if (f) {
      ws.getCell(`F${r}`).value = f;
      ws.getCell(`F${r}`).font = noteFont;
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent("経費精算申請書")}.xlsx`,
    },
  });
}
