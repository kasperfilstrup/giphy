import { NextRequest } from "next/server";
import { searchGifs } from "@/lib/giphy";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q")?.trim() ?? "";
  const offsetParam = searchParams.get("offset");

  if (!query) {
    return Response.json(
      { error: "Missing required query parameter `q`." },
      { status: 400 }
    );
  }

  const offset = offsetParam ? Number(offsetParam) : 0;
  if (!Number.isFinite(offset) || offset < 0) {
    return Response.json(
      { error: "`offset` must be a non-negative number." },
      { status: 400 }
    );
  }

  try {
    const result = await searchGifs({ query, offset });
    return Response.json(result);
  } catch (error) {
    console.error("[/api/search] Giphy request failed", error);
    return Response.json(
      { error: "Upstream search failed. Please try again." },
      { status: 502 }
    );
  }
}

