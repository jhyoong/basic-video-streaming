// src/app/api/video-subtitles/[...path]/route.ts
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';

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
  
  try {
    // Only process MKV files
    const fileName = pathSegments[pathSegments.length - 1];
    if (!fileName.toLowerCase().endsWith('.mkv')) {
      return NextResponse.json({ subtitles: [] });
    }
    
    // Construct the path based on the number of segments
    const relativePathSegments = ['public', 'videos', ...pathSegments];
    const videoPath = join(process.cwd(), ...relativePathSegments);
    
    // Check if file exists
    if (!existsSync(videoPath)) {
      return NextResponse.json(
        { error: "Video file not found" },
        { status: 404 }
      );
    }
    
    // Check for extracted subtitles in the cache directory
    const cacheDir = join(process.cwd(), 'public', 'cache', 'subtitles');
    const videoSubDir = join(cacheDir, ...pathSegments.slice(0, -1));
    const videoFileBaseName = fileName.substring(0, fileName.lastIndexOf('.'));
    
    // If no extracted subtitles exist yet, return empty array
    if (!existsSync(videoSubDir)) {
      return NextResponse.json({ subtitles: [] });
    }
    
    // Look for extracted subtitle files that match this video
    const subtitleFiles = readdirSync(videoSubDir)
      .filter(file => file.startsWith(videoFileBaseName) && file.endsWith('.vtt'));
    
    if (subtitleFiles.length === 0) {
      return NextResponse.json({ subtitles: [] });
    }
    
    // Parse out the info from the filenames
    const subtitles = subtitleFiles.map((file, idx) => {
      // Extract language and track index from filename
      // Format: videoname-language-trackindex.vtt
      const parts = file.split('-');
      const trackIndex = parseInt(parts[parts.length - 1].split('.')[0], 10) || idx;
      const language = parts[parts.length - 2] || 'unknown';
      
      return {
        index: trackIndex,
        language: language,
        label: `Subtitle ${trackIndex} (${language})`,
        url: `/cache/subtitles/${pathSegments.slice(0, -1).join('/')}/${file}`
      };
    });
    
    return NextResponse.json({ subtitles });
    
  } catch (error) {
    console.error(`Error processing video subtitles for ${pathSegments.join('/')}:`, error);
    return NextResponse.json(
      { error: `Failed to process video subtitles` },
      { status: 500 }
    );
  }
}