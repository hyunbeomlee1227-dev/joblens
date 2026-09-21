export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      service: "joblens",
      version: process.env.DEPLOYMENT_VERSION ?? "local",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
