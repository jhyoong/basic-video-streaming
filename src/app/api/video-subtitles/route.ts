// src/app/api/video-subtitles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
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

    // Check if video file exists
    try {
      await fs.access(resolvedPath);
    } catch (error) {
      return NextResponse.json(
        { error: 'Video file not found' },
        { status: 404 }
      );
    }

    // Get directory of the video file
    const videoDir = path.dirname(resolvedPath);
    const videoFileName = path.basename(resolvedPath);
    const videoBaseName = videoFileName.substring(0, videoFileName.lastIndexOf('.'));

    // Look for subtitle files in the same directory
    const subtitleExtensions = ['.vtt', '.srt', '.ass', '.ssa'];
    let subtitles: Array<{
      index: number;
      language: string;
      label: string;
      url: string;
    }> = [];

    try {
      const files = await fs.readdir(videoDir);
      let subtitleIndex = 0;

      for (const file of files) {
        const lowercaseFile = file.toLowerCase();
        
        // Check if file is a subtitle file for this video
        if (lowercaseFile.startsWith(videoBaseName.toLowerCase()) && 
            subtitleExtensions.some(ext => lowercaseFile.endsWith(ext))) {
          
          const subtitlePath = path.join(videoDir, file);
          
          // Extract language from filename if available
          // Patterns: video.en.vtt, video-en.vtt, video_en.vtt
          let language = 'unknown';
          const matches = file.match(/[\._-](en|fr|es|de|it|pt|ru|ja|ko|zh)[\._-]/i);
          if (matches) {
            language = matches[1].toLowerCase();
          }

          // Create relative URL for the subtitle file
          // We need to create an API endpoint to serve subtitle files
          const relativeSubtitlePath = path.relative(process.cwd(), subtitlePath);
          const subtitleUrl = `/api/subtitle-file?path=${encodeURIComponent(relativeSubtitlePath)}`;

          subtitles.push({
            index: subtitleIndex++,
            language: language,
            label: `Subtitle ${subtitleIndex} (${language})`,
            url: subtitleUrl
          });
        }
      }
    } catch (error) {
      console.error('Error reading directory for subtitles:', error);
    }

    return NextResponse.json({ subtitles });
  } catch (error) {
    console.error('Video subtitles API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}