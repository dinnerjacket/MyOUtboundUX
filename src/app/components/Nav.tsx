"use client";

import Link from "next/link";

interface NavProps {
  active: "knowledge" | "preview" | "prospects";
}

export default function Nav({ active }: NavProps) {
  return (
    <nav style={styles.nav}>
      <div style={styles.navInner}>
        <Link href="/" style={styles.brand}>
          <span style={styles.brandIcon}>◆</span>
          <span style={styles.brandText}>Outbound Machine</span>
        </Link>
        <div style={styles.tabs}>
          <Link
            href="/"
            style={{
              ...styles.tab,
              ...(active === "knowledge" ? styles.tabActive : {}),
            }}
          >
            Knowledge Base
          </Link>
          <Link
            href="/preview"
            style={{
              ...styles.tab,
              ...(active === "preview" ? styles.tabActive : {}),
            }}
          >
            Sequence Preview
          </Link>
          <Link
            href="/prospects"
            style={{
              ...styles.tab,
              ...(active === "prospects" ? styles.tabActive : {}),
            }}
          >
            Prospects
          </Link>
        </div>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    borderBottom: "1px solid #1e293b",
    background: "rgba(10, 15, 26, 0.9)",
    backdropFilter: "blur(12px)",
    position: "sticky" as const,
    top: 0,
    zIndex: 50,
  },
  navInner: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "0 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 52,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
  },
  brandIcon: {
    color: "#3b82f6",
    fontSize: 16,
  },
  brandText: {
    fontSize: 14,
    fontWeight: 700,
    color: "#f1f5f9",
    letterSpacing: "-0.01em",
  },
  tabs: {
    display: "flex",
    gap: 2,
  },
  tab: {
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 500,
    color: "#64748b",
    textDecoration: "none",
    borderRadius: 6,
    transition: "all 0.15s",
  },
  tabActive: {
    color: "#e2e8f0",
    background: "rgba(59, 130, 246, 0.1)",
  },
};
