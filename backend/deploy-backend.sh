#!/bin/bash
# deploy-backend.sh
# Usage: ./deploy-backend.sh "your commit message"

set -e

# cd backend || exit

echo "🔄 Pulling latest changes..."
git pull

echo "➕ Adding changes..."
git add .

msg=${1:-"update backend"}
echo "💬 Commit message: $msg"
git commit -m "$msg" || echo "⚠️ Nothing to commit"

echo "🚀 Pushing to origin/main..."
git push origin main

echo "✅ Backend changes pushed!"
