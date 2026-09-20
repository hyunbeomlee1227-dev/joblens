// One invocation makes one Jooble API request. The free key has a lifetime quota.
const apiKey = process.env.JOOBLE_API_KEY?.trim();

if (!apiKey) {
  console.error('Set JOOBLE_API_KEY in the process environment first.');
  process.exitCode = 2;
} else {
  const keywords = process.argv[2] ?? '사무';
  const location = process.argv[3] ?? '대한민국';

  try {
    const response = await fetch(
      `https://kr.jooble.org/api/${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ keywords, location, page: 1, ResultOnPage: 3 }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!response.ok) {
      throw new Error(`Jooble returned HTTP ${response.status}`);
    }

    const result = await response.json();
    if (!Number.isInteger(result.totalCount) || !Array.isArray(result.jobs)) {
      throw new Error('Jooble response did not contain the expected fields.');
    }

    console.log(JSON.stringify({
      keywords,
      location,
      totalCount: result.totalCount,
      returned: result.jobs.length,
      examples: result.jobs.map(({ title, company, location: jobLocation, updated }) => ({
        title,
        company,
        location: jobLocation,
        updated,
      })),
    }, null, 2));
  } catch (error) {
    // Never log the request URL or raw error: the API key is in the URL path.
    console.error(error instanceof Error && error.message.startsWith('Jooble returned')
      ? error.message
      : 'Jooble verification failed; check network access and response format.');
    process.exitCode = 1;
  }
}
