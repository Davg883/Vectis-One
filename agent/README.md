# Aegis Fleet Manager Agent

`agent/fleet_manager.py` polls Convex for issued job cards and sends professional work-order emails via Gmail. It also reads unread Gmail replies, extracts a `Job ID`, classifies the vendor intent, and syncs status/replies back to Convex.

## Required Convex HTTP routes

This repo exposes:
- `POST /agent/list-issued-jobs` (body: `{ "orgId": "..." }`)
- `POST /agent/update-job` (body: `{ "jobId": "...", "status": "...", "reply": "..." }`)

Both require an `Authorization` header matching `BFF_INTERNAL_TOKEN`.

## Environment variables

- `CONVEX_URL` (e.g. `https://<deployment>.convex.cloud`)
- `BFF_INTERNAL_TOKEN` (must match Convex env var)
- `AGENT_ORG_ID` (your Clerk org id / `orgId` stored on docs)

Gmail:
- `GMAIL_CREDENTIALS_PATH` (OAuth client secrets JSON)
- `GMAIL_TOKEN_PATH` (optional, defaults to `gmail_token.json`)

Optional LLM classification (via `pydantic-ai`):
- `OPENAI_API_KEY`
- `OPENAI_FLEET_AGENT_MODEL` (optional, default: `gpt-4o-mini`)

## Run

Install deps (example):
- `pip install pydantic pydantic-ai requests google-auth google-auth-oauthlib google-api-python-client`

Run:
- `python agent/fleet_manager.py`

