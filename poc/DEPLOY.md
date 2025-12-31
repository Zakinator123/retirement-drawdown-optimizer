# Netlify Deployment Guide

This project uses Netlify CLI for manual deployments (no Git required).

## Initial Setup

### 1. Install Netlify CLI

```bash
npm install -g netlify-cli
```

### 2. Authenticate

```bash
netlify login
```

This will open a browser window for you to log in and authorize the CLI.

### 3. Link Your Site

If you already have a Netlify site:

```bash
netlify link
```

This will prompt you to select your site from a list.

**OR** if you need to create a new site:

```bash
netlify init
```

Follow the prompts to create and link a new site.

## Deploying

### Option 1: Using the Deploy Script (Recommended)

**Deploy to production:**
```bash
./deploy.sh
# or
npm run deploy:prod
```

**Deploy to draft URL (for preview):**
```bash
./deploy.sh --draft
# or
npm run deploy:draft
```

### Option 2: Using Netlify CLI Directly

**Deploy to production:**
```bash
netlify deploy --prod
```

**Deploy to draft URL:**
```bash
netlify deploy
```

## Quick Deploy Workflow

1. Make your changes to the files
2. Run `./deploy.sh` (or `npm run deploy`)
3. Your site will be live in seconds!

## Troubleshooting

### "Site not linked" error
Run `netlify link` to connect your local folder to your Netlify site.

### "Netlify CLI not found"
Make sure you've installed it globally: `npm install -g netlify-cli`

### Check deployment status
```bash
netlify status
```

### View deployment logs
```bash
netlify open
```
This opens your Netlify dashboard in the browser.

