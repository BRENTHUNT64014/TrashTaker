# Daily Task Email Setup Guide

## GitHub Actions Setup

### 1. Add Secrets to GitHub Repository

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these two secrets:

**APP_URL**
```
https://your-app-domain.com
```
(Your production URL, e.g., https://trashtasker.vercel.app)

**CRON_SECRET**
```
cron_secret_key_change_in_production_12345
```
(Use the same value from your .env.local file)

### 2. Enable GitHub Actions

1. Go to your repository on GitHub
2. Click the "Actions" tab
3. If Actions are disabled, click "I understand my workflows, go ahead and enable them"

### 3. The Workflow Will Run Automatically

- **Scheduled**: Every day at 7:00 AM Central Time (1:00 PM UTC)
- **Manual**: Click "Actions" tab → "Daily Task Email" → "Run workflow"

### 4. Change the Email Time (Optional)

Edit `.github/workflows/daily-task-email.yml` and change the cron schedule:

```yaml
# Current: 7:00 AM Central (13:00 UTC)
- cron: '0 13 * * *'

# Examples:
# 6:00 AM Central (12:00 UTC)
- cron: '0 12 * * *'

# 8:00 AM Central (14:00 UTC)
- cron: '0 14 * * *'

# 9:00 AM Central (15:00 UTC)
- cron: '0 15 * * *'
```

### 5. Test the Email Now

**Option A: Manual GitHub Action**
1. Go to Actions tab
2. Click "Daily Task Email"
3. Click "Run workflow" button
4. Click green "Run workflow" button

**Option B: API Test (Local)**
```bash
curl -X POST http://localhost:3000/api/tasks/daily-email
```

**Option C: API Test (Production)**
```bash
curl -X GET https://your-app-domain.com/api/tasks/daily-email \
  -H "Authorization: Bearer cron_secret_key_change_in_production_12345"
```

## How It Works

1. GitHub Actions runs the workflow at 7 AM daily
2. Calls your `/api/tasks/daily-email` endpoint
3. API finds all users with tasks due today
4. Sends beautiful HTML email to each user via SendGrid
5. Email includes:
   - All tasks due today sorted by priority
   - Task details (type, status, description)
   - Address/location for site visits
   - Property and contact information
   - Link to dashboard

## Troubleshooting

### Emails not sending?

1. **Check GitHub Actions logs**:
   - Go to Actions tab → Latest workflow run → View logs

2. **Verify secrets are set**:
   - Settings → Secrets and variables → Actions
   - Make sure APP_URL and CRON_SECRET exist

3. **Check your app logs** (Vercel/hosting):
   - Look for errors in `/api/tasks/daily-email` endpoint

4. **Verify SendGrid is working**:
   - Check SENDGRID_API_KEY in production environment variables
   - Verify sender email is verified in SendGrid

### Change email send time?

GitHub Actions uses UTC time. Convert your local time:
- 6 AM Central = 12:00 UTC → `cron: '0 12 * * *'`
- 7 AM Central = 13:00 UTC → `cron: '0 13 * * *'`
- 8 AM Central = 14:00 UTC → `cron: '0 14 * * *'`
- 9 AM Central = 15:00 UTC → `cron: '0 15 * * *'`

### Want to stop emails temporarily?

Disable the workflow:
1. Go to Actions tab
2. Click "Daily Task Email"
3. Click "..." menu → "Disable workflow"

## Next Steps

1. Push this to GitHub
2. Add the secrets (APP_URL and CRON_SECRET)
3. Test manually from Actions tab
4. Wait for tomorrow at 7 AM or adjust the schedule
