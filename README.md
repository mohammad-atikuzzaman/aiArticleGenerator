# 🤖 AI Facebook Page Automation & Lead Assistant

An intelligent, AI-powered automation system for Facebook Pages designed to drive engagement, educate audiences, and handle customer leads automatically. Powered by **Google Gemini AI**, **MongoDB Vector RAG Search**, and **Facebook Graph API (v23.0)**.

---

## 🌟 Key Features

### 📅 1. Daily Automated Post Generation
- **Topic Queue Management**: Automatically picks service-focused topics from MongoDB. If topics run out, Gemini generates 30 new Bangla topics tailored for web development and business automation.
- **Bangla Content Writing**: Generates high-converting, educational Facebook text posts with natural soft calls-to-action (CTAs).
- **Automated Scheduling**: Scheduled daily at 9:00 PM (Asia/Dhaka timezone) via `node-cron`.

### 💬 2. Smart Messenger Auto-Responder
- **Debounced Reply Queue**: Consolidates rapid multiple messages from the same user into a single coherent AI response.
- **RAG Knowledge Retrieval**: Uses **MongoDB Hybrid Vector & Full-Text Search (RRF)** to answer questions accurately based on your custom `knowledgeBase.json`.
- **Human Admin Handoff**: Intercepts admin replies (echo events) and automatically pauses bot replies for 10 minutes to prevent AI interference when a human admin takes over.
- **Conversation Memory**: Keeps track of recent chat context and user requirements (budget, project type, deadlines).

### 💬 3. Public Comment Auto-Reply
- **Post Context Awareness**: Fetches the context of the Facebook post to generate relevant replies.
- **Service Intent Classification**: AI classifies comments to ensure public replies are only sent for genuine service inquiries (ignoring greetings, praise, or unrelated chat).
- **Public Reply Loop Prevention**: Only replies to top-level comments; avoids nested threads to prevent spam loops.

### 🛡️ 4. Enterprise-Grade Security & Performance
- **Webhook HMAC Verification**: Validates `x-hub-signature-256` HTTP headers using your Facebook App Secret to prevent spoofing.
- **Atomic Operations**: Prevents race conditions during topic selection across multiple worker instances.
- **Exponential Backoff Retries**: Automatically retries Gemini API calls and Facebook Graph requests on rate limits (`429`) or network errors (`5xx`).
- **Data Retention & TTL Indexes**: Automatic cleanup of old post logs (90 days), embedding caches (60 days), and processed message hashes.

---

## 🏗️ Architecture Overview

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
                 │          MongoDB Atlas (RAG & Knowledge Base)         │
                 └───────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

Before running the application, make sure you have:
1. **Node.js**: v18.0.0 or higher
2. **MongoDB**: MongoDB Atlas (recommended for Vector Search) or local MongoDB instance.
3. **Google Gemini API Key**: Obtain from [Google AI Studio](https://aistudio.google.com/).
4. **Facebook Developer App**:
   - Facebook Page Admin access
   - Page Access Token (with `pages_manage_posts`, `pages_messaging`, `pages_read_engagement` permissions)
   - App Secret & Webhook Verify Token

---

## ⚙️ Installation & Setup

### 1. Clone the Repository & Install Dependencies
```bash
git clone <repository-url>
cd aiArticleGenerator
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:

```env
# Server Port
PORT=3000

# Google Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_EMBEDDING_MODEL=gemini-embedding-001

# Facebook Graph API & Webhook Configuration
FB_PAGE_ID=your_facebook_page_id_here
FB_PAGE_ACCESS_TOKEN=your_facebook_page_access_token_here
FB_VERIFY_TOKEN=your_custom_webhook_verify_token_here
FB_APP_SECRET=your_facebook_app_secret_here
FB_GRAPH_API_VERSION=v23.0

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=aiArticleGenerator

# Optional Tuning (Default values will be used if omitted)
MESSENGER_REPLY_DEBOUNCE_MS=20000
MESSENGER_ADMIN_PAUSE_MS=600000
MESSENGER_REPLY_POLL_MS=10000
MESSENGER_REPLY_CONCURRENCY=3
```

### 3. Customize Business Knowledge Base
Edit `knowledgeBase.json` to define your business offerings, services, pricing policies, lead qualification questions, and tone of voice.

Example `knowledgeBase.json`:
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
    "landing page design",
    "ecommerce development",
    "speed optimization"
  ],
  "pricing_policy": "Price depends on requirements. Do not quote fixed prices without scope.",
  "lead_questions": [
    "আপনার business type কী?",
    "কী কী feature লাগবে?"
  ]
}
```

---

## 🚀 Running the Application

### Development Mode (with hot reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

---

## 🔗 Facebook Webhook Integration Setup

1. **Expose Local Server (For Development)**: Use `ngrok` or a reverse proxy.
   ```bash
   ngrok http 3000
   ```
2. **Configure Facebook Webhook**:
   - Go to **Facebook Developer Dashboard** -> Your App -> **Webhooks**.
   - Select **Page** object and set **Callback URL** to: `https://your-domain.com/webhook`
   - Set **Verify Token** to the exact string configured in `FB_VERIFY_TOKEN`.
   - Subscribe to the following Page fields:
     - `messages`
     - `messaging_postbacks`
     - `feed`

---

## 📂 Project Structure

```
aiArticleGenerator/
├── config/
│   └── aiConfig.js               # Application configuration loader
├── service/
│   ├── aiClient.js               # Shared Gemini AI client & Exponential Backoff retry helper
│   ├── commentDedupeStore.js     # Comment webhook event deduplication
│   ├── conversationStore.js      # Chat memory & vector search embedding retrieval
│   ├── dbInit.js                 # Database connection & TTL index initialization
│   ├── embeddingService.js       # Vector embedding generator with caching
│   ├── facebookCommentService.js # Facebook Graph API context & public comment replies
│   ├── generateArticle.js        # Daily Facebook post content generator
│   ├── generateMessengerReply.js # Messenger RAG reply generator & comment classifier
│   ├── generateMonthlyTopics.js  # 30-day topic queue generator
│   ├── knowledgeStore.js         # Hybrid Vector + Text search RAG pipeline
│   ├── messageDedupeStore.js     # Messenger event & bot echo deduplication
│   ├── mongoClient.js            # MongoDB client lifecycle management
│   ├── pendingReplyStore.js      # Debounced Messenger reply buffer & atomic lock queue
│   ├── postLogStore.js           # Posting status logger
│   └── topicStore.js             # Topic queue store with atomic selection
├── utills/
│   ├── facebookPoster.js         # Facebook Page post publisher
│   └── messengerResponder.js     # Facebook Messenger API sender
├── index.js                      # Main application entry point & HTTP Webhook server
├── knowledgeBase.json            # Business knowledge base definition
└── package.json
```

---

## 🛠️ Maintenance & Troubleshooting

- **MongoDB Index Warning**: If Vector Search is unavailable or unindexed on MongoDB Atlas, the system automatically falls back to Full-Text search and in-memory knowledge base caching without crashing.
- **Rate Limit Resilience**: All Gemini API calls use automatic exponential backoff retries.
- **Graceful Shutdown**: The application responds to `SIGTERM` and `SIGINT` signals, ensuring in-flight webhook processes finish and MongoDB connections drain cleanly.

---

## 📄 License
ISC License.
