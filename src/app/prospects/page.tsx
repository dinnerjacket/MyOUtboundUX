"use client";

import { useState, useCallback, type ChangeEvent, type DragEvent } from "react";
import Nav from "../components/Nav";
import { PREFILLED_KNOWLEDGE } from "../data/prefilled-knowledge";

// --- Types ---

interface Prospect {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  company: string;
  industry: string;
  companySize: string;
  linkedin: string;
  valid: boolean;
  errors: string[];
  selected: boolean;
  sequenceStatus: "pending" | "generating" | "done" | "error";
  emails?: GeneratedEmail[];
}

interface GeneratedEmail {
  step: number;
  name: string;
  delay: string;
  subject: string;
  subjectB?: string;
  body: string;
  cta: string;
  strategy: string;
}

interface ColumnMap {
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  company: string;
  industry: string;
  companySize: string;
  linkedin: string;
}

// --- Helpers ---

const REQUIRED_FIELDS: (keyof ColumnMap)[] = ["firstName", "email", "title", "company"];

const FIELD_LABELS: Record<keyof ColumnMap, string> = {
  firstName: "First Name",
  lastName: "Last Name",
  email: "Email",
  title: "Title / Role",
  company: "Company",
  industry: "Industry",
  companySize: "Company Size",
  linkedin: "LinkedIn URL",
};

const COMMON_HEADERS: Record<string, keyof ColumnMap> = {
  "first name": "firstName",
  "first_name": "firstName",
  "firstname": "firstName",
  "first": "firstName",
  "last name": "lastName",
  "last_name": "lastName",
  "lastname": "lastName",
  "last": "lastName",
  "email": "email",
  "email address": "email",
  "email_address": "email",
  "work email": "email",
  "title": "title",
  "job title": "title",
  "job_title": "title",
  "role": "title",
  "position": "title",
  "company": "company",
  "company name": "company",
  "company_name": "company",
  "organization": "company",
  "org": "company",
  "industry": "industry",
  "sector": "industry",
  "company size": "companySize",
  "company_size": "companySize",
  "employees": "companySize",
  "size": "companySize",
  "# employees": "companySize",
  "linkedin": "linkedin",
  "linkedin url": "linkedin",
  "linkedin_url": "linkedin",
  "person linkedin url": "linkedin",
};

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function autoMapColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {
    firstName: "",
    lastName: "",
    email: "",
    title: "",
    company: "",
    industry: "",
    companySize: "",
    linkedin: "",
  };

  headers.forEach((h) => {
    const normalized = h.toLowerCase().trim();
    const field = COMMON_HEADERS[normalized];
    if (field && !map[field]) {
      map[field] = h;
    }
  });

  return map;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateProspect(p: Prospect): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!p.firstName.trim()) errors.push("Missing first name");
  if (!p.email.trim()) errors.push("Missing email");
  else if (!validateEmail(p.email)) errors.push("Invalid email format");
  if (!p.title.trim()) errors.push("Missing title");
  if (!p.company.trim()) errors.push("Missing company");
  return { valid: errors.length === 0, errors };
}

