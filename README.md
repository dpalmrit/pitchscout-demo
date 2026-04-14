# Scout AI — Soccer Video Analysis Demo

An interactive frontend demo for a Soccer AI Video Analysis web app. Built as a static site — zero dependencies, no build step required.

## Live demo

Deploy instantly to **GitHub Pages** — see setup below.

---

## What's in this repo

```
scout-ai/
├── index.html          # Main app shell + all three views
├── css/
│   └── style.css       # Full stylesheet (dark theme, responsive)
├── js/
│   └── app.js          # Nav, upload simulation, dashboard logic
└── README.md
```

### Three views

| View | Description |
|------|-------------|
| **Drop Portal** | Simulates the S3 pre-signed upload flow with UUID assignment, progress steps, and PII scrubbing display |
| **Dashboard** | Tactical analysis output — scout grade, metric bars, scanning timeline, AI observations |
| **Architecture** | AWS stack overview — Lambda, DynamoDB, S3, SNS/SES, with a Python handler code snippet |

---

## Deploy to GitHub Pages (3 steps)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial Scout AI demo"
git remote add origin https://github.com/YOUR_USERNAME/scout-ai.git
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, select `main` branch and `/ (root)`
3. Click **Save**

### 3. Your site is live

```
https://YOUR_USERNAME.github.io/scout-ai/
```

GitHub Pages typically goes live within 60 seconds.

---

## Local development

No build step needed. Just open the file:

```bash
# Option A — open directly
open index.html

# Option B — serve locally (avoids any CORS edge cases)
npx serve .
# or
python3 -m http.server 8080
```

---

## Tech stack (demo)

| Layer | Choice |
|-------|--------|
| Framework | Vanilla HTML/CSS/JS — no dependencies |
| Fonts | Bebas Neue (display) + DM Sans (body) via Google Fonts |
| Theme | Dark, mobile-responsive |
| State | In-memory JS only |

---

## Production architecture (what this demo represents)

| Layer | Stack |
|-------|-------|
| Frontend | React + Vite + Tailwind CSS |
| API | AWS API Gateway + Lambda (Python 3.12) |
| Storage | S3 with Transfer Acceleration + Pre-signed URLs |
| Database | DynamoDB — UUID primary keys only (no PII) |
| AI | Gemini Vision / GPT-4o via Lambda stub |
| Notifications | AWS SNS (SMS) + SES (Email) |
| IaC | AWS SAM or Terraform |
| Performance | Provisioned Concurrency on AI analysis Lambda |
| Security | AES-256 at rest, TLS 1.3 in transit, COPPA-aware schema |

---

## Security design notes

- No player names or birthdates are stored anywhere
- All records use `player_uuid` and `session_uuid` as primary keys
- S3 pre-signed URLs expire after 15 minutes
- S3 Transfer Acceleration handles large video uploads on mobile connections
- Provisioned Concurrency eliminates cold starts on the AI analysis function

---

## Next steps

- [ ] Wire up real AWS SAM backend (`template.yaml`)
- [ ] Replace upload simulation with live pre-signed URL fetch
- [ ] Add authentication (Amazon Cognito)
- [ ] Build React version with Vite + Tailwind
- [ ] Add COPPA compliance review for youth athlete data handling

---

## License

MIT
