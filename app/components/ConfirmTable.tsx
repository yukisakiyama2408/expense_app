"use client";

import { useState } from "react";
import { useEntries } from "@/app/context/entries";
import { useRouter } from "next/navigation";

const TRAVEL_ITEMS = ["飛行機", "宿泊", "食事代", "電車・バス", "タクシー", "駐車場・高速料金"] as const;
const NON_TRAVEL_ITEMS = ["会議費", "交際費", "消耗品費", "新聞図書費", "通信費", "その他"] as const;
const ALL_ITEMS = [...TRAVEL_ITEMS, ...NON_TRAVEL_ITEMS] as const;

function parseAmount(amount: string | null): number {
  if (!amount) return 0;
  return parseInt(amount.replace(/[¥¥,\s]/g, ""), 10) || 0;
}
function fmt(n: number): string {
  return n > 0 ? n.toLocaleString() : "";
}
function toFullwidth(n: number): string {
  return String(n).replace(/[0-9]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xFEE0));
}

// ── スタイル定数 ──────────────────────────────────────────────────
// メタデータセクション: フォームスタイル (ラベルは装飾なし、入力は下線のみ)
const META_LABEL = "whitespace-nowrap px-1 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300";
const META_VAL   = "border-b border-zinc-500 px-1 py-0.5 text-[10px] text-zinc-900 dark:border-zinc-400 dark:text-zinc-50";
const META_VAL_UD = "border-y border-zinc-500 px-1 py-0.5 text-[10px] text-zinc-900 dark:border-zinc-400 dark:text-zinc-50";
const META_BLANK = "py-0.5";

// データテーブルセクション: thin top/bottom + hair left/right
const B_DATA = "border-t border-b border-l border-zinc-500 dark:border-zinc-500";
const TH1 = "border-t border-l border-zinc-500 px-0.5 py-1 text-center text-[8px] font-bold leading-tight text-zinc-800 dark:border-zinc-500 dark:text-zinc-100";
const TH2 = "border-t border-b border-l border-zinc-500 px-0.5 py-1 text-center text-[8px] leading-tight text-zinc-800 dark:border-zinc-500 dark:text-zinc-100";
const TD  = `${B_DATA} px-1 py-0.5 text-[10px] text-zinc-900 dark:text-zinc-50`;
const TDN = `${B_DATA} px-1 py-0.5 text-right text-[10px] tabular-nums text-zinc-900 dark:text-zinc-50`;
const TDS = `${B_DATA} px-1 py-0.5 text-right text-[10px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-50`;

const INPUT = "w-full bg-transparent text-[10px] focus:outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500";

const MAX_ROWS = 18;

