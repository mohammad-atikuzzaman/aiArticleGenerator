# 📰 AI Article Generator

An automated system that creates and posts engaging articles with custom-generated images directly to a Facebook page—powered by multiple AI services and orchestrated using Node.js. 

This project demonstrates how artificial intelligence can streamline content creation and social media automation. Every morning at 9 AM, a Node.js script kicks off a seamless workflow:

This end-to-end process runs automatically, delivering fresh, contextual content without manual effort.

## 🚀 Overview

1. **Topic Generation**: Using **Mistral AI**, the system selects a trending or compelling topic for the day.
2. **Article Writing**: Mistral AI then generates a full article based on the selected topic.
3. **Image Creation**: Key concepts from the article are extracted and sent to the **Hugging Face Image Generator AI**, which produces a relevant visual.
4. **Content Publishing**: The final article and image are published to a Facebook page using the **Facebook Graph API**.

## 🧰 Technologies Used

- **Node.js** – The backbone of the automation and integration logic.
- **Mistral AI** – For generating article topics and writing full-length articles.
- **Hugging Face Image Generator** – To generate images based on article content.
- **ImgBB Image Hosting** – To upload images made from Hugging Face Image Generator.
- **Facebook Graph API** – For posting articles and images to Facebook.

## 🧑‍💻 Getting Started

### ⚙️ Prerequisites

- **Node.js** (v18 or newer recommended)
- **Mistral AI API key** (for topic and article generation)
- **Hugging Face API key** (for image generation)
- **ImgBB API key** (for image uploading and link generation)
- **Facebook Developer account** (for Graph API access)

### 📦 Installation

1. **Clone and setup the project**

   ```bash
   git clone <repository-url>
   cd aiArticleGenerator
   npm install
   ```

2. **Environment Configuration**

   Create a `.env` file and Copy the below and update with your values:

    ```bash
   # Site
   SITE_NAME="your-site-name"
   SITE_URL="your-site-url"

   # Mistral AI
   OPENROUTER_API_KEY="your-openrouter-api-key"

   # Hugging Face AI
   HUGGINGFACE_API_KEY="your-huggingface-api-key"

   # ImgBB
   IMGBB_API_KEY="your-imgbb-api-key"

   # Facebook
   FB_PAGE_ID="your-facebook-page-id"
   FB_PAGE_ACCESS_TOKEN="your-facebook-access-token"
   FB_VERIFY_TOKEN="your-webhook-verify-token"

   # MongoDB + vector memory
   MONGODB_URI="mongodb+srv://user:password@cluster.mongodb.net/?retryWrites=true&w=majority"
   MONGODB_DB_NAME="aiArticleGenerator"
   MONGODB_CONVERSATIONS_COLLECTION="conversation_messages"
   MONGODB_VECTOR_INDEX="conversation_embedding_index"
   GEMINI_EMBEDDING_MODEL="text-embedding-004"
   ```

### MongoDB Vector Search Setup

Messenger conversations are stored in MongoDB. Each saved message also gets a Gemini embedding, so future replies can retrieve only the most relevant old messages instead of sending the full chat history to the AI model. This keeps prompts smaller and helps reduce token cost.

If you use MongoDB Atlas, create a Vector Search index on the `conversation_messages` collection:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "userId"
    }
  ]
}
```

Use the same index name as `MONGODB_VECTOR_INDEX`. If the vector index is missing or you use a local MongoDB server without Atlas Vector Search, the app will still store conversations in MongoDB and fall back to recent-message context only.

3. **Run Development Server**

   ```bash
   npm start
   ```

   This command starts the automation workflow. It will trigger the daily cron job, generate a topic and article, create an image, upload it, and post everything to your configured Facebook page. You should see logs in the terminal indicating each step of the process.

   **Testing the Workflow Manually:**  
   If you want to test the workflow immediately (without waiting for the 9AM cron job), you can uncomment the following code in `index.js`:

   ```js
   // (async () => {
   //   await runGenerator();
   // })();
   ```

   This will run the generator instantly when you start the server.

## 📁 Project Structure

```
aiArticleGenerator/
├── config/                      # Configuration Folder
│   └── aiConfig.js              # AI configuration and API keys
├── service/                     # Service logics
│   └── generateArticle.js       # Generates articles using AI
│   └── generateImage.js         # Generates images using AI
│   └── generateTopic.js         # Generates topics using AI
├── utills/                      # Utility functions
│   └── facebookPoster.js        # Posts content to Facebook
├── .env                         # Environment variables
├── index.js                     # Main entry point
├── package.json                 # Project metadata and dependencies
├── README.md                    # Project documentation
└── vercel.json                  # Vercel deployment configuration
└── LICENSE                      # License information
```

## ✨ Key Features Explained

- **Automated Topic Generation**: Uses Mistral AI to select trending or relevant topics every day.
- **AI-Powered Article Writing**: Generates full-length articles based on the chosen topic using advanced language models.
- **Custom Image Creation**: Extracts key concepts from articles and generates unique images via Hugging Face Image Generator.
- **Image Hosting Integration**: Uploads generated images to ImgBB for reliable hosting and sharing.
- **Seamless Facebook Publishing**: Automatically posts articles and images to a Facebook page using the Facebook Graph API.
- **Daily Cron Job**: The entire workflow is triggered automatically every morning at 9 AM using a scheduled cron job, ensuring consistent and timely content delivery.
- **Environment-Based Configuration**: All sensitive credentials and configuration are managed securely via environment variables.

## 🚢 Deployment

### 🌐 Vercel Deployment (Recommended)

1. **Connect to Vercel**

   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

2. **Environment Variables**
   Set all environment variables in Vercel dashboard

## 🙌 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support create an issue in the repository.

## 🙏 Acknowledgments

- Inspired by the potential of AI to automate and enhance digital content creation.
- Built through continuous learning, experimentation, and problem-solving.
- Thanks to open-source communities and AI service providers for their valuable resources and APIs.
