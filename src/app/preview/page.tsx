"use client";

import { useState, type ChangeEvent } from "react";
import { PREFILLED_KNOWLEDGE } from "../data/prefilled-knowledge";
import Nav from "../components/Nav";

interface Persona {
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  industry: string;
  companySize: string;
  challenge: string;
}

interface Email {
  step: number;
  name: string;
  delay: string;
  subject: string;
  subjectB?: string;
  body: string;
  cta: string;
  strategy: string;
}

const PRESET_PERSONAS = [
  {
    label: "EP Physician",
    persona: {
      firstName: "Sarah",
      lastName: "Chen",
      title: "Director of Electrophysiology",
      company: "Atlantic Cardiology Associates",
      industry: "Cardiology Practice",
      companySize: "50-200 employees, 2,500+ device patients",
      challenge: "Struggling with Paceart end-of-life, staff spending too much time on manual device checks, care achievement below 40%",
    },
  },
  {
    label: "Device Clinic Manager",
    persona: {
      firstName: "James",
      lastName: "Mitchell",
      title: "Device Clinic Manager",
      company: "Northeast Health System",
      industry: "Hospital-based EP Program",
      companySize: "5,000+ employees, 8,000 device patients across 4 sites",
      challenge: "Managing device advisory tracking via spreadsheets, inconsistent workflows across locations, billing gaps from missed intervals",
    },
  },
  {
    label: "VP Cardiovascular",
    persona: {
      firstName: "Rebecca",
      lastName: "Torres",
      title: "VP of Cardiovascular Services",
      company: "Meridian Health Partners",
      industry: "Integrated Health System",
      companySize: "10,000+ employees, 12 cardiology sites",
      challenge: "Vendor sprawl across device manufacturers, need to standardize and scale remote monitoring, board pressure on cardiovascular service line revenue",
    },
  },
  {
    label: "Practice Administrator",
    persona: {
      firstName: "David",
      lastName: "Park",
      title: "Practice Administrator",
      company: "Heartland Cardiology",
      industry: "Private Cardiology Practice",
      companySize: "20-50 employees, 1,200 device patients",
      challenge: "Missing significant billing revenue from remote monitoring, need to justify ROI on any new technology investment, staff retention concerns",
    },
  },
];

const EMPTY_PERSONA: Persona = {
  firstName: "",
  lastName: "",
  title: "",
  company: "",
  industry: "",
  companySize: "",
  challenge: "",
};

const TIMING_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#64748b"];

