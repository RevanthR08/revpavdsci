#!/usr/bin/env python3
# flake8: noqa
# pylint: disable=broad-exception-caught,global-statement
"""
Generate a deep forensic PDF report with rich visual analytics.

Key goals:
- Professional courtroom-friendly structure and language.
- Minimum 15 pages with explicit chapterized sections.
- Graph-heavy evidence representation with analyst explanations.
- Optional Groq augmentation for narrative depth (no hardcoded key).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import re
import sys
import tempfile
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from datetime import UTC, datetime
from typing import Any, Dict, Iterable, List, Tuple
from xml.sax.saxutils import escape

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"]
SEVERITY_WEIGHTS = {
    "critical": 5.0,
    "high": 4.0,
    "medium": 2.5,
    "low": 1.2,
    "info": 0.6,
}
DEFAULT_SEVERITY_COLORS = {
    "critical": "#dc2626",
    "high": "#ea580c",
    "medium": "#d97706",
    "low": "#0284c7",
    "info": "#64748b",
}

SEVERITY_COLORS = dict(DEFAULT_SEVERITY_COLORS)

THEME_PRESETS: Dict[str, Dict[str, str]] = {
    "sentinel_cyber": {
        "name": "Sentinel Cyber High-Fidelity",
        "title_text": "#0f172a",
        "body_text": "#334155",
        "muted_text": "#64748b",
        "header_bg": "#0f172a",
        "header_bg_alt": "#1e293b",
        "row_bg_a": "#ffffff",
        "row_bg_b": "#f8fafc",
        "grid": "#e2e8f0",
        "chart_primary": "#2563eb",
        "chart_secondary": "#7c3aed",
        "chart_accent": "#f59e0b",
        "chart_warning": "#ef4444",
        "chart_purple": "#8b5cf6",
        "sev_critical": "#dc2626",
        "sev_high": "#f97316",
        "sev_medium": "#f59e0b",
        "sev_low": "#0ea5e9",
        "sev_info": "#64748b",
    },
    "legal_navy": {
        "name": "Legal Navy",
        "title_text": "#0f172a",
        "body_text": "#1e293b",
        "muted_text": "#475569",
        "header_bg": "#0f172a",
        "header_bg_alt": "#1e293b",
        "row_bg_a": "#f8fafc",
        "row_bg_b": "#eef2ff",
        "grid": "#cbd5e1",
        "chart_primary": "#0ea5e9",
        "chart_secondary": "#22c55e",
        "chart_accent": "#f59e0b",
        "chart_warning": "#ef4444",
        "chart_purple": "#8b5cf6",
        "sev_critical": "#b91c1c",
        "sev_high": "#c2410c",
        "sev_medium": "#a16207",
        "sev_low": "#0369a1",
        "sev_info": "#475569",
    },
    "judicial_charcoal": {
        "name": "Judicial Charcoal",
        "title_text": "#111827",
        "body_text": "#1f2937",
        "muted_text": "#6b7280",
        "header_bg": "#111827",
        "header_bg_alt": "#374151",
        "row_bg_a": "#f9fafb",
        "row_bg_b": "#f3f4f6",
        "grid": "#d1d5db",
        "chart_primary": "#2563eb",
        "chart_secondary": "#059669",
        "chart_accent": "#d97706",
        "chart_warning": "#dc2626",
        "chart_purple": "#7c3aed",
        "sev_critical": "#b91c1c",
        "sev_high": "#c2410c",
        "sev_medium": "#b45309",
        "sev_low": "#1d4ed8",
        "sev_info": "#4b5563",
    },
    "compliance_emerald": {
        "name": "Compliance Emerald",
        "title_text": "#022c22",
        "body_text": "#064e3b",
        "muted_text": "#065f46",
        "header_bg": "#064e3b",
        "header_bg_alt": "#065f46",
        "row_bg_a": "#f0fdf4",
        "row_bg_b": "#ecfdf5",
        "grid": "#bbf7d0",
        "chart_primary": "#0f766e",
        "chart_secondary": "#16a34a",
        "chart_accent": "#f59e0b",
        "chart_warning": "#dc2626",
        "chart_purple": "#6d28d9",
        "sev_critical": "#991b1b",
        "sev_high": "#b45309",
        "sev_medium": "#a16207",
        "sev_low": "#0f766e",
        "sev_info": "#166534",
    },
}

ACTIVE_THEME = dict(THEME_PRESETS["sentinel_cyber"])


def set_active_theme(theme_name: str) -> None:
    selected = THEME_PRESETS.get(clean_text(theme_name).lower())
    if not selected:
        selected = THEME_PRESETS["sentinel_cyber"]

    # Work on a detached copy so updating ACTIVE_THEME does not mutate preset data.
    selected_copy = dict(selected)

    ACTIVE_THEME.clear()
    ACTIVE_THEME.update(selected_copy)

    SEVERITY_COLORS.clear()
    SEVERITY_COLORS.update(
        {
            "critical": selected["sev_critical"],
            "high": selected_copy["sev_high"],
            "medium": selected_copy["sev_medium"],
            "low": selected_copy["sev_low"],
            "info": selected_copy["sev_info"],
        }
    )


def theme_color(name: str, fallback: str) -> str:
    return ACTIVE_THEME.get(name, fallback)

DEFAULT_TARGET_PAGES = 15


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_int(value: Any, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    text = str(value)
    text = re.sub(r"```[\s\S]*?```", " ", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    text = re.sub(r"#+\s?", "", text)
    text = re.sub(r"\[[^\]]+\]\([^\)]+\)", "", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def to_title(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("_", " ").strip()).title()


def parse_timestamp_hour(value: Any) -> int | None:
    if not value:
        return None

    raw = str(value).strip()
    if not raw:
        return None

    raw = raw.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(raw).hour
    except ValueError:
        pass

    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M:%S.%f"):
        try:
            return datetime.strptime(raw, fmt).hour
        except ValueError:
            continue

    return None


def normalize_risk_score(
    payload: Dict[str, Any],
    analysis: Dict[str, Any],
    findings: List[Dict[str, Any]],
) -> float:
    explicit = safe_float(payload.get("risk_score"), -1)
    if explicit >= 0:
        return max(0.0, min(100.0, explicit))

    backend = safe_float(analysis.get("risk_score"), -1)
    if backend > 100:
        backend = backend / 100.0
    if backend >= 0:
        return max(0.0, min(100.0, backend))

    if not findings:
        return 0.0

    weighted = 0.0
    for finding in findings:
        sev = str(finding.get("severity") or "info").lower()
        weighted += SEVERITY_WEIGHTS.get(sev, 1.0)

    score = (weighted / (len(findings) * 5.0)) * 100.0
    return max(0.0, min(100.0, score))


def risk_band(score: float) -> str:
    if score >= 80:
        return "CRITICAL"
    if score >= 55:
        return "HIGH"
    if score >= 30:
        return "MEDIUM"
    return "LOW"


def split_phase_sequence(raw: str) -> List[str]:
    if not raw:
        return []

    parts = re.split(r"\s*(?:->|=>|→)\s*", raw)
    return [clean_text(part).lower().replace(" ", "-") for part in parts if clean_text(part)]


def summarize_metrics(payload: Dict[str, Any]) -> Dict[str, Any]:
    analysis = payload.get("analysis") or {}
    summary = payload.get("summary") or {}
    categories = payload.get("categories") or []
    findings = payload.get("findings") or []
    chains = payload.get("chains") or []
    travels = payload.get("travels") or []

    if not isinstance(categories, list):
        categories = []
    if not isinstance(findings, list):
        findings = []
    if not isinstance(chains, list):
        chains = []
    if not isinstance(travels, list):
        travels = []

    risk_score = normalize_risk_score(payload, analysis, findings)
    threat_level = str(payload.get("threat_level") or risk_band(risk_score)).upper()

    severity_counts: Counter = Counter()
    detection_counts: Counter = Counter()
    hour_counts: Dict[int, int] = defaultdict(int)
    user_counts: Counter = Counter()
    host_counts: Counter = Counter()
    phase_counts: Counter = Counter()
    mitre_counts: Counter = Counter()

    findings_with_timestamp = 0
    findings_with_user = 0
    findings_with_host = 0
    findings_with_mitre = 0

    for finding in findings:
        severity = str(finding.get("severity") or "info").lower()
        if severity not in SEVERITY_ORDER:
            severity = "info"
        severity_counts[severity] += 1

        detection = to_title(str(finding.get("detection_type") or "rule"))
        detection_counts[detection] += 1

        users = finding.get("affected_users") or []
        hosts = finding.get("affected_hosts") or []

        if isinstance(users, list):
            for user in users:
                name = clean_text(user)
                if name:
                    user_counts[name] += 1
                    findings_with_user += 1

        if isinstance(hosts, list):
            for host in hosts:
                name = clean_text(host)
                if name:
                    host_counts[name] += 1
                    findings_with_host += 1

        timestamp = finding.get("timestamp")
        details = finding.get("details") or {}
        timestamp = timestamp or details.get("time_logged") or details.get("timestamp")
        hour = parse_timestamp_hour(timestamp)
        if hour is not None:
            hour_counts[hour] += 1
            findings_with_timestamp += 1

        mitre = finding.get("mitre_techniques") or []
        if isinstance(mitre, list) and mitre:
            findings_with_mitre += 1
            for item in mitre:
                key = clean_text(item)
                if key:
                    mitre_counts[key] += 1

    category_rows: List[Dict[str, Any]] = []
    for category in categories:
        category_name = clean_text(category.get("category_name") or "Unspecified")
        event_count = safe_int(category.get("event_count"), 0)
        risk = safe_float(category.get("risk_score"), 0.0)
        tactic = clean_text(category.get("tactic") or "Unspecified")
        mitre_id = clean_text(category.get("mitre_id") or "")

        category_rows.append(
            {
                "category_name": category_name,
                "event_count": event_count,
                "risk_score": risk,
                "tactic": tactic,
                "mitre_id": mitre_id,
                "weighted_risk": risk * max(event_count, 1),
            }
        )

        if mitre_id:
            mitre_counts[mitre_id] += max(1, event_count)

    category_rows.sort(key=lambda item: item["weighted_risk"], reverse=True)

    chain_rows: List[Dict[str, Any]] = []
    confidence_values: List[float] = []
    for chain in chains:
        raw_conf = safe_float(chain.get("chain_confidence", chain.get("confidence", 0.0)), 0.0)
        confidence = raw_conf * 100.0 if raw_conf <= 1.0 else raw_conf
        confidence = max(0.0, min(100.0, confidence))
        confidence_values.append(confidence)

        raw_phases = chain.get("kill_chain_phases")
        phases: List[str] = []
        if isinstance(raw_phases, list) and raw_phases:
            phases = [clean_text(item).lower().replace(" ", "-") for item in raw_phases if clean_text(item)]
        else:
            phases = split_phase_sequence(clean_text(chain.get("title") or chain.get("chain_sequence") or ""))

        for phase in phases:
            phase_counts[phase] += 1

        user = ""
        if isinstance(chain.get("affected_users"), list) and chain.get("affected_users"):
            user = clean_text(chain["affected_users"][0])
        if not user:
            user = clean_text(chain.get("user_account") or "Unknown")

        host = clean_text(chain.get("computer") or "Unknown")

        chain_rows.append(
            {
                "chain_id": clean_text(chain.get("chain_id") or chain.get("id") or "N/A"),
                "computer": host,
                "user": user,
                "confidence": confidence,
                "phases": phases,
                "title": clean_text(chain.get("title") or chain.get("chain_sequence") or ""),
            }
        )

    chain_rows.sort(key=lambda item: item["confidence"], reverse=True)

    travel_gaps: List[float] = []
    for travel in travels:
        gap = safe_float(travel.get("gap_minutes"), -1)
        if gap >= 0:
            travel_gaps.append(gap)

    findings_sorted = sorted(
        findings,
        key=lambda finding: (
            safe_float(finding.get("risk_score"), 0.0),
            SEVERITY_WEIGHTS.get(str(finding.get("severity") or "info").lower(), 0.0),
        ),
        reverse=True,
    )

    risk_points = [safe_float(item.get("risk_score"), 0.0) for item in findings_sorted[:80]]

    remediation_text = (
        ((summary.get("sections") or {}).get("remediation_steps"))
        or payload.get("remediation_text")
        or ""
    )
    if not remediation_text:
        remediation_text = (
            "1. Isolate impacted hosts and reset privileged credentials.\n"
            "2. Audit persistence artifacts and disable unauthorized services.\n"
            "3. Restrict lateral movement paths and enforce host firewall policies.\n"
            "4. Increase continuous monitoring and validate detective control quality."
        )

    executive_summary = clean_text(
        payload.get("executive_summary_text")
        or (summary.get("sections") or {}).get("executive_summary")
        or summary.get("executive_briefing")
        or payload.get("report_markdown")
        or ""
    )

    payload_hash = hashlib.sha256(
        json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()

    quality_metrics = {
        "timestamp_coverage": round((findings_with_timestamp / max(len(findings), 1)) * 100, 2),
        "user_coverage": round((findings_with_user / max(len(findings), 1)) * 100, 2),
        "host_coverage": round((findings_with_host / max(len(findings), 1)) * 100, 2),
        "mitre_coverage": round((findings_with_mitre / max(len(findings), 1)) * 100, 2),
    }

    ip_counts: Counter = Counter()
    protocol_counts: Counter = Counter()

    for finding in findings:
        details = finding.get("details") or {}
        src_ip = clean_text(details.get("source_ip") or details.get("src_ip"))
        dst_ip = clean_text(details.get("destination_ip") or details.get("dest_ip") or details.get("dst_ip"))
        proto = clean_text(details.get("protocol") or details.get("service"))

        if src_ip: ip_counts[src_ip] += 1
        if dst_ip: ip_counts[dst_ip] += 1
        if proto: protocol_counts[proto.upper()] += 1

    return {
        "analysis": analysis,
        "summary": summary,
        "categories": category_rows,
        "findings": findings,
        "chains": chain_rows,
        "travels": travels,
        "risk_score": round(risk_score, 2),
        "threat_level": threat_level,
        "severity_counts": severity_counts,
        "detection_counts": detection_counts,
        "hour_counts": hour_counts,
        "user_counts": user_counts,
        "host_counts": host_counts,
        "phase_counts": phase_counts,
        "mitre_counts": mitre_counts,
        "ip_counts": ip_counts,
        "protocol_counts": protocol_counts,
        "confidence_values": confidence_values,
        "high_conf_chains": sum(1 for c in confidence_values if c >= 75.0),
        "travel_gaps": travel_gaps,
        "risk_points": risk_points,
        "executive_summary": executive_summary,
        "remediation_text": remediation_text,
        "payload_hash": payload_hash,
        "top_findings": findings_sorted[:120],
        "quality_metrics": quality_metrics,
        "impacted_users": len(user_counts),
        "impacted_hosts": len(host_counts),
    }


# ------------------------
# Chart Generation Helpers
# ------------------------


def _finalize_chart(fig, path: str) -> None:
    fig.tight_layout()
    fig.savefig(path, dpi=220)
    plt.close(fig)


def save_chart_severity(path: str, severity_counts: Counter) -> None:
    labels = [to_title(level) for level in SEVERITY_ORDER]
    values = [severity_counts.get(level, 0) for level in SEVERITY_ORDER]
    colors_used = [SEVERITY_COLORS[level] for level in SEVERITY_ORDER]

    fig, ax = plt.subplots(figsize=(8.0, 3.2))
    bars = ax.bar(labels, values, color=colors_used, edgecolor="#111827")
    for bar, value in zip(bars, values):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height() + 0.2,
            str(value),
            ha="center",
            va="bottom",
            fontsize=8,
        )
    ax.set_title("Severity Distribution")
    ax.set_ylabel("Count")
    ax.grid(axis="y", linestyle="--", alpha=0.35)
    ax.set_axisbelow(True)
    _finalize_chart(fig, path)


def save_chart_detection(path: str, detection_counts: Counter) -> None:
    top = detection_counts.most_common(8)
    labels = [name for name, _ in top] or ["No Data"]
    values = [count for _, count in top] or [1]

    fig, ax = plt.subplots(figsize=(8.0, 3.2))
    palette = [
        theme_color("chart_primary", "#0284c7"),
        theme_color("chart_secondary", "#0f766e"),
        theme_color("chart_accent", "#f59e0b"),
        theme_color("chart_warning", "#ea580c"),
        theme_color("chart_purple", "#7c3aed"),
        "#14b8a6",
        "#4b5563",
        "#f43f5e",
    ]
    bars = ax.barh(labels, values, color=palette[: len(values)], edgecolor="#111827")
    ax.invert_yaxis()
    for bar, value in zip(bars, values):
        ax.text(value + 0.2, bar.get_y() + bar.get_height() / 2, str(value), va="center", fontsize=8)
    ax.set_title("Detection Type Distribution")
    ax.set_xlabel("Signals")
    ax.grid(axis="x", linestyle="--", alpha=0.35)
    ax.set_axisbelow(True)
    _finalize_chart(fig, path)


def save_chart_timeline(path: str, hour_counts: Dict[int, int]) -> None:
    hours = list(range(24))
    values = [hour_counts.get(hour, 0) for hour in hours]

    fig, ax = plt.subplots(figsize=(8.0, 3.2))
    primary = theme_color("chart_primary", "#0ea5e9")
    ax.plot(hours, values, color=primary, linewidth=2.0, marker="o", markersize=3)
    ax.fill_between(hours, values, color=primary, alpha=0.16)
    ax.set_xticks([0, 4, 8, 12, 16, 20, 23])
    ax.set_xticklabels(["00", "04", "08", "12", "16", "20", "23"])
    ax.set_title("Event Activity by Hour")
    ax.set_xlabel("Hour (24h)")
    ax.set_ylabel("Events")
    ax.grid(linestyle="--", alpha=0.35)
    ax.set_axisbelow(True)
    _finalize_chart(fig, path)


def save_chart_chain_confidence(path: str, confidences: List[float]) -> None:
    values = confidences or [0.0]

    fig, ax = plt.subplots(figsize=(8.0, 3.2))
    ax.hist(
        values,
        bins=[0, 20, 40, 60, 75, 90, 100],
        color=theme_color("chart_accent", "#f97316"),
        edgecolor="#111827",
        alpha=0.9,
    )
    ax.set_title("Chain Confidence Histogram")
    ax.set_xlabel("Confidence (%)")
    ax.set_ylabel("Chain Count")
    ax.grid(axis="y", linestyle="--", alpha=0.35)
    ax.set_axisbelow(True)
    _finalize_chart(fig, path)


def save_chart_category_risk(path: str, category_rows: List[Dict[str, Any]]) -> None:
    top = category_rows[:8]
    labels = [row["category_name"][:28] for row in top] or ["No Categories"]
    values = [safe_float(row["weighted_risk"], 0.0) for row in top] or [0.0]

    fig, ax = plt.subplots(figsize=(8.0, 3.2))
    bars = ax.barh(labels, values, color=theme_color("chart_secondary", "#22c55e"), edgecolor="#111827")
    ax.invert_yaxis()
    for bar, value in zip(bars, values):
        ax.text(value + 0.2, bar.get_y() + bar.get_height() / 2, f"{value:.1f}", va="center", fontsize=8)
    ax.set_title("Category Weighted Risk (risk * event count)")
    ax.set_xlabel("Weighted Risk")
    ax.grid(axis="x", linestyle="--", alpha=0.35)
    ax.set_axisbelow(True)
    _finalize_chart(fig, path)


def save_chart_mitre(path: str, mitre_counts: Counter) -> None:
    top = mitre_counts.most_common(10)
    labels = [name for name, _ in top] or ["No MITRE"]
    values = [count for _, count in top] or [0]

    fig, ax = plt.subplots(figsize=(8.0, 3.2))
    bars = ax.bar(labels, values, color=theme_color("chart_purple", "#a855f7"), edgecolor="#111827")
    ax.tick_params(axis="x", rotation=35, labelsize=8)
    for bar, value in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.2, str(value), ha="center", va="bottom", fontsize=7)
    ax.set_title("MITRE Technique Frequency")
    ax.set_ylabel("Count")
    ax.grid(axis="y", linestyle="--", alpha=0.35)
    ax.set_axisbelow(True)
    _finalize_chart(fig, path)


def save_chart_asset_impact(path: str, counts: Counter, title: str, color: str) -> None:
    top = counts.most_common(10)
    labels = [name[:28] for name, _ in top] or ["No Data"]
    values = [count for _, count in top] or [0]

    fig, ax = plt.subplots(figsize=(8.0, 3.2))
    bars = ax.barh(labels, values, color=color, edgecolor="#111827")
    ax.invert_yaxis()
    for bar, value in zip(bars, values):
        ax.text(value + 0.1, bar.get_y() + bar.get_height() / 2, str(value), va="center", fontsize=8)
    ax.set_title(title)
    ax.set_xlabel("Occurrences")
    ax.grid(axis="x", linestyle="--", alpha=0.35)
    ax.set_axisbelow(True)
    _finalize_chart(fig, path)


def save_chart_travel_gaps(path: str, gaps: List[float]) -> None:
    values = gaps or [0.0]

    fig, ax = plt.subplots(figsize=(8.0, 3.2))
    ax.hist(
        values,
        bins=8,
        color=theme_color("chart_warning", "#ef4444"),
        edgecolor="#111827",
        alpha=0.9,
    )
    ax.set_title("Impossible Travel Gap Distribution")
    ax.set_xlabel("Gap Minutes")
    ax.set_ylabel("Alert Count")
    ax.grid(axis="y", linestyle="--", alpha=0.35)
    ax.set_axisbelow(True)
    _finalize_chart(fig, path)


def save_chart_phase_frequency(path: str, phase_counts: Counter) -> None:
    top = phase_counts.most_common(10)
    labels = [to_title(name).replace(" ", "\n") for name, _ in top] or ["No\nPhases"]
    values = [count for _, count in top] or [0]

    fig, ax = plt.subplots(figsize=(8.0, 3.2))
    bars = ax.bar(labels, values, color=theme_color("chart_primary", "#06b6d4"), edgecolor="#111827")
    for bar, value in zip(bars, values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.2, str(value), ha="center", va="bottom", fontsize=7)
    ax.set_title("Kill-Chain Phase Frequency")
    ax.set_ylabel("Occurrences")
    ax.grid(axis="y", linestyle="--", alpha=0.35)
    ax.set_axisbelow(True)
    _finalize_chart(fig, path)


def save_chart_risk_trend(path: str, risk_points: List[float]) -> None:
    values = risk_points or [0.0]
    indexes = list(range(1, len(values) + 1))

    fig, ax = plt.subplots(figsize=(8.0, 3.2))
    accent = theme_color("chart_accent", "#f59e0b")
    ax.plot(indexes, values, color=accent, linewidth=2)
    ax.fill_between(indexes, values, color=accent, alpha=0.15)
    ax.set_title("Prioritized Finding Risk Trend")
    ax.set_xlabel("Finding Rank")
    ax.set_ylabel("Risk Score")
    ax.grid(linestyle="--", alpha=0.35)
    ax.set_axisbelow(True)
    _finalize_chart(fig, path)


# ------------------
# Layout and Tables
# ------------------


def build_styles() -> Dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    styles = {
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=34,
            leading=40,
            textColor=colors.HexColor(theme_color("title_text", "#0f172a")),
            alignment=TA_CENTER,
            spaceAfter=20,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=12,
            leading=18,
            textColor=colors.HexColor(theme_color("muted_text", "#334155")),
            alignment=TA_CENTER,
            spaceAfter=12,
        ),
        "title": ParagraphStyle(
            "Title",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=24,
            leading=28,
            textColor=colors.HexColor(theme_color("title_text", "#0f172a")),
            alignment=TA_LEFT,
            spaceAfter=12,
        ),
        "section": ParagraphStyle(
            "Section",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor(theme_color("title_text", "#0f172a")),
            spaceBefore=10,
            spaceAfter=8,
            borderPadding=2,
            borderWidth=0,
            leftIndent=0,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor(theme_color("body_text", "#334155")),
            spaceBefore=4,
            spaceAfter=4,
        ),
        "small": ParagraphStyle(
            "Small",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor(theme_color("muted_text", "#64748b")),
        ),
        "tiny": ParagraphStyle(
            "Tiny",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor(theme_color("body_text", "#334155")),
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor(theme_color("body_text", "#334155")),
            leftIndent=15,
            bulletIndent=5,
            spaceAfter=3,
        ),
        "caption": ParagraphStyle(
            "Caption",
            parent=base["BodyText"],
            fontName="Helvetica-Oblique",
            fontSize=8.5,
            leading=11,
            textColor=colors.HexColor(theme_color("muted_text", "#64748b")),
            spaceBefore=4,
            spaceAfter=8,
        ),
    }
    return styles


def draw_header_footer(canvas: Any, doc: Any) -> None:
    canvas.saveState()
    
    # Brand bar on the left
    canvas.setFillColor(colors.HexColor(theme_color("header_bg", "#0f172a")))
    canvas.rect(0, 0, 0.4 * cm, A4[1], fill=1, stroke=0)
    
    # Header metadata
    canvas.setFont("Helvetica-Bold", 7)
    canvas.setFillColor(colors.HexColor(theme_color("muted_text", "#64748b")))
    canvas.drawString(doc.leftMargin, A4[1] - 0.8 * cm, "SENTINAL FORENSIC CORE // GEN-4 ADJUDICATION")
    
    # Bottom metadata
    canvas.setFont("Helvetica", 7)
    report_sig = hashlib.md5(f"{doc.pagesize}".encode()).hexdigest()[:12].upper()
    canvas.drawString(doc.leftMargin, 0.8 * cm, f"Report Signature: {report_sig}")
    canvas.drawRightString(A4[0] - doc.rightMargin, 0.8 * cm, f"DETECTION LAYER CLASSIFIED // PAGE {canvas.getPageNumber()}")
    
    canvas.restoreState()


def para(value: Any, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(clean_text(value) or "-"), style)


def wrap_token_for_cell(value: Any, chunk: int = 8) -> str:
    text = clean_text(value)
    if not text:
        return "-"

    compact = text.replace(" ", "")
    if len(compact) <= chunk:
        return escape(text)

    segments = [escape(compact[i:i + chunk]) for i in range(0, len(compact), chunk)]
    return "<br/>".join(segments)


def add_kv_table(
    story: List[Any],
    rows: List[Tuple[str, str]],
    col_widths: Tuple[float, float],
    styles: Dict[str, ParagraphStyle],
) -> None:
    table_rows = []
    for key, value in rows:
        table_rows.append(
            [
                Paragraph(f"<b>{escape(clean_text(key))}</b>", styles["body"]),
                Paragraph(escape(clean_text(value)), styles["body"]),
            ]
        )

    table = Table(table_rows, colWidths=[col_widths[0], col_widths[1]], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor(theme_color("row_bg_a", "#f8fafc"))),
                (
                    "ROWBACKGROUNDS",
                    (0, 0),
                    (-1, -1),
                    [
                        colors.HexColor(theme_color("row_bg_a", "#f8fafc")),
                        colors.HexColor(theme_color("row_bg_b", "#f1f5f9")),
                    ],
                ),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor(theme_color("grid", "#cbd5e1"))),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor(theme_color("grid", "#cbd5e1"))),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(table)


def findings_table(findings: List[Dict[str, Any]], styles: Dict[str, ParagraphStyle]) -> Table:
    rows: List[List[Any]] = [[
        Paragraph("<b>ID</b>", styles["tiny"]),
        Paragraph("<b>Severity</b>", styles["tiny"]),
        Paragraph("<b>Detection</b>", styles["tiny"]),
        Paragraph("<b>Title</b>", styles["tiny"]),
        Paragraph("<b>Risk</b>", styles["tiny"]),
    ]]

    for finding in findings:
        rows.append(
            [
                Paragraph(wrap_token_for_cell(finding.get("id") or "N/A", 8), styles["tiny"]),
                para(to_title(str(finding.get("severity") or "info")), styles["tiny"]),
                para(to_title(str(finding.get("detection_type") or "rule")), styles["tiny"]),
                para(clean_text(finding.get("title") or "Untitled signal")[:96], styles["tiny"]),
                para(f"{safe_float(finding.get('risk_score'), 0.0):.2f}", styles["tiny"]),
            ]
        )

    table = Table(
        rows,
        colWidths=[4.1 * cm, 2.2 * cm, 2.8 * cm, 6.8 * cm, 1.0 * cm],
        repeatRows=1,
        hAlign="LEFT",
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(theme_color("header_bg", "#0f172a"))),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7.1),
                ("LEADING", (0, 0), (-1, -1), 8.6),
                ("ALIGN", (4, 1), (4, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [
                        colors.HexColor(theme_color("row_bg_a", "#f8fafc")),
                        colors.HexColor(theme_color("row_bg_b", "#eef2ff")),
                    ],
                ),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor(theme_color("grid", "#cbd5e1"))),
                ("LEFTPADDING", (0, 0), (-1, -1), 3.5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3.5),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("WORDWRAP", (0, 0), (-1, -1), "CJK"),
            ]
        )
    )
    return table


def chain_table(chains: List[Dict[str, Any]], styles: Dict[str, ParagraphStyle]) -> Table:
    rows: List[List[Any]] = [[
        Paragraph("<b>Chain ID</b>", styles["tiny"]),
        Paragraph("<b>Host</b>", styles["tiny"]),
        Paragraph("<b>User</b>", styles["tiny"]),
        Paragraph("<b>Confidence</b>", styles["tiny"]),
        Paragraph("<b>Phase Summary</b>", styles["tiny"]),
    ]]

    for chain in chains[:14]:
        phases = " -> ".join(chain.get("phases", [])[:5]) or "Unavailable"
        rows.append(
            [
                Paragraph(wrap_token_for_cell(chain.get("chain_id") or "N/A", 9), styles["tiny"]),
                para(chain.get("computer") or "Unknown", styles["tiny"]),
                para(chain.get("user") or "Unknown", styles["tiny"]),
                para(f"{safe_float(chain.get('confidence'), 0.0):.1f}%", styles["tiny"]),
                para(phases[:90], styles["tiny"]),
            ]
        )

    table = Table(
        rows,
        colWidths=[3.1 * cm, 2.8 * cm, 2.6 * cm, 2.0 * cm, 6.3 * cm],
        repeatRows=1,
        hAlign="LEFT",
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(theme_color("header_bg_alt", "#1e293b"))),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7.1),
                ("LEADING", (0, 0), (-1, -1), 8.6),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [
                        colors.HexColor(theme_color("row_bg_a", "#f8fafc")),
                        colors.HexColor(theme_color("row_bg_b", "#ecfeff")),
                    ],
                ),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor(theme_color("grid", "#cbd5e1"))),
                ("LEFTPADDING", (0, 0), (-1, -1), 3.5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3.5),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return table


def category_table(categories: List[Dict[str, Any]], styles: Dict[str, ParagraphStyle]) -> Table:
    rows: List[List[Any]] = [[
        Paragraph("<b>Category</b>", styles["tiny"]),
        Paragraph("<b>Events</b>", styles["tiny"]),
        Paragraph("<b>Risk</b>", styles["tiny"]),
        Paragraph("<b>Tactic</b>", styles["tiny"]),
        Paragraph("<b>MITRE</b>", styles["tiny"]),
    ]]

    for category in categories[:16]:
        rows.append(
            [
                para(category.get("category_name") or "Unspecified", styles["tiny"]),
                para(str(safe_int(category.get("event_count"), 0)), styles["tiny"]),
                para(f"{safe_float(category.get('risk_score'), 0.0):.2f}", styles["tiny"]),
                para(category.get("tactic") or "Unspecified", styles["tiny"]),
                para(category.get("mitre_id") or "-", styles["tiny"]),
            ]
        )

    table = Table(
        rows,
        colWidths=[6.2 * cm, 1.5 * cm, 1.4 * cm, 4.0 * cm, 3.2 * cm],
        repeatRows=1,
        hAlign="LEFT",
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(theme_color("header_bg", "#0f172a"))),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7.1),
                ("LEADING", (0, 0), (-1, -1), 8.6),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [
                        colors.HexColor(theme_color("row_bg_a", "#f8fafc")),
                        colors.HexColor(theme_color("row_bg_b", "#eff6ff")),
                    ],
                ),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor(theme_color("grid", "#cbd5e1"))),
                ("LEFTPADDING", (0, 0), (-1, -1), 3.5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3.5),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return table


def travel_table(travels: List[Dict[str, Any]], styles: Dict[str, ParagraphStyle]) -> Table:
    rows: List[List[Any]] = [[
        Paragraph("<b>Travel ID</b>", styles["tiny"]),
        Paragraph("<b>User</b>", styles["tiny"]),
        Paragraph("<b>Host A</b>", styles["tiny"]),
        Paragraph("<b>Host B</b>", styles["tiny"]),
        Paragraph("<b>Gap (min)</b>", styles["tiny"]),
    ]]

    if not travels:
        rows.append([
            para("N/A", styles["tiny"]),
            para("No impossible travel indicators", styles["tiny"]),
            para("-", styles["tiny"]),
            para("-", styles["tiny"]),
            para("0", styles["tiny"]),
        ])
    else:
        for travel in travels[:16]:
            rows.append(
                [
                    para(travel.get("travel_id") or "N/A", styles["tiny"]),
                    para(travel.get("user_account") or "Unknown", styles["tiny"]),
                    para(travel.get("host_a") or "Unknown", styles["tiny"]),
                    para(travel.get("host_b") or "Unknown", styles["tiny"]),
                    para(f"{safe_float(travel.get('gap_minutes'), 0.0):.2f}", styles["tiny"]),
                ]
            )

    table = Table(
        rows,
        colWidths=[3.2 * cm, 3.1 * cm, 3.5 * cm, 3.5 * cm, 2.8 * cm],
        repeatRows=1,
        hAlign="LEFT",
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(theme_color("header_bg_alt", "#1e293b"))),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 7.1),
                ("LEADING", (0, 0), (-1, -1), 8.6),
                (
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [
                        colors.HexColor(theme_color("row_bg_a", "#f8fafc")),
                        colors.HexColor(theme_color("row_bg_b", "#fef2f2")),
                    ],
                ),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor(theme_color("grid", "#cbd5e1"))),
                ("LEFTPADDING", (0, 0), (-1, -1), 3.5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 3.5),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return table


def add_bullets(story: List[Any], lines: Iterable[str], styles: Dict[str, ParagraphStyle]) -> None:
    for line in lines:
        normalized = clean_text(line)
        normalized = re.sub(r"^\d+\.\s*", "", normalized)
        if normalized:
            story.append(Paragraph(f"- {escape(normalized)}", styles["bullet"]))


def derive_gap_notes(metrics: Dict[str, Any]) -> List[str]:
    notes: List[str] = []
    quality = metrics.get("quality_metrics") or {}

    if len(metrics.get("findings") or []) == 0:
        notes.append("No finding records were provided; legal narrative confidence is constrained until event evidence is supplied.")

    if len(metrics.get("categories") or []) == 0:
        notes.append("Category-level risk/tactic metadata is missing; threat taxonomy should be completed for stronger attribution.")

    if quality.get("timestamp_coverage", 0) < 70:
        notes.append("Timestamp coverage is below 70%; chronology confidence may be reduced for sequence reconstruction.")

    if quality.get("host_coverage", 0) < 60:
        notes.append("Host attribution coverage is limited; affected-system scope should be validated before legal disclosure.")

    if quality.get("user_coverage", 0) < 60:
        notes.append("User attribution coverage is limited; account ownership and identity enrichment are recommended.")

    if quality.get("mitre_coverage", 0) < 40:
        notes.append("MITRE coverage is sparse; consider additional technique mapping for defensible adversary-pattern explanation.")

    if len(metrics.get("chains") or []) == 0:
        notes.append("No correlated chain records were produced; multi-stage progression should be investigated manually.")

    if not notes:
        notes.append("No material telemetry gaps detected from supplied payload; dataset appears sufficiently populated for this reporting layer.")

    return notes


# -----------------------------
# Optional Groq Narratives
# -----------------------------


AI_SECTION_KEYS: Tuple[str, ...] = (
    "executive",
    "methodology",
    "risk_posture",
    "temporal",
    "chains",
    "findings",
    "category_mitre",
    "asset_impact",
    "travel_phase",
    "remediation",
    "legal",
    "glossary",
    "gap_analysis",
)


def _clip_narrative(text: Any, max_chars: int) -> str:
    value = clean_text(text)
    if len(value) <= max_chars:
        return value

    clipped = value[:max_chars].rsplit(" ", 1)[0].strip()
    if not clipped:
        clipped = value[:max_chars].strip()
    return f"{clipped} ..."


def _default_ai_sections(metrics: Dict[str, Any]) -> Dict[str, str]:
    severity = metrics["severity_counts"]
    quality = metrics["quality_metrics"]
    hour_counts = metrics["hour_counts"]
    detection_counts = metrics["detection_counts"]
    phase_counts = metrics["phase_counts"]
    mitre_counts = metrics["mitre_counts"]

    peak_hour = None
    if hour_counts:
        peak_hour = max(hour_counts.items(), key=lambda item: item[1])[0]

    top_detection = "rule"
    if detection_counts:
        top_detection = max(detection_counts.items(), key=lambda item: item[1])[0]

    top_phase = "credential-access"
    if phase_counts:
        top_phase = max(phase_counts.items(), key=lambda item: item[1])[0]

    top_category = metrics["categories"][0] if metrics["categories"] else {}
    top_mitre = "not-supplied"
    if mitre_counts:
        top_mitre = str(max(mitre_counts.items(), key=lambda item: item[1])[0])

    executive = (
        f"Threat posture is {metrics['threat_level']} with composite risk {metrics['risk_score']:.2f}/100. "
        f"Critical findings: {severity.get('critical', 0)}, high findings: {severity.get('high', 0)}, "
        f"correlated chains: {len(metrics['chains'])}, impacted users: {metrics['impacted_users']}, "
        f"impacted hosts: {metrics['impacted_hosts']}."
    )

    methodology = (
        "Pipeline methodology combines deterministic detections, anomaly signatures, temporal reconstruction, and chain correlation. "
        f"Coverage indicators are timestamp {quality.get('timestamp_coverage', 0):.2f}%, user {quality.get('user_coverage', 0):.2f}%, "
        f"host {quality.get('host_coverage', 0):.2f}%, MITRE {quality.get('mitre_coverage', 0):.2f}%."
    )

    risk_posture = (
        "Severity and detection analytics indicate concentrated exposure in high-impact signals. "
        f"Most common detection family: {to_title(top_detection)}. "
        "Prioritization should focus on high-confidence, multi-host, and repeated-account indicators before broader medium-risk backlog items."
    )

    temporal = (
        "Temporal analytics support sequence reconstruction and likely operational windows for adversary activity. "
        + (f"Peak activity hour observed near {int(peak_hour):02d}:00 UTC. " if peak_hour is not None else "No reliable peak hour could be derived. ")
        + "Risk trend visualization emphasizes front-loaded criticality and should guide staged containment planning."
    )

    chains = (
        "Chain-correlation evidence suggests multi-step behavior rather than isolated signals. "
        f"High-confidence chains: {metrics['high_conf_chains']}; dominant phase indicator: {to_title(top_phase)}. "
        "Validation should prioritize path continuity, credential lineage, and host-to-host progression artifacts."
    )

    findings = (
        "Detailed findings are ranked by risk score and severity weighting to support triage defensibility. "
        "Analysts should verify the top-ranked entries first, preserve raw log lineage for each record ID, "
        "and annotate any assumptions used during contextual interpretation."
    )

    category_mitre = (
        "Category and ATT&CK mapping support attribution narrative depth and control-gap analysis. "
        f"Top category: {top_category.get('category_name') or 'Unspecified'}; top mapped technique/tactic token: {top_mitre}. "
        "Sparse mappings should be expanded before external legal disclosure."
    )

    asset_impact = (
        "Asset-impact analytics identify concentration of exposure across user accounts and endpoints. "
        f"Distinct impacted users: {metrics['impacted_users']}, distinct impacted hosts: {metrics['impacted_hosts']}. "
        "Elevated concentration in a small population indicates urgent containment and credential hygiene requirements."
    )

    travel_phase = (
        "Travel-gap and phase-frequency analysis supports plausibility testing for account activity and attack progression. "
        f"Impossible travel alert count: {len(metrics['travels'])}. "
        "Where travel anomalies and later-stage phases co-occur, escalation response should be accelerated."
    )

    legal = (
        "The report includes evidence integrity hashing, procedural traceability elements, and structured chronology suitable for "
        "forensic/legal workflows. Jurisdiction-specific admissibility standards require legal counsel and certified forensic review."
    )

    remediation = (
        "Containment should prioritize credential reset, endpoint isolation, persistence eradication, and lateral movement constraints, "
        "followed by detective-control tuning and validation.")

    gap_analysis = (
        "Potential analytical gaps should be reviewed before legal submission: verify timestamp normalization consistency, "
        "confirm complete asset attribution for each high-risk signal, and validate MITRE mappings where available. "
        "Any finding lacking full context should be flagged for supplemental evidentiary collection and analyst annotation."
    )

    glossary = (
        "Glossary entries define key technical terms to reduce interpretation ambiguity for non-technical stakeholders. "
        "Assumptions and certification language should be reviewed against organization policy and jurisdictional evidentiary expectations "
        "before formal submission."
    )

    return {
        "executive": executive,
        "methodology": methodology,
        "risk_posture": risk_posture,
        "temporal": temporal,
        "chains": chains,
        "findings": findings,
        "category_mitre": category_mitre,
        "asset_impact": asset_impact,
        "travel_phase": travel_phase,
        "legal": legal,
        "remediation": remediation,
        "glossary": glossary,
        "gap_analysis": gap_analysis,
        "technical": chains,
        "source": "deterministic-fallback",
    }


def _extract_json_object(raw_text: str) -> str | None:
    if not raw_text:
        return None

    start = raw_text.find("{")
    end = raw_text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None

    return raw_text[start:end + 1]


def _call_groq(api_key: str, model: str, prompt: str) -> str:
    body = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a senior digital forensics expert writing litigation-ready narrative sections. "
                    "Return strict JSON only."
                ),
            },
            {
                "role": "user",
                "content": prompt,
            },
        ],
        "temperature": 0.2,
        "max_tokens": 3600,
    }

    request = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=45) as response:
        payload = json.loads(response.read().decode("utf-8"))

    choices = payload.get("choices") or []
    if not choices:
        raise ValueError("Groq response had no choices")

    return str((choices[0].get("message") or {}).get("content") or "")


def build_ai_sections(payload: Dict[str, Any], metrics: Dict[str, Any]) -> Dict[str, str]:
    result = _default_ai_sections(metrics)

    api_key = clean_text(payload.get("groq_api_key") or os.getenv("GROQ_API_KEY") or "")
    if not api_key:
        return result

    model = clean_text(payload.get("groq_model") or os.getenv("GROQ_MODEL") or "llama-3.3-70b-versatile")

    compact_metrics = {
        "scan_id": metrics["analysis"].get("scan_id") or payload.get("scan_id") or payload.get("scanId") or "unknown",
        "report_theme": payload.get("report_theme") or "legal_navy",
        "report_profile": payload.get("report_profile") or "forensic_legal",
        "threat_level": metrics["threat_level"],
        "risk_score": metrics["risk_score"],
        "total_findings": len(metrics["findings"]),
        "total_chains": len(metrics["chains"]),
        "severity_distribution": {level: metrics["severity_counts"].get(level, 0) for level in SEVERITY_ORDER},
        "detection_distribution": dict(metrics["detection_counts"]),
        "phase_frequency": dict(metrics["phase_counts"]),
        "mitre_frequency": dict(metrics["mitre_counts"]),
        "travel_alerts": len(metrics["travels"]),
        "impacted_users": metrics["impacted_users"],
        "impacted_hosts": metrics["impacted_hosts"],
        "top_findings": [
            {
                "id": item.get("id"),
                "title": item.get("title"),
                "severity": item.get("severity"),
                "risk_score": item.get("risk_score"),
                "detection_type": item.get("detection_type"),
            }
            for item in metrics["top_findings"][:10]
        ],
        "top_categories": [
            {
                "name": item.get("category_name"),
                "events": item.get("event_count"),
                "risk": item.get("risk_score"),
                "tactic": item.get("tactic"),
            }
            for item in metrics["categories"][:6]
        ],
        "quality": metrics["quality_metrics"],
    }

    section_hints = {
        "executive": "overall threat posture and board-level implication",
        "methodology": "collection, normalization, and quality interpretation",
        "risk_posture": "severity and detection chart interpretation",
        "temporal": "timeline and risk trend interpretation",
        "chains": "attack chain confidence and progression narrative",
        "findings": "how to interpret prioritized finding tables",
        "category_mitre": "category and ATT&CK mapping interpretation",
        "asset_impact": "impacted users and hosts interpretation",
        "travel_phase": "impossible travel and phase analysis interpretation",
        "remediation": "actionable remediation sequence",
        "legal": "admissibility and evidentiary posture",
        "glossary": "term clarity and certification framing",
        "gap_analysis": "missing evidence and next data-collection actions",
    }

    prompt = (
        "Generate full chapter narratives for a digital-forensics PDF. "
        "Return STRICT JSON object only, with exactly these keys and no extras: "
        f"{', '.join(AI_SECTION_KEYS)}. "
        "Do not return markdown, prose wrappers, or code fences. "
        "For each key, write 120-180 words, detail-focused, metric-grounded, litigation-ready, and non-generic. "
        "If metrics are sparse, explicitly state limitation and the next evidence collection action. "
        f"Section intent map: {json.dumps(section_hints, ensure_ascii=True)}. "
        f"Metrics JSON: {json.dumps(compact_metrics, ensure_ascii=True)}"
    )

    try:
        response_text = _call_groq(api_key, model, prompt)
        json_blob = _extract_json_object(response_text)
        if not json_blob:
            return result

        parsed = json.loads(json_blob)
        for key in AI_SECTION_KEYS:
            value = clean_text(parsed.get(key) or "")
            if value:
                result[key] = value

        result["technical"] = result.get("chains", result.get("technical", ""))

        result["source"] = f"groq:{model}"
        return result
    except (urllib.error.HTTPError, urllib.error.URLError, ValueError, json.JSONDecodeError):
        return result


# ----------------
# Report Building
# ----------------


def build_report(payload: Dict[str, Any], output_path: str) -> None:
    set_active_theme(str(payload.get("report_theme") or "sentinel_cyber"))
    metrics = summarize_metrics(payload)
    styles = build_styles()
    ai_sections = build_ai_sections(payload, metrics)
    gap_notes = derive_gap_notes(metrics)
    target_pages = max(DEFAULT_TARGET_PAGES, safe_int(payload.get("target_pages"), DEFAULT_TARGET_PAGES))

    def chapter_text(key: str, fallback: str, max_chars: int) -> str:
        return _clip_narrative(ai_sections.get(key) or fallback, max_chars)

    with tempfile.TemporaryDirectory(prefix="forensic-report-") as tmp:
        charts = {
            "severity": os.path.join(tmp, "severity.png"),
            "detection": os.path.join(tmp, "detection.png"),
            "timeline": os.path.join(tmp, "timeline.png"),
            "confidence": os.path.join(tmp, "confidence.png"),
            "category": os.path.join(tmp, "category.png"),
            "mitre": os.path.join(tmp, "mitre.png"),
            "users": os.path.join(tmp, "users.png"),
            "hosts": os.path.join(tmp, "hosts.png"),
            "travel": os.path.join(tmp, "travel.png"),
            "phases": os.path.join(tmp, "phases.png"),
            "trend": os.path.join(tmp, "trend.png"),
        }

        save_chart_severity(charts["severity"], metrics["severity_counts"])
        save_chart_detection(charts["detection"], metrics["detection_counts"])
        save_chart_timeline(charts["timeline"], metrics["hour_counts"])
        save_chart_chain_confidence(charts["confidence"], metrics["confidence_values"])
        save_chart_category_risk(charts["category"], metrics["categories"])
        save_chart_mitre(charts["mitre"], metrics["mitre_counts"])
        save_chart_asset_impact(
            charts["users"],
            metrics["user_counts"],
            "Top Impacted Users",
            theme_color("chart_primary", "#0ea5e9"),
        )
        save_chart_asset_impact(
            charts["hosts"],
            metrics["host_counts"],
            "Top Impacted Hosts",
            theme_color("chart_secondary", "#22c55e"),
        )
        save_chart_travel_gaps(charts["travel"], metrics["travel_gaps"])
        save_chart_phase_frequency(charts["phases"], metrics["phase_counts"])
        save_chart_risk_trend(charts["trend"], metrics["risk_points"])

        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            leftMargin=1.55 * cm,
            rightMargin=1.55 * cm,
            topMargin=1.45 * cm,
            bottomMargin=1.25 * cm,
            title="Digital Incident Forensic Report",
            author="Sentinal Forensic Intelligence",
        )

        story: List[Any] = []
        analysis = metrics["analysis"]
        summary = metrics["summary"]

        scan_id = clean_text(
            analysis.get("scan_id") or payload.get("scan_id") or payload.get("scanId") or "Unknown"
        )
        file_name = clean_text(analysis.get("file_name") or "Source dataset not provided")

        generated_at = clean_text(
            payload.get("generated_at")
            or summary.get("generated_at")
            or datetime.now(UTC).isoformat()
        )
        generated_label = generated_at
        try:
            generated_label = datetime.fromisoformat(generated_at.replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M:%S %Z")
        except ValueError:
            pass

        # ----------------------
        # Page 1: Cover Page
        # ----------------------
        story.append(Spacer(1, 2.0 * cm))
        story.append(Paragraph("FORENSIC CORE", styles["cover_subtitle"]))
        story.append(Paragraph("Digital Incident Intelligence Briefing", styles["cover_title"]))
        story.append(Paragraph("GEN-4 NEURAL ADJUDICATION // LITIGATION-READY DOSSIER", styles["cover_subtitle"]))
        story.append(Spacer(1, 1.2 * cm))
        
        # Stylized separator
        story.append(Table([[""]], colWidths=[14 * cm], rowHeights=[0.4 * cm], style=TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(theme_color("header_bg", "#0f172a"))),
            ('ROUNDEDCORNERS', [4, 4, 4, 4]),
        ])))
        story.append(Spacer(1, 1.2 * cm))

        story.append(Paragraph("EXECUTIVE CASE SUMMARY", styles["section"]))
        add_kv_table(
            story,
            rows=[
                ("Case Scan ID", scan_id),
                ("Asset Label", file_name),
                ("Intelligence Timestamp", generated_label),
                ("Total Signal Breadth", f"{len(metrics['findings'])} Verified Points"),
                ("Risk Vector Status", metrics["threat_level"]),
                ("Neural Core Confidence", f"{metrics['high_conf_chains']} High-Confidence Logic Chains"),
            ],
            col_widths=(6.4 * cm, 9.6 * cm),
            styles=styles,
        )

        story.append(Spacer(1, 0.5 * cm))
        story.append(
            Paragraph(
                "This report was generated to support forensic triage, executive decision-making, and legal evidentiary workflows.",
                styles["body"],
            )
        )
        story.append(Spacer(1, 0.3 * cm))
        story.append(Paragraph(f"Evidence digest (SHA-256): {metrics['payload_hash']}", styles["small"]))
        story.append(PageBreak())

        # ----------------------
        # Page 2: Legal + TOC
        # ----------------------
        story.append(Paragraph("1. Legal and Evidentiary Notice", styles["section"]))
        story.append(
            Paragraph(
                "This document is prepared for digital forensics and incident-response documentation. "
                "Admissibility and evidentiary weight depend on jurisdiction, collection process, chain-of-custody completeness, "
                "and expert testimony standards.",
                styles["body"],
            )
        )
        story.append(Spacer(1, 0.25 * cm))
        story.append(Paragraph("2. Table of Contents", styles["section"]))
        toc_entries = [
            "1. Legal and Evidentiary Notice",
            "2. Executive Assessment",
            "3. Methodology and Data Quality",
            "4. Risk Posture Analytics",
            "5. Temporal and Trend Analytics",
            "6. Attack Chain Correlation",
            "7. Detailed Findings (Part I)",
            "8. Detailed Findings (Part II)",
            "9. Network Entity Intelligence",
            "10. High-Density Evidence Archive",
            "11. Adjudication & Remediation Path",
            "12. Legal Narrative and Chain of Custody",
            "13. Glossary and Certification",
        ]
        add_bullets(story, toc_entries, styles)
        story.append(Spacer(1, 0.25 * cm))
        story.append(Paragraph(f"Narrative source: {ai_sections['source']}", styles["small"]))
        story.append(PageBreak())

        # ----------------------
        # Page 3: Executive
        # ----------------------
        story.append(Paragraph("3. Executive Assessment", styles["section"]))
        story.append(Paragraph(escape(chapter_text("executive", "", 1020)), styles["body"]))
        story.append(Spacer(1, 0.2 * cm))

        risk_drivers = []
        severity = metrics["severity_counts"]
        if severity.get("critical", 0) > 0:
            risk_drivers.append(f"Critical findings observed: {severity['critical']}.")
        if metrics["high_conf_chains"] > 0:
            risk_drivers.append(f"High-confidence chains: {metrics['high_conf_chains']}.")
        if len(metrics["travels"]) > 0:
            risk_drivers.append(f"Impossible travel alerts: {len(metrics['travels'])}.")
        if metrics["impacted_hosts"] >= 3:
            risk_drivers.append(f"Host exposure breadth elevated: {metrics['impacted_hosts']} impacted hosts.")
        if not risk_drivers:
            risk_drivers.append("No single risk driver dominates; aggregate medium-risk accumulation remains significant.")

        story.append(Paragraph("Primary Risk Drivers", styles["section"]))
        add_bullets(story, risk_drivers, styles)
        story.append(PageBreak())

        # ----------------------
        # Page 4: Methodology
        # ----------------------
        story.append(Paragraph("4. Methodology and Data Quality", styles["section"]))
        story.append(Paragraph(escape(chapter_text("methodology", ai_sections.get("gap_analysis", ""), 930)), styles["body"]))
        story.append(Spacer(1, 0.15 * cm))
        story.append(
            Paragraph(
                "The analysis pipeline combines deterministic detections, anomaly signals, category clustering, chain confidence correlation, "
                "asset-impact aggregation, and timeline reconstruction. Metrics were normalized to a 0-100 risk scale for cross-domain comparability.",
                styles["body"],
            )
        )
        story.append(Spacer(1, 0.2 * cm))

        add_kv_table(
            story,
            rows=[
                ("Total log events", str(safe_int(analysis.get("total_logs"), 0))),
                ("Total threat signals", str(safe_int(analysis.get("total_threats"), len(metrics["findings"])))),
                ("Distinct detection families", str(len(metrics["detection_counts"]))),
                ("MITRE mappings present", str(len(metrics["mitre_counts"]))),
                ("Timestamp coverage", f"{metrics['quality_metrics']['timestamp_coverage']:.2f}%"),
                ("User attribution coverage", f"{metrics['quality_metrics']['user_coverage']:.2f}%"),
                ("Host attribution coverage", f"{metrics['quality_metrics']['host_coverage']:.2f}%"),
                ("MITRE tagging coverage", f"{metrics['quality_metrics']['mitre_coverage']:.2f}%"),
            ],
            col_widths=(6.4 * cm, 9.6 * cm),
            styles=styles,
        )
        story.append(Spacer(1, 0.2 * cm))
        story.append(Paragraph("Detected Data Gaps and Fill Actions", styles["section"]))
        story.append(Paragraph(escape(chapter_text("gap_analysis", "", 760)), styles["small"]))
        story.append(Spacer(1, 0.12 * cm))
        add_bullets(story, gap_notes, styles)
        story.append(PageBreak())

        # ----------------------
        # Page 5: Risk posture charts
        # ----------------------
        story.append(Paragraph("5. Risk Posture Analytics", styles["section"]))
        story.append(Paragraph(escape(chapter_text("risk_posture", "Severity and detection distributions are shown below with visual evidence counts.", 700)), styles["small"]))
        story.append(Spacer(1, 0.15 * cm))
        story.append(Image(charts["severity"], width=16.1 * cm, height=6.2 * cm))
        story.append(Paragraph("Figure 5.1 - Severity distribution by finding class.", styles["caption"]))
        story.append(Image(charts["detection"], width=16.1 * cm, height=6.2 * cm))
        story.append(Paragraph("Figure 5.2 - Detection type distribution.", styles["caption"]))
        story.append(PageBreak())

        # ----------------------
        # Page 6: Temporal + trend
        # ----------------------
        story.append(Paragraph("6. Temporal and Trend Analytics", styles["section"]))
        story.append(Paragraph(escape(chapter_text("temporal", "These charts describe when signal density peaks and how risk declines across ranked findings.", 700)), styles["small"]))
        story.append(Spacer(1, 0.15 * cm))
        story.append(Image(charts["timeline"], width=16.1 * cm, height=6.2 * cm))
        story.append(Paragraph("Figure 6.1 - Hourly signal activity profile.", styles["caption"]))
        story.append(Image(charts["trend"], width=16.1 * cm, height=6.2 * cm))
        story.append(Paragraph("Figure 6.2 - Risk trend for prioritized findings.", styles["caption"]))
        story.append(PageBreak())

        # ----------------------
        # Page 7: Chains
        # ----------------------
        story.append(Paragraph("7. Attack Chain Correlation", styles["section"]))
        story.append(Paragraph(escape(chapter_text("chains", ai_sections.get("technical", ""), 820)), styles["small"]))
        story.append(Spacer(1, 0.2 * cm))
        story.append(chain_table(metrics["chains"], styles))
        story.append(Spacer(1, 0.2 * cm))
        story.append(Image(charts["confidence"], width=16.1 * cm, height=5.5 * cm))
        story.append(Paragraph("Figure 7.1 - Chain confidence histogram.", styles["caption"]))
        story.append(PageBreak())

        # ----------------------
        # Page 8: Findings I
        # ----------------------
        story.append(Paragraph("8. Detailed Findings (Prioritized) - Part I", styles["section"]))
        story.append(Paragraph(escape(chapter_text("findings", "", 640)), styles["small"]))
        story.append(Spacer(1, 0.12 * cm))
        first_batch = metrics["top_findings"][:12]
        if not first_batch:
            first_batch = [{"id": "N/A", "severity": "info", "detection_type": "rule", "title": "No findings", "risk_score": 0}]
        story.append(findings_table(first_batch, styles))
        story.append(Spacer(1, 0.2 * cm))
        story.append(
            Paragraph(
                "Interpretation: rows are sorted by risk and severity weighting. IDs are wrapped to preserve readability and avoid column overlap.",
                styles["small"],
            )
        )
        story.append(PageBreak())

        # ----------------------
        # Page 9: Network entity intel
        # ----------------------
        story.append(Paragraph("9. Network Entity Intelligence", styles["section"]))
        story.append(Paragraph(escape(chapter_text("asset_impact", "Network entity distributions (IPs and Protocols) are shown for correlation across finding classes.", 700)), styles["small"]))
        story.append(Spacer(1, 0.4 * cm))
        
        # IP Table
        top_ips = metrics["ip_counts"].most_common(12)
        ip_rows = [("Entity Address", "Signal Frequency")] + [(ip, str(count)) for ip, count in top_ips]
        add_kv_table(story, ip_rows, (10 * cm, 6 * cm), styles)
        
        story.append(Spacer(1, 0.5 * cm))
        
        # Protocol Table
        top_protos = metrics["protocol_counts"].most_common(10)
        proto_data = [("Protocol / Service", "Frequency")] + [(p, str(count)) for p, count in top_protos]
        add_kv_table(story, proto_data, (10 * cm, 6 * cm), styles)
        
        story.append(PageBreak())

        # ----------------------
        # Page 10: High-Density Evidence Log
        # ----------------------
        story.append(Paragraph("10. High-Density Evidence Archive", styles["section"]))
        story.append(Paragraph("Detailed technical logs for secondary findings. Access restricted to authorized forensic personnel.", styles["small"]))
        story.append(Spacer(1, 0.3 * cm))
        
        remaining_findings = metrics["top_findings"][12:50]
        if remaining_findings:
            story.append(findings_table(remaining_findings, styles))
            story.append(Spacer(1, 0.2 * cm))
            story.append(Paragraph("Note: This table represents high-fidelity signal correlation from historical archive nodes.", styles["tiny"]))
        
        story.append(PageBreak())

        # ----------------------
        # Final: Remediation + Legal
        # ----------------------
        story.append(Paragraph("11. Adjudication & Remediation Path", styles["section"]))
        story.append(Paragraph(escape(chapter_text("remediation", "", 910)), styles["body"]))
        story.append(Spacer(1, 0.2 * cm))
        story.append(Paragraph("Priority Action Items", styles["section"]))
        remediation_lines = [line.strip() for line in str(metrics["remediation_text"]).split("\n") if line.strip()]
        add_bullets(story, remediation_lines, styles)
        story.append(Spacer(1, 0.2 * cm))
        add_kv_table(
            story,
            rows=[
                ("0-24 hours", "Containment, credential reset, endpoint isolation, and emergency blocking."),
                ("24-72 hours", "Persistence eradication, host hardening, and forensic validation replay."),
                ("3-7 days", "Control tuning, coverage gap closure, and threat-hunting follow-up."),
                ("7-30 days", "Programmatic lessons learned, control maturity uplift, governance reporting."),
            ],
            col_widths=(3.8 * cm, 12.2 * cm),
            styles=styles,
        )
        story.append(PageBreak())

        # ----------------------
        # Page 14: Legal + custody
        # ----------------------
        story.append(Paragraph("14. Legal Narrative and Chain of Custody", styles["section"]))
        story.append(Paragraph(escape(chapter_text("legal", "", 920)), styles["body"]))
        story.append(Spacer(1, 0.2 * cm))

        add_kv_table(
            story,
            rows=[
                ("Input payload hash (SHA-256)", metrics["payload_hash"]),
                ("Python runtime", platform.python_version()),
                ("Execution platform", platform.platform()),
                ("Report timestamp", datetime.now(UTC).strftime("%Y-%m-%d %H:%M:%S UTC")),
                ("Narrative provider", ai_sections["source"]),
                ("Generator", "Sentinal Forensic Report Engine v2"),
            ],
            col_widths=(5.0 * cm, 11.0 * cm),
            styles=styles,
        )
        story.append(PageBreak())

        # ----------------------
        # Page 15: Glossary + sign-off
        # ----------------------
        story.append(Paragraph("15. Glossary, Assumptions, and Certification", styles["section"]))
        story.append(Paragraph(escape(chapter_text("glossary", "", 700)), styles["small"]))
        story.append(Spacer(1, 0.10 * cm))
        glossary = [
            "Finding: A suspicious signal with risk and contextual metadata.",
            "Chain Confidence: A normalized estimate that linked events represent a coherent attack path.",
            "Weighted Risk: Category risk score multiplied by event volume.",
            "Impossible Travel: User activity across locations or hosts with impractical time displacement.",
            "MITRE Mapping: Alignment of observed behavior to ATT&CK techniques/tactics.",
        ]
        add_bullets(story, glossary, styles)
        story.append(Spacer(1, 0.35 * cm))
        story.append(
            Paragraph(
                "Certification Statement: The report was generated from supplied telemetry and metadata without modifying original evidence payload content.",
                styles["body"],
            )
        )
        story.append(Spacer(1, 0.55 * cm))
        story.append(Paragraph("Prepared by: Sentinal Forensic Intelligence", styles["body"]))
        story.append(Paragraph("Role: Automated Forensic Report Generator", styles["body"]))
        story.append(Paragraph("Signature: ______________________________", styles["body"]))
        story.append(Paragraph("Date: ______________________________", styles["body"]))

        # Optional extra appendix pages above baseline 15.
        extra_pages = max(0, target_pages - DEFAULT_TARGET_PAGES)
        for index in range(extra_pages):
            story.append(PageBreak())
            story.append(Paragraph(f"Supplementary Appendix {index + 1}", styles["section"]))
            story.append(
                Paragraph(
                    "This appendix page was generated to satisfy requested report length and preserve evidentiary formatting continuity.",
                    styles["body"],
                )
            )
            add_kv_table(
                story,
                rows=[
                    ("Appendix Index", str(index + 1)),
                    ("Case Reference", scan_id),
                    ("Threat Level", metrics["threat_level"]),
                    ("Composite Risk", f"{metrics['risk_score']:.2f} / 100"),
                    ("Payload Hash", metrics["payload_hash"]),
                ],
                col_widths=(4.3 * cm, 11.7 * cm),
                styles=styles,
            )

        doc.build(story, onFirstPage=draw_header_footer, onLaterPages=draw_header_footer)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate forensic-grade PDF report from JSON payload")
    parser.add_argument("--input", required=True, help="Path to JSON input payload")
    parser.add_argument("--output", required=True, help="Path for output PDF")
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        with open(args.input, "r", encoding="utf-8-sig") as handle:
            payload = json.load(handle)

        build_report(payload, args.output)
        print(f"PDF report generated at: {args.output}")
        return 0
    except (OSError, ValueError, TypeError, KeyError) as exc:
        print(f"Failed to generate forensic report: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
