import { getAnalysisBff } from "@/features/analysis/analysis-runtime";

export async function POST(request: Request) {
  return (await getAnalysisBff()).start(request);
}
