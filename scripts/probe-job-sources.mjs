// Read-only connectivity probe. It does not store or publish job data.
// Remotive recommends at most four requests/day; Himalayas refreshes daily.
// If JOOBLE_API_KEY is set, each run also consumes one of its limited API calls.
// SEOUL_OPEN_API_KEY enables a six-row check; without it, Seoul uses the five-row sample key.
// Seoul's published API endpoint uses HTTP, so do not run the authenticated check on an untrusted network.
const timeoutMs = 15_000;

async function getJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

const sourceProbes = [
  {
    name: 'Seoul Open Data - job postings',
    url: 'http://openapi.seoul.go.kr:8088/{key}/json/recMntList/1/{end}/',
    run: async () => {
      const key = process.env.SEOUL_OPEN_API_KEY?.trim() || 'sample';
      const end = key === 'sample' ? 5 : 6;
      const data = await getJson(`http://openapi.seoul.go.kr:8088/${encodeURIComponent(key)}/json/recMntList/1/${end}/`);
      const listing = data.recMntList;
      if (listing?.RESULT?.CODE !== 'INFO-000' || !Array.isArray(listing.row)) {
        throw new Error('Unexpected response');
      }
      return {
        mode: key === 'sample' ? 'sample' : 'authenticated',
        fetched: listing.row.length,
        reportedTotal: listing.list_total_count ?? null,
        fields: Object.keys(listing.row[0] ?? {}),
      };
    },
  },
  {
    name: 'Himalayas',
    url: 'https://himalayas.app/jobs/api/search?country=KR&sort=recent&page=1',
    run: async () => {
      const data = await getJson('https://himalayas.app/jobs/api/search?country=KR&sort=recent&page=1');
      if (!Array.isArray(data.jobs)) throw new Error('Unexpected response');
      return {
        fetched: data.jobs.length,
        reportedTotal: data.totalCount ?? null,
        koreaEligibleBySourceFilter: data.jobs.length,
      };
    },
  },
  {
    name: 'Remotive',
    url: 'https://remotive.com/api/remote-jobs?limit=100',
    run: async () => {
      const data = await getJson('https://remotive.com/api/remote-jobs?limit=100');
      if (!Array.isArray(data.jobs)) throw new Error('Unexpected response');
      return {
        fetched: data.jobs.length,
        worldwide: data.jobs.filter((job) => /worldwide/i.test(job.candidate_required_location ?? '')).length,
        koreaMention: data.jobs.filter((job) => /korea|대한민국|한국/i.test(job.candidate_required_location ?? '')).length,
      };
    },
  },
  {
    name: 'Remote OK',
    url: 'https://remoteok.com/api',
    run: async () => {
      const data = await getJson('https://remoteok.com/api');
      if (!Array.isArray(data)) throw new Error('Unexpected response');
      const jobs = data.filter((job) => job && typeof job === 'object' && job.id);
      return {
        fetched: jobs.length,
        worldwide: jobs.filter((job) => /worldwide/i.test(job.location ?? '')).length,
        koreaMention: jobs.filter((job) => /korea|대한민국|한국/i.test(job.location ?? '')).length,
        unspecifiedLocation: jobs.filter((job) => !job.location).length,
      };
    },
  },
];

const joobleKey = process.env.JOOBLE_API_KEY?.trim();
if (joobleKey) {
  sourceProbes.push({
    name: 'Jooble Korea',
    url: 'https://kr.jooble.org/api/{key}',
    run: async () => {
      const data = await getJson(`https://kr.jooble.org/api/${encodeURIComponent(joobleKey)}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ keywords: '사무', location: '대한민국', page: 1, ResultOnPage: 3 }),
      });
      if (!Array.isArray(data.jobs)) throw new Error('Unexpected response');
      return { fetched: data.jobs.length, reportedTotal: data.totalCount ?? null };
    },
  });
}

const selectedSource = process.argv.find((arg) => arg.startsWith('--source='))?.slice('--source='.length);
const probes = selectedSource
  ? sourceProbes.filter(({ name }) => name.toLowerCase().includes(selectedSource.toLowerCase()))
  : sourceProbes;
if (probes.length === 0) throw new Error(`No source matches: ${selectedSource}`);

const results = await Promise.all(probes.map(async ({ name, url, run }) => {
  try {
    return { name, url, ok: true, ...(await run()) };
  } catch (error) {
    // In particular, never print a URL containing the Jooble key.
    const message = error instanceof Error && /^HTTP \d+$/.test(error.message)
      ? error.message
      : 'Connection or response validation failed';
    return { name, url, ok: false, error: message };
  }
}));

console.log(JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
if (results.some((result) => !result.ok)) process.exitCode = 1;
