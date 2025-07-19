# Competitive Landscape Microservice Testing Guide

This guide provides step-by-step instructions for testing the competitive landscape microservice.

## Prerequisites

1. **Node.js 18+** installed
2. **OpenAI API Key** (for real analysis, or use mock mode)
3. **Git** to clone the repository

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yloewidt/competitive-landscape-microservice.git
cd competitive-landscape-microservice
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set:
- `OPENAI_API_KEY`: Your OpenAI API key (or leave as `test-key` for testing without real analysis)
- `API_KEY`: Set your desired API key (default: `test-api-key`)

### 4. Start the Microservice

```bash
npm start
```

The server will start on port 3700 by default.

## Testing Methods

### Method 1: Using the Test UI (Recommended)

1. **Start the test UI server**:
   ```bash
   python3 -m http.server 8000
   ```

2. **Open in browser**:
   Navigate to http://localhost:8000/test-ui.html

3. **Test the endpoints**:
   - Click "Test Health" to verify the service is running
   - Click "Create Analysis" to submit a competitive analysis request
   - Use the Job ID to check status
   - View the analysis results when complete

### Method 2: Using cURL Commands

1. **Health Check**:
   ```bash
   curl http://localhost:3700/health
   ```

2. **Create Analysis**:
   ```bash
   curl -X POST http://localhost:3700/api/competitive-landscape/analyze \
     -H "Content-Type: application/json" \
     -H "X-API-Key: test-api-key" \
     -d '{
       "solutionDescription": "AI-powered customer service chatbot for e-commerce",
       "industryId": "tech-ai-chatbots"
     }'
   ```

3. **Check Job Status**:
   ```bash
   curl http://localhost:3700/api/jobs/{JOB_ID} \
     -H "X-API-Key: test-api-key"
   ```

4. **List All Analyses**:
   ```bash
   curl http://localhost:3700/api/competitive-landscape \
     -H "X-API-Key: test-api-key"
   ```

5. **Get Specific Analysis**:
   ```bash
   curl http://localhost:3700/api/competitive-landscape/{ANALYSIS_ID} \
     -H "X-API-Key: test-api-key"
   ```

### Method 3: Run Automated Tests

```bash
npm test
```

### Method 4: Docker Testing

1. **Build and run with Docker Compose**:
   ```bash
   docker-compose up
   ```

2. **With MySQL support**:
   ```bash
   docker-compose --profile mysql up
   ```

## Development Mode Features

### Synchronous Analysis (Dev Only)

For immediate testing without Cloud Tasks:

```bash
curl -X POST http://localhost:3700/api/competitive-landscape/analyze-sync \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-api-key" \
  -d '{
    "solutionDescription": "Your solution description here"
  }'
```

**Note**: This endpoint is disabled in production.

## Worker Testing

To test the worker service (processes analysis jobs):

1. **Start the worker**:
   ```bash
   npm run worker
   ```

2. **Create a job and watch it get processed**

## Troubleshooting

### Common Issues

1. **"Failed to fetch" error in UI**:
   - Ensure the server is running on port 3700
   - Check that you're using http://localhost:8000 for the test UI
   - Verify CORS is properly configured

2. **"Invalid API key" error**:
   - Check that X-API-Key header matches the value in .env
   - Default is `test-api-key`

3. **OpenAI API errors**:
   - Verify your OpenAI API key is valid
   - For testing without real API calls, use mock responses

4. **Port already in use**:
   ```bash
   # Kill process on port 3700
   lsof -i:3700 | grep LISTEN | awk '{print $2}' | xargs kill -9
   ```

### Logs

Check the logs for debugging:
- Server logs: `logs/app.log`
- Error logs: `logs/error.log`
- Console output when running with `npm start`

## Production Deployment

For production deployment on Google Cloud:

1. **Set up Cloud SQL database**
2. **Configure Cloud Tasks queue**
3. **Deploy using Cloud Build**:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

See `README.md` for detailed deployment instructions.

## API Response Examples

### Successful Analysis Creation
```json
{
  "message": "Competitive analysis queued for processing",
  "jobId": "1234567890",
  "status": "pending",
  "statusUrl": "/api/jobs/1234567890"
}
```

### Job Status Response
```json
{
  "id": "1234567890",
  "type": "competitive_analysis",
  "status": "completed",
  "result": {
    "id": "analysis-123",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### Analysis Results
```json
{
  "id": "analysis-123",
  "solutionDescription": "AI-powered customer service chatbot",
  "results": {
    "competitors": [...],
    "featureMatrix": {...},
    "marketGaps": [...],
    "summary": "Executive summary..."
  }
}
```