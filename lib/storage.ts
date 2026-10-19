import { S3Client } from '@aws-sdk/client-s3'

const requiredStorageEnv = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION,
}

if (Object.values(requiredStorageEnv).some((value) => !value)) {
  throw new Error('Neon Object Storage environment variables are not configured')
}

export const storageBucket = 'assets'

export const storage = new S3Client({
  forcePathStyle: true,
  credentials: {
    accessKeyId: requiredStorageEnv.accessKeyId!,
    secretAccessKey: requiredStorageEnv.secretAccessKey!,
  },
  endpoint: requiredStorageEnv.endpoint,
  region: requiredStorageEnv.region,
})
