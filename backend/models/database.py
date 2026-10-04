import aiosqlite
import json
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = "aura.db"

async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute('''
            CREATE TABLE IF NOT EXISTS scans (
                id TEXT PRIMARY KEY,
                url TEXT,
                status TEXT,
                start_time DATETIME,
                end_time DATETIME
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS issues (
                id TEXT PRIMARY KEY,
                scan_id TEXT,
                rule TEXT,
                severity TEXT,
                element TEXT,
                selector TEXT,
                html TEXT,
                description TEXT,
                impact TEXT,
                status TEXT,
                FOREIGN KEY(scan_id) REFERENCES scans(id)
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS timeline_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id TEXT,
                timestamp DATETIME,
                event_type TEXT,
                status TEXT,
                message TEXT,
                details TEXT,
                FOREIGN KEY(scan_id) REFERENCES scans(id)
            )
        ''')
        await db.execute('''
            CREATE TABLE IF NOT EXISTS fixes (
                id TEXT PRIMARY KEY,
                issue_id TEXT,
                scan_id TEXT,
                plan TEXT,
                patch_js TEXT,
                rollback_js TEXT,
                status TEXT,
                verification_status TEXT,
                FOREIGN KEY(issue_id) REFERENCES issues(id),
                FOREIGN KEY(scan_id) REFERENCES scans(id)
            )
        ''')
        await db.commit()

async def create_scan(scan_id: str, url: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO scans (id, url, status, start_time) VALUES (?, ?, ?, ?)",
            (scan_id, url, "PENDING", datetime.utcnow().isoformat())
        )
        await db.commit()

async def update_scan_status(scan_id: str, status: str):
    async with aiosqlite.connect(DB_PATH) as db:
        query = "UPDATE scans SET status = ?"
        params = [status]
        if status in ("COMPLETE", "FAILED"):
            query += ", end_time = ?"
            params.append(datetime.utcnow().isoformat())
        query += " WHERE id = ?"
        params.append(scan_id)
        
        await db.execute(query, params)
        await db.commit()

async def get_scan(scan_id: str) -> Optional[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM scans WHERE id = ?", (scan_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None

async def add_timeline_event(scan_id: str, event_type: str, status: str, message: str, details: Dict = None):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO timeline_events (scan_id, timestamp, event_type, status, message, details) VALUES (?, ?, ?, ?, ?, ?)",
            (scan_id, datetime.utcnow().isoformat(), event_type, status, message, json.dumps(details) if details else "{}")
        )
        await db.commit()

async def get_timeline_events(scan_id: str) -> List[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM timeline_events WHERE scan_id = ? ORDER BY timestamp ASC", (scan_id,)) as cursor:
            rows = await cursor.fetchall()
            events = []
            for row in rows:
                event = dict(row)
                event['details'] = json.loads(event['details'])
                events.append(event)
            return events

async def save_issues(scan_id: str, issues: List[Dict[str, Any]]):
    async with aiosqlite.connect(DB_PATH) as db:
        for issue in issues:
            await db.execute(
                "INSERT INTO issues (id, scan_id, rule, severity, element, selector, html, description, impact, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (issue['id'], scan_id, issue['rule'], issue['severity'], issue.get('element', ''), issue['selector'], issue['html'], issue['description'], issue['impact'], 'UNFIXED')
            )
        await db.commit()

async def get_issues(scan_id: str) -> List[Dict[str, Any]]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM issues WHERE scan_id = ?", (scan_id,)) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
