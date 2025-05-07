// src/app/api/folder-has-videos/[folder]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFolderInfo, VideoSource } from '@/lib/videoSourceService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folder: string }> }
) {
  const searchParams = request.nextUrl.searchParams;
  const source: VideoSource = searchParams.get('source') === 'external' 
    ? 'external' 
    : 'internal';
  
  const folder = (await params).folder;
  
  try {
    const folderInfo = getFolderInfo(source, folder);
    
    if (!folderInfo) {
      return NextResponse.json(
        { error: `Failed to get info for folder ${folder}` },
        { status: 500 }
      );
    }
    
    return NextResponse.json(folderInfo);
  } catch (error) {
    console.error(`Error checking videos in folder ${folder}:`, error);
    return NextResponse.json(
      { error: `Failed to check videos in folder ${folder}` },
      { status: 500 }
    );
  }
}