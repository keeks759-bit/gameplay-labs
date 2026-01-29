import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CloudflareDirectUploadResponse {
  success: boolean;
  result: {
    uploadURL: string;
    uid: string;
  };
  errors?: Array<{ code: number; message: string }>;
}

export async function POST(request: NextRequest) {
  // Validate method
  if (request.method !== 'POST') {
    return NextResponse.json(
      { ok: false, error: 'Method not allowed' },
      { status: 405 }
    );
  }

  // Read environment variables
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;

  if (!accountId || !apiToken) {
    return NextResponse.json(
      { ok: false, error: 'Missing Cloudflare env vars' },
      { status: 500 }
    );
  }

  try {
    // Call Cloudflare Stream API to create direct upload
    const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`;
    
    const response = await fetch(cloudflareUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxDurationSeconds: 600,
        requireSignedURLs: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[STREAM_DIRECT_UPLOAD] Cloudflare API error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText.slice(0, 200),
      });
      return NextResponse.json(
        { ok: false, error: 'Cloudflare direct upload failed' },
        { status: 500 }
      );
    }

    const data: CloudflareDirectUploadResponse = await response.json();

    if (!data.success || !data.result?.uploadURL || !data.result?.uid) {
      console.error('[STREAM_DIRECT_UPLOAD] Invalid Cloudflare response:', {
        success: data.success,
        hasResult: !!data.result,
        errors: data.errors,
      });
      return NextResponse.json(
        { ok: false, error: 'Cloudflare direct upload failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      uid: data.result.uid,
      uploadURL: data.result.uploadURL,
    });
  } catch (error) {
    console.error('[STREAM_DIRECT_UPLOAD] Unexpected error:', error);
    return NextResponse.json(
      { ok: false, error: 'Cloudflare direct upload failed' },
      { status: 500 }
    );
  }
}
