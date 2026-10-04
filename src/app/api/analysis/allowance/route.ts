import { getAnalysisBff } from "@/features/analysis/analysis-runtime";

export async function GET(request: Request) {
  return (await getAnalysisBff()).allowance(request);
}
