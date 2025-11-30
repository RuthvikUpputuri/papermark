#!/bin/sh
# Wait for MinIO to be ready
until curl -f http://minio:9000/minio/health/live > /dev/null 2>&1; do
  echo "Waiting for MinIO to be ready..."
  sleep 2
done

# Configure MinIO client
mc alias set myminio http://minio:9000 papermark papermarksecret

# Create bucket if it doesn't exist
mc mb myminio/papermark --ignore-existing

# Set bucket to public read (adjust as needed)
mc anonymous set download myminio/papermark

echo "MinIO bucket 'papermark' is ready!"
