import os
import time
import json
import re
from typing import List, Optional
from datetime import datetime

# Environment Variables
from dotenv import load_dotenv

# Pydantic AI & Convex
from pydantic_ai import Agent, RunContext
from convex import ConvexClient

# Google APIs
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

# --- CONFIGURATION ---
# Load env vars from .env.local
load_dotenv('.env.local')

CONVEX_URL = os.getenv("NEXT_PUBLIC_CONVEX_URL")
BFF_TOKEN = os.getenv("BFF_INTERNAL_TOKEN")
SCOPES = ['https://www.googleapis.com/auth/gmail.modify']
MODEL = os.getenv("OPENAI_FLEET_AGENT_MODEL", "openai:gpt-4o")

# Verify config immediately
if not CONVEX_URL or not BFF_TOKEN:
    print("Warning: Missing CONVEX_URL or BFF_INTERNAL_TOKEN in .env.local")

# Initialize Clients
try:
    if CONVEX_URL:
        client = ConvexClient(CONVEX_URL)
        # client.set_debug(True) # Not available in this version
    else:
        client = None
except Exception as e:
    client = None
    print(f"Warning: ConvexClient init failed: {e}")

# --- GMAIL AUTHENTICATION ---
def get_gmail_service():
    """Authenticates with Gmail and returns the service object."""
    creds = None
    # The file token.json stores the user's access and refresh tokens.
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # You need to download credentials.json from Google Cloud Console
            if not os.path.exists('credentials.json'):
                print("⚠️  CRITICAL: Missing credentials.json for Gmail API")
                print("    Please download it from Google Cloud Console (OAuth Client ID)")
                print("   and place it in the root directory as 'credentials.json'.")
                return None
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.json', 'w') as token:
            token.write(creds.to_json())

    return build('gmail', 'v1', credentials=creds)

# --- TOOLS FOR THE AGENT ---
def update_convex_job(job_id: str, status: str, reply: str):
    """Updates the job status in Convex via the HTTP webhook."""
    import requests
    if not CONVEX_URL:
        return "❌ Missing CONVEX_URL"
        
    url = f"{CONVEX_URL}/http/n8n/update-job" # We reuse the HTTP route
    
    payload = {
        "jobId": job_id,
        "status": status,
        "supplierReply": reply
    }
    
    headers = {"Authorization": BFF_TOKEN}
    
    try:
        resp = requests.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return f"✅ Updated Job {job_id} to {status}"
    except Exception as e:
        return f"❌ Failed to update Convex: {str(e)}"

    except Exception as e:
        return f"❌ Failed to update Convex: {str(e)}"

def send_gmail(service, job):
    from email.mime.text import MIMEText
    import base64
    
    message = MIMEText(job['text'])
    message['to'] = job['vendorEmail']
    message['subject'] = f"Work Order: {job['vehicle']} [Job-ID: {job['_id']}]"
    
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
    service.users().messages().send(userId='me', body={'raw': raw}).execute()

def check_outbound_queue(service):
    """Checks Convex for jobs waiting to be emailed."""
    import requests
    if not CONVEX_URL:
        return

    url = f"{CONVEX_URL}/http/agent/get-pending"
    headers = {"Authorization": BFF_TOKEN}
    
    try:
        resp = requests.post(url, headers=headers)
        if resp.status_code == 200:
            data = resp.json()
            jobs = data.get("jobs", [])
            if jobs:
                print(f"\n📦 Found {len(jobs)} pending dispatches.")
                
            for job in jobs:
                print(f"   🚀 Dispatching Job: {job['_id']} to {job['vendorEmail']}")
                try:
                    send_gmail(service, job)
                    # Confirm dispatch to Convex
                    update_convex_job(job['_id'], "dispatched", "Email Sent by Agent")
                except Exception as e:
                    print(f"   ❌ Failed to dispatch {job['_id']}: {e}")
    except Exception as e:
        print(f"⚠️ Outbound Check Failed: {e}")
fleet_agent = Agent(
    MODEL,
    system_prompt=(
        "You are the Aegis Logistics Fleet Manager."
        "Your job is to read emails from mechanics and update the database."
        "If an email confirms a booking, set status to 'work_in_progress'."
        "If an email says job complete, set status to 'completed'."
        "Always extract the Job ID carefully."
    )
)

@fleet_agent.tool
def mark_email_read(ctx: RunContext, msg_id: str):
    """Marks a Gmail message as read."""
    service = ctx.deps
    service.users().messages().modify(
        userId='me', 
        id=msg_id, 
        body={'removeLabelIds': ['UNREAD']}
    ).execute()
    return "Email marked as read."

@fleet_agent.tool
def sync_job(ctx: RunContext, job_id: str, status: str, summary: str):
    """Syncs the job status to the database."""
    print(f"   🛠️  TOOL CALL: Updating {job_id} -> {status}")
    return update_convex_job(job_id, status, summary)

# --- MAIN LOOP ---
def run_fleet_manager():
    print("🤖 Aegis Fleet Agent Online...")
    service = get_gmail_service()
    if not service:
        print("❌ Gmail service failed to initialize. Exiting.")
        return

    while True:
        try:
            # 1. Poll Gmail for Unread "Work Orders"
            results = service.users().messages().list(
                userId='me', 
                q='subject:"Work Order" is:unread'
            ).execute()
            
            messages = results.get('messages', [])

            if not messages:
                print(".", end="", flush=True)
                # Check outbound queue while idle
                check_outbound_queue(service)
                time.sleep(10)
                continue

            print(f"\n📨 Found {len(messages)} new emails!")

            for msg in messages:
                # 2. Fetch Email Body
                txt = service.users().messages().get(userId='me', id=msg['id']).execute()
                snippet = txt.get('snippet', '')
                payload = txt.get('payload', {})
                headers = payload.get('headers', [])
                subject = next((h['value'] for h in headers if h['name'] == 'Subject'), "No Subject")
                
                email_content = f"Subject: {subject}\nBody: {snippet}"
                
                # 3. Agentic Reasoning
                print(f"   Analyzing: {subject}...")
                
                # We inject the Gmail Service as dependency
                # Note: fleet_agent.run_sync might require result_type or return just text depending on version
                # If result_type is not set, it returns a RunResult with .data as the string response
                # We also catch potential model errors
                try:
                    result = fleet_agent.run_sync(
                        f"Process this email. Message ID: {msg['id']}\n\n{email_content}",
                        deps=service
                    )
                    
                    # FIX: Handle result object safely
                    try:
                        # Try standard attribute
                        output = getattr(result, 'data', result)
                    except:
                        output = str(result)
                    
                    print(f"   🤖 Result: {output}")
                except Exception as agent_err:
                     print(f"   ⚠️ Agent Error: {agent_err}")


        except Exception as e:
            print(f"\n⚠️ Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    run_fleet_manager()
