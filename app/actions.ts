"use server";

export interface ExtractedExpenseCandidates {
  paymentDate: string[];
  paymentDestination: string[];
  amount: string[];
}

export interface ActionState {
  success: boolean;
  candidates?: ExtractedExpenseCandidates;
  rawText?: string;
  error?: string;
}

function parseExpenseFromText(rawText: string): ExtractedExpenseCandidates {
  const text = rawText.normalize("NFKC");

  // --- 日付 ---
  type ToIso = (m: RegExpMatchArray) => string;
  const toIsoReiwa: ToIso = (m) => {
    const year = 2018 + parseInt(m[1]);
    return `${year}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  };
  const datePatternDefs: { source: string; toIso: ToIso }[] = [
    { source: /令和\s*(\d+)\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/.source, toIso: toIsoReiwa },
    {
      source: /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/.source,
      toIso: (m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
    },
    {
      source: /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?!\s*\d{2}:\d{2})/.source,
      toIso: (m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
    },
  ];

  const seenDates = new Set<string>();
  const paymentDate: string[] = [];
  const addDate = (iso: string) => {
    if (!seenDates.has(iso)) { seenDates.add(iso); paymentDate.push(iso); }
  };

  // 支払い関連ラベル近傍の日付を優先
  const paymentLabelRe = /支払[いい]?日|決済日|購入日|取引日|領収日/;
  const textLines = text.split("\n").map((l) => l.trim());
  for (let i = 0; i < textLines.length; i++) {
    if (paymentLabelRe.test(textLines[i])) {
      const window = textLines.slice(i, i + 3).join(" ");
      for (const { source, toIso } of datePatternDefs) {
        for (const m of window.matchAll(new RegExp(source, "g"))) addDate(toIso(m));
      }
    }
  }

  // 全体から残りの日付を収集
  for (const { source, toIso } of datePatternDefs) {
    for (const m of text.matchAll(new RegExp(source, "g"))) addDate(toIso(m));
  }

  // --- 金額 ---
  const seenAmounts = new Set<number>();
  const amount: string[] = [];
  const addAmount = (n: number) => {
    if (Number.isFinite(n) && n > 0 && !seenAmounts.has(n)) {
      seenAmounts.add(n);
      amount.push(`¥${n.toLocaleString()}`);
    }
  };

  // 合計/total ラベル付き金額を優先
  for (const m of text.matchAll(/(?:合計|小計|お買上|ご請求|total)[金額]?\s*[¥￥]?\s*([\d,]+)\s*円?/gi)) {
    addAmount(parseInt(m[1].replace(/,/g, "")));
  }
  for (const m of text.matchAll(/[¥￥]\s*([\d,]+)/g)) {
    addAmount(parseInt(m[1].replace(/,/g, "")));
  }
  for (const m of text.matchAll(/([\d,]+)\s*円/g)) {
    addAmount(parseInt(m[1].replace(/,/g, "")));
  }

  // --- 支払い先 ---
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const companyRe = /株式会社|有限会社|合同会社|一般社団法人|協同組合|社団法人|財団法人/;
  const addresseeMarkerRe = /様|御中|殿/;

  const addresseeIndices = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (addresseeMarkerRe.test(lines[i])) {
      addresseeIndices.add(i);
      if (i > 0) addresseeIndices.add(i - 1);
    }
  }

  const seenDest = new Set<string>();
  const paymentDestination: string[] = [];
  const addDest = (line: string) => {
    if (!seenDest.has(line)) { seenDest.add(line); paymentDestination.push(line); }
  };

  // 宛名でない会社名行（領収書末尾＝発行主が多いため逆順で優先）
  const issuerLines = lines.filter((line, i) => companyRe.test(line) && !addresseeIndices.has(i));
  for (const line of [...issuerLines].reverse()) addDest(line);

  // フォールバック: 先頭から最大5行の非宛名行
  for (const [i, line] of lines.entries()) {
    if (!addresseeIndices.has(i) && paymentDestination.length < 5) addDest(line);
  }

  return { paymentDate, paymentDestination, amount };
}

export async function extractExpenseFromPDF(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  try {
    const file = formData.get("pdf") as File;

    if (!file || file.size === 0) {
      return { success: false, error: "PDFファイルを選択してください" };
    }

    if (file.type !== "application/pdf") {
      return { success: false, error: "PDFファイルのみ対応しています" };
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const pdfData = await parser.getText();
    await parser.destroy();
    const text = pdfData.text;

    if (!text.trim()) {
      return {
        success: false,
        error: "PDFからテキストを抽出できませんでした（スキャン画像PDFには非対応）",
      };
    }

    return {
      success: true,
      candidates: parseExpenseFromText(text),
      rawText: text,
    };
  } catch (error) {
    console.error("PDF extraction error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "エラーが発生しました",
    };
  }
}
