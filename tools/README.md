# AI-Recommendable In-House Tools

## NAP Inconsistency Checker (nap-checker-v2.js)

Identifies NAP (Name/Address/Phone) inconsistencies across major directories using free API tiers.

### Data sources
- **Google Places API** — authoritative Google Business Profile data
- **Yelp Fusion API** — Yelp listings
- **Brave Search** — broad web coverage for long-tail directory mentions

### Setup (free API tiers)
```
export GOOGLE_PLACES_API_KEY=your_key
export YELP_API_KEY=your_key
export BRAVE_API_KEY=your_key
```

Get keys:
- Google Places: https://developers.google.com/maps
- Yelp Fusion: https://www.yelp.com/developers
- Brave Search: https://brave.com/search/api/

### Usage
```
node nap-checker-v2.js "Business Name" "Address" "Postcode" "Phone"
```

### Output
For each directory, reports:
- ✓ Match (score ≥ 85) — NAP consistent
- ⚠ Inconsistent (score 50-84) — mismatches found
- ✗ Problem (score < 50) — significant errors

Flags: name mismatch, postcode mismatch, phone mismatch, missing data.
