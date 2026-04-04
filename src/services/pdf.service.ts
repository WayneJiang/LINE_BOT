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

export interface SequentialSummaryRow {
  courseName: string;
  courseTime: string;
  coachName: string;
  month: string;
  date: string;
  traineeName: string;
}

@Injectable()
export class PdfService {
  private fontPath = path.join(process.cwd(), "fonts", "NotoSansTC-Regular.ttf");
  private fontBoldPath = path.join(process.cwd(), "fonts", "NotoSansTC-Bold.ttf");

  async generateMonthlySummaryPdf(
    month: string,
    rows: MonthlySummaryRow[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const pdfDocument = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];

      pdfDocument.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDocument.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDocument.on("error", reject);

      pdfDocument.registerFont("NotoSansTC", this.fontPath);
      pdfDocument.registerFont("NotoSansTC-Bold", this.fontBoldPath);
      pdfDocument.font("NotoSansTC");

      // 依教練分組
      const grouped = new Map<string, MonthlySummaryRow[]>();
      for (const row of rows) {
        if (!grouped.has(row.coachName)) {
          grouped.set(row.coachName, []);
        }
        grouped.get(row.coachName).push(row);
      }

      const headers = ["學員", "簽到紀錄", "上課次數"];
      const tableLeft = 50;
      const totalWidth = pdfDocument.page.width - tableLeft * 2;
      const colWidths = [
        totalWidth * 0.25,
        totalWidth * 0.50,
        totalWidth * 0.25,
      ];
      const lineHeight = 16;
      const cellPadding = 7;
      const headerHeight = 30;

      let isFirstPage = true;

      for (const [coachName, coachRows] of grouped) {
        if (!isFirstPage) {
          pdfDocument.addPage();
        }
        isFirstPage = false;

        // 教練標題
        pdfDocument.font("NotoSansTC-Bold").fontSize(20).fillColor("#000000")
          .text(`${coachName} 教練 — 個人教練計畫`, { align: "center" });
        pdfDocument.font("NotoSansTC").fontSize(12).fillColor("#666666")
          .text(`${month} 月份報表`, { align: "center" });
        pdfDocument.moveDown(1);

        // 表頭
        let headerY = pdfDocument.y;
        this.drawTableHeader(pdfDocument, tableLeft, headerY, colWidths, headers, totalWidth, headerHeight);
        headerY = pdfDocument.y;

        // 表格內容
        pdfDocument.font("NotoSansTC").fillColor("#000000").fontSize(11);

        let totalCheckins = 0;

        coachRows.forEach((row, index) => {
          const dates = (row.checkinDates || "—").split("\n");
          const rowHeight = Math.max(dates.length, 1) * lineHeight + cellPadding * 2;

          if (headerY + rowHeight > pdfDocument.page.height - 120) {
            pdfDocument.addPage();
            headerY = 50;
            this.drawTableHeader(pdfDocument, tableLeft, headerY, colWidths, headers, totalWidth, headerHeight);
            headerY = pdfDocument.y;
            pdfDocument.font("NotoSansTC").fillColor("#000000").fontSize(11);
          }

          if (index % 2 === 0) {
            pdfDocument.rect(tableLeft, headerY, totalWidth, rowHeight).fill("#f5f5f5");
            pdfDocument.fillColor("#000000");
          }

          // 學員名稱（垂直置中）
          const nameY = headerY + (rowHeight - lineHeight) / 2;
          pdfDocument.text(row.traineeName, tableLeft + 8, nameY, {
            width: colWidths[0] - 16,
            align: "center",
          });

          // 簽到紀錄（逐行列出）
          dates.forEach((date, di) => {
            pdfDocument.text(date, tableLeft + colWidths[0] + 8, headerY + cellPadding + di * lineHeight, {
              width: colWidths[1] - 16,
              align: "center",
            });
          });

          // 上課次數（垂直置中）
          const countY = headerY + (rowHeight - lineHeight) / 2;
          pdfDocument.text(String(row.checkinCount), tableLeft + colWidths[0] + colWidths[1] + 8, countY, {
            width: colWidths[2] - 16,
            align: "center",
          });

          totalCheckins += row.checkinCount;
          headerY += rowHeight;
        });

        // 頁末統計教練總上課次數
        headerY += 10;
        if (headerY + 40 > pdfDocument.page.height - 50) {
          pdfDocument.addPage();
          headerY = 50;
        }
        pdfDocument.rect(tableLeft, headerY, totalWidth, 36).fill("#e8f4fd");
        pdfDocument.font("NotoSansTC-Bold").fontSize(14).fillColor("#333333")
          .text(`總上課次數：${totalCheckins}`, tableLeft, headerY + 9, {
            width: totalWidth,
            align: "center",
          });
      }

      pdfDocument.end();
    });
  }

  async generateSequentialSummaryPdf(
    month: string,
    rows: SequentialSummaryRow[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const pdfDocument = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];

      pdfDocument.on("data", (chunk: Buffer) => chunks.push(chunk));
      pdfDocument.on("end", () => resolve(Buffer.concat(chunks)));
      pdfDocument.on("error", reject);

      pdfDocument.registerFont("NotoSansTC", this.fontPath);
      pdfDocument.registerFont("NotoSansTC-Bold", this.fontBoldPath);
      pdfDocument.font("NotoSansTC");

      // 依課程分組，再依日期分組
      const courseMap = new Map<string, { courseTime: string; coachName: string; dates: Map<string, string[]> }>();
      for (const row of rows) {
        const key = row.courseName;
        if (!courseMap.has(key)) {
          courseMap.set(key, { courseTime: row.courseTime, coachName: row.coachName, dates: new Map() });
        }
        const course = courseMap.get(key);
        if (!course.dates.has(row.date)) {
          course.dates.set(row.date, []);
        }
        course.dates.get(row.date).push(row.traineeName);
      }

      const tableLeft = 50;
      const totalWidth = pdfDocument.page.width - tableLeft * 2;
      const headers = ["日期", "學員", "上課人數"];
      const colWidths = [
        totalWidth * 0.20,
        totalWidth * 0.55,
        totalWidth * 0.25,
      ];
      const lineHeight = 16;
      const cellPadding = 7;
      const headerHeight = 30;

      let isFirstPage = true;

      for (const [courseName, course] of courseMap) {
        if (!isFirstPage) {
          pdfDocument.addPage();
        }
        isFirstPage = false;

        // 課程標題
        pdfDocument.font("NotoSansTC-Bold").fontSize(20).fillColor("#000000")
          .text(`${course.courseTime} ${courseName}`, { align: "center" });
        pdfDocument.font("NotoSansTC").fontSize(12).fillColor("#666666")
          .text(`${course.coachName} 教練`, { align: "center" });
        pdfDocument.moveDown(1);

        // 表頭
        let headerY = pdfDocument.y;
        this.drawTableHeader(pdfDocument, tableLeft, headerY, colWidths, headers, totalWidth, headerHeight);
        headerY = pdfDocument.y;

        pdfDocument.font("NotoSansTC").fillColor("#000000").fontSize(11);

        let totalAttendees = 0;
        let rowIndex = 0;

        for (const [date, trainees] of course.dates) {
          const rowHeight = Math.max(trainees.length, 1) * lineHeight + cellPadding * 2;

          if (headerY + rowHeight > pdfDocument.page.height - 120) {
            pdfDocument.addPage();
            headerY = 50;
            this.drawTableHeader(pdfDocument, tableLeft, headerY, colWidths, headers, totalWidth, headerHeight);
            headerY = pdfDocument.y;
            pdfDocument.font("NotoSansTC").fillColor("#000000").fontSize(11);
          }

          if (rowIndex % 2 === 0) {
            pdfDocument.rect(tableLeft, headerY, totalWidth, rowHeight).fill("#f5f5f5");
            pdfDocument.fillColor("#000000");
          }

          // 日期（垂直置中）
          const dateY = headerY + (rowHeight - lineHeight) / 2;
          pdfDocument.text(date, tableLeft + 8, dateY, {
            width: colWidths[0] - 16,
            align: "center",
          });

          // 學員（逐行列出）
          trainees.forEach((name, ni) => {
            pdfDocument.text(name, tableLeft + colWidths[0] + 8, headerY + cellPadding + ni * lineHeight, {
              width: colWidths[1] - 16,
              align: "center",
            });
          });

          // 上課人數（垂直置中）
          const countY = headerY + (rowHeight - lineHeight) / 2;
          pdfDocument.text(String(trainees.length), tableLeft + colWidths[0] + colWidths[1] + 8, countY, {
            width: colWidths[2] - 16,
            align: "center",
          });

          totalAttendees += trainees.length;
          headerY += rowHeight;
          rowIndex++;
        }

        // 頁末統計總上課人數
        headerY += 10;
        if (headerY + 40 > pdfDocument.page.height - 50) {
          pdfDocument.addPage();
          headerY = 50;
        }
        pdfDocument.rect(tableLeft, headerY, totalWidth, 36).fill("#e8f4fd");
        pdfDocument.font("NotoSansTC-Bold").fontSize(14).fillColor("#333333")
          .text(`總上課人次：${totalAttendees}`, tableLeft, headerY + 9, {
            width: totalWidth,
            align: "center",
          });
      }

      pdfDocument.end();
    });
  }

  private drawTableHeader(
    pdfDocument: InstanceType<typeof PDFDocument>,
    tableLeft: number,
    headerY: number,
    colWidths: number[],
    headers: string[],
    totalWidth: number,
    headerHeight: number
  ): void {
    pdfDocument.rect(tableLeft, headerY, totalWidth, headerHeight).fill("#333333");
    pdfDocument.font("NotoSansTC-Bold").fillColor("#ffffff").fontSize(12);

    let x = tableLeft;
    headers.forEach((header, i) => {
      pdfDocument.text(header, x + 8, headerY + 8, {
        width: colWidths[i] - 16,
        align: "center",
      });
      x += colWidths[i];
    });

    pdfDocument.y = headerY + headerHeight;
  }
}
