import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { nanoid } from 'nanoid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const bucketName = process.env.AWS_S3_BUCKET_NAME!;

export async function uploadFile(
  file: Buffer,
  folder: string,
  fileName: string,
  contentType: string
) {
  const key = `${folder}/${nanoid()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return {
    key,
    url: `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
  };
}

export async function getSignedUrlForUpload(folder: string, fileName: string, contentType: string) {
  const key = `${folder}/${nanoid()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  return { url, key };
}

export async function getSignedUrlForDownload(key: string) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

export async function deleteFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
}

export async function uploadViolationPhoto(file: Buffer, fileName: string) {
  return uploadFile(file, 'violations', fileName, 'image/jpeg');
}

export async function uploadRoutePhoto(file: Buffer, fileName: string) {
  return uploadFile(file, 'routes', fileName, 'image/jpeg');
}

export async function uploadLockBoxPhoto(file: Buffer, fileName: string) {
  return uploadFile(file, 'properties/lockbox', fileName, 'image/jpeg');
}
