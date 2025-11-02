#!/usr/bin/env node
/**
 * Example Webhook Server for Testing GitHub App Integration
 * 
 * Usage:
 *   1. Install dependencies: npm install express crypto
 *   2. Set WEBHOOK_SECRET environment variable
 *   3. Run: node webhook-server-example.js
 *   4. Use ngrok to expose: ngrok http 3000
 *   5. Add ngrok URL to GitHub App webhook settings
 */

import express from 'express';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your-webhook-secret-here';

// Middleware to parse JSON
app.use(express.json());

// Middleware to verify webhook signature
function verifyWebhookSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  
  if (!signature) {
    console.warn('??  Missing X-Hub-Signature-256 header');
    return res.status(401).json({ error: 'Missing signature' });
  }

  const payload = JSON.stringify(req.body);
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');

  if (signature !== digest) {
    console.error('? Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  console.log('? Signature verified');
  next();
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'GitHub Webhook Server',
    timestamp: new Date().toISOString()
  });
});

// Webhook endpoint
app.post('/github/webhook', verifyWebhookSignature, (req, res) => {
  const event = req.headers['x-github-event'];
  const deliveryId = req.headers['x-github-delivery'];
  
  console.log(`\n?? Received event: ${event}`);
  console.log(`?? Delivery ID: ${deliveryId}`);
  console.log(`? Timestamp: ${new Date().toISOString()}`);

  // Handle different event types
  switch (event) {
    case 'push':
      handlePushEvent(req.body);
      break;
    
    case 'pull_request':
      handlePullRequestEvent(req.body);
      break;
    
    case 'issues':
      handleIssuesEvent(req.body);
      break;
    
    case 'issue_comment':
      handleIssueCommentEvent(req.body);
      break;
    
    case 'check_run':
      handleCheckRunEvent(req.body);
      break;
    
    case 'workflow_run':
      handleWorkflowRunEvent(req.body);
      break;
    
    default:
      console.log(`??  Unhandled event type: ${event}`);
  }

  // Always respond with 200 to acknowledge receipt
  res.status(200).json({ received: true });
});

// Event handlers
function handlePushEvent(payload) {
  const { ref, commits, repository, pusher } = payload;
  console.log(`\n?? Push Event:`);
  console.log(`   Repository: ${repository.full_name}`);
  console.log(`   Branch: ${ref}`);
  console.log(`   Pusher: ${pusher.name}`);
  console.log(`   Commits: ${commits.length}`);
  
  commits.forEach((commit, index) => {
    console.log(`   Commit ${index + 1}: ${commit.id.substring(0, 7)} - ${commit.message.split('\n')[0]}`);
  });
}

function handlePullRequestEvent(payload) {
  const { action, pull_request, repository } = payload;
  console.log(`\n?? Pull Request Event:`);
  console.log(`   Repository: ${repository.full_name}`);
  console.log(`   Action: ${action}`);
  console.log(`   PR #${pull_request.number}: ${pull_request.title}`);
  console.log(`   State: ${pull_request.state}`);
  console.log(`   Author: ${pull_request.user.login}`);
  
  if (pull_request.merged) {
    console.log(`   ? Merged by: ${pull_request.merged_by?.login}`);
  }
}

function handleIssuesEvent(payload) {
  const { action, issue, repository } = payload;
  console.log(`\n?? Issue Event:`);
  console.log(`   Repository: ${repository.full_name}`);
  console.log(`   Action: ${action}`);
  console.log(`   Issue #${issue.number}: ${issue.title}`);
  console.log(`   State: ${issue.state}`);
  console.log(`   Labels: ${issue.labels.map(l => l.name).join(', ') || 'none'}`);
  
  if (issue.assignees?.length > 0) {
    console.log(`   Assignees: ${issue.assignees.map(a => a.login).join(', ')}`);
  }
}

function handleIssueCommentEvent(payload) {
  const { action, comment, issue, repository } = payload;
  console.log(`\n?? Issue Comment Event:`);
  console.log(`   Repository: ${repository.full_name}`);
  console.log(`   Action: ${action}`);
  console.log(`   Issue #${issue.number}: ${issue.title}`);
  console.log(`   Comment by: ${comment.user.login}`);
  console.log(`   Comment: ${comment.body.substring(0, 100)}...`);
}

function handleCheckRunEvent(payload) {
  const { action, check_run, repository } = payload;
  console.log(`\n? Check Run Event:`);
  console.log(`   Repository: ${repository.full_name}`);
  console.log(`   Action: ${action}`);
  console.log(`   Check: ${check_run.name}`);
  console.log(`   Status: ${check_run.status}`);
  console.log(`   Conclusion: ${check_run.conclusion || 'pending'}`);
}

function handleWorkflowRunEvent(payload) {
  const { action, workflow_run, repository } = payload;
  console.log(`\n??  Workflow Run Event:`);
  console.log(`   Repository: ${repository.full_name}`);
  console.log(`   Action: ${action}`);
  console.log(`   Workflow: ${workflow_run.name}`);
  console.log(`   Status: ${workflow_run.status}`);
  console.log(`   Conclusion: ${workflow_run.conclusion || 'pending'}`);
}

// Error handling
app.use((err, req, res, next) => {
  console.error('? Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
????????????????????????????????????????????????????????????
?     GitHub Webhook Server - Testing Server              ?
????????????????????????????????????????????????????????????

?? Server running on: http://localhost:${PORT}
?? Webhook endpoint: http://localhost:${PORT}/github/webhook
?? Webhook secret: ${WEBHOOK_SECRET ? '? Set' : '? Not set'}

?? Next steps:
   1. Install ngrok: npm install -g ngrok
   2. Expose port: ngrok http ${PORT}
   3. Copy HTTPS URL from ngrok
   4. Add to GitHub App webhook settings:
      https://github.com/settings/apps/YOUR_APP_NAME

?? Tip: Set WEBHOOK_SECRET environment variable to match GitHub App secret
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n?? Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n?? Shutting down gracefully...');
  process.exit(0);
});