export function ConfirmTable() {
  const { confirmedMap, selectedMonth } = useEntries();
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [name, setName]               = useState("");
  const [department, setDepartment]   = useState("");
  const [employeeId, setEmployeeId]   = useState("");
  const [approver, setApprover]       = useState("菅野龍彦");
  const [accountant, setAccountant]   = useState("北埜順子");

  const sorted = Object.values(confirmedMap).sort((a, b) => {
    if (!a.paymentDate && !b.paymentDate) return 0;
    if (!a.paymentDate) return 1;
    if (!b.paymentDate) return -1;
    return a.paymentDate.localeCompare(b.paymentDate);
  });

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-sm text-zinc-500">確定されたデータがありません</p>
        <button
          onClick={() => router.push("/results")}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          抽出結果ページへ
        </button>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
  });
  const periodStart = selectedMonth ? `${selectedMonth.year}/${selectedMonth.month}/1` : "";
  const periodEnd = selectedMonth
    ? `${selectedMonth.year}/${selectedMonth.month}/${new Date(selectedMonth.year, selectedMonth.month, 0).getDate()}`
    : "";

  const colTotals: Record<string, number> = Object.fromEntries(ALL_ITEMS.map((k) => [k, 0]));
  for (const entry of sorted) {
    const amt = parseAmount(entry.amount);
    if (amt > 0 && entry.accountItem in colTotals) colTotals[entry.accountItem] += amt;
  }
  const grandTotal = Object.values(colTotals).reduce((a, b) => a + b, 0);
  const rows = Array.from({ length: MAX_ROWS }, (_, i) => sorted[i] ?? null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: sorted, name, department, employeeId, approver, accountant }),
      });
      if (!res.ok) throw new Error("export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "経費精算申請書.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="overflow-x-auto p-4">

          {/*
           * テーブルは19列 (Excel D〜V に対応)
           * 1=D(確認) 2=E(No.) 3=F(日付) 4=G(CC) 5=H(支払先) 6=I(目的)
           * 7=J(飛行機) 8=K(宿泊) 9=L(食事代) 10=M(電車バス) 11=N(タクシー) 12=O(駐車場)
           * 13=P(会議費) 14=Q(交際費) 15=R(消耗品費) 16=S(新聞図書費) 17=T(通信費)
           * 18=U(その他) 19=V(合計)
           */}
          <table className="w-full min-w-[1100px] border-collapse text-left">
            <colgroup>
              <col style={{ width: "28px"  }} />{/* D */}
              <col style={{ width: "28px"  }} />{/* E */}
              <col style={{ width: "56px"  }} />{/* F */}
              <col style={{ width: "56px"  }} />{/* G */}
              <col style={{ width: "116px" }} />{/* H */}
              <col style={{ width: "148px" }} />{/* I */}
              <col style={{ width: "50px"  }} />{/* J */}
              <col style={{ width: "50px"  }} />{/* K */}
              <col style={{ width: "50px"  }} />{/* L */}
              <col style={{ width: "50px"  }} />{/* M */}
              <col style={{ width: "50px"  }} />{/* N */}
              <col style={{ width: "50px"  }} />{/* O */}
              <col style={{ width: "50px"  }} />{/* P */}
              <col style={{ width: "50px"  }} />{/* Q */}
              <col style={{ width: "50px"  }} />{/* R */}
              <col style={{ width: "50px"  }} />{/* S */}
              <col style={{ width: "50px"  }} />{/* T */}
              <col style={{ width: "50px"  }} />{/* U */}
              <col style={{ width: "62px"  }} />{/* V */}
            </colgroup>

            <tbody>
              {/* ── タイトル ── */}
              <tr>
                <td colSpan={19} className="border-b-2 border-zinc-500 pb-1 pt-0.5 text-center text-base font-bold text-zinc-900 dark:border-zinc-400 dark:text-zinc-50">
                  経費精算申請書
                </td>
              </tr>

              {/* ── スペーサー ── */}
              <tr><td colSpan={19} className="h-1" /></tr>

              {/*
               * ── Row 6: 名前 / 提出日 / 承認者 ──
               * D:E(2) F:H(3) I(1) J(1) K:L(2) M:P(4) Q:S(3) T:U(2) V(1) = 19
               */}
              <tr>
                <td colSpan={2} className={META_LABEL}>名　前</td>
                <td colSpan={3} className={META_VAL}>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="氏名" className={INPUT} />
                </td>
                <td colSpan={1} className={META_BLANK} />
                <td colSpan={1} className={META_LABEL}>提出日</td>
                <td colSpan={2} className={META_VAL}>{today}</td>
                <td colSpan={4} className={META_BLANK} />
                <td colSpan={3} className={META_LABEL}>承認者氏名</td>
                <td colSpan={2} className={META_VAL}>
                  <input value={approver} onChange={(e) => setApprover(e.target.value)} placeholder="" className={INPUT} />
                </td>
                <td colSpan={1} className={META_LABEL}>㊞</td>
              </tr>

              {/*
               * ── Row 7: 所属部署 ──
               * D:E(2) F:H(3) I:V(14) = 19
               */}
              <tr>
                <td colSpan={2} className={META_LABEL}>所属部署</td>
                <td colSpan={3} className={META_VAL_UD}>
                  <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="" className={INPUT} />
                </td>
                <td colSpan={14} className={META_BLANK} />
              </tr>

              {/*
               * ── Row 8: 社員番号 / 対象期間 / 経理担当者 ──
               * D:E(2) F:H(3) I(1) J(1) K:L(2) M(1) N:O(2) P(1) Q:S(3) T:U(2) V(1) = 19
               */}
              <tr>
                <td colSpan={2} className={META_LABEL}>社員番号</td>
                <td colSpan={3} className={META_VAL_UD}>
                  <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="" className={INPUT} />
                </td>
                <td colSpan={1} className={META_BLANK} />
                <td colSpan={1} className={META_LABEL}>対象期間</td>
                <td colSpan={2} className={META_VAL}>{periodStart}</td>
                <td colSpan={1} className={META_BLANK} />
                <td colSpan={2} className={META_VAL}>{periodEnd}</td>
                <td colSpan={1} className={META_BLANK} />
                <td colSpan={3} className={META_LABEL}>経理担当者</td>
                <td colSpan={2} className={META_VAL}>
                  <input value={accountant} onChange={(e) => setAccountant(e.target.value)} placeholder="" className={INPUT} />
                </td>
                <td colSpan={1} className={META_LABEL}>㊞</td>
              </tr>

              {/* スペーサー */}
              <tr><td colSpan={19} className="h-2" /></tr>

              {/* ── ヘッダー Row 10 ── */}
              <tr>
                <th rowSpan={2} className={TH1}>確認</th>
                <th rowSpan={2} className={TH1}>領収書<br />No.</th>
                <th rowSpan={2} className={TH1}>日　付</th>
                <th rowSpan={2} className={TH1}>チャージ<br />コード</th>
                <th rowSpan={2} className={TH1}>支払先・内容</th>
                <th rowSpan={2} className={TH1}>目的・同席者・目的地　など</th>
                <th colSpan={6} className={`${TH1} border-b border-zinc-200 dark:border-zinc-500`}>旅費交通費</th>
                <th rowSpan={2} className={TH1}>会議費</th>
                <th rowSpan={2} className={TH1}>交際費</th>
                <th rowSpan={2} className={TH1}>消耗品費</th>
                <th rowSpan={2} className={TH1}>新聞<br />図書費</th>
                <th rowSpan={2} className={TH1}>通信費</th>
                <th rowSpan={2} className={TH1}>その他</th>
                <th rowSpan={2} className={TH1}>合　計</th>
              </tr>
              {/* ── ヘッダー Row 11 ── */}
              <tr>
                <th className={TH2}>飛行機</th>
                <th className={TH2}>宿泊</th>
                <th className={TH2}>食事代</th>
                <th className={TH2}>電車・<br />バス</th>
                <th className={TH2}>タクシー</th>
                <th className={TH2}>駐車場<br />高速料金</th>
              </tr>

              {/* ── データ行 (18行固定) ── */}
              {rows.map((entry, i) => {
                const amt = entry ? parseAmount(entry.amount) : 0;
                return (
                  <tr key={i}>
                    <td className={`${TD} text-center`} />
                    <td className={`${TD} text-center`}>{toFullwidth(i + 1)}</td>
                    <td className={`${TD} whitespace-nowrap text-center`}>{entry?.paymentDate ? `${parseInt(entry.paymentDate.slice(5, 7))}/${parseInt(entry.paymentDate.slice(8))}` : ""}</td>
                    <td className={TD} />
                    <td className={TD}>{entry?.paymentDestination ?? ""}</td>
                    <td className={TD}>{entry?.purpose ?? ""}</td>
                    {ALL_ITEMS.map((item) => (
                      <td key={item} className={TDN}>
                        {entry?.accountItem === item && amt ? fmt(amt) : ""}
                      </td>
                    ))}
                    <td className={`${TDN} font-medium`}>{entry && amt ? fmt(amt) : ""}</td>
                  </tr>
                );
              })}

              {/* ── 小計行 ── */}
              <tr>
                <td colSpan={6} className={`${TDS} border-t-2 border-t-zinc-600`} />
                {ALL_ITEMS.map((item) => (
                  <td key={item} className={`${TDS} border-t-2 border-t-zinc-600`}>
                    {fmt(colTotals[item])}
                  </td>
                ))}
                <td className={`${TDS} border-t-2 border-t-zinc-600`} />
              </tr>

              {/* ── 経費清算合計 (T-U: ラベル, V: 値) ── */}
              <tr>
                <td colSpan={16} className="py-0.5" />
                <td colSpan={2} className="border-t border-zinc-500 py-0.5 pr-1 text-right text-[10px] font-bold text-zinc-900 dark:border-zinc-500 dark:text-zinc-50">
                  経費清算合計
                </td>
                <td className="border-2 border-zinc-800 px-1 py-0.5 text-right text-[10px] font-bold tabular-nums text-zinc-900 dark:border-zinc-300 dark:text-zinc-50">
                  {fmt(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ── 注釈 ── */}
          <div className="mt-2 space-y-0.5 text-[9px] text-zinc-400 dark:text-zinc-500">
            <p>* 消耗品費：文房具その他の消耗品 / 新聞図書費：仕事の情報収集のための新聞・雑誌・書籍代他</p>
            <p>* 宿泊費　ホテルの名前を支払い先名欄へ必ず記入すること.ホテルでの食事や電話代などは宿泊費へは含まないこと</p>
            <p>* 会議費　1人当たり1万円未満とする</p>
            <p>* 1項目につき、30万円以上の場合は、稟議書を提出のこと</p>
            <p>* すべての経費について、支払先名/内容を記入すること</p>
            <p>* 領収書は別紙に添付し、番号を振ること</p>
            <p>* 名刺作成費はその他へ記入する</p>
          </div>

        </div>
      </div>

      {/* Excelエクスポートボタン */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isExporting ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              出力中...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Excelを出力
            </>
          )}
        </button>
      </div>
    </div>
  );
}
