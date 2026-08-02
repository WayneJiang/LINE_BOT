import { Injectable } from "@nestjs/common";
import PDFDocument from "pdfkit";
import * as path from "path";

export interface MonthlySummaryRow {
  coachName: string;
  traineeName: string;
  planType: string;
  month: string;
  quota: number;
  checkinCount: number;
  checkinDates: string;
}

export interface GroupFitnessSummaryRow {
  courseId: number;
  courseName: string;
  courseTime: string;
  coachName: string;
  month: string;
  date: string;
  traineeName: string;
}

export interface YearlySummaryRow {
  coachName: string;
  year: string;
  totalAttendees: number;
  totalSessions: number;
}

interface TableColumn {
  header: string;
  /** 佔可用寬度的比例，一張表加總為 1 */
  ratio: number;
  align?: "left" | "center" | "right";
}

interface StatCard {
  label: string;
  value: string;
}

type Pdf = InstanceType<typeof PDFDocument>;

const PLAN_TYPE_LABEL: Record<string, string> = {
  PrivateTraining: "個人教練",
  FlexPrivate: "個人彈性",
  SemiPrivate: "個人小班",
  GroupFitness: "團體課程",
};

/** 版面常數集中管理，避免各處魔術數字對不上 */
const LAYOUT = {
  margin: 50,
  /** 內容底線，其下留給頁尾統計條與頁碼 */
  bottomLimit: 92,
  cellPadding: 6,
  bodyFontSize: 9.5,
  headerHeight: 26,
};

/**
 * 對齊前端 style.css 的企業色系（light theme）：
 * 品牌紅 --color-primary-brand / --color-primary-hover，
 * 中性色沿用同一條 slate 色階。
 *
 * 文字比網站的 --color-text (#334155) 再深一階：網頁字級大、螢幕自帶對比，
 * 報表主體只有 9.5pt 且要能列印，太淡會糊成灰色。
 */
const COLOR = {
  text: "#0f172a",
  muted: "#475569",
  line: "#cbd5e1",
  /** 深一階的品牌紅，配白字對比才足夠 */
  tableHead: "#b71c1c",
  zebra: "#f8fafc",
  cardBg: "#f0f4f8",
  accent: "#d32f2f",
  summaryBg: "#fdecea",
  pageNumber: "#64748b",
};

@Injectable()
export class PdfService {
  private fontPath = path.join(
    process.cwd(),
    "fonts",
    "NotoSansTC-Regular.ttf",
  );
  private fontBoldPath = path.join(
    process.cwd(),
    "fonts",
    "NotoSansTC-Bold.ttf",
  );

  /* ------------------------------------------------------------------ *
   * 版面元件
   * ------------------------------------------------------------------ */

  private contentWidth(pdfDocument: Pdf): number {
    return pdfDocument.page.width - LAYOUT.margin * 2;
  }

  /** 每頁共用的頁首：左標題、右期間、底部細線。回傳表格可以開始的 y */
  private drawPageHeader(
    pdfDocument: Pdf,
    title: string,
    period: string,
  ): number {
    const left = LAYOUT.margin;
    const width = this.contentWidth(pdfDocument);
    const top = LAYOUT.margin;

    pdfDocument
      .font("NotoSansTC-Bold")
      .fontSize(15)
      .fillColor(COLOR.text)
      .text(title, left, top, { width, align: "left" });
    pdfDocument
      .font("NotoSansTC")
      .fontSize(10)
      .fillColor(COLOR.muted)
      .text(period, left, top + 4, { width, align: "right" });

    const lineY = top + 24;
    pdfDocument
      .moveTo(left, lineY)
      .lineTo(left + width, lineY)
      .lineWidth(0.8)
      .strokeColor(COLOR.line)
      .stroke();

    return lineY + 14;
  }

