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
}

const PLAN_TYPE_LABEL: Record<string, string> = {
  Personal: "個人教練",
  FlexiblePersonal: "個人彈性",
  Block: "團體課程",
  Sequential: "團體課程",
};

@Injectable()
export class PdfService {
  private fontPath = path.join(process.cwd(), "fonts", "NotoSansTC-Regular.ttf");
  private fontBoldPath = path.join(process.cwd(), "fonts", "NotoSansTC-Bold.ttf");

  async generateMonthlySummaryPdf(
    month: string,
    rows: MonthlySummaryRow[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      doc.registerFont("NotoSansTC", this.fontPath);
      doc.registerFont("NotoSansTC-Bold", this.fontBoldPath);
      doc.font("NotoSansTC");

      // 依教練分組
      const grouped = new Map<string, MonthlySummaryRow[]>();
      for (const row of rows) {
        if (!grouped.has(row.coachName)) {
          grouped.set(row.coachName, []);
        }
        grouped.get(row.coachName).push(row);
      }

      const headers = ["學員", "計畫類型", "額度", "簽到次數"];
      const tableLeft = 50;
      const totalWidth = doc.page.width - tableLeft * 2;
      const colWidths = [
        totalWidth * 0.3,
        totalWidth * 0.3,
        totalWidth * 0.2,
        totalWidth * 0.2,
      ];
      const rowHeight = 28;
      const headerHeight = 30;

      let isFirstPage = true;

      for (const [coachName, coachRows] of grouped) {
        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;

        // 教練標題（只有教練名）
        doc.font("NotoSansTC-Bold").fontSize(20).fillColor("#000000")
          .text(`${coachName} 教練`, { align: "center" });
        doc.moveDown(1);

        // 表頭
        let yPos = doc.y;
        this.drawTableHeader(doc, tableLeft, yPos, colWidths, headers, totalWidth, headerHeight);
        yPos = doc.y;

        // 表格內容
        doc.font("NotoSansTC").fillColor("#000000").fontSize(11);

        coachRows.forEach((row, index) => {
          if (yPos + rowHeight > doc.page.height - 80) {
            doc.addPage();
            yPos = 50;
            this.drawTableHeader(doc, tableLeft, yPos, colWidths, headers, totalWidth, headerHeight);
            yPos = doc.y;
            doc.font("NotoSansTC").fillColor("#000000").fontSize(11);
          }

          if (index % 2 === 0) {
            doc.rect(tableLeft, yPos, totalWidth, rowHeight).fill("#f5f5f5");
            doc.fillColor("#000000");
          }

          let xPos = tableLeft;
          const values = [
            row.traineeName,
            PLAN_TYPE_LABEL[row.planType] || row.planType,
            String(row.quota),
            String(row.checkinCount),
          ];
          values.forEach((val, i) => {
            doc.text(val, xPos + 8, yPos + 7, {
              width: colWidths[i] - 16,
              align: "center",
            });
            xPos += colWidths[i];
          });

          yPos += rowHeight;
        });
      }

      doc.end();
    });
  }

  private drawTableHeader(
    doc: InstanceType<typeof PDFDocument>,
    tableLeft: number,
    yPos: number,
    colWidths: number[],
    headers: string[],
    totalWidth: number,
    headerHeight: number
  ): void {
    doc.rect(tableLeft, yPos, totalWidth, headerHeight).fill("#333333");
    doc.font("NotoSansTC-Bold").fillColor("#ffffff").fontSize(12);

    let xPos = tableLeft;
    headers.forEach((header, i) => {
      doc.text(header, xPos + 8, yPos + 8, {
        width: colWidths[i] - 16,
        align: "center",
      });
      xPos += colWidths[i];
    });

    doc.y = yPos + headerHeight;
  }
}
