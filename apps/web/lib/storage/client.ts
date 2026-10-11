import "server-only";
import {
    DeleteObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** The private bucket for source files (TECH-STACK section 10). */
export const UPLOADS_BUCKET = "uploads";

let client: S3Client | undefined;

/**
 * The one client for Neon Object Storage, created on first use so importing
 * this module never needs the storage env vars. The access keys come from
 * `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`, which the SDK reads itself.
 */
function getStorage() {
    if (client) return client;
    const endpoint = process.env["AWS_ENDPOINT_URL_S3"];
    const region = process.env["AWS_REGION"];
    if (!endpoint || !region) {
        throw new Error(
            "Object storage is not configured. Set AWS_ENDPOINT_URL_S3 and AWS_REGION in the repo-root .env.local.",
        );
    }
    client = new S3Client({
        endpoint,
        region,
        forcePathStyle: true,
        // Without these the presigner signs a checksum of an empty body, and
        // every browser PUT is rejected.
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
    });
    return client;
}

/**
 * A URL the browser can PUT one object to. `Content-Type` and
 * `Content-Length` are signed, so the PUT must carry exactly these values:
 * the declared size is the size that gets stored.
 */
export async function presignUpload({
    bucket,
    key,
    contentType,
    contentLength,
    expiresIn,
}: {
    bucket: string;
    key: string;
    contentType: string;
    contentLength: number;
    /** Seconds. */
    expiresIn: number;
}) {
    const url = await getSignedUrl(
        getStorage(),
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: contentType,
            ContentLength: contentLength,
        }),
        {
            expiresIn,
            signableHeaders: new Set(["content-type", "content-length"]),
        },
    );
    // The browser sets `Content-Length` itself, from the body.
    return { url, headers: { "Content-Type": contentType } };
}

function isMissing(error: unknown) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })
        ?.$metadata?.httpStatusCode;
    const name = (error as { name?: string })?.name;
    return status === 404 || name === "NotFound" || name === "NoSuchKey";
}

/** The stored object's size and type, or `null` when there is no object. */
export async function headObject({
    bucket,
    key,
}: {
    bucket: string;
    key: string;
}): Promise<{ size: number; contentType: string | null } | null> {
    try {
        const object = await getStorage().send(
            new HeadObjectCommand({ Bucket: bucket, Key: key }),
        );
        return {
            size: object.ContentLength ?? 0,
            contentType: object.ContentType ?? null,
        };
    } catch (error) {
        if (isMissing(error)) return null;
        throw error;
    }
}

/** Deletes an object. Deleting one that is not there succeeds. */
export async function deleteObject({
    bucket,
    key,
}: {
    bucket: string;
    key: string;
}) {
    await getStorage().send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
}
