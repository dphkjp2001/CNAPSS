#!/bin/bash
# deploy-frontend.sh
# Usage: ./deploy-frontend.sh "your commit message"

set -e  # Exit on first error

cd frontend || exit

echo "🔄 Pulling latest changes..."
git pull

echo "➕ Adding changes..."
git add .

msg=${1:-"update frontend"}
echo "💬 Commit message: $msg"
git commit -m "$msg" || echo "⚠️ Nothing to commit"

echo "🚀 Pushing to origin/main..."
git push origin main

echo "🏗️ Building project..."
npm run build

echo "🔥 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Frontend deployed successfully!"
