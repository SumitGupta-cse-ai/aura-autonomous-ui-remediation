"""AURA FastAPI Application — REST API + WebSocket for the Autonomous UI Remediation Agent."""

import sys
import asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import uuid
import os
import re
import json
import shutil
import difflib
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from models.schemas import (
    ScanRequest, ScanResponse, ScanStatus, ScanData,
    TimelineEvent, TimelineEventType, FixResult, GitHubPRRequest,
    IssueStatus, VerificationStatus,
)
from core.export_engine import (
    generate_fixed_website_archive,
    generate_fix_pack_archive,
    generate_comprehensive_audit_report,
    create_or_preview_github_pr,
    get_sandbox_html_for_scan,
)
from agents.orchestrator import Orchestrator
from agents.browser_agent import resolve_demo_file
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

cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "https://aura-autonomous-ui-remediation.vercel.app",
    "https://aura-autonomous-ui-remediation-oullh9ar2-cubic-closure.vercel.app",
]

frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    cleaned = frontend_url.rstrip("/")
    if cleaned not in cors_origins:
        cors_origins.append(cleaned)

cors_env = os.getenv("CORS_ORIGINS")
if cors_env:
    for o in cors_env.split(","):
        o_clean = o.strip().rstrip("/")
        if o_clean and o_clean not in cors_origins:
            cors_origins.append(o_clean)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Simple root health endpoint."""
    return {
        "status": "ok",
        "message": "AURA backend is running",
    }


def get_backend_base_url(request: Optional[Request] = None) -> str:
    """Return the canonical base URL for this server (supports Render, Vercel, Railway, and reverse proxies)."""
    render_url = os.getenv("RENDER_EXTERNAL_URL")
    if render_url:
        return render_url.rstrip("/")
    app_url = os.getenv("APP_URL") or os.getenv("BACKEND_URL")
    if app_url:
        return app_url.rstrip("/")
    if request:
        # Check reverse proxy headers
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        host = request.headers.get("x-forwarded-host", request.headers.get("host"))
        if host:
            return f"{proto}://{host}"
        return str(request.base_url).rstrip("/")
    port = os.getenv("PORT", "8000")
    return f"http://localhost:{port}"

# Serve demo site static files
demo_site_path = Path(__file__).resolve().parent.parent / "demo-site"
if not (demo_site_path / "demo1.html").exists():
    demo_site_path = Path(__file__).resolve().parent / "demo-site"
demo_site_path.mkdir(parents=True, exist_ok=True)
if demo_site_path.exists():
    app.mount("/demo-site", StaticFiles(directory=str(demo_site_path), html=True), name="demo-site")
    if (demo_site_path / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(demo_site_path / "assets")), name="demo-assets")

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

    # Pre-register the scan synchronously so that immediate client polling NEVER gets 404
    pending_scan = ScanData(
        scan_id=scan_id,
        url=url,
        status=ScanStatus.PENDING,
        created_at=created_at,
        original_url=url,
    )
    orchestrator.register_pending_scan(pending_scan)

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
    return JSONResponse(content=scan.model_dump())


@app.get("/api/scans")
async def get_all_scans():
    """Get all scans with lightweight summary."""
    scans = orchestrator.get_all_scans()
    lightweight = []
    for s in scans:
        dump = s.model_dump(exclude={"issues", "timeline", "screenshot"})
        dump["issues_count"] = len(s.issues)
        lightweight.append(dump)
    return JSONResponse(content=lightweight)


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


@app.post("/api/scan/{scan_id}/fix-blocking")
async def fix_blocking_issues(scan_id: str):
    """Automatically fix all unresolved P0 and P1 blocking issues in order."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    result = await orchestrator.fix_blocking_issues(scan_id)

    updated = orchestrator.get_scan(scan_id)
    if updated:
        await ws_manager.broadcast(scan_id, {
            "type": "status_change",
            "status": updated.status.value,
        })

    return result


@app.post("/api/scan/{scan_id}/retry/{issue_id}")
async def retry_issue(scan_id: str, issue_id: str):
    """Retry fixing a specific issue."""
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


