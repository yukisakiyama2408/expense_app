"use server";

export interface ExtractedExpense {
  paymentDate: string | null;
  paymentDestination: string | null;
  amount: string | null;
}

export interface ActionState {
  success: boolean;
  data?: ExtractedExpense;
  rawText?: string;
  error?: string;
}

function parseExpenseFromText(rawText: string): ExtractedExpense {
  // PDFから抽出されるKangxi部首互換文字（⽇⽉⼊ 等）を標準CJKに正規化
  const text = rawText.normalize("NFKC");

  // 日付抽出: 支払日・決済日・購入日 等のラベル近傍の日付を優先、なければ最初の日付
  let paymentDate: string | null = null;

  type DatePattern = { re: RegExp; toIso: (m: RegExpMatchArray) => string };
  const toIsoReiwa = (m: RegExpMatchArray) => {
    const year = 2018 + parseInt(m[1]);
    return `${year}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  };
  const datePatterns: DatePattern[] = [
    {
      re: /令和\s*(\d+)\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/,
      toIso: toIsoReiwa,
    },
    {
      re: /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/,
      toIso: (m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
    },
    {
      re: /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?!\s*\d{2}:\d{2})/,
      toIso: (m) => `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`,
    },
  ];

  const findDateIn = (s: string): string | null => {
    for (const { re, toIso } of datePatterns) {
      const m = s.match(re);
      if (m) return toIso(m);
    }
    return null;
  };

  // 支払い関連ラベルが含まれる行から前後2行のウィンドウ内で日付を探す
  const paymentLabelRe = /支払[いい]?日|決済日|購入日|取引日|領収日/;
  const textLines = text.split("\n").map((l) => l.trim());
  for (let i = 0; i < textLines.length && !paymentDate; i++) {
    if (paymentLabelRe.test(textLines[i])) {
      const window = textLines.slice(i, i + 3).join(" ");
      paymentDate = findDateIn(window);
    }
  }

  // ラベル付き日付が見つからなければ全体から最初の日付にフォールバック
  if (!paymentDate) {
    paymentDate = findDateIn(text);
  }

  // 金額抽出: 合計/total を優先、次に最大の金額
  let amount: string | null = null;
  const totalMatch = text.match(
    /(?:合計|小計|お買上|ご請求|total)[金額]?\s*[¥￥]?\s*([\d,]+)\s*円?/i
  );
  if (totalMatch) {
    amount = `¥${totalMatch[1]}`;
  } else {
    // ¥xxx または xxxxx円 のうち最大値を採用
    const allAmounts: number[] = [];
    for (const m of text.matchAll(/[¥￥]\s*([\d,]+)/g)) {
      allAmounts.push(parseInt(m[1].replace(/,/g, "")));
    }
    for (const m of text.matchAll(/([\d,]+)\s*円/g)) {
      allAmounts.push(parseInt(m[1].replace(/,/g, "")));
    }
    if (allAmounts.length > 0) {
      const max = Math.max(...allAmounts);
      amount = `¥${max.toLocaleString()}`;
    }
  }

  // 支払い先抽出: 宛名（様/御中/殿を含む行またはその直前行）を除外した発行主の会社名
  // 発行主は領収書の末尾に記載されることが多いため、条件を満たす最後の行を採用する
  let paymentDestination: string | null = null;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const companyRe = /株式会社|有限会社|合同会社|一般社団法人|協同組合|社団法人|財団法人/;
  const addresseeMarkerRe = /様|御中|殿/;

  // 宛名マーカーを含む行と、その直前行（会社名が別行の場合）をまとめて除外対象とする
  const addresseeIndices = new Set<number>();
  for (let i = 0; i < lines.length; i++) {
    if (addresseeMarkerRe.test(lines[i])) {
      addresseeIndices.add(i);
      if (i > 0) addresseeIndices.add(i - 1);
    }
  }

  // 宛名でない会社名行を収集し、最後のものを発行主とする
  const issuerLines = lines.filter(
    (line, i) => companyRe.test(line) && !addresseeIndices.has(i)
  );
  if (issuerLines.length > 0) {
    paymentDestination = issuerLines[issuerLines.length - 1];
  }
  if (!paymentDestination && lines.length > 0) {
    paymentDestination = lines.find((_, i) => !addresseeIndices.has(i)) ?? lines[0];
  }

  return { paymentDate, paymentDestination, amount };
}

export async function extractExpenseFromAzure(
  _prevState: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !apiKey) {
    return { success: false, error: "Azure Document Intelligence の設定が不足しています（AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT / KEY）" };
  }

  const file = formData.get("file") as File;
  if (!file || file.size === 0) {
    return { success: false, error: "ファイルを選択してください" };
  }

  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/bmp",
  ];
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: "PDF・JPEG・PNG・TIFF・BMP 形式に対応しています" };
  }

  try {
    const { DocumentAnalysisClient, AzureKeyCredential } = await import("@azure/ai-form-recognizer");
    const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey));

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const poller = await client.beginAnalyzeDocument("prebuilt-receipt", buffer);
    const result = await poller.pollUntilDone();

    if (!result.documents || result.documents.length === 0) {
      return { success: false, error: "領収書の情報を抽出できませんでした" };
    }

    const fields = result.documents[0].fields;

    // 支払日
    let paymentDate: string | null = null;
    const dateField = fields["TransactionDate"];
    if (dateField?.kind === "date" && dateField.value) {
      const d = dateField.value;
      paymentDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    // 支払い先
    let paymentDestination: string | null = null;
    const merchantField = fields["MerchantName"];
    if (merchantField?.kind === "string") {
      paymentDestination = merchantField.value ?? null;
    }

    // 金額（通貨フィールド優先、なければ数値フィールド）
    let amount: string | null = null;
    const totalField = fields["Total"];
    if (totalField?.kind === "currency" && totalField.value?.amount !== undefined) {
      amount = `¥${totalField.value.amount.toLocaleString()}`;
    } else if (totalField?.kind === "number" && totalField.value !== undefined) {
      amount = `¥${totalField.value.toLocaleString()}`;
    }

    return {
      success: true,
      data: { paymentDate, paymentDestination, amount },
    };
  } catch (error) {
    console.error("Azure Document Intelligence error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "エラーが発生しました",
    };
  }
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

    const extracted = parseExpenseFromText(text);

    return {
      success: true,
      data: extracted,
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
