// src/app/api/video-subtitles/[...path]/route.ts
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  console.log('Received video-subtitles request');
  
  try {
    const pathSegments = (await params).path;
    console.log('Path segments:', pathSegments);
    
    if (!pathSegments || pathSegments.length === 0) {
      console.error('Invalid path - no segments');
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 400 }
      );
    }
    
    // Check if this is an external source
    const source = request.nextUrl.searchParams.get('source') || 'internal';
    console.log('Source type:', source);
    
    // Only process MKV files
    const fileName = pathSegments[pathSegments.length - 1];
    console.log('Looking for subtitles for file:', fileName);
    
    if (!fileName.toLowerCase().endsWith('.mkv')) {
      console.log('Not an MKV file, skipping');
      return NextResponse.json({ subtitles: [] });
    }
    
    // Check for extracted subtitles in the cache directory
    const cacheDir = join(process.cwd(), 'public', 'cache', 'subtitles');
    console.log('Cache directory:', cacheDir);
    
    // If cache directory doesn't exist, return empty array
    if (!existsSync(cacheDir)) {
      console.log('Cache directory does not exist');
      return NextResponse.json({ subtitles: [] });
    }
    
    // Include source type in the path
    const videoSubDir = join(cacheDir, source, ...pathSegments.slice(0, -1));
    console.log('Video subtitle directory:', videoSubDir);
    
    const videoFileBaseName = fileName.substring(0, fileName.lastIndexOf('.'));
    console.log('Video base name:', videoFileBaseName);
    
    // If no extracted subtitles directory exists yet, return empty array
    if (!existsSync(videoSubDir)) {
      console.log('Subtitle directory does not exist');
      return NextResponse.json({ subtitles: [] });
    }
    
    // Look for extracted subtitle files that match this video
    let subtitleFiles = [];
    try {
      subtitleFiles = readdirSync(videoSubDir)
        .filter(file => file.startsWith(videoFileBaseName) && file.endsWith('.vtt'));
      console.log('Found subtitle files:', subtitleFiles);
    } catch (error) {
      console.error('Error reading subtitle directory:', error);
      return NextResponse.json({ 
        subtitles: [],
        error: "Failed to read subtitle directory"
      });
    }
    
    if (subtitleFiles.length === 0) {
      console.log('No subtitle files found');
      return NextResponse.json({ subtitles: [] });
    }
    
    // Parse out the info from the filenames
    const subtitles = subtitleFiles.map((file, idx) => {
      // Extract language and track index from filename
      // Format: videoname-language-trackindex.vtt
      const parts = file.split('-');
      const trackIndex = parseInt(parts[parts.length - 1].split('.')[0], 10) || idx;
      const language = parts[parts.length - 2] || 'unknown';
      
      // Include source type in the URL
      const subtitleUrl = `/cache/subtitles/${source}/${pathSegments.slice(0, -1).join('/')}/${file}`;
      console.log('Subtitle URL:', subtitleUrl);
      
      return {
        index: trackIndex,
        language: language,
        label: `Subtitle ${trackIndex} (${language})`,
        url: subtitleUrl
      };
    });
    
    return NextResponse.json({ subtitles });
    
  } catch (error) {
    console.error('Unexpected error in video-subtitles endpoint:', error);
    return NextResponse.json(
      { 
        error: `Failed to process video subtitles`,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}