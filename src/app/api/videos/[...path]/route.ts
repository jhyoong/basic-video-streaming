// src/app/api/videos/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { createReadStream, statSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const pathSegments = (await params).path;
  
  if (!pathSegments || pathSegments.length === 0) {
    return NextResponse.json(
      { error: "Invalid path" },
      { status: 400 }
    );
  }
  
  // Check if this is a filesystem path (starts with 'filesystem')
  if (pathSegments[0] === 'filesystem') {
    // Remove 'filesystem' prefix and handle as filesystem path
    const filesystemPath = pathSegments.slice(1);
    
    if (filesystemPath.length === 0) {
      return NextResponse.json(
        { error: "Invalid filesystem path" },
        { status: 400 }
      );
    }
    
    // Stream the video file from filesystem
    return streamVideoFromFilesystem(request, filesystemPath);
  }
  
  // If we get here, it's not a valid format for this API
  return NextResponse.json(
    { error: "Invalid video path format. Use /api/videos/filesystem/[...path] for filesystem videos." },
    { status: 400 }
  );
}

// Function to stream video files from filesystem
async function streamVideoFromFilesystem(
  request: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  try {
    // Reconstruct the filesystem path
    const fullPath = '/' + pathSegments.map(segment => decodeURIComponent(segment)).join('/');
    
    console.log('Streaming file from filesystem:', fullPath);
    
    // Check if file exists and get stats
    let stats;
    try {
      stats = statSync(fullPath);
      if (!stats.isFile()) {
        return NextResponse.json(
          { error: 'Path is not a file' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('File not found:', fullPath, error);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // Determine content type
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.mp4':
        contentType = 'video/mp4';
        break;
      case '.webm':
        contentType = 'video/webm';
        break;
      case '.mov':
        contentType = 'video/quicktime';
        break;
      case '.avi':
        contentType = 'video/x-msvideo';
        break;
      case '.mkv':
        contentType = 'video/x-matroska';
        break;
      case '.wmv':
        contentType = 'video/x-ms-wmv';
        break;
      case '.flv':
        contentType = 'video/x-flv';
        break;
    }
    
    // Get the range header to support seeking in videos
    const range = request.headers.get('range');
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunkSize = (end - start) + 1;
      
      const headers = {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': contentType,
      };
      
      // Create a stream for the file chunk
      const stream = createReadStream(fullPath, { start, end });
      
      // Return the stream with appropriate headers
      return new NextResponse(stream as any, {
        status: 206,
        headers,
      });
    } else {
      // Return the whole file if no range is specified
      const headers = {
        'Content-Length': stats.size.toString(),
        'Content-Type': contentType,
      };
      
      const stream = createReadStream(fullPath);
      
      return new NextResponse(stream as any, {
        status: 200,
        headers,
      });
    }
  } catch (error) {
    console.error('Error streaming filesystem video:', error);
    return NextResponse.json(
      { error: 'Failed to stream video' },
      { status: 500 }
    );
  }
}