  /** 總覽頁上方的數字卡片列 */
  private drawStatCards(
    pdfDocument: Pdf,
    y: number,
    cards: StatCard[],
  ): number {
    const left = LAYOUT.margin;
    const width = this.contentWidth(pdfDocument);
    const gap = 10;
    const cardWidth = (width - gap * (cards.length - 1)) / cards.length;
    const cardHeight = 54;

    cards.forEach((card, index) => {
      const x = left + index * (cardWidth + gap);
      pdfDocument
        .roundedRect(x, y, cardWidth, cardHeight, 4)
        .fill(COLOR.cardBg);
      pdfDocument
        .font("NotoSansTC")
        .fontSize(9)
        .fillColor(COLOR.muted)
        .text(card.label, x, y + 11, { width: cardWidth, align: "center" });
      pdfDocument
        .font("NotoSansTC-Bold")
        .fontSize(16)
        .fillColor(COLOR.accent)
        .text(card.value, x, y + 26, { width: cardWidth, align: "center" });
    });

    return y + cardHeight;
  }

  private drawTableHead(
    pdfDocument: Pdf,
    columns: TableColumn[],
    widths: number[],
    y: number,
  ): number {
    const left = LAYOUT.margin;
    const width = this.contentWidth(pdfDocument);

    pdfDocument.rect(left, y, width, LAYOUT.headerHeight).fill(COLOR.tableHead);
    pdfDocument.font("NotoSansTC-Bold").fontSize(10).fillColor("#ffffff");

    let x = left;
    columns.forEach((column, index) => {
      pdfDocument.text(column.header, x + LAYOUT.cellPadding, y + 7.5, {
        width: widths[index] - LAYOUT.cellPadding * 2,
        align: column.align ?? "left",
      });
      x += widths[index];
    });

    return y + LAYOUT.headerHeight;
  }

  /**
   * 繪製表格，內容過長會自動換頁並重畫頁首與表頭。
   * 列高改由 heightOfString 量測，長字串（例如一整個月的簽到日期）
   * 會自動折行而不是一筆佔一列，頁數因此大幅縮短。
   */
  private drawTable(
    pdfDocument: Pdf,
    columns: TableColumn[],
    rows: string[][],
    startY: number,
    onNewPage: (pdfDocument: Pdf) => number,
  ): number {
    const left = LAYOUT.margin;
    const width = this.contentWidth(pdfDocument);
    const widths = columns.map((column) => width * column.ratio);
    const limit = pdfDocument.page.height - LAYOUT.bottomLimit;

    let y = this.drawTableHead(pdfDocument, columns, widths, startY);

    rows.forEach((cells, rowIndex) => {
      pdfDocument.font("NotoSansTC").fontSize(LAYOUT.bodyFontSize);

      const rowHeight =
        Math.max(
          ...cells.map((cell, index) =>
            pdfDocument.heightOfString(cell || "—", {
              width: widths[index] - LAYOUT.cellPadding * 2,
            }),
          ),
        ) +
        LAYOUT.cellPadding * 2;

      if (y + rowHeight > limit) {
        pdfDocument.addPage();
        y = this.drawTableHead(
          pdfDocument,
          columns,
          widths,
          onNewPage(pdfDocument),
        );
        pdfDocument.font("NotoSansTC").fontSize(LAYOUT.bodyFontSize);
      }

      if (rowIndex % 2 === 1) {
        pdfDocument.rect(left, y, width, rowHeight).fill(COLOR.zebra);
      }

      pdfDocument.fillColor(COLOR.text);
      let x = left;
      cells.forEach((cell, index) => {
        pdfDocument.text(
          cell || "—",
          x + LAYOUT.cellPadding,
          y + LAYOUT.cellPadding,
          {
            width: widths[index] - LAYOUT.cellPadding * 2,
            align: columns[index].align ?? "left",
          },
        );
        x += widths[index];
      });

      y += rowHeight;
    });

    return y;
  }

  /** 表格下方的小計條 */
  private drawSummaryBar(pdfDocument: Pdf, y: number, text: string): number {
    const left = LAYOUT.margin;
    const width = this.contentWidth(pdfDocument);
    const height = 28;

    pdfDocument.rect(left, y, width, height).fill(COLOR.summaryBg);
    pdfDocument
      .font("NotoSansTC-Bold")
      .fontSize(11)
      .fillColor(COLOR.tableHead)
      .text(text, left, y + 8, { width, align: "center" });

    return y + height;
  }

  private drawNote(pdfDocument: Pdf, y: number, text: string): number {
    pdfDocument
      .font("NotoSansTC")
      .fontSize(8)
      .fillColor(COLOR.muted)
      .text(text, LAYOUT.margin, y + 8, {
        width: this.contentWidth(pdfDocument),
        align: "left",
      });
    return pdfDocument.y;
  }

