"""AURA FastAPI Application — REST API + WebSocket for the Autonomous UI Remediation Agent."""

import asyncio
import uuid
import os
import json
import shutil
import difflib
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, List
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

load_dotenv()

from models.schemas import (
    ScanRequest, ScanResponse, ScanStatus, ScanData,
    TimelineEvent, TimelineEventType, FixResult,
)
from agents.orchestrator import Orchestrator
from core.security import validate_url, rate_limiter

# ─── Lifespan ───

orchestrator = Orchestrator()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown."""
    await orchestrator.start()
    print("[AURA] Agent orchestrator started")
    yield
    await orchestrator.stop()
    print("[AURA] Agent orchestrator stopped")


# ─── App ───

app = FastAPI(
    title="AURA — Autonomous UI Remediation Agent",
    description="Detect. Fix. Verify.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve demo site static files
demo_site_path = Path(__file__).resolve().parent.parent / "demo-site"
demo_site_path.mkdir(parents=True, exist_ok=True)
if demo_site_path.exists():
    app.mount("/demo-site", StaticFiles(directory=str(demo_site_path), html=True), name="demo-site")

# ─── WebSocket Manager ───

class ConnectionManager:
    """Manages WebSocket connections per scan."""

    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, scan_id: str, ws: WebSocket):
        await ws.accept()
        if scan_id not in self.active:
            self.active[scan_id] = []
        self.active[scan_id].append(ws)

    def disconnect(self, scan_id: str, ws: WebSocket):
        if scan_id in self.active:
            self.active[scan_id] = [w for w in self.active[scan_id] if w != ws]

    async def broadcast(self, scan_id: str, message: dict):
        for ws in self.active.get(scan_id, []):
            try:
                await ws.send_json(message)
            except Exception:
                pass


ws_manager = ConnectionManager()


# ─── REST Endpoints ───

@app.post("/api/scan", response_model=ScanResponse)
async def start_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    """Start a new accessibility scan."""
    if not rate_limiter.is_allowed():
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Please wait.")

    is_valid, result = validate_url(request.url)
    if not is_valid:
        raise HTTPException(status_code=400, detail=result)
    url = result

    scan_id = str(uuid.uuid4())[:12]
    created_at = datetime.utcnow().isoformat()

    background_tasks.add_task(_run_scan_task, scan_id, url)

    return ScanResponse(
        scan_id=scan_id,
        url=url,
        status=ScanStatus.PENDING,
        created_at=created_at,
    )


async def _run_scan_task(scan_id: str, url: str):
    """Background task to run the full scan pipeline."""
    async def broadcast_event(event: TimelineEvent):
        await ws_manager.broadcast(scan_id, {
            "type": "timeline_event",
            "event": event.model_dump(),
        })

    orchestrator.register_event_callback(scan_id, broadcast_event)

    try:
        await orchestrator.run_scan(scan_id, url)
        await ws_manager.broadcast(scan_id, {"type": "scan_complete"})
    except Exception as e:
        await ws_manager.broadcast(scan_id, {
            "type": "error",
            "message": str(e),
        })


@app.get("/api/scan/{scan_id}")
async def get_scan(scan_id: str):
    """Get scan data including issues and timeline."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan.model_dump()


@app.get("/api/scans")
async def get_all_scans():
    """Get all scans."""
    scans = orchestrator.get_all_scans()
    return [s.model_dump() for s in scans]


@app.post("/api/scan/{scan_id}/fix/{issue_id}")
async def fix_issue(scan_id: str, issue_id: str):
    """Fix a specific issue."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    result = await orchestrator.fix_issue(scan_id, issue_id)

    updated = orchestrator.get_scan(scan_id)
    if updated:
        await ws_manager.broadcast(scan_id, {
            "type": "status_change",
            "status": updated.status.value,
        })

    return result


@app.post("/api/scan/{scan_id}/fix-all")
async def fix_all_issues(scan_id: str):
    """Fix all auto-remediable issues."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    results = await orchestrator.fix_all_issues(scan_id)
    return results


