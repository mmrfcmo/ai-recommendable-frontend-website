#!/usr/bin/env node
/**
 * AI-Recommendable NAP Inconsistency Checker v0.2
 * 
 * Uses FREE API tiers + search to identify NAP inconsistencies across
 * the major directories.
 * 
 * Data sources:
 *  - Google Places API (Google Maps / Business Profile data)  [free tier]
 *  - Yelp Fusion API (Yelp listings)                          [free tier]
 *  - Bing local search (via Brave/DuckDuckGo fallback)        [free tier]
 *  - Brave Search (broad web coverage for the long tail)
 * 
 * The tool compares each found listing against an authoritative NAP
 * and reports exact matches, mismatches, and missing data.
 * 
 * Prerequisites (set as env vars — leave unset to test in "demo mode"):
 *   GOOGLE_PLACES_API_KEY=...
 *   YELP_API_KEY=...
 *   BRAVE_API_KEY=...        (optional, enhances web coverage)
 * 
 * Usage:
 *   node nap-checker-v2.js "Business Name" "Address" "Postcode" "Phone"
 *   node nap-checker-v2.js "Achieve Spinal Health" "Somewhere" "M1 1AE" "0161 123 4567"
 */

const https = require('https');

const AUTHORITATIVE = {
  businessName: process.argv[2] || '',
  address: process.argv[3] || '',
  postcode: (process.argv[4] || '').toUpperCase().replace(/\s+/g, ' '),
  phone: (process.argv[5] || '').replace(/[^\d+]/g, ''),
};

const GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const YELP_KEY = process.env.YELP_API_KEY || '';
const BRAVE_KEY = process.env.BRAVE_API_KEY || '';

// ===== HTTP helper =====
function fetchJson(url, options = {}) {
  return new Promise((resolve) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (NAP-Checker; +https://ai-recommendable.com)',
        ...(options.headers || {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; if (data.length > 300000) req.destroy(); });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data: {} }); }
      });
      res.on('error', () => resolve({ status: 0, data: {} }));
    });
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, data: {} }); });
    req.setTimeout(12000);
    req.on('error', () => resolve({ status: 0, data: {} }));
  });
}

