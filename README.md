# AI-Recommendable Website

The complete frontend for [ai-recommendable.com](https://ai-recommendable.com) — AI Discoverability Assessment and Trust Signal Optimisation for businesses.

## Structure

```
/
├── index.html                  # Homepage (V3 canonical)
├── ai-discoverability-scan.html# Scan form → triggers API assessment
├── ai-trust-signal-assessment.html # Service page — the assessment
├── how-it-works                # How the service works (extensionless URL)
├── pricing.html               # Pricing page (needs £995 offer)
├── about                      # About Mo Rahman and the company
├── blog.html                  # Blog & resources hub
├── contact.html               # Contact with phone, email, form
├── schema-structured-data.html# Schema.org markup service
├── trust-signal-engineering.html# Trust signal improvement service
├── content-strategy.html      # AI content strategy service
├── ai-readiness               # AI Readiness Consulting service
├── ai-readiness-assessment    # Self-assessment quiz page
├── observatory.html           # AI Recommendation Observatory (mixed V2/V3)
├── research.html              # Research hub
├── v2/                        # Archived V2 pages
│   ├── v2-pricing.html
│   ├── v2-how-it-works.html
│   ├── v2-contact.html
│   ├── v2-blog.html
│   ├── v2-observatory.html
│   └── v2-research.html
├── css/                       # Stylesheets (TBD from inline Tailwind)
├── js/                        # JavaScript (TBD)
└── README.md
```

## Page inventory

| URL | Version | Status |
|-----|---------|--------|
| `/` | V3 | 🟢 Live — good messaging, needs title fix |
| `/ai-discoverability-scan.html` | V3 | 🟢 Live |
| `/ai-trust-signal-assessment.html` | V3 | 🟢 Live — links to V2 pricing |
| `/how-it-works` | V3 | 🟡 Live — says "AI Visibility" not Discoverability |
| `/pricing.html` | V3 | 🔴 Live — shows £1,497, not £995 offer |
| `/contact.html` | V3 | 🟡 Live — says "AI Visibility" |
| `/about` | V3 | 🟡 Live — says "AI Visibility" |
| `/blog.html` | V3 | 🟡 Live — thin content |
| `/schema-structured-data.html` | V3 | 🟢 Live |
| `/trust-signal-engineering.html` | V3 | 🟢 Live |
| `/content-strategy.html` | V3 | 🟢 Live |
| `/ai-readiness` | V3 | 🟢 Live |
| `/ai-readiness-assessment` | V3 | 🟢 Live |
| `/observatory.html` | V2 | 🔴 Archived — "(V2)" in title |
| `/research.html` | V3 | 🟡 Live |
| `/v2-pricing.html` | V2 | 🔴 Archived — old pricing structure |
| `/v2-how-it-works.html` | V2 | 🔴 Archived |
| `/v2-contact.html` | V2 | 🔴 Archived |
| `/v2-blog.html` | V2 | 🔴 Archived |
| `/v2-observatory.html` | V2 | 🔴 Archived |
| `/v2-research.html` | V2 | 🔴 Archived |

## Known issues

1. **Title tag** — `index.html` says "AI Trust Optimisation", should be "AI Discoverability"
2. **Pricing** — No £995 option, shows £1,497 / £799-995/mo
3. **V2 pages still indexed** — sitemap.xml includes v2-pricing, v2-how-it-works, v2-blog, v2-observatory, v2-research
4. **"Visibility" language** — how-it-works, contact, about pages use "AI Visibility" not "AI Discoverability"
5. **Footer links** — Observatory points to V2 page; some links inconsistent
6. **No payment checkout** — No buy button or purchase flow connected