@app.get("/api/scan/{scan_id}/report")
async def get_report(scan_id: str):
    """Generate and return scan report."""
    report = orchestrator.generate_report(scan_id)
    if not report:
        raise HTTPException(status_code=404, detail="Scan not found")
    return report


@app.get("/api/demo-site-url")
async def get_demo_site_url():
    """Return default demo site URL."""
    port = os.getenv("PORT", "8000")
    return {"url": f"http://localhost:{port}/demo-site/full_remediation.html"}


@app.get("/api/demo-sites")
async def get_demo_sites():
    """Return metadata for all built-in offline demo sites."""
    port = os.getenv("PORT", "8000")
    base = f"http://localhost:{port}/demo-site"
    return [
        {
            "id": "full_remediation",
            "name": "Full Remediation Demo (ShopX)",
            "description": "Featured Judge Demo: Realistic ShopX e-commerce website with 7+ accessibility violations (missing lang, low contrast, unlabelled inputs, unlabelled icon buttons, missing image alt, heading hierarchy skip, unlabelled links).",
            "url": f"{base}/full_remediation.html",
            "expected_issues": "7+ findings",
            "difficulty": "Judge Demo",
            "demonstrates": "Full autonomous closed-loop agent workflow: Observe -> Reason -> Patch -> Sandbox -> Re-audit -> Verify",
        },
        {
            "id": "demo1",
            "name": "Accessibility Basics",
            "description": "Standard WCAG accessibility violations (missing alt, no form labels, icon button no name, heading order skip, low contrast).",
            "url": f"{base}/demo1.html",
            "expected_issues": "5 findings",
            "difficulty": "Essential",
            "demonstrates": "axe-core audit, DOM context analysis, alt-text patching, label association",
        },
        {
            "id": "demo2",
            "name": "E-Commerce Shop (EcoShop)",
            "description": "Realistic shopping page with product cards, category filters, search bar, and cart actions.",
            "url": f"{base}/demo2.html",
            "expected_issues": "6 findings",
            "difficulty": "Intermediate",
            "demonstrates": "Product image vision analysis, search label remediation, cart icon name generation",
        },
        {
            "id": "demo3",
            "name": "SaaS Dashboard (CloudMetrics)",
            "description": "Cloud infrastructure analytics dashboard with sidebar navigation, metric cards, and data table.",
            "url": f"{base}/demo3.html",
            "expected_issues": "6 findings",
            "difficulty": "Advanced",
            "demonstrates": "Table button ARIA labeling, dark theme contrast audit, avatar alt text fix",
        },
    ]


@app.get("/sandbox/{scan_id}")
async def serve_sandbox(scan_id: str):
    """Serve the sandboxed patched page for a scan."""
    sandbox_file = demo_site_path / "sandbox" / scan_id / "index.html"
    if not sandbox_file.exists():
        # Fallback to single sandbox preview if exists
        fallback = demo_site_path / "sandbox_preview.html"
        if fallback.exists():
            return FileResponse(str(fallback), media_type="text/html")
        raise HTTPException(status_code=404, detail="Sandbox preview not available yet")
    return FileResponse(str(sandbox_file), media_type="text/html")


@app.get("/api/scan/{scan_id}/diff/{issue_id}")
async def get_issue_diff(scan_id: str, issue_id: str):
    """Get the DOM diff for a specific issue."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    issue = next((i for i in scan.issues if i.id == issue_id), None)
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if issue.dom_diff:
        return {"diff": issue.dom_diff, "has_diff": True}

    original = issue.original_html_snippet or ""
    patched = issue.patched_html_snippet or ""

    if not original and not patched:
        return {"diff": "No diff available — fix has not been applied yet.", "has_diff": False}

    diff_lines = list(difflib.unified_diff(
        original.splitlines(keepends=True),
        patched.splitlines(keepends=True),
        fromfile="original.html",
        tofile="patched.html",
        lineterm="",
    ))

    return {"diff": "\n".join(diff_lines), "has_diff": len(diff_lines) > 0}


@app.get("/api/scan/{scan_id}/download")
async def download_patch(scan_id: str):
    """Download the patched sandbox as a ZIP file."""
    sandbox_dir = demo_site_path / "sandbox" / scan_id
    if not sandbox_dir.exists():
        raise HTTPException(status_code=404, detail="Sandbox not available for download")

    import tempfile
    zip_path = Path(tempfile.gettempdir()) / f"aura-patch-{scan_id}"
    try:
        shutil.make_archive(str(zip_path), 'zip', str(sandbox_dir))
        return FileResponse(
            str(zip_path) + ".zip",
            media_type="application/zip",
            filename=f"AURA-Patch-{scan_id}.zip",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create archive: {str(e)}")


@app.get("/api/scan/{scan_id}/report/download")
async def download_report(scan_id: str):
    """Generate and download a markdown report."""
    report = orchestrator.generate_report(scan_id)
    if not report:
        raise HTTPException(status_code=404, detail="Scan not found")

    scan = orchestrator.get_scan(scan_id)

    md = f"""# AURA Accessibility Remediation Report

