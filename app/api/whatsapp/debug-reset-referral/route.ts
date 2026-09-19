// Endpoint temporal de un solo uso — resetea el flag "ya le compartimos su link de
// referido" (hasSharedReferralLink) para un número, así se puede volver a ver el mensaje
// en una prueba real sin esperar 365 días. Protegido con LINK_SECRET (ya existente) para
// que no sea un endpoint público abierto. Se borra después de usarse.
import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";
import { hashPhone } from "@/lib/wa-identity";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const wa     = searchParams.get("wa") ?? "";
  const secret = searchParams.get("secret") ?? "";

  if (!process.env.LINK_SECRET || secret !== process.env.LINK_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!wa) return NextResponse.json({ error: "missing wa" }, { status: 400 });

  const key = `wa:referralshared:${hashPhone(wa)}`;
  const redis = await getRedis();
  const existed = await redis.del(key);
  return NextResponse.json({ ok: true, key, existed: existed > 0 });
}
