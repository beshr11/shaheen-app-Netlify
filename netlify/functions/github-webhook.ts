import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import crypto from "crypto";

// GitHub webhook secret (set in Netlify environment variables)
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";

interface GitHubWebhookEvent {
  action?: string;
  repository?: {
    name: string;
    full_name: string;
  };
  issue?: {
    number: number;
    title: string;
    body: string;
    labels: Array<{ name: string }>;
  };
  pull_request?: {
    number: number;
    title: string;
    state: string;
  };
  sender?: {
    login: string;
  };
}

/**
 * Verify GitHub webhook signature
 */
function verifySignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) {
    console.warn("Missing signature or secret");
    return false;
  }

  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}

/**
 * Process GitHub webhook events
 */
async function processWebhookEvent(
  event: GitHubWebhookEvent,
  eventType: string
): Promise<void> {
  console.log(`Processing ${eventType} event:`, JSON.stringify(event, null, 2));

  switch (eventType) {
    case "issues":
      if (event.action === "opened" && event.issue) {
        console.log(
          `New issue #${event.issue.number}: ${event.issue.title}`
        );
        // Here you would add Bugbot logic to:
        // - Auto-label the issue
        // - Auto-assign based on rules
        // - Post welcome comment
      }
      break;

    case "pull_request":
      if (event.action === "opened" && event.pull_request) {
        console.log(
          `New PR #${event.pull_request.number}: ${event.pull_request.title}`
        );
        // Here you would add Cloud Agent logic to:
        // - Review the PR
        // - Run checks
        // - Comment with suggestions
      }
      break;

    case "push":
      console.log(`Push event for ${event.repository?.full_name}`);
      // Here you would trigger:
      // - Code indexing
      // - Analysis
      // - Tests
      break;

    default:
      console.log(`Unhandled event type: ${eventType}`);
  }
}

/**
 * Netlify Function handler for GitHub webhooks
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  // Get GitHub signature from headers
  const signature = event.headers["x-hub-signature-256"] || "";
  const eventType = event.headers["x-github-event"] || "";
  const deliveryId = event.headers["x-github-delivery"] || "";

  console.log(`Received webhook: ${eventType} (${deliveryId})`);

  // Verify webhook signature
  const payload = event.body || "";
  if (!verifySignature(payload, signature, WEBHOOK_SECRET)) {
    console.error("Invalid webhook signature");
    return {
      statusCode: 401,
      body: JSON.stringify({ error: "Invalid signature" }),
    };
  }

  try {
    // Parse webhook payload
    const webhookEvent: GitHubWebhookEvent = JSON.parse(payload);

    // Process the event
    await processWebhookEvent(webhookEvent, eventType);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Webhook processed successfully",
        event: eventType,
        delivery: deliveryId,
      }),
    };
  } catch (error) {
    console.error("Error processing webhook:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