**Scan ID:** {report['scan_id']}
**URL:** {report['url']}
**Timestamp:** {report['scan_timestamp']}

---

## Summary

| Metric | Count |
|--------|-------|
| Total Issues | {report['total_issues']} |
| Critical | {report['issues_by_severity'].get('critical', 0)} |
| Serious | {report['issues_by_severity'].get('serious', 0)} |
| Moderate | {report['issues_by_severity'].get('moderate', 0)} |
| Minor | {report['issues_by_severity'].get('minor', 0)} |
| Fixed | {report['issues_fixed']} |
| Unresolved | {report['issues_unresolved']} |
| Needs Review | {report['issues_needs_review']} |

## WCAG Criteria Mapping

"""
    for criterion, rules in report.get('wcag_mappings', {}).items():
        md += f"- **WCAG {criterion}**: {', '.join(rules)}\n"

    md += "\n## Fixes Applied\n\n"
    md += "| Issue | Rule | Strategy | Status |\n"
    md += "|-------|------|----------|--------|\n"
    for fix in report.get('fixes_applied', []):
        md += f"| {fix['issue_id']} | {fix['rule']} | {fix['strategy']} | {fix['verification_status']} |\n"

    if scan and scan.issues:
        md += "\n## Issue Details\n\n"
        for issue in scan.issues:
            md += f"### {issue.rule_id} ({issue.severity.value})\n\n"
            md += f"- **Status:** {issue.status.value}\n"
            md += f"- **Selector:** `{issue.element_selector}`\n"
            md += f"- **Description:** {issue.description}\n"
            if issue.fix_plan:
                md += f"- **Fix Strategy:** {issue.fix_plan.strategy}\n"
                md += f"- **Fix Reason:** {issue.fix_plan.reason}\n"
            if issue.verification:
                md += f"- **Verification:** {issue.verification.status.value}\n"
                md += f"- **Details:** {issue.verification.details}\n"
            md += "\n"

    md += f"""\n## Limitations

"""
    for lim in report.get('limitations', []):
        md += f"- {lim}\n"

    md += "\n---\n*Generated by AURA — Autonomous UI Remediation Agent*\n"

    import tempfile
    report_path = Path(tempfile.gettempdir()) / f"AURA-Report-{scan_id}.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(md)

    return FileResponse(
        str(report_path),
        media_type="text/markdown",
        filename=f"AURA-Report-{scan_id}.md",
    )


@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "service": "AURA",
        "api": "online",
        "browser_engine": "ready",
        "database": "sqlite_ready",
    }


# ─── WebSocket ───

@app.websocket("/ws/scan/{scan_id}")
async def websocket_scan(websocket: WebSocket, scan_id: str):
    """WebSocket endpoint for real-time scan events."""
    await ws_manager.connect(scan_id, websocket)

    scan = orchestrator.get_scan(scan_id)
    if scan:
        for event in scan.timeline:
            try:
                await websocket.send_json({
                    "type": "timeline_event",
                    "event": event.model_dump(),
                })
            except Exception:
                break

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(scan_id, websocket)
    except Exception:
        ws_manager.disconnect(scan_id, websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )
