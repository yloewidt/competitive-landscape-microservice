# Competitive Landscape Microservice

A standalone microservice for analyzing competitive landscapes using AI, designed to be deployed on Google Cloud Run with Cloud Tasks integration.

## Features

- 🔍 AI-powered competitive analysis using OpenAI GPT-4
- 📊 Comprehensive competitor identification and analysis
- 🗺️ Market segmentation mapping
- 🎯 Feature comparison matrices
- 🚀 Async processing with Google Cloud Tasks
- 🔐 API key authentication
- 📈 RESTful API with comprehensive endpoints
- 🐳 Docker support for easy deployment

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  API Server │────▶│ Cloud Tasks │
└─────────────┘     └─────────────┘     └─────────────┘
                            │                    │
                            ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Database   │     │   Worker    │
                    └─────────────┘     └─────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- OpenAI API key
- Google Cloud Project (for production)
- MySQL or SQLite

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd competitive-landscape-microservice
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with required values

### Development

Run the API server:
```bash
npm start
```

Run the worker (in a separate terminal):
```bash
npm run worker
```

Run tests:
```bash
npm test
```

### Docker

Build and run with Docker Compose:
```bash
docker-compose up
```

Run with MySQL support:
```bash
docker-compose --profile mysql up
```

## API Endpoints

### Health Check
- `GET /health` - Basic health check
- `GET /health/detailed` - Detailed health status

### Competitive Analysis
- `POST /api/competitive-landscape/analyze` - Queue a new analysis
- `GET /api/competitive-landscape` - List all analyses
- `GET /api/competitive-landscape/:id` - Get specific analysis
- `GET /api/competitive-landscape/:id/competitors` - Get competitors for an analysis

### Jobs
- `GET /api/jobs/:jobId` - Check job status

All API endpoints require `X-API-Key` header for authentication.

## Request Example

```bash
curl -X POST http://localhost:3700/api/competitive-landscape/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "solutionDescription": "AI-powered customer service chatbot for e-commerce",
    "industryId": "tech-ai-chatbots"
  }'
```

## Response Example

```json
{
  "message": "Competitive analysis queued for processing",
  "jobId": "1234567890",
  "status": "pending",
  "statusUrl": "/api/jobs/1234567890"
}
```

## Configuration

### Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `OPENAI_API_KEY` - Required for AI analysis
- `DATABASE_TYPE` - Choose between 'sqlite' or 'mysql'
- `API_KEY` - API key for authentication
- `GCP_PROJECT_ID` - Google Cloud project (production)

### Database

The service supports both SQLite (development) and MySQL (production):

- SQLite: Automatic setup, no configuration needed
- MySQL: Configure connection details in `.env`

## Deployment

### Google Cloud Run

1. Build and push Docker image:
```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT/competitive-landscape-api
```

2. Deploy to Cloud Run:
```bash
gcloud run deploy competitive-landscape-api \
  --image gcr.io/YOUR_PROJECT/competitive-landscape-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Cloud Tasks Worker

Deploy the worker separately:
```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT/competitive-landscape-worker -f Dockerfile.worker
gcloud run deploy competitive-landscape-worker \
  --image gcr.io/YOUR_PROJECT/competitive-landscape-worker \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated
```

## Testing

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## License

ISC