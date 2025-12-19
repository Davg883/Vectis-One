import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

const handleN8nUpdate = httpAction(async (ctx, request) => {
  const { jobId, status, supplierReply } = await request.json();
  const token = request.headers.get("Authorization");

  if (token !== process.env.BFF_INTERNAL_TOKEN) {
    return new Response(null, { status: 401 });
  }

  // If we have a reply, update the job and the defect status
  if (supplierReply && jobId) {
    await ctx.runMutation(internal.transport.maintenance.updateJobStatus, {
      jobId: jobId, // n8n sends "jobId", mapped from jobCardId
      status: "work_in_progress",
      reply: supplierReply,
    });
  }

  return new Response(null, { status: 200 });
});

const handleAgentListIssuedJobs = httpAction(async (ctx, request) => {
  const token = request.headers.get("Authorization");
  if (token !== process.env.BFF_INTERNAL_TOKEN) {
    return new Response(null, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { orgId?: string } | null;
  const orgId = body?.orgId?.trim();
  if (!orgId) {
    return new Response(JSON.stringify({ error: "Missing orgId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const jobs = await ctx.runQuery(internal.transport.maintenance.listIssuedJobsForAgent, { orgId });

  return new Response(JSON.stringify({ jobs }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

const handleAgentUpdateJob = httpAction(async (ctx, request) => {
  const token = request.headers.get("Authorization");
  if (token !== process.env.BFF_INTERNAL_TOKEN) {
    return new Response(null, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { jobId?: string; status?: string; reply?: string }
    | null;
  const jobId = body?.jobId?.trim();
  const status = body?.status?.trim();
  const reply = body?.reply;

  if (!jobId || !status) {
    return new Response(JSON.stringify({ error: "Missing jobId or status" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  await ctx.runMutation(internal.transport.maintenance.updateJobStatus, {
    jobId,
    status,
    reply: reply?.trim() ? reply : undefined,
  });

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

const handleAgentGetPending = httpAction(async (ctx, request) => {
  const token = request.headers.get("Authorization");
  if (token !== process.env.BFF_INTERNAL_TOKEN) {
    return new Response(null, { status: 401 });
  }

  // Calls the new internal query
  const jobs = await ctx.runQuery(internal.transport.maintenance.getPendingDispatches);

  return new Response(JSON.stringify({ jobs }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

http.route({
  path: "/n8n/update-job",
  method: "POST",
  handler: handleN8nUpdate,
});

http.route({
  path: "/agent/list-issued-jobs",
  method: "POST",
  handler: handleAgentListIssuedJobs,
});

http.route({
  path: "/agent/update-job",
  method: "POST",
  handler: handleAgentUpdateJob,
});

http.route({
  path: "/agent/get-pending",
  method: "POST",
  handler: handleAgentGetPending,
});

export default http;
