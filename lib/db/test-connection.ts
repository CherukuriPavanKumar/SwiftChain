import { config } from 'dotenv'

config({ path: '.env.local' })

async function main() {
  const { db } = await import('./client')
  const { transfers } = await import('./schema')

  const result = await db.select().from(transfers).limit(1)

  console.log('Database connected successfully! Sample query result:', result)
}

main().catch((error) => {
  console.error('Database test failed:', error)
  process.exitCode = 1
})
