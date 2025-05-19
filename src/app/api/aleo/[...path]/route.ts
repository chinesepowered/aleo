import { NextRequest, NextResponse } from 'next/server';

const ALEO_API_TARGET_BASE_URL = 'https://api.explorer.provable.com/v1';

async function handler(request: NextRequest, context: { params: Promise<{ path?: string[] | undefined }> }) {
  const resolvedParams = await context.params; // Await the params object
  const pathSegments = resolvedParams.path || []; 

  const targetPath = pathSegments.join('/');
  
  const queryString = request.nextUrl.search; // Gets the full query string like "?foo=bar"
  const targetUrl = `${ALEO_API_TARGET_BASE_URL}/${targetPath}${queryString}`;

  console.log(`[API Proxy] Method: ${request.method}, Forwarding to: ${targetUrl}`);

  let requestBody;
  if (request.method === 'POST' || request.method === 'PUT') {
    try {
      // Check if request has a body before trying to parse it
      if (request.headers.get('content-length') !== '0') {
        requestBody = await request.json();
      } else {
        requestBody = null;
      }
    } catch (e) {
      // If parsing as JSON fails, you might want to try request.text() or leave body as undefined
      console.warn('[API Proxy] Could not parse request body as JSON:', e);
      requestBody = null;
    }
  }

  try {
    const aleoResponse = await fetch(targetUrl, {
      method: request.method,
      headers: {
        // Forward essential headers. Be careful not to leak sensitive client headers.
        'Content-Type': request.headers.get('Content-Type') || 'application/json',
        'Accept': request.headers.get('Accept') || 'application/json',
        // Add other headers if the Aleo API expects them (e.g., API keys if they were client-side)
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined,
      //cache: 'no-store', // Uncomment if you need to bypass Next.js server-side caching for these API calls
    });

    // Create a new Headers object for the response to avoid issues with immutable headers
    const responseHeaders = new Headers();
    aleoResponse.headers.forEach((value, key) => {
      // Certain headers like 'content-encoding' or 'transfer-encoding' can cause issues
      // if the body is transformed or not streamed correctly. Often best to let Next/Vercel handle these.
      if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'transfer-encoding') {
        responseHeaders.set(key, value);
      }
    });
    
    // Ensure correct Content-Type for errors
    if (!aleoResponse.ok) {
      const errorBody = await aleoResponse.text();
      console.error(`[API Proxy] Aleo API Error (${aleoResponse.status} ${aleoResponse.statusText}) for ${targetUrl}: ${errorBody}`);
      // If error is JSON, keep it JSON, otherwise text
      let errorContentType = 'text/plain';
      try {
        JSON.parse(errorBody);
        errorContentType = 'application/json';
      } catch (e) { /* not json */ }
      responseHeaders.set('Content-Type', errorContentType);
      return new NextResponse(errorBody, {
        status: aleoResponse.status,
        statusText: aleoResponse.statusText,
        headers: responseHeaders,
      });
    }
    
    return new NextResponse(aleoResponse.body, {
      status: aleoResponse.status,
      statusText: aleoResponse.statusText,
      headers: responseHeaders, 
    });

  } catch (error: any) {
    console.error(`[API Proxy] Internal Error for ${request.method} ${targetUrl}:`, error);
    return new NextResponse(JSON.stringify({ error: 'Internal proxy error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export { handler as GET, handler as POST, handler as PUT, handler as DELETE, handler as PATCH }; 