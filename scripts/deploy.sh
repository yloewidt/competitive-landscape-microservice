#!/bin/bash

# Deployment script for Competitive Landscape Microservice

set -e

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-"your-project-id"}
REGION=${GCP_REGION:-"us-central1"}
API_SERVICE_NAME="competitive-landscape-api"
WORKER_SERVICE_NAME="competitive-landscape-worker"
API_IMAGE="gcr.io/${PROJECT_ID}/${API_SERVICE_NAME}"
WORKER_IMAGE="gcr.io/${PROJECT_ID}/${WORKER_SERVICE_NAME}"

echo "🚀 Deploying Competitive Landscape Microservice to Google Cloud Run"
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"

# Build and push API image
echo "📦 Building API image..."
gcloud builds submit --tag "${API_IMAGE}" .

# Build and push Worker image
echo "📦 Building Worker image..."
gcloud builds submit --tag "${WORKER_IMAGE}" -f Dockerfile.worker

# Deploy API service
echo "🌐 Deploying API service..."
gcloud run deploy "${API_SERVICE_NAME}" \
  --image "${API_IMAGE}" \
  --platform managed \
  --region "${REGION}" \
  --port 3700 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,DATABASE_TYPE=mysql,USE_CLOUD_TASKS=true" \
  --add-cloudsql-instances="${CLOUD_SQL_CONNECTION_NAME}" \
  --service-account="${API_SERVICE_ACCOUNT}" \
  --memory=1Gi \
  --cpu=1

# Deploy Worker service (private, only accessible by Cloud Tasks)
echo "⚙️ Deploying Worker service..."
gcloud run deploy "${WORKER_SERVICE_NAME}" \
  --image "${WORKER_IMAGE}" \
  --platform managed \
  --region "${REGION}" \
  --port 8080 \
  --no-allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,DATABASE_TYPE=mysql" \
  --add-cloudsql-instances="${CLOUD_SQL_CONNECTION_NAME}" \
  --service-account="${WORKER_SERVICE_ACCOUNT}" \
  --memory=2Gi \
  --cpu=2 \
  --max-instances=10

# Get service URLs
API_URL=$(gcloud run services describe "${API_SERVICE_NAME}" --region="${REGION}" --format="value(status.url)")
WORKER_URL=$(gcloud run services describe "${WORKER_SERVICE_NAME}" --region="${REGION}" --format="value(status.url)")

echo "✅ Deployment complete!"
echo "API URL: ${API_URL}"
echo "Worker URL: ${WORKER_URL}"
echo ""
echo "📝 Next steps:"
echo "1. Update Cloud Tasks to use worker URL: ${WORKER_URL}"
echo "2. Configure API authentication"
echo "3. Set up monitoring and alerts"