  /**
   * 最後統一補頁碼與產出時間。
   * 需要 bufferPages，否則寫第 1 頁時還不知道總頁數。
   */
  private drawFooters(pdfDocument: Pdf, generatedAt: string): void {
    const range = pdfDocument.bufferedPageRange();

    for (let i = range.start; i < range.start + range.count; i++) {
      pdfDocument.switchToPage(i);

      // 頁尾位在下邊界之外，暫時解除邊界避免 pdfkit 判定溢位而插入新頁
      const bottom = pdfDocument.page.margins.bottom;
      pdfDocument.page.margins.bottom = 0;

      const y = pdfDocument.page.height - 34;
      const width = this.contentWidth(pdfDocument);
      pdfDocument
        .font("NotoSansTC")
        .fontSize(8)
        .fillColor(COLOR.pageNumber)
        .text(generatedAt, LAYOUT.margin, y, { width, align: "left" })
        .text(`${i + 1} / ${range.count}`, LAYOUT.margin, y, {
          width,
          align: "right",
        });

      pdfDocument.page.margins.bottom = bottom;
    }
  }

  private createDocument(): Pdf {
    const pdfDocument = new PDFDocument({
      size: "A4",
      margin: LAYOUT.margin,
      bufferPages: true,
    });
    pdfDocument.registerFont("NotoSansTC", this.fontPath);
    pdfDocument.registerFont("NotoSansTC-Bold", this.fontBoldPath);
    pdfDocument.font("NotoSansTC");
    return pdfDocument;
  }

  /** 2026-07 → 2026 年 7 月 */
  private formatPeriod(month: string): string {
    const [year, monthPart] = month.split("-");
    return `${year} 年 ${Number(monthPart)} 月`;
  }

  private formatGeneratedAt(): string {
    const now = new Date().toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    return `產出時間 ${now}`;
  }

  /* ------------------------------------------------------------------ *
   * 個人教練課程
   * ------------------------------------------------------------------ */