// ===== NAP comparison helpers =====
function normalizeAddress(addr) {
  if (!addr) return '';
  return addr.toLowerCase()
    .replace(/[.,;']/g, ' ')
    .replace(/\b(street|st)\b/g, 'st')
    .replace(/\b(road|rd)\b/g, 'rd')
    .replace(/\b(avenue|ave)\b/g, 'ave')
    .replace(/\b(boulevard|blvd)\b/g, 'blvd')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePhone(phone) {
  if (!phone) return '';
  // Normalise common UK variations to digits
  return phone.replace(/[^\d]/g, '').replace(/^0/, '44').replace(/^44/, '44');
}

function compareListing(listing, source) {
  const issues = [];
  let score = 100;
  
  // Name comparison
  const authName = AUTHORITATIVE.businessName.toLowerCase().trim();
  const foundName = (listing.name || '').toLowerCase().trim();
  if (foundName && !foundName.includes(authName) && !authName.includes(foundName)) {
    score -= 30;
    issues.push(`Name mismatch: "${listing.name}"`);
  } else if (!foundName) {
    score -= 20;
    issues.push('Name not found');
  }
  
  // Postcode comparison
  const authPostcode = AUTHORITATIVE.postcode;
  const foundPostcode = ((listing.postcode || listing.address || '').toUpperCase() || '')
    .match(/[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}/);
  if (!authPostcode) {
    // no reference postcode
  } else if (foundPostcode && foundPostcode[0].replace(/\s/g, '') !== authPostcode.replace(/\s/g, '')) {
    score -= 35;
    issues.push(`Postcode mismatch: "${foundPostcode[0]}" vs "${authPostcode}"`);
  }
  
  // Phone comparison
  const authPhone = normalizePhone(AUTHORITATIVE.phone);
  const foundPhone = listing.phone ? normalizePhone(listing.phone) : '';
  if (authPhone && foundPhone && foundPhone !== authPhone) {
    score -= 40;
    issues.push(`Phone mismatch: "${listing.phone}"`);
  } else if (authPhone && !foundPhone) {
    score -= 15;
    issues.push('Phone not listed');
  }
  
  return {
    source,
    name: listing.name,
    address: listing.address || '',
    phone: listing.phone || '',
    score: Math.max(0, score),
    issues,
    status: score >= 85 ? '✓ Match' : score >= 50 ? '⚠ Inconsistent' : '✗ Problem',
  };
}

// ===== Google Places =====
async function checkGoogle() {
  if (!GOOGLE_KEY) return { source: 'Google', status: 'no-api-key', note: 'Add GOOGLE_PLACES_API_KEY', listing: null };
  
  // 1. Find place by name
  const findResult = await fetchJson(
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(AUTHORITATIVE.businessName)}&inputtype=textquery&fields=place_id,formatted_address,name&locationbias=ipbias&key=${GOOGLE_KEY}`
  );
  if (findResult.status !== 200 || !findResult.data.candidates || !findResult.data.candidates.length) {
    return { source: 'Google', status: 'not-found', note: 'No place matched in Google', listing: null };
  }
  
  const placeId = findResult.data.candidates[0].place_id;
  // 2. Get details incl. phone
  const details = await fetchJson(
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,international_phone_number&key=${GOOGLE_KEY}`
  );
  const d = details.data.result || {};
  const listing = { name: d.name, address: d.formatted_address, phone: d.formatted_phone_number || d.international_phone_number };
  const result = compareListing(listing, 'Google Business Profile');
  result.note = 'via Google Places API';
  return result;
}

// ===== Yelp =====
async function checkYelp() {
  if (!YELP_KEY) return { source: 'Yelp', status: 'no-api-key', note: 'Add YELP_API_KEY', listing: null };
  
  const searchUrl = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(AUTHORITATIVE.businessName)}&location=${encodeURIComponent(AUTHORITATIVE.postcode)}&limit=1`;
  const result = await fetchJson(searchUrl, { headers: { 'Authorization': `Bearer ${YELP_KEY}` } });
  if (result.status !== 200 || !result.data.businesses || !result.data.businesses.length) {
    return { source: 'Yelp', status: 'not-found', note: 'No Yelp match', listing: null };
  }
  const b = result.data.businesses[0];
  const listing = {
    name: b.name,
    address: [b.location.address1, b.location.postal_code].filter(Boolean).join(', '),
    phone: b.display_phone || b.phone,
    postcode: b.location.postal_code,
  };
  const cmp = compareListing(listing, 'Yelp');
  cmp.note = 'via Yelp Fusion API';
  return cmp;
}

// ===== Brave Search (broad coverage) =====
async function checkBrave() {
  if (!BRAVE_KEY) return { source: 'Web (Brave Search)', status: 'no-api-key', note: 'Add BRAVE_API_KEY for web-wide NAP mentions', listing: null };
  
  const query = `${AUTHORITATIVE.businessName} ${AUTHORITATIVE.postcode}`;
  const result = await fetchJson(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
    { headers: { 'X-Subscription-Token': BRAVE_KEY } }
  );
  if (result.status !== 200 || !result.data.web || !result.data.web.results) {
    return { source: 'Web (Brave Search)', status: 'error', note: 'Search failed', listing: null };
  }
  
  // Collect NAP mentions found across web results (approximate)
  const napMetaphors = result.data.web.results.map(r => r.title + ' ' + (r.description || '')).join(' ');
  const hasInfo = napMetaphors.toLowerCase().includes(AUTHORITATIVE.businessName.toLowerCase());
  return {
    source: 'Web (Brave Search)',
    status: hasInfo ? 'found-mentions' : 'no-clear-mentions',
    note: hasInfo ? 'Business has web presence; manual review of specific directory pages advised' : 'No clear NAP mentions found in top search results',
    listing: null,
  };
}

// ===== Main =====
async function main() {
  console.log('\n==============================================');
  console.log('  NAP INCONSISTENCY CHECKER — v0.2 (API tier)');
  console.log('==============================================\n');
  if (!AUTHORITATIVE.businessName) {
    console.log('Usage: node nap-checker-v2.js "Name" "Address" "Postcode" "Phone"');
    process.exit(1);
  }
  console.log(`Business : ${AUTHORITATIVE.businessName}`);
  console.log(`Address  : ${AUTHORITATIVE.address}`);
  console.log(`Postcode : ${AUTHORITATIVE.postcode}`);
  console.log(`Phone    : ${AUTHORITATIVE.phone || '(not provided)'}`);
  console.log('');
  console.log(`API keys: Google ${GOOGLE_KEY ? '✓' : '✗'} | Yelp ${YELP_KEY ? '✓' : '✗'} | Brave ${BRAVE_KEY ? '✓' : '✗'}`);
  console.log('');

  console.log('Scanning directories...\n');
  
  const results = [];
  const google = await checkGoogle();
  results.push(google);
  const yelp = await checkYelp();
  results.push(yelp);
  const brave = await checkBrave();
  results.push(brave);

  // Print table
  console.log('-------------------------------------------------------------');
  console.log(' Directory           Status');
  console.log('-------------------------------------------------------------');
  for (const r of results) {
    const label = r.status === 'no-api-key' ? 'NO API KEY — skipped' : (r.status || 'checked');
    console.log(` ${r.source.padEnd(24)} ${label}`);
    if (r.listing) {
      console.log(`   └ Name:     ${r.listing.name || '-'}`);
      console.log(`   └ Address:  ${r.listing.address || '-'}`);
      console.log(`   └ Phone:    ${r.listing.phone || '-'}`);
      if (r.issues && r.issues.length) {
        r.issues.forEach(i => console.log(`   └ ⚠ ${i}`));
      }
    }
    if (r.note) console.log(`   └ ${r.note}`);
    console.log('');
  }
  
  console.log('==============================================');
  console.log('  SUMMARY');
  console.log('==============================================');
  const apiConfigured = GOOGLE_KEY || YELP_KEY;
  if (!apiConfigured) {
    console.log('\n⚠  No API keys configured — running in DEMO mode.');
    console.log('To enable live NAP checking from Google + Yelp, set:');
    console.log('  export GOOGLE_PLACES_API_KEY=your_key_here');
    console.log('  export YELP_API_KEY=your_key_here');
    console.log('  export BRAVE_API_KEY=your_key_here');
    console.log('');
    console.log('Get free-tier keys at:');
    console.log('  Google Places:  https://developers.google.com/maps')
    console.log('  Yelp Fusion:    https://www.yelp.com/developers')
    console.log('  Brave Search:   https://brave.com/search/api/');
  }
}

main().catch(e => console.error('Error:', e.message));