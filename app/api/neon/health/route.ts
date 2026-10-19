import { ListObjectsV2Command } from '@aws-sdk/client-s3'
import { sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { storage, storageBucket } from '@/lib/storage'

export async function GET() {
  try {
    const databaseResult = await db.execute(sql`select 1 as ok`)
    const storageResult = await storage.send(
      new ListObjectsV2Command({
        Bucket: storageBucket,
        MaxKeys: 1,
      }),
    )

    return NextResponse.json({
      database: databaseResult.rows[0]?.ok === 1 ? 'ok' : 'unexpected response',
      objectStorage: storageResult.$metadata.httpStatusCode === 200 ? 'ok' : 'unexpected response',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Neon error'

    return NextResponse.json({ error: message }, { status: 503 })
  }
}

