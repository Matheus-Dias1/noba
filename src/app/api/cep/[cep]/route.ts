import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/auth";

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

/** GET /api/cep/:cep — authenticated ViaCEP proxy for unit address autocomplete. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ cep: string }> },
) {
  const guard = await requireSession();
  if (!guard.ok) return guard.response;

  const { cep: rawCep } = await params;
  const cep = rawCep.replace(/\D/g, "");
  if (cep.length !== 8) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`ViaCEP returned ${response.status}`);

    const address = (await response.json()) as ViaCepResponse;
    if (address.erro) {
      return NextResponse.json({ error: "CEP_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      street: address.logradouro ?? "",
      neighborhood: address.bairro ?? "",
      city: address.localidade ?? "",
      state: address.uf ?? "",
    });
  } catch (error) {
    console.log("UNEXPECTED ERROR (cep/:cep GET):", error);
    return NextResponse.json({ error: "CEP_LOOKUP_FAILED" }, { status: 502 });
  }
}
