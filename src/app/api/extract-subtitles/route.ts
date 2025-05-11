// src/app/api/extract-subtitles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import { resolveRequestedPath, isPathAllowed, isWithinMaxDepth } from '../../../lib/config/paths';

export async function GET(request: NextRequest) {
  console.log('Received extract subtitle request');
  
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
    try {
      await fs.access(resolvedPath);
    } catch (error) {
      return NextResponse.json(
        { error: 'Video file not found' },
        { status: 404 }
      );
    }

    // Only process MKV files
    const fileName = path.basename(resolvedPath);
    if (!fileName.toLowerCase().endsWith('.mkv')) {
      return NextResponse.json({
        success: false,
        message: "Not an MKV file, no subtitle extraction needed"
      });
    }

    // Get directory where subtitles will be stored (same as video)
    const videoDir = path.dirname(resolvedPath);
    const videoBaseName = fileName.substring(0, fileName.lastIndexOf('.'));

    try {
      // Check if FFmpeg is installed
      try {
        execSync('ffmpeg -version', { stdio: 'pipe' });
      } catch (error) {
        console.error('FFmpeg not found:', error);
        return NextResponse.json({
          success: false,
          error: "FFmpeg not installed or not working",
          details: "Please install FFmpeg to extract subtitles from MKV files"
        }, { status: 500 });
      }

      // Use ffprobe to get subtitle track information
      let probeOutput: string;
      try {
        probeOutput = execSync(
          `ffprobe -v error -select_streams s -show_entries stream=index:stream_tags=language,title -of json "${resolvedPath}"`,
          { encoding: 'utf8' }
        );
      } catch (error) {
        console.error('Error running ffprobe:', error);
        return NextResponse.json({
          success: false,
          error: "Failed to extract subtitle information with ffprobe"
        }, { status: 500 });
      }

      let probeData;
      try {
        probeData = JSON.parse(probeOutput);
      } catch (error) {
        console.error('Error parsing ffprobe output:', error);
        return NextResponse.json({
          success: false,
          error: "Failed to parse ffprobe output"
        }, { status: 500 });
      }

      const streams = probeData.streams || [];
      console.log(`Found ${streams.length} subtitle streams`);

      if (streams.length === 0) {
        return NextResponse.json({
          success: false,
          message: "No subtitle tracks found in the MKV file"
        });
      }

      // Extract each subtitle track
      const results = [];
      
      for (const stream of streams) {
        const trackIndex = stream.index;
        const language = stream.tags?.language || 'unknown';
        const title = stream.tags?.title || `Subtitle ${trackIndex}`;
        
        // Create filename for the extracted subtitle
        const subtitleFileName = `${videoBaseName}.${language}.${trackIndex}.vtt`;
        const subtitlePath = path.join(videoDir, subtitleFileName);
        
        console.log(`Processing subtitle track ${trackIndex} (${language})`);
        
        // Check if subtitle already exists
        try {
          await fs.access(subtitlePath);
          console.log(`Subtitle already exists: ${subtitlePath}`);
          results.push({
            track: trackIndex,
            language,
            title,
            path: subtitlePath,
            success: true,
            message: "Already exists"
          });
          continue;
        } catch {
          // File doesn't exist, proceed with extraction
        }
        
        // Extract subtitle track
        try {
          const cmd = `ffmpeg -y -i "${resolvedPath}" -map 0:${trackIndex} -c:s webvtt "${subtitlePath}"`;
          console.log('Running command:', cmd);
          execSync(cmd, { stdio: 'pipe' });
          
          results.push({
            track: trackIndex,
            language,
            title,
            path: subtitlePath,
            success: true,
            message: "Successfully extracted"
          });
        } catch (error) {
          console.error(`Error extracting subtitle track ${trackIndex}:`, error);
          results.push({
            track: trackIndex,
            language,
            title,
            success: false,
            error: `Failed to extract subtitle track ${trackIndex}`,
            details: error instanceof Error ? error.message : String(error)
          });
        }
      }
      
      // Return results
      const successCount = results.filter(r => r.success).length;
      return NextResponse.json({
        success: successCount > 0,
        message: `Processed ${results.length} subtitle tracks (${successCount} successful)`,
        results
      });
      
    } catch (error) {
      console.error('Error in subtitle extraction process:', error);
      return NextResponse.json({
        success: false,
        error: "Failed to extract subtitle information",
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Unexpected error in extract-subtitles endpoint:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Unexpected error in subtitle extraction`,
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}