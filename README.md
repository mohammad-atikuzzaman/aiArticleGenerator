# 🤖 AI Facebook Page Automation & Lead Assistant

An intelligent, AI-powered automation system for Facebook Pages designed to drive engagement, educate audiences, and handle customer leads automatically. Powered by **Google Gemini AI**, **MongoDB Vector Search RAG**, and **Facebook Graph API**.

This application automatically publishes daily service-focused Facebook posts, responds intelligently to user DMs in Messenger with RAG context, and handles public post comment inquiries without human intervention.

---

## 📋 Table of Contents
- [🌟 Features](#-features)
- [🏗️ System Architecture](#️-system-architecture)
- [📋 Prerequisites](#-prerequisites)
- [⚙️ Environment Variables (.env Configuration)](#️-environment-variables-env-configuration)
- [🔑 Facebook Developer & Page Setup Guide](#-facebook-developer--page-setup-guide)
  - [1. Creating Facebook App & Permissions](#1-creating-facebook-app--permissions)
  - [2. Obtaining Page ID & App Secret](#2-obtaining-page-id--app-secret)
  - [3. Generating Long-Lived Page Access Token](#3-generating-long-lived-page-access-token)
  - [4. Webhook Tunneling (Local Development)](#4-webhook-tunneling-local-development)
  - [5. Configuring Webhook Subscriptions](#5-configuring-webhook-subscriptions)
- [🧠 Customizing Business Knowledge Base](#-customizing-business-knowledge-base)
- [🚀 Quick Start & Deployment](#-quick-start--deployment)
- [📂 Project File Structure](#-project-file-structure)
- [🛡️ Security, Performance & Maintenance](#️-security-performance--maintenance)

---

## 🌟 Features

### 📅 1. Daily Automated Post Generation
- **Automated Queue & Generation**: Picks scheduled Bangla topics from MongoDB. Automatically generates 30 new topics if the queue empties.
- **Service & Lead Focused**: Writes high-converting Bangla posts targeted at business owners with subtle call-to-actions (CTAs).
- **Cron Scheduler**: Runs daily at 9:00 PM (Asia/Dhaka timezone).

### 💬 2. Smart Messenger Auto-Responder
- **Debounced Reply Queue**: Consolidates rapid incoming messages into a single AI reply.
- **RAG Knowledge Retrieval**: Uses **MongoDB Hybrid Vector + Text Search** to answer queries accurately from `knowledgeBase.json`.
- **Human Admin Handoff**: Detects human admin replies (`is_echo` events) and pauses AI responses for 10 minutes to prevent AI interference.
- **Chat Memory**: Remembers previous requirements, budget, deadlines, and project details.

### 💬 3. Public Comment Auto-Reply
- **Context-Aware**: Fetches Facebook post text to understand comment context.
- **Service Intent Classifier**: Uses AI to reply only to genuine business inquiries (skipping emojis, greetings, spam, or praise).
- **Public Loop Protection**: Only replies to top-level comments on page posts; ignores nested comment threads to avoid loops.

### 🛡️ 4. Enterprise Security & Resilience
- **HMAC Signature Verification**: Validates `x-hub-signature-256` HTTP headers using your Facebook App Secret.
- **Exponential Backoff Retries**: Automatically retries Gemini API calls and Facebook Graph requests on rate limits (`429`) or server errors (`5xx`).
- **Data Retention (TTL Indexes)**: Automatically purges embedding caches (60 days) and post logs (90 days).

---

## 🏗️ System Architecture

```
                          ┌───────────────────────────┐
                          │   Facebook Graph API &    │
                          │        Webhooks           │
                          └─────────────┬─────────────┘
                                        │
                         HMAC Signature │ Verification
                                        ▼
                          ┌───────────────────────────┐
                          │     Node.js HTTP Server   │
                          │        (index.js)         │
                          └──────┬─────────────┬──────┘
                                 │             │
              Daily Cron Job     │             │ Webhook Events
              (9:00 PM Dhaka)    ▼             ▼
                 ┌─────────────────┐         ┌───────────────────────────┐
                 │ Post Generator  │         │  Messenger / Feed Worker  │
                 └────────┬────────┘         └─────────────┬─────────────┘
                          │                                │
                          ▼                                ▼
                 ┌───────────────────────────────────────────────────────┐
                 │       Google Gemini AI & Embedding Service            │
                 └────────────────────────┬──────────────────────────────┘
                                          │
                                          ▼
                 ┌───────────────────────────────────────────────────────┐
                 │       MongoDB Atlas (RAG Knowledge Base & Memory)     │
                 └────────────────────────┴──────────────────────────────┘
```

---

## 📋 Prerequisites

Ensure you have the following installed and configured before starting:
- **Node.js**: v18.0.0 or higher
- **MongoDB**: MongoDB Atlas (recommended for Vector Search) or local MongoDB 6.0+
- **Google Gemini API Key**: Free or paid key from [Google AI Studio](https://aistudio.google.com/)
- **Facebook Account & Page**: Admin access to a Facebook Page

---

## ⚙️ Environment Variables (.env Configuration)

Create or update your `.env` file in the root directory. Below is the complete, exact structure matching this application:

```env
SITE_URL=https://your-domain.com
SITE_NAME=YourSiteName

TOGATHER_API_KEY=your_together_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key
GEMINI_API_KEY=your_gemini_api_key
IMGBB_API_KEY=your_imgbb_api_key

FB_PAGE_ACCESS_TOKEN=your_facebook_page_access_token
FB_PAGE_ID=your_facebook_page_id
FB_VERIFY_TOKEN=your_webhook_verify_token
FB_APP_SECRET=your_facebook_app_secret
PORT=3000

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
MONGODB_DB_NAME=aiArticleGenerator
MONGODB_CONVERSATIONS_COLLECTION=conversation_messages
MONGODB_CONVERSATION_VECTOR_INDEX=conversation_embedding_index
MONGODB_KNOWLEDGE_COLLECTION=knowledge_chunks
MONGODB_KNOWLEDGE_VECTOR_INDEX=knowledge_embedding_index
MONGODB_EMBEDDING_CACHE_COLLECTION=embedding_cache
MONGODB_POST_LOGS_COLLECTION=post_logs
MONGODB_MESSAGE_DEDUPE_COLLECTION=processed_messages
MONGODB_TOPICS_COLLECTION=topics
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

---

## 🔑 Facebook Developer & Page Setup Guide

Follow this step-by-step guide to integrate your Facebook Page with this bot.

### 1. Creating Facebook App & Permissions
1. Go to [Meta for Developers](https://developers.facebook.com/) and click **My Apps** -> **Create App**.
2. Select **Business** or **Other** as the app type.
3. Add **Messenger** and **Facebook Webhooks** products to your app.
4. Under **App Review / Permissions**, request the following permissions:
   - `pages_manage_posts` (To publish daily AI articles to your Facebook Page)
   - `pages_messaging` (To send and receive Messenger messages)
   - `pages_read_engagement` (To read post details and public comment feeds)
   - `pages_show_list` (To list and manage your connected Facebook Pages)

### 2. Obtaining Page ID & App Secret
- **Page ID (`FB_PAGE_ID`)**: Open your Facebook Page -> Click **About** -> Find **Page ID** (e.g. `579715571901645`).
- **App Secret (`FB_APP_SECRET`)**: Go to Meta Developer Dashboard -> **App Settings** -> **Basic** -> Click **Show** next to **App Secret**. Copy and paste it as `FB_APP_SECRET` in `.env`.

### 3. Generating Long-Lived Page Access Token
1. Open the [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Select your App and under User Token, select your Facebook Page.
3. Add permissions: `pages_manage_posts`, `pages_messaging`, `pages_read_engagement`.
4. Click **Generate Access Token**.
5. To extend this token into a **Never-Expiring Long-Lived Page Access Token**:
   - Copy the short-lived token.
   - Open [Access Token Tool](https://developers.facebook.com/tools/debug/accesstoken/).
   - Paste the token and click **Extend Access Token**.
   - Copy the extended token and paste it as `FB_PAGE_ACCESS_TOKEN` in `.env`.

---

### 4. Webhook Tunneling (Local Development)

To test webhooks locally, expose port `3000` to the internet using your preferred tool:

#### Option A: Ngrok
```bash
ngrok http 3000
```

#### Option B: Cloudflare Tunnel
```bash
cloudflared tunnel --url http://localhost:3000
```

#### Option C: LocalTunnel
```bash
npx localtunnel --port 3000
```

Copy the generated HTTPS URL (e.g., `https://xxxx.ngrok-free.app` or `https://xxxx.trycloudflare.com`).

---

### 5. Configuring Webhook Subscriptions

1. In Meta Developer Dashboard, go to **Webhooks** -> Select **Page** from the dropdown menu.
2. Click **Subscribe to this object**.
3. Fill in the fields:
   - **Callback URL**: `https://your-public-url.com/webhook`
   - **Verify Token**: Enter the exact string you set for `FB_VERIFY_TOKEN` in `.env` (e.g., `page_automation_messenger_webhook`).
4. Click **Verify and Save**.
5. Under Page Webhook fields, click **Subscribe** for the following fields:
   - ▫️ `messages` (Triggers when visitors send DMs)
   - ▫️ `messaging_postbacks` (Triggers on button/menu clicks in Messenger)
   - ▫️ `message_echoes` (Triggers when human admin or bot sends a message)
   - ▫️ `feed` (Triggers when visitors leave comments on your Page posts)
6. Go to **Messenger** -> **Settings** -> **Webhooks** -> Select your Facebook Page and click **Subscribe**.

---

## 🧠 Customizing Business Knowledge Base

The bot relies on `knowledgeBase.json` to ground its answers using Retrieval-Augmented Generation (RAG).

Modify `knowledgeBase.json` with your business details:

```json
{
  "business": {
    "name": "Web Development Service",
    "owner_role": "web developer",
    "language": "Bangla",
    "target_customers": ["small business owner", "startup founder", "ecommerce seller"]
  },
  "services": [
    "business website development",
    "landing page design and development",
    "ecommerce website development",
    "website speed optimization",
    "website maintenance"
  ],
  "selling_points": [
    "clean and professional design",
    "mobile-friendly user experience",
    "fast loading pages",
    "SEO basics included"
  ],
  "pricing_policy": "Do not mention a fixed price unless clear scope is provided. Explain price depends on requirements.",
  "lead_questions": [
    "আপনার business type কী?",
    "কী কী feature লাগবে?",
    "আপনার deadline কবে?"
  ],
  "reply_style": {
    "tone": "helpful, warm, professional, confident",
    "rules": [
      "Always reply in Bangla unless the user asks in English.",
      "Answer direct questions first.",
      "Ask at most one or two follow-up questions."
    ]
  },
  "fallback_reply": "ধন্যবাদ মেসেজ করার জন্য। আপনার প্রয়োজনটা একটু বিস্তারিত বললে আমি বুঝে বলতে পারব কীভাবে সাহায্য করা যায়।"
}
```

*Note: On server startup, `dbInit.js` automatically indexes and syncs `knowledgeBase.json` with MongoDB.*

---

## 🚀 Quick Start & Deployment

### Install Dependencies
```bash
npm install
```

### Run in Development Mode
```bash
npm run dev
```

### Run in Production Mode
```bash
npm start
```

### Production Deployment Notes
- **Process Manager**: Use `PM2` or Docker to keep the Node process running:
  ```bash
  npm install -g pm2
  pm2 start index.js --name "fb-ai-bot"
  ```
- **MongoDB Atlas Vector Index**: Create a Vector Search Index named `knowledge_embedding_index` on the `knowledge_chunks` collection using field `embedding` (dimensions: 768, similarity: cosine).

---

## 📂 Project File Structure

```
aiArticleGenerator/
├── config/
│   └── aiConfig.js               # Centralized configuration & env variables
├── service/
│   ├── aiClient.js               # Shared Gemini AI client & Exponential Backoff helper
│   ├── commentDedupeStore.js     # Comment webhook deduplication store
│   ├── conversationStore.js      # User chat memory & vector retrieval
│   ├── dbInit.js                 # Database setup, indexes & TTL configuration
│   ├── embeddingService.js       # Embedding generator with Mongo cache
│   ├── facebookCommentService.js # Facebook post context & public comment replies
│   ├── generateArticle.js        # Daily Facebook text post generator
│   ├── generateMessengerReply.js # Messenger RAG reply generator & comment classifier
│   ├── generateMonthlyTopics.js  # 30-day topic queue generator
│   ├── knowledgeStore.js         # Hybrid Vector + Text RAG search engine
│   ├── messageDedupeStore.js     # Message deduplication & bot echo tracker
│   ├── mongoClient.js            # MongoDB connection client & lifecycle manager
│   ├── pendingReplyStore.js      # Debounced Messenger reply buffer & worker queue
│   ├── postLogStore.js           # Post logs collection manager
│   └── topicStore.js             # Topic queue with atomic findOneAndUpdate
├── utills/
│   ├── facebookPoster.js         # Facebook Feed publishing utility
│   └── messengerResponder.js     # Facebook Messenger Send API utility
├── index.js                      # Main application entry point & HTTP Webhook server
├── knowledgeBase.json            # Business knowledge base definition
├── package.json
└── README.md
```

---

## 🛡️ Security, Performance & Maintenance

- **Webhook Request Security**: Rejects tampered HTTP requests using `crypto.timingSafeEqual` HMAC-SHA256 signature verification.
- **Resilient AI Calling**: Built-in `withRetry` policy handles Gemini `429 Rate Limits` and Facebook network timeouts.
- **Automatic DB Cleanup**: MongoDB TTL indexes clean up old post logs after 90 days and embedding cache after 60 days automatically.
- **Graceful Shutdown**: Properly closes HTTP server and drains MongoDB connections on `SIGTERM` or `SIGINT`.

---

## 📄 License
ISC License.
