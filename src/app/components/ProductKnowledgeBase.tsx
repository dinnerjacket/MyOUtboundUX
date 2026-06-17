"use client";

import { useState, useEffect, useCallback, type ChangeEvent, type DragEvent } from "react";
import { PREFILLED_KNOWLEDGE } from "../data/prefilled-knowledge";

const STORAGE_KEY = "outbound-machine:product-knowledge";

interface Section {
  id: string;
  label: string;
  placeholder: string;
  hint: string;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string;
  addedAt: number;
}

interface KnowledgeData {
  sections: Record<string, string>;
  files: UploadedFile[];
  urls: string[];
}

const SECTIONS: Section[] = [
  {
    id: "elevator",
    label: "Elevator Pitch",
    placeholder:
      "What does your product/service do in 2–3 sentences? Who is it for and what problem does it solve?",
    hint: "This grounds every email the system writes.",
  },
  {
    id: "icp",
    label: "Ideal Customer Profile",
    placeholder:
      "Describe your best-fit customer: industry, company size, title of buyer, budget range, pain points they have…",
    hint: "The more specific, the sharper the personalization.",
  },
  {
    id: "differentiators",
    label: "Key Differentiators",
    placeholder:
      "What makes you different from alternatives? Why do customers choose you over competitors?",
    hint: "These become proof points in outreach.",
  },
  {
    id: "proof",
    label: "Social Proof & Results",
    placeholder:
      "Case studies, testimonials, metrics, logos. E.g. 'Helped Acme Corp reduce churn by 34% in 90 days'",
    hint: "Concrete numbers convert. Include as many as you have.",
  },
  {
    id: "pricing",
    label: "Pricing & Packaging",
    placeholder:
      "How is your product priced? Tiers, per-seat, usage-based? Any free trial or pilot offer?",
    hint: "Helps craft CTAs and handle objections.",
  },
  {
    id: "objections",
    label: "Common Objections & Responses",
    placeholder:
      "What pushback do you hear most? 'Too expensive', 'We already use X', 'Not a priority right now'… and how do you handle each?",
    hint: "Pre-arms the sequence writer.",
  },
  {
    id: "tone",
    label: "Voice & Tone",
    placeholder:
      "How should outreach sound? Casual and founder-to-founder? Consultative and data-driven? Direct and no-fluff?",
    hint: "Sets the personality of every email.",
  },
  {
    id: "cta",
    label: "Desired CTA / Meeting Format",
    placeholder:
      "What does success look like? '15-min intro call', 'async Loom walkthrough', 'free audit'… Include your Calendly or booking link if you have one.",
    hint: "The ask at the end of each sequence.",
  },
];

const FILE_TYPES = ".pdf,.docx,.doc,.txt,.md,.csv,.pptx";

function completenessScore(data: KnowledgeData): number {
  let filled = 0;
  const total = SECTIONS.length + 2;
  SECTIONS.forEach((s) => {
    if ((data.sections?.[s.id] || "").trim().length > 30) filled++;
  });
  if (data.files?.length > 0) filled++;
  if (data.urls?.some((u) => u.trim().length > 5)) filled++;
  return Math.round((filled / total) * 100);
}

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "pdf" || ext === "docx" || ext === "pptx") {
        resolve(
          `[${ext.toUpperCase()} uploaded: ${file.name}, ${(file.size / 1024).toFixed(1)}KB — will be processed server-side]`
        );
      } else {
        resolve(e.target?.result as string);
      }
    };
    reader.onerror = () => resolve(`[Error reading ${file.name}]`);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (["txt", "md", "csv"].includes(ext || "")) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  });
}

