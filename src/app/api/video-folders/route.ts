// src/app/api/video-folders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getVideoFolders, VideoSource } from '@/lib/videoSourceService';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const source: VideoSource = searchParams.get('source') === 'external' 
    ? 'external' 
    : 'internal';
  
  try {
    const folders = getVideoFolders(source);
    return NextResponse.json(folders);
  } catch (error) {
    console.error(`Error reading ${source} video folders:`, error);
    return NextResponse.json(
      { error: `Failed to read ${source} video folders` },
      { status: 500 }
    );
  }
}