import { createClient } from "@supabase/supabase-js";

const signedUrlExpirySeconds = 300;

function getSupabaseStorageClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase storage environment variables are not configured.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });
}

export function getPdfStoragePath(organizationId: string, type: "invoice" | "quote", id: string) {
  return `orgs/${organizationId}/pdfs/${type}-${id}.pdf`;
}

export async function uploadPdfAndCreateSignedUrl(storageKey: string, pdfBuffer: Buffer) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "tradetrack";
  const supabase = getSupabaseStorageClient();
  const upload = await supabase.storage.from(bucket).upload(storageKey, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true
  });

  if (upload.error) {
    throw upload.error;
  }

  const signedUrl = await supabase.storage
    .from(bucket)
    .createSignedUrl(storageKey, signedUrlExpirySeconds);

  if (signedUrl.error) {
    throw signedUrl.error;
  }

  return {
    expiresIn: signedUrlExpirySeconds,
    storageKey,
    url: signedUrl.data.signedUrl
  };
}