export default function ProductKnowledgeBase() {
  const [data, setData] = useState<KnowledgeData>({
    sections: {},
    files: [],
    urls: [""],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setData(JSON.parse(stored));
      } else {
        // Load prefilled data from website crawl
        const prefilled: KnowledgeData = {
          sections: PREFILLED_KNOWLEDGE.sections,
          files: PREFILLED_KNOWLEDGE.files as UploadedFile[],
          urls: PREFILLED_KNOWLEDGE.urls,
        };
        setData(prefilled);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prefilled));
      }
    } catch {
      const prefilled: KnowledgeData = {
        sections: PREFILLED_KNOWLEDGE.sections,
        files: PREFILLED_KNOWLEDGE.files as UploadedFile[],
        urls: PREFILLED_KNOWLEDGE.urls,
      };
      setData(prefilled);
    }
    setLoading(false);
  }, []);

  const save = useCallback((newData: KnowledgeData) => {
    setSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    } catch {}
    setTimeout(() => setSaving(false), 400);
  }, []);

  const update = useCallback(
    (updater: (prev: KnowledgeData) => KnowledgeData) => {
      setData((prev) => {
        const next = updater(prev);
        save(next);
        return next;
      });
    },
    [save]
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleFileUpload = async (fileList: FileList) => {
    const files = Array.from(fileList);
    const processed: UploadedFile[] = await Promise.all(
      files.map(async (f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        content: await readFileAsText(f),
        addedAt: Date.now(),
      }))
    );
    update((prev) => ({
      ...prev,
      files: [...(prev.files || []), ...processed],
    }));
    showToast(`${files.length} file${files.length > 1 ? "s" : ""} added`);
  };

  const removeFile = (index: number) => {
    update((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const score = completenessScore(data);
  const scoreColor =
    score < 30 ? "#ef4444" : score < 60 ? "#f59e0b" : score < 85 ? "#3b82f6" : "#10b981";

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product-knowledge-base.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-8 h-8 border-3 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">Loading knowledge base…</p>
      </div>
    );
  }

  const fileIcon = (name: string) => {
    if (name.endsWith(".pdf")) return "📄";
    if (name.endsWith(".pptx")) return "📊";
    if (name.endsWith(".docx")) return "📝";
    return "📎";
  };

  return (
    <div className="max-w-[720px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-slate-100 tracking-tight m-0">
            Product Knowledge Base
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            Everything the AI needs to write outreach that sounds like your best rep
          </p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r="22" fill="none" stroke="#1e293b" strokeWidth="4" />
            <circle
              cx="26"
              cy="26"
              r="22"
              fill="none"
              stroke={scoreColor}
              strokeWidth="4"
              strokeDasharray={`${(score / 100) * 138.2} 138.2`}
              strokeLinecap="round"
              transform="rotate(-90 26 26)"
              className="transition-all duration-500"
            />
            <text
              x="26"
              y="28"
              textAnchor="middle"
              dominantBaseline="middle"
              fill={scoreColor}
              fontSize="13"
              fontWeight="700"
            >
              {score}%
            </text>
          </svg>
          <span className="text-[11px] text-slate-500 uppercase tracking-wider">
            Completeness
          </span>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center mb-5 transition-all cursor-pointer ${
          dragOver
            ? "border-blue-500 bg-blue-500/5"
            : "border-slate-800 bg-slate-900/40"
        }`}
        onDragOver={(e: DragEvent) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          setDragOver(false);
          handleFileUpload(e.dataTransfer.files);
        }}
      >
        <div className="text-3xl text-slate-600 mb-2">↑</div>
        <p className="text-slate-400 text-sm m-0 mb-1">
          Drop pitch decks, case studies, one-pagers, or any product docs
        </p>
        <p className="text-slate-600 text-xs m-0 mb-4">
          PDF, DOCX, PPTX, TXT, MD, CSV
        </p>
        <label className="inline-block px-5 py-2 text-[13px] font-semibold text-slate-200 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
          Browse files
          <input
            type="file"
            multiple
            accept={FILE_TYPES}
            className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              if (e.target.files) handleFileUpload(e.target.files);
            }}
          />
        </label>
      </div>

      {/* Uploaded Files */}
      {data.files?.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Uploaded Files
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.files.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[13px]"
              >
                <span>{fileIcon(f.name)}</span>
                <span className="text-slate-300 font-medium">{f.name}</span>
                <span className="text-slate-600 text-[11px]">
                  {(f.size / 1024).toFixed(0)}KB
                </span>
                <button
                  className="bg-transparent border-none text-slate-500 text-base cursor-pointer pl-1 hover:text-slate-300"
                  onClick={() => removeFile(i)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="flex flex-col gap-3">
        {SECTIONS.map((section) => {
          const value = data.sections?.[section.id] || "";
          const isActive = activeSection === section.id;
          const isFilled = value.trim().length > 30;
          return (
            <div
              key={section.id}
              className={`bg-slate-900/50 border rounded-xl px-5 py-4 transition-colors ${
                isActive ? "border-slate-700" : "border-slate-800"
              }`}
            >
              <div className="mb-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-[7px] h-[7px] rounded-full shrink-0 transition-colors duration-300"
                    style={{
                      backgroundColor: isFilled ? "#10b981" : "#334155",
                    }}
                  />
                  <h3 className="text-sm font-semibold text-slate-200 m-0">
                    {section.label}
                  </h3>
                </div>
                <span className="text-xs text-slate-600 ml-4">
                  {section.hint}
                </span>
              </div>
              <textarea
                className="w-full bg-transparent border border-slate-800 rounded-lg text-slate-300 text-[13px] leading-relaxed px-3 py-2.5 resize-y font-sans focus:border-slate-700 outline-none"
                placeholder={section.placeholder}
                value={value}
                rows={isActive ? 6 : 3}
                onFocus={() => setActiveSection(section.id)}
                onBlur={() => setActiveSection(null)}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  update((prev) => ({
                    ...prev,
                    sections: {
                      ...prev.sections,
                      [section.id]: e.target.value,
                    },
                  }))
                }
              />
            </div>
          );
        })}
      </div>

      {/* URLs */}
      <div className="mt-6 mb-6">
        <h3 className="text-sm font-semibold text-slate-200 m-0 mb-1">
          Reference URLs
        </h3>
        <p className="text-xs text-slate-600 m-0 mb-3">
          Website, docs, blog posts, competitor pages — anything the AI should
          read
        </p>
        {(data.urls || [""]).map((url, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <input
              type="url"
              placeholder="https://…"
              value={url}
              className="flex-1 bg-slate-900/50 border border-slate-800 rounded-lg text-slate-300 text-[13px] px-3 py-2 outline-none font-sans focus:border-slate-700"
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update((prev) => {
                  const urls = [...(prev.urls || [""])];
                  urls[i] = e.target.value;
                  return { ...prev, urls };
                })
              }
            />
            {i === (data.urls || [""]).length - 1 ? (
              <button
                className="w-10 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-lg cursor-pointer flex items-center justify-center hover:bg-slate-700"
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    urls: [...(prev.urls || [""]), ""],
                  }))
                }
              >
                +
              </button>
            ) : (
              <button
                className="w-10 bg-transparent border border-slate-800 rounded-lg text-slate-600 text-lg cursor-pointer flex items-center justify-center hover:text-slate-400"
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    urls: prev.urls.filter((_, j) => j !== i),
                  }))
                }
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          className="px-4 py-2 text-[13px] font-semibold text-slate-400 bg-transparent border border-slate-800 rounded-lg cursor-pointer hover:border-slate-700 hover:text-slate-300 transition-colors"
          onClick={exportAll}
        >
          Export JSON
        </button>
        <div className="flex-1 text-center">
          {saving ? (
            <span className="text-amber-500 text-xs">Saving…</span>
          ) : (
            <span className="text-slate-600 text-xs">Auto-saved</span>
          )}
        </div>
        <button
          className="px-6 py-2.5 text-[13px] font-bold text-white bg-gradient-to-br from-blue-500 to-blue-600 border-none rounded-lg cursor-pointer transition-opacity disabled:opacity-40"
          disabled={score < 20}
        >
          {score >= 20 ? "Continue to Step 2 →" : "Add more context first"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-slate-200 px-5 py-2.5 rounded-lg text-[13px] font-medium z-50 animate-[fadeIn_0.2s_ease]">
          {toast}
        </div>
      )}
    </div>
  );
}
