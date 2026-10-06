🛠️ AURA — Autonomous UI Remediation Agent

«Detect. Fix. Verify.»

AURA is an AI-assisted accessibility remediation agent that doesn't just find accessibility problems — it understands them, generates safe fixes, applies those fixes in an isolated browser sandbox, and verifies the result through automated re-auditing.

🚀 Live Demo

"Try AURA Live →" https://aura-autonomous-ui-remediation.vercel.app/

«Built for WCC Launchpad 30 — Agentic AI Track»

---

🎯 The Problem

Most accessibility tools stop after identifying problems:

SCAN → REPORT → ??? → MANUAL FIX

Developers still have to:

- Understand what caused the accessibility issue
- Find the correct element in the UI
- Decide how to fix it
- Write and apply the code
- Test the change
- Re-run accessibility audits
- Make sure the fix didn't introduce regressions

AURA automates this entire remediation loop.

---

💡 Our Solution

AURA transforms accessibility testing from a reporting workflow into an agentic remediation workflow:

SCAN
  ↓
UNDERSTAND
  ↓
PLAN FIX
  ↓
APPLY SAFELY
  ↓
RE-AUDIT
  ↓
VERIFY
  ↓
REPORT

The agent doesn't simply suggest a solution.

It executes the workflow, validates the result, and rolls back unsafe changes.

---

🧠 How AURA Works

                         ┌─────────────────────┐
                         │        USER         │
                         │   Enter Website URL │
                         └──────────┬──────────┘
                                    ↓
                         ┌─────────────────────┐
                         │   AURA FRONTEND     │
                         │      Next.js        │
                         └──────────┬──────────┘
                                    ↓
                         ┌─────────────────────┐
                         │   FASTAPI BACKEND   │
                         └──────────┬──────────┘
                                    ↓
                    ┌──────────────────────────────┐
                    │     AGENT ORCHESTRATOR      │
                    └──────────────┬───────────────┘
                                   ↓
             ┌─────────────────────┴─────────────────────┐
             │                                           │
   ┌─────────▼─────────┐                       ┌─────────▼─────────┐
   │  Browser / Audit  │                       │  AI Analysis      │
   │       Agent       │                       │      Agents       │
   │                   │                       │                   │
   │ • Playwright      │                       │ • DOM Context     │
   │ • axe-core        │                       │ • Vision Analysis │
   │ • Screenshots     │                       │ • Root Cause      │
   └─────────┬─────────┘                       └─────────┬─────────┘
             │                                           │
             └──────────────────┬────────────────────────┘
                                ↓
                       ┌──────────────────┐
                       │   FIX PLANNER    │
                       └────────┬─────────┘
                                ↓
                       ┌──────────────────┐
                       │ PATCH COMPILER   │
                       └────────┬─────────┘
                                ↓
                       ┌──────────────────┐
                       │ SAFETY VALIDATOR │
                       └────────┬─────────┘
                                ↓
                       ┌──────────────────┐
                       │     SANDBOX      │
                       │ DOM Patch Apply  │
                       └────────┬─────────┘
                                ↓
                       ┌──────────────────┐
                       │     RE-AUDIT     │
                       │    axe-core      │
                       └────────┬─────────┘
                                ↓
                       ┌──────────────────┐
                       │   VERIFICATION   │
                       │ Before / After   │
                       └────────┬─────────┘
                                ↓
                       ┌──────────────────┐
                       │      REPORT      │
                       └──────────────────┘

---

✨ Key Features

🔍 Real Accessibility Auditing

Uses Playwright + axe-core to identify actual accessibility violations instead of simulated results.

🧠 AI-Powered Root Cause Analysis

The AI analyzes the detected issue, DOM context and surrounding UI to determine:

- What is wrong
- Why it matters
- Who is affected
- What remediation strategy should be used

👁️ Vision-Based Analysis

Uses vision capabilities to provide contextual analysis for visual accessibility problems, including image-related issues such as missing or inappropriate alternative text.

🛡️ Safe Patch Generation

AI-generated changes are converted into structured patch operations and checked against an operation allowlist before execution.

🧪 Sandboxed Execution

Fixes are applied inside an isolated browser environment.

The original website is never modified.

🔄 Automatic Re-Auditing

After applying a fix, AURA runs the accessibility audit again to determine whether the violation was actually resolved.

✅ Verification Engine

AURA compares the state before and after remediation and checks for:

- Resolved violations
- Remaining violations
- New violations
- Potential regressions

↩️ Automatic Rollback

If verification fails or a regression is detected, AURA can revert the applied change.

⚡ Real-Time Agent Timeline

The frontend receives agent events through WebSockets, allowing users to watch the remediation process as it happens.

📦 Source Patch Export

Generated remediation patches can be exported so developers can review and integrate them into their own codebase.

---

🔀 Two Operating Modes

