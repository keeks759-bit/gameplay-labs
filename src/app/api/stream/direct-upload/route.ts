import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CloudflareDirectUploadResponse {
  success: boolean;
  result: {
    uploadURL: string;
    uid: string;
  };
  errors?: Array<{ code: number; message: string }>;
}

export async function POST(request: NextRequest) {
  // Generate request ID for tracing
  const requestId = randomUUID();
  const timestamp = new Date().toISOString();
  const pathname = request.nextUrl.pathname;

  // Log request start
  console.log('[STREAM_DIRECT_UPLOAD] Request started', {
    requestId,
    timestamp,
    method: request.method,
    pathname,
    runtime: 'nodejs',
    dynamic: 'force-dynamic',
  });

  // Validate method
  if (request.method !== 'POST') {
    console.warn('[STREAM_DIRECT_UPLOAD] Method not allowed', {
      requestId,
      method: request.method,
    });
    return NextResponse.json(
      { ok: false, error: 'Failed to create upload session' },
      {
        status: 405,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }

  // Read environment variables
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  const hasAccountId = !!accountId;
  const hasApiToken = !!apiToken;

  // Log env var presence (boolean only, never values)
  console.log('[STREAM_DIRECT_UPLOAD] Environment check', {
    requestId,
    hasAccountId,
    hasApiToken,
  });

  if (!accountId || !apiToken) {
    console.error('[STREAM_DIRECT_UPLOAD] Missing environment variables', {
      requestId,
      hasAccountId,
      hasApiToken,
    });
    return NextResponse.json(
      { ok: false, error: 'Failed to create upload session' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }

  try {
    // Call Cloudflare Stream API to create direct upload
    const cloudflareUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/direct_upload`;
    
    console.log('[STREAM_DIRECT_UPLOAD] Calling Cloudflare API', {
      requestId,
      cloudflareUrl: 'https://api.cloudflare.com/client/v4/accounts/***/stream/direct_upload',
    });
    
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

    const responseStatus = response.status;
    const responseStatusText = response.statusText;

    // Log Cloudflare API response status
    console.log('[STREAM_DIRECT_UPLOAD] Cloudflare API response', {
      requestId,
      status: responseStatus,
      statusText: responseStatusText,
      ok: response.ok,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const truncatedBody = errorText.slice(0, 500);
      
      console.error('[STREAM_DIRECT_UPLOAD] Cloudflare API error', {
        requestId,
        status: responseStatus,
        statusText: responseStatusText,
        body: truncatedBody,
        bodyLength: errorText.length,
      });
      
      return NextResponse.json(
        { ok: false, error: 'Failed to create upload session' },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      );
    }

    const responseBody = await response.text().catch(() => '');
    const truncatedResponseBody = responseBody.slice(0, 500);
    
    let data: CloudflareDirectUploadResponse | null = null;
    try {
      data = JSON.parse(responseBody) as CloudflareDirectUploadResponse;
    } catch (parseError) {
      console.error('[STREAM_DIRECT_UPLOAD] JSON parse error', {
        requestId,
        parseError: parseError instanceof Error ? parseError.message : String(parseError),
        responseBody: truncatedResponseBody,
        responseBodyLength: responseBody.length,
      });
      return NextResponse.json(
        { ok: false, error: 'Failed to create upload session' },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      );
    }

    if (!data || !data.success || !data.result?.uploadURL || !data.result?.uid) {
      console.error('[STREAM_DIRECT_UPLOAD] Invalid Cloudflare response', {
        requestId,
        success: data?.success ?? null,
        hasResult: !!data?.result,
        hasUploadURL: !!data?.result?.uploadURL,
        hasUid: !!data?.result?.uid,
        errors: data?.errors,
        responseBody: truncatedResponseBody,
      });
      
      return NextResponse.json(
        { ok: false, error: 'Failed to create upload session' },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
        }
      );
    }

    // Log success
    console.log('[STREAM_DIRECT_UPLOAD] Success', {
      requestId,
      hasUid: !!data.result.uid,
      hasUploadURL: !!data.result.uploadURL,
      uidLength: data.result.uid?.length ?? 0,
      uploadURLLength: data.result.uploadURL?.length ?? 0,
    });

    return NextResponse.json(
      {
        ok: true,
        uid: data.result.uid,
        uploadURL: data.result.uploadURL,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('[STREAM_DIRECT_UPLOAD] Unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      errorStack: error instanceof Error ? error.stack?.slice(0, 500) : undefined,
    });
    
    return NextResponse.json(
      { ok: false, error: 'Failed to create upload session' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}
