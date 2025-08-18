# 🚀 QA Pipeline Quick Reference

## ⚡ **Quick Commands**

```bash
# Complete pipeline
pnpm qa:pipeline

# Individual phases
pnpm qa:crawl      # Discover user journeys
pnpm qa:generate   # Generate tests
pnpm qa:test       # Execute tests
pnpm qa:report     # Generate reports
pnpm qa:help       # Show all options
```

## 🌍 **Environment Configuration**

```bash
# Local development
BASE_URL=http://localhost:3000 pnpm qa:pipeline

# Staging
BASE_URL=https://staging.bookiji.com pnpm qa:pipeline

# Production
BASE_URL=https://bookiji.com pnpm qa:pipeline

# Custom depth
MAX_DEPTH=3 pnpm qa:pipeline
```

## 📊 **Quality Thresholds**

```yaml
Overall Score:     ≥ 80%  # Blocks deployment
Test Coverage:     ≥ 70%  # Blocks deployment
Accessibility:     ≥ 90%  # Blocks deployment
```

## 🔍 **Pipeline Outputs**

- **`crawl-output.json`** - Discovered journeys & elements
- **`tests/generated.spec.ts`** - Auto-generated tests
- **`qa-pipeline-report.json`** - Quality metrics (JSON)
- **`qa-pipeline-report.html`** - Visual dashboard
- **`test-results/`** - Screenshots & artifacts

## 🚨 **Critical Paths**

The pipeline automatically identifies and prioritizes:
- **Booking flows** 🚨
- **Authentication** 🚨
- **Service requests** 🚨
- **User onboarding** 🚨

## 🔧 **Troubleshooting**

```bash
# Pipeline won't start
pnpm qa:help
pnpm install
pnpm exec playwright install --with-deps chromium

# Crawling issues
curl http://localhost:3000
MAX_DEPTH=1 pnpm qa:crawl

# Test failures
pnpm test:e2e --reporter=list --debug
cat qa-pipeline-report.json | jq '.qualityMetrics'
```

## 📱 **Team Notifications**

```bash
# Slack integration
SLACK_WEBHOOK=https://hooks.slack.com/... pnpm qa:pipeline

# Email alerts
EMAIL_RECIPIENTS=team@bookiji.com pnpm qa:pipeline
```

## 🎯 **Best Practices**

- **Daily**: `pnpm qa:report` to check quality status
- **Development**: `pnpm qa:crawl` to discover new elements
- **Pre-commit**: `pnpm qa:pipeline` for full validation
- **Release**: Test staging and production environments

## 📚 **Full Documentation**

- **Complete Guide**: [`QA_PIPELINE_COMPLETE.md`](QA_PIPELINE_COMPLETE.md)
- **Developer Guide**: [`DEVELOPER_ONBOARDING.md`](DEVELOPER_ONBOARDING.md)
- **Pipeline Script**: `scripts/qa-pipeline.mjs`
- **CI/CD Config**: `.github/workflows/qa-pipeline.yml`

---

**🚀 Bookiji QA Pipeline - Enterprise-grade automated quality assurance!**