  async generateMonthlySummaryPdf(
    month: string,
    rows: MonthlySummaryRow[],
    yearlyRows: YearlySummaryRow[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const pdfDocument = this.createDocument();
      const chunks: Buffer[] = [];
      pdfDocument.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDocument.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDocument.on("error", reject);

      const period = this.formatPeriod(month);
      const year = month.split("-")[0];

      const grouped = new Map<string, MonthlySummaryRow[]>();
      for (const row of rows) {
        if (!grouped.has(row.coachName)) {
          grouped.set(row.coachName, []);
        }
        grouped.get(row.coachName).push(row);
      }

      this.drawPrivateOverview(
        pdfDocument,
        period,
        year,
        grouped,
        rows,
        yearlyRows,
      );

      for (const [coachName, coachRows] of grouped) {
        pdfDocument.addPage();

        const title = `${coachName} 教練 — 個人教練課程`;
        let y = this.drawPageHeader(pdfDocument, title, period);

        const columns: TableColumn[] = [
          { header: "學員", ratio: 0.16 },
          { header: "方案", ratio: 0.13, align: "center" },
          { header: "額度", ratio: 0.08, align: "center" },
          { header: "次數", ratio: 0.08, align: "center" },
          { header: "簽到日期", ratio: 0.55 },
        ];

        const body = coachRows.map((row) => [
          row.traineeName,
          PLAN_TYPE_LABEL[row.planType] ?? row.planType,
          String(row.quota),
          String(row.checkinCount),
          // 原本一天一行，改成頓號串接後交給表格自動折行
          (row.checkinDates || "").split("\n").filter(Boolean).join("、"),
        ]);

        y = this.drawTable(pdfDocument, columns, body, y, (document) =>
          this.drawPageHeader(document, `${title}`, period),
        );

        const totalCheckins = coachRows.reduce(
          (sum, row) => sum + row.checkinCount,
          0,
        );
        const traineeCount = new Set(coachRows.map((row) => row.traineeName))
          .size;
        this.drawSummaryBar(
          pdfDocument,
          y + 10,
          `本月合計 ｜ 學員 ${traineeCount} 人 ｜ 上課 ${totalCheckins} 次`,
        );
      }

      this.drawFooters(pdfDocument, this.formatGeneratedAt());
      pdfDocument.end();
    });
  }

  private drawPrivateOverview(
    pdfDocument: Pdf,
    period: string,
    year: string,
    grouped: Map<string, MonthlySummaryRow[]>,
    rows: MonthlySummaryRow[],
    yearlyRows: YearlySummaryRow[],
  ): void {
    let y = this.drawPageHeader(pdfDocument, "個人教練課程統計", period);

    const monthlyTotal = rows.reduce((sum, row) => sum + row.checkinCount, 0);
    const traineeTotal = new Set(rows.map((row) => row.traineeName)).size;
    const yearlyTotal = yearlyRows.reduce(
      (sum, row) => sum + row.totalSessions,
      0,
    );

    y = this.drawStatCards(pdfDocument, y, [
      { label: "本月上課", value: `${monthlyTotal} 次` },
      { label: "教練", value: `${grouped.size} 位` },
      { label: "學員", value: `${traineeTotal} 人` },
      { label: `${year} 年累計`, value: `${yearlyTotal} 次` },
    ]);

    const columns: TableColumn[] = [
      { header: "教練", ratio: 0.28 },
      { header: "本月次數", ratio: 0.18, align: "center" },
      { header: "本月學員", ratio: 0.18, align: "center" },
      { header: `${year} 年次數`, ratio: 0.18, align: "center" },
      { header: `${year} 年學員`, ratio: 0.18, align: "center" },
    ];

    const yearlyByCoach = new Map(
      yearlyRows.map((row) => [row.coachName, row]),
    );
    const coachNames = [
      ...new Set([...grouped.keys(), ...yearlyByCoach.keys()]),
    ].sort((a, b) => a.localeCompare(b, "zh-TW"));

    const body = coachNames.map((coachName) => {
      const coachRows = grouped.get(coachName) ?? [];
      const yearly = yearlyByCoach.get(coachName);
      return [
        coachName,
        String(coachRows.reduce((sum, row) => sum + row.checkinCount, 0)),
        String(new Set(coachRows.map((row) => row.traineeName)).size),
        String(yearly?.totalSessions ?? 0),
        String(yearly?.totalAttendees ?? 0),
      ];
    });

    body.push([
      "合計",
      String(monthlyTotal),
      String(traineeTotal),
      String(yearlyTotal),
      String(yearlyRows.reduce((sum, row) => sum + row.totalAttendees, 0)),
    ]);

    y = this.drawTable(pdfDocument, columns, body, y + 16, (document) =>
      this.drawPageHeader(document, "個人教練課程統計", period),
    );

    this.drawNote(
      pdfDocument,
      y,
      `「本月學員」「${year} 年學員」為該教練服務的不重複人數；` +
        `合計列的年度學員數為各教練相加，同時跟隨多位教練的學員會重複計入。`,
    );
  }

  /* ------------------------------------------------------------------ *
   * 團體課程
   * ------------------------------------------------------------------ */

  async generateGroupFitnessSummaryPdf(
    month: string,
    rows: GroupFitnessSummaryRow[],
    yearlyRows: YearlySummaryRow[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const pdfDocument = this.createDocument();
      const chunks: Buffer[] = [];
      pdfDocument.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDocument.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDocument.on("error", reject);

      const period = this.formatPeriod(month);
      const year = month.split("-")[0];

      // 以 courseId 分組：同名課程常有多個時段甚至分屬不同教練，
      // 用名稱會把它們併成一頁，標題只剩其中一堂，人次也會算到錯的教練頭上
      const courseMap = new Map<
        number,
        {
          courseName: string;
          courseTime: string;
          coachName: string;
          dates: Map<string, string[]>;
        }
      >();
      for (const row of rows) {
        if (!courseMap.has(row.courseId)) {
          courseMap.set(row.courseId, {
            courseName: row.courseName,
            courseTime: row.courseTime,
            coachName: row.coachName,
            dates: new Map(),
          });
        }
        // 當月無人上課的課程只有佔位列（date 為空），建了分頁就好
        if (!row.date) {
          continue;
        }
        const course = courseMap.get(row.courseId);
        if (!course.dates.has(row.date)) {
          course.dates.set(row.date, []);
        }
        course.dates.get(row.date).push(row.traineeName);
      }

      this.drawGroupOverview(pdfDocument, period, year, courseMap, yearlyRows);

      pdfDocument.addPage();
      const title = "團體課程明細";
      let y = this.drawPageHeader(pdfDocument, title, period);

      const columns: TableColumn[] = [
        { header: "日期", ratio: 0.14, align: "center" },
        { header: "學員", ratio: 0.66 },
        { header: "人數", ratio: 0.2, align: "center" },
      ];

      for (const course of courseMap.values()) {
        const attendees = [...course.dates.values()].reduce(
          (sum, names) => sum + names.length,
          0,
        );

        // 課程之間不強制分頁，但要確保標題不會被單獨留在頁尾
        const needed = 26 + LAYOUT.headerHeight + 40;
        if (y + needed > pdfDocument.page.height - LAYOUT.bottomLimit) {
          pdfDocument.addPage();
          y = this.drawPageHeader(pdfDocument, `${title}`, period);
        }

        pdfDocument
          .font("NotoSansTC-Bold")
          .fontSize(12)
          .fillColor(COLOR.text)
          .text(
            course.courseTime
              ? `${course.courseName} ｜ ${course.courseTime}`
              : course.courseName,
            LAYOUT.margin,
            y,
            { width: this.contentWidth(pdfDocument), align: "left" },
          );
        pdfDocument
          .font("NotoSansTC")
          .fontSize(10)
          .fillColor(COLOR.muted)
          .text(
            `${course.coachName} 教練 ｜ ${attendees} 人次`,
            LAYOUT.margin,
            y + 1,
            { width: this.contentWidth(pdfDocument), align: "right" },
          );
        y += 20;

        const body =
          course.dates.size === 0
            ? [["—", "本月無人上課", "0"]]
            : [...course.dates.entries()].map(([date, names]) => [
                date,
                names.join("、"),
                String(names.length),
              ]);

        y =
          this.drawTable(pdfDocument, columns, body, y, (document) =>
            this.drawPageHeader(document, `${title}`, period),
          ) + 18;
      }

      this.drawFooters(pdfDocument, this.formatGeneratedAt());
      pdfDocument.end();
    });
  }

  private drawGroupOverview(
    pdfDocument: Pdf,
    period: string,
    year: string,
    courseMap: Map<
      number,
      {
        courseName: string;
        courseTime: string;
        coachName: string;
        dates: Map<string, string[]>;
      }
    >,
    yearlyRows: YearlySummaryRow[],
  ): void {
    let y = this.drawPageHeader(pdfDocument, "團體課程統計", period);

    const courses = [...courseMap.values()];
    const attendeesOf = (course: { dates: Map<string, string[]> }): number =>
      [...course.dates.values()].reduce((sum, names) => sum + names.length, 0);

    const totalAttendees = courses.reduce(
      (sum, course) => sum + attendeesOf(course),
      0,
    );
    const traineeTotal = new Set(
      courses.flatMap((course) => [...course.dates.values()].flat()),
    ).size;
    const yearlyTrainees = yearlyRows.reduce(
      (sum, row) => sum + row.totalAttendees,
      0,
    );

    y = this.drawStatCards(pdfDocument, y, [
      { label: "本月上課", value: `${totalAttendees} 人次` },
      { label: "課程", value: `${courses.length} 堂` },
      { label: "本月學員", value: `${traineeTotal} 人` },
      { label: `${year} 年學員`, value: `${yearlyTrainees} 人` },
    ]);

    const columns: TableColumn[] = [
      { header: "課程", ratio: 0.3 },
      { header: "時段", ratio: 0.28 },
      { header: "教練", ratio: 0.22 },
      { header: "人次", ratio: 0.2, align: "center" },
    ];

    const body = courses.map((course) => [
      course.courseName,
      course.courseTime || "—",
      course.coachName,
      String(attendeesOf(course)),
    ]);
    body.push(["合計", "", "", String(totalAttendees)]);

    y = this.drawTable(pdfDocument, columns, body, y + 16, (document) =>
      this.drawPageHeader(document, "團體課程統計", period),
    );

    this.drawNote(
      pdfDocument,
      y,
      "「人次」為累計簽到人數，同一學員上多堂課會分別計入；" +
        `「${year} 年學員」為各教練服務的不重複人數相加；` +
        "「未指定課程」為簽到時未選擇課程的紀錄，需補登後才能歸入正確課程。",
    );
  }
}