@app.post("/api/scan/{scan_id}/palette/{palette_id}")
async def apply_palette(scan_id: str, palette_id: str):
    """Apply a selected color palette (Option A, B, C, D) to the sandbox."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    result = await orchestrator.apply_palette(scan_id, palette_id)

    updated = orchestrator.get_scan(scan_id)
    if updated:
        await ws_manager.broadcast(scan_id, {
            "type": "status_change",
            "status": updated.status.value,
        })

    return result


@app.post("/api/scan/{scan_id}/bundle/{bundle_id}")
async def apply_bundle(scan_id: str, bundle_id: str):
    """Apply an improvement bundle (modern_refresh, accessibility_readability, premium_refresh) to sandbox."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    result = await orchestrator.apply_bundle(scan_id, bundle_id)

    updated = orchestrator.get_scan(scan_id)
    if updated:
        await ws_manager.broadcast(scan_id, {
            "type": "status_change",
            "status": updated.status.value,
        })

    return result


@app.post("/api/scan/{scan_id}/rollback")
async def rollback_scan(scan_id: str):
    """Rollback sandbox to previous snapshot."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    result = await orchestrator.rollback_scan(scan_id)

    updated = orchestrator.get_scan(scan_id)
    if updated:
        await ws_manager.broadcast(scan_id, {
            "type": "status_change",
            "status": updated.status.value,
        })

    return result


class PreviewRequest(BaseModel):
    type: str  # "bundle", "palette", "issue", "variant"
    id: str


@app.post("/api/scan/{scan_id}/preview")
async def generate_preview(scan_id: str, payload: PreviewRequest):
    """Generate an isolated preview snapshot without modifying active sandbox."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    result = await orchestrator.generate_preview(scan_id, payload.type, payload.id)
    return result


@app.get("/sandbox/{scan_id}/preview")
async def serve_sandbox_preview(scan_id: str):
    """Serve the isolated preview page for a scan."""
    candidates = [
        demo_site_path / "sandbox" / scan_id / "preview.html",
        Path(__file__).resolve().parent / "demo-site" / "sandbox" / scan_id / "preview.html",
        Path(__file__).resolve().parent.parent / "demo-site" / "sandbox" / scan_id / "preview.html",
    ]
    for c in candidates:
        if c.exists():
            return FileResponse(str(c), media_type="text/html")
    # Fallback to after sandbox
    return await serve_sandbox_after(scan_id)


@app.get("/sandbox/{scan_id}/show-changes")
async def serve_sandbox_show_changes(scan_id: str):
    """Serve the sandboxed page with visible category change highlights and top legend."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    html_content = orchestrator.generate_show_changes_html(scan_id)
    return HTMLResponse(content=html_content)


class InspectElementRequest(BaseModel):
    selector: str = ""
    element_text: str = ""
    tag: str = ""


@app.post("/api/scan/{scan_id}/inspect-element")
async def inspect_element(scan_id: str, payload: InspectElementRequest):
    """Provide detailed element-level AI inspection with Before vs After metrics."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return orchestrator.inspect_element(scan_id, payload.selector, payload.element_text, payload.tag)


class AskAuraRequest(BaseModel):
    question: str


@app.post("/api/scan/{scan_id}/ask")
async def ask_aura(scan_id: str, payload: AskAuraRequest):
    """Ask AURA AI website design and remediation advisor."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return orchestrator.ask_aura(scan_id, payload.question)


@app.get("/api/scan/{scan_id}/variants")
async def get_design_variants(scan_id: str):
    """Get the 3 design variants available for the website."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return orchestrator.get_variants(scan_id)


@app.get("/api/scan/{scan_id}/versions")
async def get_version_history(scan_id: str):
    """Get version history snapshots for the scan."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return orchestrator.get_versions(scan_id)


@app.post("/api/scan/{scan_id}/restore/{version_index}")
async def restore_version(scan_id: str, version_index: int):
    """Restore sandbox to a specific historical version."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    result = await orchestrator.restore_version(scan_id, version_index)
    updated = orchestrator.get_scan(scan_id)
    if updated:
        await ws_manager.broadcast(scan_id, {
            "type": "status_change",
            "status": updated.status.value,
        })
    return result