function deduplicateProspects(prospects: Prospect[]): Prospect[] {
  const seen = new Set<string>();
  return prospects.filter((p) => {
    const key = p.email.toLowerCase().trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Instantly CSV format
function exportInstantly(prospects: Prospect[]): string {
  const rows: string[] = [
    "email,first_name,last_name,company_name,title,custom1,custom2,custom3,custom4,custom5,sequence_1_subject,sequence_1_body,sequence_2_subject,sequence_2_body,sequence_3_subject,sequence_3_body,sequence_4_subject,sequence_4_body,sequence_5_subject,sequence_5_body",
  ];

  prospects
    .filter((p) => p.sequenceStatus === "done" && p.emails)
    .forEach((p) => {
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      const emailCols = (p.emails || [])
        .map((e) => `${esc(e.subject)},${esc(e.body)}`)
        .join(",");
      rows.push(
        `${esc(p.email)},${esc(p.firstName)},${esc(p.lastName)},${esc(p.company)},${esc(p.title)},${esc(p.industry)},${esc(p.companySize)},"","","",${emailCols}`
      );
    });

  return rows.join("\n");
}

// Lemlist CSV format
function exportLemlist(prospects: Prospect[]): string {
  const rows: string[] = [
    "email,firstName,lastName,companyName,title,icebreaker,step1Subject,step1Body,step2Subject,step2Body,step3Subject,step3Body,step4Subject,step4Body,step5Subject,step5Body",
  ];

  prospects
    .filter((p) => p.sequenceStatus === "done" && p.emails)
    .forEach((p) => {
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      const icebreaker = p.emails?.[0]?.body.split("\n").find((l) => l.trim() && !l.startsWith("Hi"))?.trim() || "";
      const emailCols = (p.emails || [])
        .map((e) => `${esc(e.subject)},${esc(e.body)}`)
        .join(",");
      rows.push(
        `${esc(p.email)},${esc(p.firstName)},${esc(p.lastName)},${esc(p.company)},${esc(p.title)},${esc(icebreaker)},${emailCols}`
      );
    });

  return rows.join("\n");
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// --- Component ---

type Stage = "upload" | "map" | "review" | "generate";

export default function ProspectsPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<ColumnMap>({
    firstName: "", lastName: "", email: "", title: "",
    company: "", industry: "", companySize: "", linkedin: "",
  });
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [previewStep, setPreviewStep] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // --- Upload stage ---
  const handleCSVText = useCallback((text: string) => {
    const { headers, rows } = parseCSV(text);
    if (headers.length === 0) {
      showToast("Could not parse CSV — check the file format");
      return;
    }
    setRawHeaders(headers);
    setRawRows(rows);
    setColumnMap(autoMapColumns(headers));
    setStage("map");
    showToast(`${rows.length} rows detected`);
  }, []);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      handleCSVText(e.target?.result as string);
    };
    reader.readAsText(file);
  }, [handleCSVText]);

  const [loadingPrebuilt, setLoadingPrebuilt] = useState(false);

  const loadPrebuiltList = async () => {
    setLoadingPrebuilt(true);
    try {
      const res = await fetch("/prospects-ep-hf.csv");
      if (!res.ok) throw new Error("Failed to fetch");
      const text = await res.text();
      handleCSVText(text);
    } catch {
      showToast("Failed to load prospect list");
    } finally {
      setLoadingPrebuilt(false);
    }
  };

  // --- Map stage: apply mapping ---
  const applyMapping = () => {
    const mapped: Prospect[] = rawRows.map((row, i) => {
      const get = (field: keyof ColumnMap) => {
        const header = columnMap[field];
        if (!header) return "";
        const idx = rawHeaders.indexOf(header);
        return idx >= 0 ? (row[idx] || "").trim() : "";
      };

      const p: Prospect = {
        id: `p-${i}-${Date.now()}`,
        firstName: get("firstName"),
        lastName: get("lastName"),
        email: get("email"),
        title: get("title"),
        company: get("company"),
        industry: get("industry"),
        companySize: get("companySize"),
        linkedin: get("linkedin"),
        valid: true,
        errors: [],
        selected: true,
        sequenceStatus: "pending",
      };

      const validation = validateProspect(p);
      p.valid = validation.valid;
      p.errors = validation.errors;
      return p;
    });

    const deduped = deduplicateProspects(mapped);
    const dupeCount = mapped.length - deduped.length;
    setProspects(deduped);
    setStage("review");
    if (dupeCount > 0) showToast(`${dupeCount} duplicate${dupeCount > 1 ? "s" : ""} removed`);
  };

  // --- Generate stage ---
  const generateAll = async () => {
    const selected = prospects.filter((p) => p.selected && p.valid);
    if (selected.length === 0) return;

    setStage("generate");
    setGenerating(true);
    setGenProgress(0);

    let knowledge;
    try {
      const stored = localStorage.getItem("outbound-machine:product-knowledge");
      knowledge = stored ? JSON.parse(stored) : PREFILLED_KNOWLEDGE;
    } catch {
      knowledge = PREFILLED_KNOWLEDGE;
    }

    for (let i = 0; i < selected.length; i++) {
      const prospect = selected[i];
      const idx = prospects.findIndex((p) => p.id === prospect.id);

      setProspects((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], sequenceStatus: "generating" };
        return next;
      });

      try {
        const res = await fetch("/api/generate-sequence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            persona: {
              firstName: prospect.firstName,
              lastName: prospect.lastName,
              title: prospect.title,
              company: prospect.company,
              industry: prospect.industry,
              companySize: prospect.companySize,
              challenge: "",
            },
            knowledge,
          }),
        });

        const data = await res.json();

        setProspects((prev) => {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            sequenceStatus: data.emails ? "done" : "error",
            emails: data.emails || undefined,
          };
          return next;
        });
      } catch {
        setProspects((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], sequenceStatus: "error" };
          return next;
        });
      }

      setGenProgress(i + 1);
      // Small delay to avoid rate limits
      if (i < selected.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    setGenerating(false);
  };

  const selectAll = (val: boolean) => {
    setProspects((prev) => prev.map((p) => ({ ...p, selected: p.valid ? val : false })));
  };

  const validCount = prospects.filter((p) => p.valid).length;
  const selectedCount = prospects.filter((p) => p.selected && p.valid).length;
  const doneCount = prospects.filter((p) => p.sequenceStatus === "done").length;

  return (
    <div style={{ fontFamily: "Inter, -apple-system, system-ui, sans-serif" }}>
      <Nav active="prospects" />

      <div style={S.container}>
        {/* --- Upload Stage --- */}
        {stage === "upload" && (
          <div>
            <h2 style={S.title}>Upload Prospects</h2>
            <p style={S.sub}>
              Drop a CSV of prospects — we&apos;ll map columns, validate, and generate
              personalized sequences for each one.
            </p>

            <div style={S.formatHint}>
              <span style={S.formatLabel}>Expected columns:</span> First Name,
              Last Name, Email, Title, Company, Industry, Company Size, LinkedIn URL
              <br />
              <span style={S.formatNote}>
                Apollo, ZoomInfo, and LinkedIn Sales Nav exports work out of the box.
              </span>
            </div>

            {/* Pre-built list loader */}
            <div style={S.prebuiltCard}>
              <div style={S.prebuiltLeft}>
                <span style={S.prebuiltTitle}>EP &amp; HF Physician List</span>
                <span style={S.prebuiltSub}>50 researched prospects — directors, chiefs, KOLs from Mount Sinai, Cleveland Clinic, Duke, Stanford, Mayo, and more</span>
              </div>
              <button
                style={{
                  ...S.prebuiltBtn,
                  opacity: loadingPrebuilt ? 0.6 : 1,
                }}
                onClick={loadPrebuiltList}
                disabled={loadingPrebuilt}
              >
                {loadingPrebuilt ? "Loading…" : "Load 50 Prospects →"}
              </button>
            </div>

            <div style={S.orDivider}>
              <span style={S.orLine} />
              <span style={S.orText}>or upload your own</span>
              <span style={S.orLine} />
            </div>

            <div
              style={{
                ...S.dropZone,
                ...(dragOver ? S.dropZoneActive : {}),
              }}
              onDragOver={(e: DragEvent) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e: DragEvent) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
            >
              <div style={S.dropIcon}>↑</div>
              <p style={S.dropText}>Drop your prospect CSV here</p>
              <label style={S.browseBtn}>
                Browse files
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  style={{ display: "none" }}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </label>
            </div>

            {/* Sample CSV download */}
            <button
              style={S.sampleBtn}
              onClick={() => {
                const sample = `first_name,last_name,email,title,company,industry,company_size,linkedin_url
Sarah,Chen,sarah.chen@atlanticcard.com,Director of Electrophysiology,Atlantic Cardiology Associates,Cardiology Practice,"50-200 employees, 2500 devices",https://linkedin.com/in/sarahchen
James,Mitchell,j.mitchell@northeasthealth.org,Device Clinic Manager,Northeast Health System,Hospital EP Program,"5000+ employees, 8000 devices",https://linkedin.com/in/jamesmitchell
Rebecca,Torres,rtorres@meridianhealth.com,VP Cardiovascular Services,Meridian Health Partners,Integrated Health System,"10000+ employees, 12 sites",https://linkedin.com/in/rebeccatorres`;
                downloadCSV(sample, "sample-prospects.csv");
                showToast("Sample CSV downloaded");
              }}
            >
              Download sample CSV
            </button>
          </div>
        )}

        {/* --- Column Mapping Stage --- */}
        {stage === "map" && (
          <div>
            <h2 style={S.title}>Map Your Columns</h2>
            <p style={S.sub}>
              We auto-detected {rawRows.length} rows and {rawHeaders.length} columns.
              Verify the mapping below.
            </p>

            <div style={S.mapGrid}>
              {(Object.keys(FIELD_LABELS) as (keyof ColumnMap)[]).map((field) => (
                <div key={field} style={S.mapRow}>
                  <label style={S.mapLabel}>
                    {FIELD_LABELS[field]}
                    {REQUIRED_FIELDS.includes(field) && (
                      <span style={S.reqDot}>*</span>
                    )}
                  </label>
                  <select
                    style={S.mapSelect}
                    value={columnMap[field]}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                      setColumnMap((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                  >
                    <option value="">— skip —</option>
                    {rawHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  {/* Preview first value */}
                  <span style={S.mapPreview}>
                    {columnMap[field] && rawRows[0]
                      ? rawRows[0][rawHeaders.indexOf(columnMap[field])] || "—"
                      : ""}
                  </span>
                </div>
              ))}
            </div>

            <div style={S.mapActions}>
              <button style={S.backBtn} onClick={() => setStage("upload")}>
                ← Back
              </button>
              <button
                style={{
                  ...S.primaryBtn,
                  opacity: columnMap.email && columnMap.firstName ? 1 : 0.4,
                }}
                onClick={applyMapping}
                disabled={!columnMap.email || !columnMap.firstName}
              >
                Apply Mapping → Review Prospects
              </button>
            </div>
          </div>
        )}

        {/* --- Review Stage --- */}
        {(stage === "review" || stage === "generate") && (
          <div>
            <div style={S.reviewHeader}>
              <div>
                <h2 style={S.title}>
                  {stage === "generate" ? "Generating Sequences" : "Review Prospects"}
                </h2>
                <p style={S.sub}>
                  {validCount} valid of {prospects.length} total
                  {selectedCount < validCount && ` · ${selectedCount} selected`}
                  {doneCount > 0 && ` · ${doneCount} sequences generated`}
                </p>
              </div>

              {stage === "review" && (
                <div style={S.reviewActions}>
                  <button style={S.backBtn} onClick={() => setStage("map")}>
                    ← Remap
                  </button>
                  <button
                    style={{
                      ...S.primaryBtn,
                      opacity: selectedCount > 0 ? 1 : 0.4,
                    }}
                    onClick={generateAll}
                    disabled={selectedCount === 0}
                  >
                    Generate {selectedCount} Sequence{selectedCount !== 1 ? "s" : ""} →
                  </button>
                </div>
              )}

              {stage === "generate" && generating && (
                <div style={S.progressWrap}>
                  <div style={S.progressBar}>
                    <div
                      style={{
                        ...S.progressFill,
                        width: `${(genProgress / selectedCount) * 100}%`,
                      }}
                    />
                  </div>
                  <span style={S.progressText}>
                    {genProgress} / {selectedCount}
                  </span>
                </div>
              )}

              {stage === "generate" && !generating && doneCount > 0 && (
                <div style={S.exportActions}>
                  <button
                    style={S.exportBtn}
                    onClick={() => {
                      downloadCSV(exportInstantly(prospects), "outbound-instantly.csv");
                      showToast("Instantly CSV exported");
                    }}
                  >
                    Export for Instantly
                  </button>
                  <button
                    style={S.exportBtn}
                    onClick={() => {
                      downloadCSV(exportLemlist(prospects), "outbound-lemlist.csv");
                      showToast("Lemlist CSV exported");
                    }}
                  >
                    Export for Lemlist
                  </button>
                </div>
              )}
            </div>

            {/* Prospects table */}
            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>
                      <input
                        type="checkbox"
                        checked={selectedCount === validCount && validCount > 0}
                        onChange={(e) => selectAll(e.target.checked)}
                        style={S.checkbox}
                      />
                    </th>
                    <th style={S.th}>Name</th>
                    <th style={S.th}>Email</th>
                    <th style={S.th}>Title</th>
                    <th style={S.th}>Company</th>
                    <th style={S.th}>Status</th>
                    <th style={S.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {prospects.map((p, i) => (
                    <tr
                      key={p.id}
                      style={{
                        ...S.tr,
                        opacity: p.valid ? 1 : 0.5,
                      }}
                    >
                      <td style={S.td}>
                        <input
                          type="checkbox"
                          checked={p.selected}
                          disabled={!p.valid}
                          onChange={() =>
                            setProspects((prev) => {
                              const next = [...prev];
                              next[i] = { ...next[i], selected: !next[i].selected };
                              return next;
                            })
                          }
                          style={S.checkbox}
                        />
                      </td>
                      <td style={S.td}>
                        <span style={S.name}>
                          {p.firstName} {p.lastName}
                        </span>
                      </td>
                      <td style={S.tdEmail}>{p.email}</td>
                      <td style={S.td}>
                        <span style={S.titleCell}>{p.title}</span>
                      </td>
                      <td style={S.td}>
                        <span style={S.companyCell}>{p.company}</span>
                        {p.industry && (
                          <span style={S.industryBadge}>{p.industry}</span>
                        )}
                      </td>
                      <td style={S.td}>
                        {!p.valid && (
                          <span style={S.statusError} title={p.errors.join(", ")}>
                            ✗ {p.errors[0]}
                          </span>
                        )}
                        {p.valid && p.sequenceStatus === "pending" && (
                          <span style={S.statusPending}>Pending</span>
                        )}
                        {p.sequenceStatus === "generating" && (
                          <span style={S.statusGen}>Generating…</span>
                        )}
                        {p.sequenceStatus === "done" && (
                          <span style={S.statusDone}>✓ 5 emails</span>
                        )}
                        {p.sequenceStatus === "error" && (
                          <span style={S.statusError}>Error</span>
                        )}
                      </td>
                      <td style={S.td}>
                        {p.sequenceStatus === "done" && (
                          <button
                            style={S.previewBtn}
                            onClick={() => {
                              setPreviewIdx(previewIdx === i ? null : i);
                              setPreviewStep(0);
                            }}
                          >
                            {previewIdx === i ? "Hide" : "Preview"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Inline preview */}
            {previewIdx !== null && prospects[previewIdx]?.emails && (
              <div style={S.inlinePreview}>
                <div style={S.previewTabs}>
                  {prospects[previewIdx].emails!.map((em, si) => (
                    <button
                      key={si}
                      style={{
                        ...S.previewTab,
                        ...(previewStep === si ? S.previewTabActive : {}),
                      }}
                      onClick={() => setPreviewStep(si)}
                    >
                      {em.delay}
                    </button>
                  ))}
                </div>
                <div style={S.previewEmail}>
                  <div style={S.previewSubject}>
                    <span style={S.previewLabel}>Subject:</span>{" "}
                    {prospects[previewIdx].emails![previewStep].subject}
                  </div>
                  <div style={S.previewBody}>
                    {prospects[previewIdx]
                      .emails![previewStep].body.split("\n")
                      .map((line, j) => (
                        <p key={j} style={{ margin: line.trim() ? "4px 0" : "10px 0", minHeight: line.trim() ? undefined : 4 }}>
                          {line}
                        </p>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}

// --- Styles ---
const S: Record<string, React.CSSProperties> = {
  container: { maxWidth: 900, margin: "0 auto", padding: "24px 16px 80px", color: "#e2e8f0" },
  title: { fontSize: 20, fontWeight: 700, color: "#f1f5f9", margin: 0, letterSpacing: "-0.02em" },
  sub: { fontSize: 14, color: "#64748b", margin: "4px 0 0" },

  formatHint: { fontSize: 13, color: "#475569", background: "rgba(15,23,42,0.5)", border: "1px solid #1e293b", borderRadius: 8, padding: "12px 16px", marginTop: 20, marginBottom: 20, lineHeight: 1.6 },
  formatLabel: { color: "#94a3b8", fontWeight: 600 },
  formatNote: { fontSize: 12, color: "#475569", fontStyle: "italic" as const },

  dropZone: { border: "2px dashed #1e293b", borderRadius: 12, padding: "40px 24px", textAlign: "center" as const, marginBottom: 16, transition: "all 0.2s", cursor: "pointer", background: "rgba(15,23,42,0.4)" },
  dropZoneActive: { borderColor: "#3b82f6", background: "rgba(59,130,246,0.06)" },
  dropIcon: { fontSize: 28, color: "#475569", marginBottom: 8 },
  dropText: { color: "#94a3b8", fontSize: 14, margin: "0 0 16px" },
  browseBtn: { display: "inline-block", padding: "8px 18px", fontSize: 13, fontWeight: 600, color: "#e2e8f0", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, cursor: "pointer" },
  sampleBtn: { background: "none", border: "none", color: "#3b82f6", fontSize: 13, cursor: "pointer", padding: 0, fontFamily: "inherit" },

  prebuiltCard: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 20px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 10, marginBottom: 20, flexWrap: "wrap" as const },
  prebuiltLeft: { display: "flex", flexDirection: "column" as const, gap: 4, flex: 1, minWidth: 200 },
  prebuiltTitle: { fontSize: 14, fontWeight: 700, color: "#e2e8f0" },
  prebuiltSub: { fontSize: 12, color: "#64748b", lineHeight: 1.5 },
  prebuiltBtn: { padding: "10px 22px", fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const, flexShrink: 0 },
  orDivider: { display: "flex", alignItems: "center", gap: 12, marginBottom: 20 },
  orLine: { flex: 1, height: 1, background: "#1e293b" },
  orText: { fontSize: 12, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.05em", fontWeight: 600 },

  // Map stage
  mapGrid: { display: "flex", flexDirection: "column" as const, gap: 10, marginTop: 20 },
  mapRow: { display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 12, alignItems: "center" },
  mapLabel: { fontSize: 13, fontWeight: 600, color: "#cbd5e1" },
  reqDot: { color: "#ef4444", marginLeft: 2 },
  mapSelect: { background: "rgba(15,23,42,0.5)", border: "1px solid #1e293b", borderRadius: 8, color: "#cbd5e1", fontSize: 13, padding: "8px 10px", outline: "none", fontFamily: "inherit" },
  mapPreview: { fontSize: 12, color: "#475569", overflow: "hidden" as const, textOverflow: "ellipsis" as const, whiteSpace: "nowrap" as const },
  mapActions: { display: "flex", gap: 12, marginTop: 24 },

  // Buttons
  backBtn: { padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#94a3b8", background: "transparent", border: "1px solid #1e293b", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" },
  primaryBtn: { padding: "10px 22px", fontSize: 13, fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#3b82f6,#2563eb)", border: "none", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" },

  // Review
  reviewHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" as const, gap: 16, marginBottom: 20 },
  reviewActions: { display: "flex", gap: 10 },
  exportActions: { display: "flex", gap: 10 },
  exportBtn: { padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#10b981", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 8, cursor: "pointer", fontFamily: "inherit" },

  progressWrap: { display: "flex", alignItems: "center", gap: 12 },
  progressBar: { width: 160, height: 6, background: "#1e293b", borderRadius: 3, overflow: "hidden" as const },
  progressFill: { height: "100%", background: "#3b82f6", borderRadius: 3, transition: "width 0.3s ease" },
  progressText: { fontSize: 12, color: "#64748b", fontWeight: 600 },

  // Table
  tableWrap: { overflowX: "auto" as const, borderRadius: 10, border: "1px solid #1e293b" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: { textAlign: "left" as const, padding: "10px 12px", fontSize: 11, fontWeight: 600, color: "#475569", textTransform: "uppercase" as const, letterSpacing: "0.05em", borderBottom: "1px solid #1e293b", background: "rgba(15,23,42,0.6)" },
  tr: { borderBottom: "1px solid #0f172a" },
  td: { padding: "10px 12px", verticalAlign: "middle" as const },
  tdEmail: { padding: "10px 12px", color: "#64748b", fontSize: 12, fontFamily: "monospace" },
  checkbox: { accentColor: "#3b82f6" },
  name: { fontWeight: 600, color: "#e2e8f0" },
  titleCell: { color: "#94a3b8", fontSize: 12 },
  companyCell: { color: "#cbd5e1", display: "block" },
  industryBadge: { fontSize: 10, color: "#475569", background: "rgba(15,23,42,0.8)", padding: "1px 6px", borderRadius: 3, marginTop: 2, display: "inline-block" },

  statusPending: { color: "#475569", fontSize: 12 },
  statusGen: { color: "#f59e0b", fontSize: 12 },
  statusDone: { color: "#10b981", fontSize: 12, fontWeight: 600 },
  statusError: { color: "#ef4444", fontSize: 12 },
  previewBtn: { padding: "4px 12px", fontSize: 11, fontWeight: 600, color: "#3b82f6", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 5, cursor: "pointer", fontFamily: "inherit" },

  // Inline preview
  inlinePreview: { marginTop: 16, background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, overflow: "hidden" as const },
  previewTabs: { display: "flex", borderBottom: "1px solid #1e293b", gap: 0 },
  previewTab: { flex: 1, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#64748b", background: "transparent", border: "none", borderBottom: "2px solid transparent", cursor: "pointer", fontFamily: "inherit" },
  previewTabActive: { color: "#e2e8f0", borderBottomColor: "#3b82f6", background: "rgba(59,130,246,0.05)" },
  previewSubject: { padding: "12px 16px", borderBottom: "1px solid #1e293b", fontSize: 13 },
  previewLabel: { color: "#475569", fontWeight: 600, fontSize: 11, textTransform: "uppercase" as const },
  previewBody: { padding: "16px 20px", fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 },
  previewEmail: {},

  toast: { position: "fixed" as const, bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500, zIndex: 999 },
};
