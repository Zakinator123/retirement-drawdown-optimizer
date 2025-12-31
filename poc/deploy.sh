#!/bin/bash

# Netlify Deploy Script
# Usage: ./deploy.sh [--prod|--draft]
#   --prod: Deploy to production (default)
#   --draft: Deploy to draft URL for preview

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Netlify deployment...${NC}"

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo -e "${YELLOW}⚠️  Netlify CLI not found. Installing...${NC}"
    npm install -g netlify-cli
fi

# Check if site is linked
if [ ! -f ".netlify/state.json" ]; then
    echo -e "${YELLOW}⚠️  Site not linked. Linking now...${NC}"
    echo -e "${BLUE}Please select your site when prompted.${NC}"
    netlify link
fi

# Determine deploy type
DEPLOY_TYPE="--prod"
if [ "$1" == "--draft" ]; then
    DEPLOY_TYPE=""
    echo -e "${BLUE}📝 Deploying to draft URL...${NC}"
else
    echo -e "${BLUE}🌐 Deploying to production...${NC}"
fi

# Deploy
netlify deploy $DEPLOY_TYPE

echo -e "${GREEN}✅ Deployment complete!${NC}"

