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
  const all    = searchParams.get("all") === "1";
  const secret = searchParams.get("secret") ?? "";

  if (!process.env.LINK_SECRET || secret !== process.env.LINK_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const redis = await getRedis();

  // Reseteo completo — cutover a Bridge producción: borra CUALQUIER puntero wa:* (todos los
  // correos/teléfonos vinculados de las pruebas de esta noche), sin importar el número.
  // Este endpoint se borra del código justo después de usarse una vez.
  if (all) {
    let cursor = "0";
    const deleted: string[] = [];
    do {
      const res = await redis.scan(cursor, { MATCH: "wa:*", COUNT: 200 });
      cursor = res.cursor;
      if (res.keys.length) {
        await redis.del(res.keys);
        deleted.push(...res.keys);
      }
    } while (cursor !== "0");
    return NextResponse.json({ ok: true, cleared_count: deleted.length });
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
  const results: Record<string, boolean> = {};
  for (const key of keys) {
    results[key] = (await redis.del(key)) > 0;
  }
  return NextResponse.json({ ok: true, cleared: results });
}
