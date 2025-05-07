// src/app/api/videos/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getVideos, streamVideo, VideoSource } from '@/lib/videoSourceService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const searchParams = request.nextUrl.searchParams;
  const source: VideoSource = searchParams.get('source') === 'external' 
    ? 'external' 
    : 'internal';
    
  const pathSegments = (await params).path;
  
  if (!pathSegments || pathSegments.length === 0) {
    return NextResponse.json(
      { error: "Invalid path" },
      { status: 400 }
    );
  }
  
  // Check if this is a streaming request (has a file extension)
  const lastSegment = pathSegments[pathSegments.length - 1];
  const isFile = /\.\w+$/.test(lastSegment);
  
  if (isFile) {
    // Stream the video file
    return streamVideo(request, source, pathSegments);
  } else {
    // List videos in the directory
    try {
      const videos = getVideos(source, pathSegments);
      return NextResponse.json(videos);
    } catch (error) {
      console.error(`Error reading videos from path ${pathSegments.join('/')}:`, error);
      return NextResponse.json(
        { error: `Failed to read videos from path ${pathSegments.join('/')}` },
        { status: 500 }
      );
    }
  }
}