export default function PreviewPage() {
  const [persona, setPersona] = useState<Persona>(EMPTY_PERSONA);
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeEmail, setActiveEmail] = useState(0);
  const [showVariantB, setShowVariantB] = useState(false);

  const updateField = (field: keyof Persona, value: string) => {
    setPersona((prev) => ({ ...prev, [field]: value }));
  };

  const loadPreset = (preset: (typeof PRESET_PERSONAS)[number]) => {
    setPersona(preset.persona);
    setEmails([]);
    setActiveEmail(0);
  };

  const isReady =
    persona.firstName.trim() &&
    persona.title.trim() &&
    persona.company.trim();

  const generateSequence = async () => {
    if (!isReady) return;
    setLoading(true);
    setError(null);
    setEmails([]);
    setActiveEmail(0);

    try {
      // Load knowledge from localStorage or use prefilled
      let knowledge;
      try {
        const stored = localStorage.getItem("outbound-machine:product-knowledge");
        knowledge = stored ? JSON.parse(stored) : PREFILLED_KNOWLEDGE;
      } catch {
        knowledge = PREFILLED_KNOWLEDGE;
      }

      const res = await fetch("/api/generate-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona, knowledge }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEmails(data.emails || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "Inter, -apple-system, system-ui, sans-serif" }}>
      <Nav active="preview" />

      <div style={styles.container}>
        {/* Persona Section */}
        <div style={styles.personaSection}>
          <div style={styles.personaHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Prospect Persona</h2>
              <p style={styles.sectionSub}>
                Define who you&apos;re reaching out to — the sequence adapts to their
                world
              </p>
            </div>
          </div>

          {/* Preset buttons */}
          <div style={styles.presetRow}>
            <span style={styles.presetLabel}>Quick-fill:</span>
            {PRESET_PERSONAS.map((p) => (
              <button
                key={p.label}
                style={styles.presetBtn}
                onClick={() => loadPreset(p)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Form grid */}
          <div style={styles.formGrid}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>First Name</label>
              <input
                style={styles.input}
                placeholder="Sarah"
                value={persona.firstName}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  updateField("firstName", e.target.value)
                }
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Last Name</label>
              <input
                style={styles.input}
                placeholder="Chen"
                value={persona.lastName}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  updateField("lastName", e.target.value)
                }
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Title / Role</label>
              <input
                style={styles.input}
                placeholder="Director of Electrophysiology"
                value={persona.title}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  updateField("title", e.target.value)
                }
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Company</label>
              <input
                style={styles.input}
                placeholder="Atlantic Cardiology Associates"
                value={persona.company}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  updateField("company", e.target.value)
                }
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Industry / Segment</label>
              <input
                style={styles.input}
                placeholder="Hospital-based EP Program"
                value={persona.industry}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  updateField("industry", e.target.value)
                }
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Company Size</label>
              <input
                style={styles.input}
                placeholder="50-200 employees, 2,500+ device patients"
                value={persona.companySize}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  updateField("companySize", e.target.value)
                }
              />
            </div>
          </div>

          {/* Challenge - full width */}
          <div style={{ ...styles.fieldGroup, marginTop: 12 }}>
            <label style={styles.label}>
              Key Challenge / Context{" "}
              <span style={styles.labelHint}>
                — what&apos;s keeping them up at night?
              </span>
            </label>
            <textarea
              style={styles.textarea}
              rows={3}
              placeholder="Struggling with Paceart end-of-life, staff spending too much time on manual device checks, care achievement below 40%..."
              value={persona.challenge}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                updateField("challenge", e.target.value)
              }
            />
          </div>

          {/* Generate button */}
          <div style={styles.generateRow}>
            <button
              style={{
                ...styles.generateBtn,
                opacity: isReady && !loading ? 1 : 0.4,
                cursor: isReady && !loading ? "pointer" : "not-allowed",
              }}
              onClick={generateSequence}
              disabled={!isReady || loading}
            >
              {loading ? (
                <span style={styles.loadingInner}>
                  <span style={styles.spinnerSmall} />
                  Generating sequence…
                </span>
              ) : (
                "Preview 5-Step Sequence →"
              )}
            </button>
            {error && <p style={styles.errorText}>{error}</p>}
          </div>
        </div>

        {/* Sequence Preview */}
        {emails.length > 0 && (
          <div style={styles.sequenceSection}>
            <div style={styles.sequenceHeader}>
              <h2 style={styles.sectionTitle}>
                Sequence for {persona.firstName} {persona.lastName}
              </h2>
              <p style={styles.sectionSub}>
                {persona.title} at {persona.company}
              </p>
            </div>

            {/* Timeline nav */}
            <div style={styles.timeline}>
              {emails.map((email, i) => (
                <button
                  key={i}
                  style={{
                    ...styles.timelineStep,
                    ...(activeEmail === i ? styles.timelineStepActive : {}),
                    borderColor:
                      activeEmail === i
                        ? TIMING_COLORS[i]
                        : "transparent",
                  }}
                  onClick={() => {
                    setActiveEmail(i);
                    setShowVariantB(false);
                  }}
                >
                  <span
                    style={{
                      ...styles.stepDot,
                      backgroundColor: TIMING_COLORS[i],
                    }}
                  >
                    {email.step}
                  </span>
                  <span style={styles.stepMeta}>
                    <span style={styles.stepDelay}>{email.delay}</span>
                    <span style={styles.stepName}>{email.name}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* Email preview */}
            {emails[activeEmail] && (
              <div style={styles.emailPreview}>
                {/* Strategy bar */}
                <div
                  style={{
                    ...styles.strategyBar,
                    borderLeftColor: TIMING_COLORS[activeEmail],
                  }}
                >
                  <span style={styles.strategyLabel}>Strategy:</span>{" "}
                  {emails[activeEmail].strategy}
                </div>

                {/* Email chrome */}
                <div style={styles.emailChrome}>
                  <div style={styles.emailMeta}>
                    <div style={styles.emailMetaRow}>
                      <span style={styles.emailMetaLabel}>To:</span>
                      <span style={styles.emailMetaValue}>
                        {persona.firstName.toLowerCase()}.
                        {persona.lastName.toLowerCase()}@
                        {persona.company
                          .toLowerCase()
                          .replace(/[^a-z]/g, "")
                          .slice(0, 16)}
                        .com
                      </span>
                    </div>
                    <div style={styles.emailMetaRow}>
                      <span style={styles.emailMetaLabel}>Subject:</span>
                      <span style={styles.emailMetaValue}>
                        {showVariantB && emails[activeEmail].subjectB
                          ? emails[activeEmail].subjectB
                          : emails[activeEmail].subject}
                      </span>
                      {emails[activeEmail].subjectB && (
                        <button
                          style={styles.abToggle}
                          onClick={() => setShowVariantB(!showVariantB)}
                        >
                          {showVariantB ? "A" : "B"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={styles.emailBody}>
                    {emails[activeEmail].body
                      .split("\n")
                      .map((line: string, j: number) => (
                        <p
                          key={j}
                          style={{
                            margin: line.trim() === "" ? "12px 0" : "6px 0",
                            minHeight: line.trim() === "" ? 8 : undefined,
                          }}
                        >
                          {line}
                        </p>
                      ))}
                  </div>

                  <div style={styles.emailFooter}>
                    <span style={styles.ctaLabel}>CTA:</span>{" "}
                    <span style={styles.ctaValue}>
                      {emails[activeEmail].cta}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Export hint */}
            <p style={styles.exportHint}>
              Step 2 will let you upload a CSV of prospects and generate
              sequences for all of them at once, ready for Instantly or Lemlist
              export.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "24px 16px 80px",
    color: "#e2e8f0",
  },
  personaSection: {
    marginBottom: 40,
  },
  personaHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 700,
    color: "#f1f5f9",
    margin: 0,
    letterSpacing: "-0.02em",
  },
  sectionSub: {
    fontSize: 14,
    color: "#64748b",
    margin: "4px 0 0",
  },
  presetRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap" as const,
  },
  presetLabel: {
    fontSize: 12,
    color: "#475569",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    fontWeight: 600,
  },
  presetBtn: {
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    color: "#94a3b8",
    background: "rgba(15, 23, 42, 0.5)",
    border: "1px solid #1e293b",
    borderRadius: 6,
    cursor: "pointer",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  labelHint: {
    textTransform: "none" as const,
    fontWeight: 400,
    color: "#475569",
    letterSpacing: 0,
  },
  input: {
    background: "rgba(15, 23, 42, 0.5)",
    border: "1px solid #1e293b",
    borderRadius: 8,
    color: "#cbd5e1",
    fontSize: 13,
    padding: "10px 12px",
    outline: "none",
    fontFamily: "inherit",
  },
  textarea: {
    background: "rgba(15, 23, 42, 0.5)",
    border: "1px solid #1e293b",
    borderRadius: 8,
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 1.6,
    padding: "10px 12px",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical" as const,
    width: "100%",
    boxSizing: "border-box" as const,
  },
  generateRow: {
    marginTop: 20,
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  generateBtn: {
    padding: "12px 28px",
    fontSize: 14,
    fontWeight: 700,
    color: "#fff",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    border: "none",
    borderRadius: 8,
    transition: "opacity 0.2s",
    fontFamily: "inherit",
  },
  loadingInner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  spinnerSmall: {
    display: "inline-block",
    width: 14,
    height: 14,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid #fff",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    margin: 0,
  },
  sequenceSection: {
    borderTop: "1px solid #1e293b",
    paddingTop: 32,
  },
  sequenceHeader: {
    marginBottom: 24,
  },
  timeline: {
    display: "flex",
    gap: 6,
    marginBottom: 24,
    overflowX: "auto" as const,
    paddingBottom: 4,
  },
  timelineStep: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    background: "rgba(15, 23, 42, 0.5)",
    border: "1px solid transparent",
    borderBottom: "3px solid transparent",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.15s",
    minWidth: 0,
    flex: "1 1 0",
    fontFamily: "inherit",
  },
  timelineStepActive: {
    background: "rgba(30, 41, 59, 0.8)",
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  stepMeta: {
    display: "flex",
    flexDirection: "column" as const,
    minWidth: 0,
  },
  stepDelay: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  stepName: {
    fontSize: 12,
    color: "#cbd5e1",
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
  },
  emailPreview: {
    marginBottom: 24,
  },
  strategyBar: {
    padding: "10px 16px",
    background: "rgba(15, 23, 42, 0.6)",
    borderLeft: "3px solid",
    borderRadius: "0 8px 8px 0",
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 16,
    lineHeight: 1.5,
  },
  strategyLabel: {
    fontWeight: 700,
    color: "#cbd5e1",
  },
  emailChrome: {
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 12,
    overflow: "hidden",
  },
  emailMeta: {
    padding: "16px 20px",
    borderBottom: "1px solid #1e293b",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  emailMetaRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  emailMetaLabel: {
    fontSize: 12,
    color: "#475569",
    fontWeight: 600,
    width: 56,
    flexShrink: 0,
  },
  emailMetaValue: {
    fontSize: 13,
    color: "#e2e8f0",
    fontWeight: 500,
    flex: 1,
  },
  abToggle: {
    padding: "2px 10px",
    fontSize: 11,
    fontWeight: 700,
    color: "#f59e0b",
    background: "rgba(245, 158, 11, 0.1)",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    borderRadius: 4,
    cursor: "pointer",
    flexShrink: 0,
    fontFamily: "inherit",
  },
  emailBody: {
    padding: "20px 24px",
    fontSize: 14,
    color: "#cbd5e1",
    lineHeight: 1.7,
  },
  emailFooter: {
    padding: "12px 20px",
    borderTop: "1px solid #1e293b",
    fontSize: 12,
  },
  ctaLabel: {
    color: "#475569",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  ctaValue: {
    color: "#3b82f6",
    fontWeight: 500,
  },
  exportHint: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center" as const,
    fontStyle: "italic" as const,
    marginTop: 8,
  },
};
