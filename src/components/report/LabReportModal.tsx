import { useRef, useState } from "react";
import { LabReportData, ReportService } from "../../services/ReportService";

interface LabReportModalProps {
  code: string;
  fileName: string;
  terminalOutput: string;
  onClose: () => void;
}

export function LabReportModal({
  code,
  fileName,
  terminalOutput,
  onClose,
}: LabReportModalProps) {
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [busy, setBusy] = useState(false);
  const printIframeRef = useRef<HTMLIFrameElement>(null);

  const [institution, setInstitution] = useState("Tribhuvan University");
  const [course, setCourse] = useState("C Programming Lab (CSC-101)");
  const [title, setTitle] = useState("Lab Experiment: Program Output Analysis");
  const [studentName, setStudentName] = useState("Student Name");
  const [rollNo, setRollNo] = useState("01");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [objective, setObjective] = useState(
    "To write a C program, compile and execute it using C-Shell IDE, and analyze the resulting terminal output."
  );

  const [includeCode, setIncludeCode] = useState(true);
  const [includeOutput, setIncludeOutput] = useState(true);

  const getReportData = (): LabReportData => ({
    institution,
    course,
    title,
    studentName,
    rollNo,
    date,
    objective,
    code: includeCode ? code : "",
    fileName: fileName || "main.c",
    terminalOutput: includeOutput ? terminalOutput : "",
  });

  const handlePrintPdf = () => {
    const iframe = printIframeRef.current;
    if (!iframe) {
      ReportService.printPdf(getReportData());
      return;
    }
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(ReportService.generateHtml(getReportData()));
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 300);
  };

  const handleSaveHtml = async () => {
    setBusy(true);
    try {
      const html = ReportService.generateHtml(getReportData());
      const defaultName = `${(fileName || "Lab_Report").replace(/\.c$/, "")}_Report`;
      const saved = await ReportService.saveReportFile(html, "html", defaultName);
      if (saved) alert("🌐 HTML Lab Report saved!");
    } catch (e) {
      alert(`Failed to save HTML report: ${e}`);
    }
    setBusy(false);
  };

  const handleSaveMarkdown = async () => {
    setBusy(true);
    try {
      const md = ReportService.generateMarkdown(getReportData());
      const defaultName = `${(fileName || "Lab_Report").replace(/\.c$/, "")}_Report`;
      const saved = await ReportService.saveReportFile(md, "md", defaultName);
      if (saved) alert("📝 Markdown Lab Report saved!");
    } catch (e) {
      alert(`Failed to save Markdown report: ${e}`);
    }
    setBusy(false);
  };

  const reportHtml = ReportService.generateHtml(getReportData());

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📄 Academic Lab Report Generator</h3>
          <div className="tab-switch">
            <button
              className={`switch-btn ${activeTab === "form" ? "active" : ""}`}
              onClick={() => setActiveTab("form")}
            >
              ✏️ Form Inputs
            </button>
            <button
              className={`switch-btn ${activeTab === "preview" ? "active" : ""}`}
              onClick={() => setActiveTab("preview")}
            >
              👁️ Live Preview
            </button>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {activeTab === "form" ? (
          <div className="report-form-container">
            <div className="form-grid">
              <div className="form-group">
                <label>Institution / University:</label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Course / Subject:</label>
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                />
              </div>

              <div className="form-group span-2">
                <label>Experiment Title:</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Student Name:</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Roll No / ID:</label>
                <input
                  type="text"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Date:</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Active Source File:</label>
                <input type="text" value={fileName || "main.c"} disabled />
              </div>

              <div className="form-group span-2">
                <label>Objective / Problem Statement:</label>
                <textarea
                  rows={3}
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                />
              </div>
            </div>

            <div className="include-toggles">
              <label>
                <input
                  type="checkbox"
                  checked={includeCode}
                  onChange={(e) => setIncludeCode(e.target.checked)}
                />
                Include Source Code
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={includeOutput}
                  onChange={(e) => setIncludeOutput(e.target.checked)}
                />
                Include Terminal Execution Output
              </label>
            </div>
          </div>
        ) : (
          <div className="report-preview-container">
            <iframe
              title="Lab Report Live Preview"
              srcDoc={reportHtml}
              className="report-preview-iframe"
            />
          </div>
        )}

        <div className="modal-actions">
          <button
            className="action-btn primary"
            onClick={handlePrintPdf}
            disabled={busy}
          >
            🖨️ Print / Export to PDF
          </button>
          <button
            className="action-btn secondary"
            onClick={handleSaveHtml}
            disabled={busy}
          >
            🌐 Save HTML
          </button>
          <button
            className="action-btn secondary"
            onClick={handleSaveMarkdown}
            disabled={busy}
          >
            📝 Save Markdown
          </button>
          <button className="action-btn cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
      <iframe
        ref={printIframeRef}
        title="Print Frame"
        style={{ display: "none" }}
      />
    </div>
  );
}
