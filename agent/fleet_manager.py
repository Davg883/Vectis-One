import base64
import email.message
import logging
import os
import re
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin

import requests
from pydantic import BaseModel, Field

try:
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
except Exception:  # pragma: no cover
    Credentials = None  # type: ignore
    InstalledAppFlow = None  # type: ignore
    build = None  # type: ignore

try:
    from pydantic_ai import Agent
    from pydantic_ai.models.openai import OpenAIModel
except Exception:  # pragma: no cover
    Agent = None  # type: ignore
    OpenAIModel = None  # type: ignore


LOG = logging.getLogger("fleet_manager")


class EmailIntent(BaseModel):
    job_id: Optional[str] = Field(default=None, description="Convex jobCard ID, if present")
    status: Optional[str] = Field(
        default=None,
        description='One of: "work_in_progress", "completed", "dispatch_failed", or null',
    )
    reply: Optional[str] = Field(default=None, description="Short vendor reply summary")


@dataclass(frozen=True)
class UnreadEmail:
    message_id: str
    subject: str
    from_email: str
    body: str


class ConvexClient:
    def __init__(self, convex_url: str, token: str, timeout_s: int = 20):
        self._base = convex_url.rstrip("/") + "/"
        self._token = token
        self._timeout_s = timeout_s

    def _post(self, path: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        url = urljoin(self._base, path.lstrip("/"))
        resp = requests.post(
            url,
            json=payload,
            headers={"Authorization": self._token, "Content-Type": "application/json"},
            timeout=self._timeout_s,
        )
        if not resp.ok:
            raise RuntimeError(f"Convex HTTP {resp.status_code}: {resp.text}")
        return resp.json()

    def list_issued_jobs(self, org_id: str) -> List[Dict[str, Any]]:
        data = self._post("/agent/list-issued-jobs", {"orgId": org_id})
        return list(data.get("jobs") or [])

    def update_job(self, job_id: str, status: str, reply: Optional[str] = None) -> None:
        self._post("/agent/update-job", {"jobId": job_id, "status": status, "reply": reply})


class GmailClient:
    SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]

    def __init__(self, creds_path: str, token_path: str):
        if build is None or InstalledAppFlow is None:
            raise RuntimeError(
                "Missing Gmail deps. Install: google-auth google-auth-oauthlib google-api-python-client"
            )
        self._service = self._build_service(creds_path, token_path)

    def _build_service(self, creds_path: str, token_path: str):
        creds = None
        if os.path.exists(token_path):
            creds = Credentials.from_authorized_user_file(token_path, self.SCOPES)  # type: ignore[union-attr]

        if not creds or not getattr(creds, "valid", False):
            flow = InstalledAppFlow.from_client_secrets_file(creds_path, self.SCOPES)
            creds = flow.run_local_server(port=0)
            with open(token_path, "w", encoding="utf-8") as f:
                f.write(creds.to_json())

        return build("gmail", "v1", credentials=creds)

    def send_email(self, to: str, subject: str, body: str) -> str:
        msg = email.message.EmailMessage()
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)

        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")
        res = (
            self._service.users()
            .messages()
            .send(userId="me", body={"raw": raw})
            .execute()
        )
        return str(res.get("id") or "")

    def read_unread_emails(self, max_results: int = 10) -> List[UnreadEmail]:
        msgs = (
            self._service.users()
            .messages()
            .list(userId="me", q="is:unread", maxResults=max_results)
            .execute()
        )
        ids = [m["id"] for m in (msgs.get("messages") or []) if m.get("id")]
        out: List[UnreadEmail] = []
        for mid in ids:
            m = self._service.users().messages().get(userId="me", id=mid, format="full").execute()
            headers = {h["name"].lower(): h["value"] for h in (m.get("payload", {}).get("headers") or [])}
            subject = headers.get("subject", "")
            from_email = headers.get("from", "")
            body = self._extract_body(m.get("payload") or {})
            out.append(UnreadEmail(message_id=mid, subject=subject, from_email=from_email, body=body))
        return out

    def mark_as_read(self, message_id: str) -> None:
        (
            self._service.users()
            .messages()
            .modify(userId="me", id=message_id, body={"removeLabelIds": ["UNREAD"]})
            .execute()
        )

    def _extract_body(self, payload: Dict[str, Any]) -> str:
        def decode(data: str) -> str:
            return base64.urlsafe_b64decode(data.encode("utf-8")).decode("utf-8", errors="replace")

        if payload.get("body", {}).get("data"):
            return decode(payload["body"]["data"])

        parts = payload.get("parts") or []
        for p in parts:
            mime = p.get("mimeType") or ""
            data = p.get("body", {}).get("data")
            if data and mime.startswith("text/plain"):
                return decode(data)
        for p in parts:
            data = p.get("body", {}).get("data")
            if data:
                return decode(data)
        return ""