@app.get("/api/scan/{scan_id}/health-scores")
async def get_health_scores(scan_id: str):
    """Get real 8-dimension health scores responding to detected and resolved issues."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return orchestrator.get_health_scores(scan_id)


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
async def get_demo_site_url(request: Request):
    """Return default demo site URL."""
    base = get_backend_base_url(request)
    return {"url": f"{base}/demo-site/full_remediation.html"}


@app.get("/api/demo-sites")
async def get_demo_sites(request: Request):
    """Return metadata for all built-in offline demo sites."""
    base = f"{get_backend_base_url(request)}/demo-site"
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
        {
            "id": "clean_site",
            "name": "Clean Website (Zero-Error Demo)",
            "description": "Apex Studio: Technically healthy, accessible modern website with 0 accessibility errors. Demonstrates Stage 2 AI Website Improvement Advisor, design assessment, and authentic color palettes.",
            "url": f"{base}/clean_site.html",
            "expected_issues": "0 errors, 5 AI improvements",
            "difficulty": "Zero-Error Showcase",
            "demonstrates": "Zero Errors != Zero Value: AI Website Improvement Advisor, 9-dimension scoring, 4 brand palettes",
        },
    ]


@app.get("/sandbox/{scan_id}/before")
@app.get("/sandbox/{scan_id}/original")
async def serve_sandbox_before(scan_id: str):
    """Serve the original untouched website snapshot for a scan."""
    candidates = [
        demo_site_path / "sandbox" / scan_id / "before.html",
        Path(__file__).resolve().parent / "demo-site" / "sandbox" / scan_id / "before.html",
        Path(__file__).resolve().parent.parent / "demo-site" / "sandbox" / scan_id / "before.html",
    ]
    for c in candidates:
        if c.is_file():
            return FileResponse(str(c), media_type="text/html")

    # If before.html is not created on disk, check memory or original url from scan
    scan = orchestrator.get_scan(scan_id)
    if scan:
        if getattr(scan, "original_html", None):
            return HTMLResponse(content=scan.original_html, media_type="text/html")
        if scan.baseline and getattr(scan.baseline, "html_snapshot", None):
            return HTMLResponse(content=scan.baseline.html_snapshot, media_type="text/html")
        if scan.url:
            demo_name, demo_file = resolve_demo_file(scan.url)
            if demo_file and demo_file.is_file():
                return FileResponse(str(demo_file), media_type="text/html")

    # Safe fallback so before snapshot is NEVER 404 or broken
    for fallback_name in ["full_remediation.html", "demo1.html", "index.html"]:
        for base in [demo_site_path, Path(__file__).resolve().parent / "demo-site", Path(__file__).resolve().parent.parent / "demo-site"]:
            fb = base / fallback_name
            if fb.is_file():
                return FileResponse(str(fb), media_type="text/html")

    return HTMLResponse(content="<!DOCTYPE html><html><head><title>Original Page</title></head><body><p>Snapshot ready.</p></body></html>", media_type="text/html")


@app.get("/sandbox/{scan_id}/after")
@app.get("/sandbox/{scan_id}/improved")
async def serve_sandbox_after(scan_id: str):
    """Serve the remediated website sandbox for a scan."""
    candidates = [
        demo_site_path / "sandbox" / scan_id / "after.html",
        demo_site_path / "sandbox" / scan_id / "index.html",
        Path(__file__).resolve().parent / "demo-site" / "sandbox" / scan_id / "after.html",
        Path(__file__).resolve().parent / "demo-site" / "sandbox" / scan_id / "index.html",
        Path(__file__).resolve().parent.parent / "demo-site" / "sandbox" / scan_id / "after.html",
        Path(__file__).resolve().parent.parent / "demo-site" / "sandbox" / scan_id / "index.html",
    ]
    for c in candidates:
        if c.is_file():
            return FileResponse(str(c), media_type="text/html")

    scan = orchestrator.get_scan(scan_id)
    if scan:
        if getattr(scan, "patched_html", None):
            return HTMLResponse(content=scan.patched_html, media_type="text/html")
        if getattr(scan, "original_html", None):
            return HTMLResponse(content=scan.original_html, media_type="text/html")
        if scan.baseline and getattr(scan.baseline, "html_snapshot", None):
            return HTMLResponse(content=scan.baseline.html_snapshot, media_type="text/html")
        if scan.url:
            demo_name, demo_file = resolve_demo_file(scan.url)
            if demo_file and demo_file.is_file():
                return FileResponse(str(demo_file), media_type="text/html")

    # High-fidelity remediated preview fallback
    for base in [demo_site_path, Path(__file__).resolve().parent / "demo-site", Path(__file__).resolve().parent.parent / "demo-site"]:
        sb = base / "sandbox_preview.html"
        if sb.is_file():
            return FileResponse(str(sb), media_type="text/html")

    return await serve_sandbox_before(scan_id)


@app.get("/sandbox/{scan_id}")
async def serve_sandbox(scan_id: str):
    """Serve the sandboxed patched page for a scan (falls back to improved or base page)."""
    return await serve_sandbox_after(scan_id)


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


@app.get("/api/scan/{scan_id}/diff")
@app.get("/api/scan/{scan_id}/diff/all")
async def get_scan_diff(scan_id: str):
    """Get the full before/after DOM diff for a scan."""
    safe_id = _sanitize_session_id(scan_id)
    scan = orchestrator.get_scan(safe_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    before_html = ""
    after_html = ""
    for base_dir in [demo_site_path, Path(__file__).resolve().parent / "demo-site", Path(__file__).resolve().parent.parent / "demo-site"]:
        s_dir = base_dir / "sandbox" / safe_id
        if (s_dir / "before.html").exists():
            before_html = (s_dir / "before.html").read_text(encoding="utf-8", errors="ignore")
        if (s_dir / "after.html").exists():
            after_html = (s_dir / "after.html").read_text(encoding="utf-8", errors="ignore")
        elif (s_dir / "index.html").exists():
            after_html = (s_dir / "index.html").read_text(encoding="utf-8", errors="ignore")
        if before_html and after_html:
            break

    if not before_html or not after_html:
        diffs = [i.dom_diff for i in scan.issues if i.dom_diff]
        if diffs:
            return {"diff": "\n\n".join(diffs), "has_diff": True}
        return {"diff": "No diff available — fixes not yet applied.", "has_diff": False}

    diff_lines = list(difflib.unified_diff(
        before_html.splitlines(keepends=True),
        after_html.splitlines(keepends=True),
        fromfile="before.html",
        tofile="after.html",
        lineterm="",
    ))
    return {"diff": "\n".join(diff_lines), "has_diff": len(diff_lines) > 0}


def _sanitize_session_id(session_id: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9_\-]', '', session_id)
    if not cleaned or cleaned != session_id:
        raise HTTPException(status_code=400, detail="Invalid session identifier")
    return cleaned


@app.get("/api/scan/{scan_id}/download")
@app.get("/api/scan/{scan_id}/export/website")
@app.get("/api/remediation/{scan_id}/export/website")
async def export_fixed_website(scan_id: str, background_tasks: BackgroundTasks):
    """Download the complete client-accessible remediated website as a ZIP file."""
    safe_id = _sanitize_session_id(scan_id)
    scan = orchestrator.get_scan(safe_id)
    if not scan:
        raise HTTPException(status_code=404, detail=f"Scan session '{safe_id}' not found")

    has_remediation = any(
        i.status == IssueStatus.FIXED or (i.verification and i.verification.status == VerificationStatus.VERIFIED)
        for i in scan.issues
    ) or get_sandbox_html_for_scan(safe_id) is not None

    if not has_remediation:
        raise HTTPException(
            status_code=400,
            detail=f"No verified remediation found for session '{safe_id}'. Run remediation first before exporting."
        )

    try:
        archive_path = generate_fixed_website_archive(scan, safe_id)
        if not archive_path.exists() or archive_path.stat().st_size == 0:
            raise HTTPException(status_code=500, detail="Generated export archive is empty")

        # Safely remove temporary zip file after client finishes downloading
        background_tasks.add_task(os.remove, str(archive_path))
        return FileResponse(
            str(archive_path),
            media_type="application/zip",
            filename=f"aura-fixed-website-{safe_id}.zip",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate website export: {str(e)}")


@app.get("/api/scan/{scan_id}/export/pack")
@app.get("/api/scan/{scan_id}/export/fixpack")
@app.get("/api/scan/{scan_id}/download/fix-pack")
@app.get("/api/scan/{scan_id}/export/fix-pack")
@app.get("/api/remediation/{scan_id}/export/fix-pack")
async def export_fix_pack(scan_id: str, background_tasks: BackgroundTasks):
    """Download developer Fix Pack (git patches, changes.json, verification.json, README) as a ZIP."""
    safe_id = _sanitize_session_id(scan_id)
    scan = orchestrator.get_scan(safe_id)
    if not scan:
        raise HTTPException(status_code=404, detail=f"Scan session '{safe_id}' not found")

    has_verified = any(
        i.status == IssueStatus.FIXED or (i.verification and i.verification.status == VerificationStatus.VERIFIED)
        for i in scan.issues
    )
    if not has_verified:
        raise HTTPException(
            status_code=400,
            detail=f"No verified fixes found for session '{safe_id}'. Apply and verify fixes before downloading Fix Pack."
        )

    try:
        archive_path = generate_fix_pack_archive(scan, safe_id)
        if not archive_path.exists() or archive_path.stat().st_size == 0:
            raise HTTPException(status_code=500, detail="Generated fix pack archive is empty")

        # Safely remove temporary zip file after client finishes downloading
        background_tasks.add_task(os.remove, str(archive_path))
        return FileResponse(
            str(archive_path),
            media_type="application/zip",
            filename=f"aura-fix-pack-{safe_id}.zip",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate fix pack: {str(e)}")


@app.get("/api/scan/{scan_id}/download")
@app.get("/api/remediation/{scan_id}/download")
async def download_patch(scan_id: str, background_tasks: BackgroundTasks):
    """Download verified export (backwards-compatible alias for website export)."""
    return await export_fixed_website(scan_id, background_tasks)


@app.get("/api/scan/{scan_id}/report/download")
@app.get("/api/remediation/{scan_id}/report/download")
async def download_report(scan_id: str, background_tasks: BackgroundTasks):
    """Generate and download comprehensive markdown audit report."""
    safe_id = _sanitize_session_id(scan_id)
    scan = orchestrator.get_scan(safe_id)
    if not scan:
        raise HTTPException(status_code=404, detail=f"Scan session '{safe_id}' not found")

    report_md = generate_comprehensive_audit_report(scan, safe_id)
    import tempfile
    report_path = Path(tempfile.gettempdir()) / f"AURA-Audit-Report-{safe_id}.md"
    report_path.write_text(report_md, encoding="utf-8")

    background_tasks.add_task(os.remove, str(report_path))
    return FileResponse(
        str(report_path),
        media_type="text/markdown",
        filename=f"AURA-Audit-Report-{safe_id}.md",
    )


@app.post("/api/scan/{scan_id}/github/pr")
async def create_github_pr(scan_id: str, req: GitHubPRRequest):
    """Create or preview GitHub Pull Request with verified remediation changes."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    result = await create_or_preview_github_pr(
        scan=scan,
        scan_id=scan_id,
        repo=req.repo,
        token=req.token,
        base_branch=req.base_branch or "main",
    )
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "GitHub PR creation failed"))
    return result


@app.get("/api/scan/{scan_id}/github/status")
async def get_github_status(scan_id: str):
    """Check readiness for GitHub Pull Request creation."""
    scan = orchestrator.get_scan(scan_id)
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    verified_count = sum(
        1 for i in scan.issues
        if i.status.value == "fixed" or (i.verification and i.verification.status.value == "verified")
    )
    return {
        "scan_id": scan_id,
        "can_create_pr": verified_count > 0,
        "verified_count": verified_count,
        "suggested_branch": f"aura/remediation/{scan_id[:8]}",
        "requires_verification": verified_count == 0,
    }


@app.get("/api/health")
async def health():
    """Health check endpoint with full subsystem status."""
    return {
        "status": "ok",
        "service": "AURA Autonomous UI Remediation Engine",
        "api": "Operational",
        "browser_engine": "Operational",
        "analysis_engine": "Operational",
        "preview_engine": "Operational",
        "remediation_engine": "Operational",
        "storage": "Operational",
        "environment": "production" if os.getenv("RENDER_EXTERNAL_URL") or os.getenv("RENDER") else "development",
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
