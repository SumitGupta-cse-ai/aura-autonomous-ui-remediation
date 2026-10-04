# AURA — Autonomous UI Remediation Agent

> **Detect. Fix. Verify.**

An AI-assisted developer tool that identifies accessibility issues in websites, generates safe UI fixes, applies them in a sandboxed environment, and verifies the fixes through automated re-auditing.

**Built for WCC Launchpad 30 — Agentic AI Track**

---

## The Problem

Traditional accessibility tools stop at reporting:

```
SCAN → REPORT → ??? (manual work)
```

Developers still need to understand the issue, figure out the fix, write the code, test it, and verify no regressions were introduced.

## Our Solution

AURA closes the remediation loop with a genuine agentic system:

```
SCAN → UNDERSTAND → FIX → RE-AUDIT → VERIFY
```

Every step is real — not simulated. The agent timeline shows actual operations.

---

## Architecture

```
USER
 ↓
AURA FRONTEND (Next.js)
 ↓
FASTAPI BACKEND
 ↓
AGENT ORCHESTRATOR
 ↓
┌────────────────────┬──────────────────────┐
│ Browser/Audit Agent│  Analysis Agents     │
│ • Playwright       │  • DOM Context       │
│ • axe-core         │  • Vision (GPT-4o)   │
│ • Screenshots      │  • Issue Analysis    │
└────────────────────┴──────────────────────┘
 ↓
FIX PLANNER → PATCH COMPILER → SAFETY VALIDATOR
 ↓
SANDBOX (DOM injection via Playwright)
 ↓
RE-AUDIT (axe-core re-run)
 ↓
VERIFICATION ENGINE (before/after comparison)
 ↓
REPORT
```

## Features

- **Browser Automation**: Playwright loads any website with proper timeouts
- **Deterministic Auditing**: axe-core identifies real WCAG violations
- **AI Analysis**: Understands root cause, user impact, remediation strategy
- **Vision Analysis**: GPT-4o vision for contextual image alt text
- **Safe Patching**: Structured fix plans validated against operation allowlist
- **Sandbox Execution**: Patches applied in isolated browser — original site untouched
- **Re-Auditing**: Full axe-core re-run after each fix
- **Verification**: Before/after comparison with regression checking
- **Rollback**: Automatic reversion if verification fails or regressions detected
- **Real-time Timeline**: WebSocket-powered agent event stream
- **Source Patch Export**: Download generated patches for integration

## Two Modes

| Mode | Description |
|------|-------------|
| **A — Live Analysis** | Scan any URL, preview fixes in sandbox, verify with re-audit |
| **B — Patch Export** | Download structured patches (HTML, CSS, ARIA changes) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI |
| Browser | Playwright (headless Chromium) |
| Accessibility | axe-core 4.9 |
| AI | OpenAI GPT-4o-mini |
| Communication | WebSocket (real-time timeline) |
| Data | In-memory (hackathon MVP) |

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- OpenAI API Key

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
playwright install chromium

# Create .env file
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start server
python main.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Run

1. Open **http://localhost:3000**
2. Click **"Try Demo Site"** or enter any public URL
3. Watch the agent detect, fix, and verify accessibility issues in real-time

---

## Demo Site

The included demo site (`demo-site/index.html`) is a realistic-looking agricultural products page containing **8 intentional accessibility issues**:

1. Image without `alt` attribute (WCAG 1.1.1)
2. Form input without label (WCAG 1.3.1 / 4.1.2)
3. Button without accessible name (WCAG 4.1.2)
4. Incorrect heading hierarchy (WCAG 1.3.1)
5. Missing document language (WCAG 3.1.1)
6. Missing focus styles (WCAG 2.4.7)
7. Low contrast text (WCAG 1.4.3)
8. Link with no discernible text (WCAG 4.1.2 / 2.4.4)

This is labeled as **"AURA Demo Environment"** — issues are intentional for testing.

---

## Security

- URL validation with SSRF protection (blocks private IPs, localhost, metadata endpoints)
- Patch schema validation against operation allowlist
- No arbitrary code execution — AI output goes through safety validator
- Website content treated as untrusted data (prompt injection defense)
- API keys in environment variables only

## Limitations

- Automated testing covers a subset of WCAG criteria
- AI-generated fixes should be reviewed by a human
- Dynamic content may not be fully tested
- Fixes are sandboxed — they do not modify the original website

---

## License

MIT
