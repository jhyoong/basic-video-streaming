// src/app/api/subfolders/[folder]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSubfolders, VideoSource } from '@/lib/videoSourceService';

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
    const subfolders = getSubfolders(source, folder);
    return NextResponse.json(subfolders);
  } catch (error) {
    console.error(`Error reading subfolders from ${folder}:`, error);
    return NextResponse.json(
      { error: `Failed to read subfolders from ${folder}` },
      { status: 500 }
    );
  }
}