import { save } from "@tauri-apps/plugin-dialog";
import { FileService } from "./FileService";

export interface LabReportData {
  institution: string;
  course: string;
  title: string;
  studentName: string;
  rollNo: string;
  date: string;
  objective: string;
  code: string;
  fileName: string;
  terminalOutput: string;
  screenshotUrl?: string;
}

export class ReportService {
  /**
   * Generates a beautifully styled, self-contained HTML document for the Lab Report.
   */
  static generateHtml(data: LabReportData): string {
    const escapedCode = (data.code || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const escapedOutput = (data.terminalOutput || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${data.title || "Lab Report"} - ${data.studentName}</title>
  <style>
    @media print {
      body { background: #fff !important; color: #000 !important; }
      .no-print { display: none !important; }
      .report-container { border: 1px solid #ccc !important; box-shadow: none !important; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0f0f17;
      color: #e2e8f0;
      margin: 0;
      padding: 40px 20px;
    }
    .report-container {
      max-width: 850px;
      margin: 0 auto;
      background: #181824;
      border: 1px solid #2d3748;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #319795;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 26px;
      color: #319795;
      letter-spacing: 0.5px;
    }
    .header h2 {
      margin: 0 0 6px 0;
      font-size: 18px;
      font-weight: 500;
      color: #a0aec0;
    }
    .header h3 {
      margin: 0;
      font-size: 20px;
      color: #e2e8f0;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      background: #1a202c;
      border-radius: 8px;
      overflow: hidden;
    }
    .meta-table td {
      padding: 12px 16px;
      border: 1px solid #2d3748;
      font-size: 14px;
    }
    .meta-label {
      font-weight: bold;
      color: #319795;
      width: 25%;
    }
    .section-title {
      font-size: 18px;
      color: #ffb000;
      border-left: 4px solid #ffb000;
      padding-left: 10px;
      margin: 30px 0 15px 0;
    }
    .objective-box {
      background: #1a202c;
      border-left: 4px solid #319795;
      padding: 15px;
      border-radius: 4px;
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 25px;
    }
    pre {
      background: #0b0b12;
      border: 1px solid #2d3748;
      border-radius: 8px;
      padding: 16px;
      font-family: "JetBrains Mono", "Courier New", monospace;
      font-size: 13px;
      line-height: 1.5;
      overflow-x: auto;
      color: #ffb000;
    }
    .terminal-box {
      background: #050508;
      border: 1px solid #ffb000;
      border-radius: 8px;
      padding: 16px;
      font-family: "JetBrains Mono", monospace;
      font-size: 13px;
      color: #48bb78;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #718096;
      border-top: 1px solid #2d3748;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <div class="header">
      ${data.institution ? `<h1>${data.institution}</h1>` : ""}
      ${data.course ? `<h2>${data.course}</h2>` : ""}
      <h3>${data.title || "Lab Report"}</h3>
    </div>

    <table class="meta-table">
      <tr>
        <td class="meta-label">Student Name:</td>
        <td>${data.studentName || "N/A"}</td>
        <td class="meta-label">Roll / ID:</td>
        <td>${data.rollNo || "N/A"}</td>
      </tr>
      <tr>
        <td class="meta-label">Date:</td>
        <td>${data.date}</td>
        <td class="meta-label">File Name:</td>
        <td>${data.fileName || "main.c"}</td>
      </tr>
    </table>

    ${
      data.objective
        ? `<div class="section-title">🎯 Objective / Problem Statement</div>
           <div class="objective-box">${data.objective}</div>`
        : ""
    }

    ${
      data.code
        ? `<div class="section-title">💻 Source Code (${data.fileName || "main.c"})</div>
           <pre><code>${escapedCode}</code></pre>`
        : ""
    }

    ${
      data.terminalOutput
        ? `<div class="section-title">🖥️ Program Execution Output</div>
           <div class="terminal-box">${escapedOutput}</div>`
        : ""
    }

    <div class="footer">
      Generated automatically with C-Shell IDE v0.2.1 • Professional Edition
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generates Markdown content for the Lab Report.
   */
  static generateMarkdown(data: LabReportData): string {
    return `# ${data.institution ? data.institution + " - " : ""}${data.title || "Lab Report"}

**Course:** ${data.course || "N/A"}  
**Student Name:** ${data.studentName || "N/A"}  
**Roll / ID:** ${data.rollNo || "N/A"}  
**Date:** ${data.date}  
**File:** ${data.fileName || "main.c"}  

---

## 🎯 Objective / Problem Statement
${data.objective || "N/A"}

---

## 💻 Source Code
\`\`\`c
${data.code || ""}
\`\`\`

---

## 🖥️ Execution Output
\`\`\`text
${data.terminalOutput || "No execution output available."}
\`\`\`

---
*Generated with C-Shell IDE v0.2.1*
`;
  }

  /**
   * Triggers browser native Print window (ideal for saving as PDF).
   */
  static printPdf(data: LabReportData): void {
    const htmlContent = this.generateHtml(data);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Could not open print window. Please allow popups.");
      return;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 400);
  }

  /**
   * Saves the report as HTML or Markdown natively using Tauri dialog and FileService.
   */
  static async saveReportFile(
    content: string,
    extension: "html" | "md",
    defaultName: string = "Lab_Report"
  ): Promise<boolean> {
    const fileName = `${defaultName}.${extension}`;

    let filePath: string | null = null;
    try {
      filePath = await save({
        defaultPath: fileName,
        filters: [
          {
            name: extension === "html" ? "HTML File" : "Markdown File",
            extensions: [extension],
          },
        ],
      });
    } catch (e) {
      console.warn("Tauri save report dialog error:", e);
    }

    if (filePath) {
      await FileService.writeFile(filePath, content);
      return true;
    }

    // Fallback: Browser blob download trigger
    const mimeType = extension === "html" ? "text/html" : "text/markdown";
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }
}
