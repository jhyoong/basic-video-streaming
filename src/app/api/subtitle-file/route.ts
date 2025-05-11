// src/app/api/subtitle-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolveRequestedPath, isPathAllowed, isWithinMaxDepth } from '../../../lib/config/paths';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedPath = searchParams.get('path');

    if (!requestedPath) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      );
    }

    // Resolve and validate the path
    const resolvedPath = resolveRequestedPath(requestedPath);
    
    if (!isPathAllowed(resolvedPath)) {
      return NextResponse.json(
        { error: 'Access denied: Path not in allowed base paths' },
        { status: 403 }
      );
    }
    
    if (!isWithinMaxDepth(resolvedPath)) {
      return NextResponse.json(
        { error: 'Access denied: Path exceeds maximum allowed depth' },
        { status: 403 }
      );
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: 'Subtitle file not found' },
        { status: 404 }
      );
    }

    // Check if it's actually a subtitle file
    const extension = path.extname(resolvedPath).toLowerCase();
    const subtitleExtensions = ['.vtt', '.srt', '.ass', '.ssa'];
    
    if (!subtitleExtensions.includes(extension)) {
      return NextResponse.json(
        { error: 'File is not a supported subtitle format' },
        { status: 400 }
      );
    }

    // Check if it's actually a file
    const stats = fs.statSync(resolvedPath);
    if (!stats.isFile()) {
      return NextResponse.json(
        { error: 'Path is not a file' },
        { status: 400 }
      );
    }

    // Read the subtitle file
    const subtitleContent = fs.readFileSync(resolvedPath, 'utf-8');

    // Set appropriate headers
    const headers = new Headers({
      'Content-Type': getContentType(extension),
      'Content-Length': Buffer.byteLength(subtitleContent, 'utf-8').toString(),
      'Cache-Control': 'public, max-age=3600',
    });

    // Return the subtitle content
    return new NextResponse(subtitleContent, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Subtitle file serving error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to get content type based on file extension
function getContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    '.vtt': 'text/vtt',
    '.srt': 'text/srt',
    '.ass': 'text/x-ssa',
    '.ssa': 'text/x-ssa',
  };

  return contentTypes[extension.toLowerCase()] || 'text/plain';
}