// Endpoint temporal de un solo uso — borra TODOS los punteros guardados en Redis para un
// número de prueba (correo vinculado, última orden, flag de link de referido ya
// compartido, código de referido pendiente, sesión activa) para poder probar el flujo
// completo como si fuera un usuario 100% nuevo. Protegido con LINK_SECRET (ya existente)
// para que no sea un endpoint público abierto. Se borra después de usarse.
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

  const hash = hashPhone(wa);
  const keys = [
    `wa:id2email:${hash}`,
    `wa:lastorder:${hash}`,
    `wa:referralshared:${hash}`,
    `wa:pendingref:${hash}`,
    `wa:session:${hash}`,
    `wa:awaitingemail:${hash}`,
  ];
  const redis = await getRedis();
  const results: Record<string, boolean> = {};
  for (const key of keys) {
    results[key] = (await redis.del(key)) > 0;
  }
  return NextResponse.json({ ok: true, cleared: results });
}