Mode| What it does
A — Live Analysis| Scan a URL → detect issues → generate fixes → preview in sandbox → re-audit → verify
B — Patch Export| Generate structured HTML, CSS and ARIA remediation patches for developer integration

---

🧩 Agentic Workflow

AURA follows a closed-loop remediation architecture:

1. Detect

Playwright loads the target page and axe-core performs an accessibility audit.

2. Understand

The analysis agent examines the violation, DOM context and relevant page information.

3. Plan

A structured remediation plan is generated.

4. Validate

The proposed operation is checked against AURA's patch safety rules.

5. Fix

The patch is applied inside the browser sandbox.

6. Re-Audit

axe-core runs again on the modified page.

7. Verify

AURA compares the before/after audit results and checks for regressions.

8. Rollback or Report

If the fix is unsafe, it can be reverted. Otherwise, the successful remediation is reported to the user.

---

🧪 Demo Environment

AURA includes a dedicated demo website containing 8 intentional accessibility issues.

#| Accessibility Issue| WCAG
1| Image without "alt" attribute| 1.1.1
2| Form input without label| 1.3.1 / 4.1.2
3| Button without accessible name| 4.1.2
4| Incorrect heading hierarchy| 1.3.1
5| Missing document language| 3.1.1
6| Missing focus styles| 2.4.7
7| Low-contrast text| 1.4.3
8| Link without discernible text| 2.4.4 / 4.1.2

The demo is intentionally labeled:

«AURA Demo Environment»

so users know the accessibility issues are deliberately introduced for testing.

---

🏗️ Architecture

Frontend

- Next.js 15
- TypeScript
- Tailwind CSS

Backend

- Python
- FastAPI

Browser Automation

- Playwright
- Headless Chromium

Accessibility

- axe-core 4.9

AI

- OpenAI GPT-4o-mini

Real-Time Communication

- WebSocket

Data

- In-memory storage for the hackathon MVP

---

🔐 Security

AURA is designed with safety in mind.

SSRF Protection

URL validation prevents requests to:

- Localhost
- Private IP addresses
- Cloud metadata endpoints
- Other restricted network targets

Patch Allowlist

AI-generated operations must conform to a predefined patch schema.

No Arbitrary Code Execution

AI output is never executed directly.

It passes through the safety validation layer before being applied.

Sandboxed Changes

Fixes are applied only inside the isolated browser environment.

Prompt Injection Defense

Website content is treated as untrusted data rather than trusted instructions.

API Key Protection

OpenAI credentials are stored through environment variables and are not hardcoded into the application.

---

📁 Project Structure

AURA/
│
├── frontend/              # Next.js frontend
│
├── backend/               # FastAPI backend
│
├── demo-site/             # Accessibility test website
│
├── README.md
└── ...

---

🚀 Getting Started

Prerequisites

Make sure you have:

- Node.js 18+
- Python 3.10+
- OpenAI API Key

---

⚙️ Backend Setup

cd backend

pip install -r requirements.txt

playwright install chromium

Create your environment file:

cp .env.example .env

Then add your OpenAI API key:

OPENAI_API_KEY=your_api_key_here

Start the backend:

python main.py

---

💻 Frontend Setup

Open another terminal:

cd frontend

npm install

npm run dev

---

🌐 Run AURA

Open:

http://localhost:3000

Then either:

1. Click Try Demo Site
2. Enter a public website URL
3. Watch AURA detect, analyze, fix and verify accessibility issues

---

🎬 Demo Flow

For the best demonstration:

Open AURA
    ↓
Try Demo Site
    ↓
Accessibility Scan
    ↓
Issues Detected
    ↓
AI Understands Issues
    ↓
Fix Plan Generated
    ↓
Safety Validation
    ↓
Sandbox Patch Applied
    ↓
Re-Audit
    ↓
Issues Resolved
    ↓
Verification
    ↓
Final Report

---

🏆 Why AURA?

Traditional accessibility tools answer:

«"What's wrong?"»

AURA answers:

«"What's wrong, why is it wrong, how can it be fixed, did the fix actually work, and did it introduce a regression?"»

That is the core difference between a reporting tool and an agentic remediation system.

---

⚠️ Limitations

- Automated auditing covers only a subset of WCAG criteria.
- AI-generated remediation should still be reviewed by a developer.
- Highly dynamic websites may not be completely evaluated.
- Sandbox fixes do not directly modify the production website.
- The current MVP uses in-memory data storage.

---

🔮 Future Scope

Potential future improvements include:

- GitHub integration for automated pull requests
- Repository-level source code remediation
- CI/CD accessibility gates
- Persistent project history
- Multi-page website crawling
- Expanded WCAG coverage
- Human-in-the-loop approval workflows
- Accessibility regression monitoring
- Automated remediation across complete codebases

---

📜 License

MIT License

---

👨‍💻 Built for WCC Launchpad 30

AURA — Autonomous UI Remediation Agent

«Detect. Fix. Verify.»