def _extract_job_id(subject: str, body: str) -> Optional[str]:
    hay = f"{subject}\n{body}"
    # Common forms:
    # - "Ref: Job ID: <id>"
    # - "Job ID <id>"
    m = re.search(r"job\s*id\s*[:#]?\s*([A-Za-z0-9_-]{12,})", hay, re.IGNORECASE)
    if m:
        return m.group(1)
    return None


def _heuristic_intent(subject: str, body: str) -> EmailIntent:
    job_id = _extract_job_id(subject, body)
    text = (subject + "\n" + body).lower()

    status = None
    if any(k in text for k in ["accepted", "we can do", "we can take", "booked", "confirm", "available"]):
        status = "work_in_progress"
    if any(k in text for k in ["completed", "done", "fixed", "repaired", "finished"]):
        status = "completed"
    if any(k in text for k in ["cannot", "can't", "unavailable", "reject", "decline"]):
        status = "dispatch_failed"

    reply = body.strip()
    reply = re.sub(r"\s+", " ", reply)[:1500] if reply else None
    return EmailIntent(job_id=job_id, status=status, reply=reply)


def build_llm_agent() -> Optional[Any]:
    if Agent is None or OpenAIModel is None:
        return None
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    model_name = os.getenv("OPENAI_FLEET_AGENT_MODEL") or "gpt-4o-mini"
    model = OpenAIModel(model_name, api_key=api_key)
    system_prompt = (
        "You are the Aegis Fleet Manager.\n"
        "1. Check for unread emails.\n"
        "2. For each email, analyze the body.\n"
        "   - Look for a 'Job ID' (it might be in the subject or body).\n"
        "   - Determine the intent: Did they accept the job? Finish it? Reject it?\n"
        "3. If you find a Job ID and a Status update:\n"
        "   - Provide job_id and a status.\n"
        '   - status must be one of: "work_in_progress", "completed", "dispatch_failed" or null.\n'
        "4. Keep reply short (<= 500 chars).\n"
    )
    return Agent(model, system_prompt=system_prompt, result_type=EmailIntent)


def analyze_email(agent: Optional[Any], subject: str, body: str, from_email: str) -> EmailIntent:
    if agent is None:
        return _heuristic_intent(subject, body)

    prompt = f"From: {from_email}\nSubject: {subject}\n\nBody:\n{body}"
    try:
        result = agent.run_sync(prompt)
        return result.data if hasattr(result, "data") else result  # pydantic-ai versions differ
    except Exception as e:
        LOG.warning("LLM analysis failed, falling back to heuristics: %s", e)
        return _heuristic_intent(subject, body)


def _env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"Missing env var: {name}")
    return v


def main() -> None:
    logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

    convex_url = _env("CONVEX_URL")
    token = _env("BFF_INTERNAL_TOKEN")
    org_id = _env("AGENT_ORG_ID")

    creds_path = _env("GMAIL_CREDENTIALS_PATH")
    token_path = os.getenv("GMAIL_TOKEN_PATH") or "gmail_token.json"

    poll_s = int(os.getenv("POLL_INTERVAL_SECONDS") or "15")
    max_unread = int(os.getenv("MAX_UNREAD_EMAILS") or "10")

    convex = ConvexClient(convex_url=convex_url, token=token)
    gmail = GmailClient(creds_path=creds_path, token_path=token_path)
    llm_agent = build_llm_agent()

    LOG.info("Aegis Fleet Manager started (org=%s)", org_id)

    while True:
        try:
            # 1) Inbound: process unread vendor replies
            unread = gmail.read_unread_emails(max_results=max_unread)
            for m in unread:
                intent = analyze_email(llm_agent, m.subject, m.body, m.from_email)
                if intent.job_id and intent.status:
                    LOG.info("Updating job %s -> %s (email %s)", intent.job_id, intent.status, m.message_id)
                    convex.update_job(intent.job_id, intent.status, intent.reply)
                    gmail.mark_as_read(m.message_id)
                else:
                    LOG.info("No actionable job update found in email %s; leaving unread", m.message_id)

            # 2) Outbound: dispatch any issued job cards
            issued = convex.list_issued_jobs(org_id)
            for job in issued:
                job_id = str(job.get("jobId") or "").strip()
                to = str(job.get("vendorEmail") or "").strip()
                subject = str(job.get("subject") or "").strip()
                text = str(job.get("text") or "").strip()
                if not (job_id and to and subject and text):
                    continue

                LOG.info("Dispatching job %s to %s", job_id, to)
                gmail_id = gmail.send_email(to=to, subject=subject, body=text)
                convex.update_job(job_id, "dispatched", f"Gmail message id: {gmail_id}" if gmail_id else None)

        except Exception as e:
            LOG.exception("Loop error: %s", e)

        time.sleep(poll_s)


if __name__ == "__main__":
    main()

