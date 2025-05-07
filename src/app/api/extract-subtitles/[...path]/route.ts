// src/app/api/extract-subtitles/[...path]/route.ts
import { existsSync, mkdirSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import { NextRequest, NextResponse } from 'next/server';

// Ensure cache directory exists
async function ensureCacheDir() {
  const cacheDir = join(process.cwd(), 'public', 'cache', 'subtitles');
  console.log('Ensuring cache directory exists:', cacheDir);
  if (!existsSync(cacheDir)) {
    try {
      await mkdir(cacheDir, { recursive: true });
      console.log('Created cache directory');
    } catch (error) {
      console.error('Error creating cache directory:', error);
      throw error;
    }
  }
  return cacheDir;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  console.log('Received extract subtitle request');
  
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
    
    // Only process MKV files
    const fileName = pathSegments[pathSegments.length - 1];
    console.log('Processing file:', fileName);
    
    if (!fileName.toLowerCase().endsWith('.mkv')) {
      console.log('Not an MKV file, skipping');
      return NextResponse.json({ 
        success: false,
        message: "Not an MKV file, no subtitle extraction needed" 
      });
    }
    
    // Construct the path based on the number of segments
    const relativePathSegments = ['public', 'videos', ...pathSegments];
    const videoPath = join(process.cwd(), ...relativePathSegments);
    console.log('Full video path:', videoPath);
    
    // Check if file exists
    if (!existsSync(videoPath)) {
      console.error('Video file not found at path:', videoPath);
      return NextResponse.json(
        { error: "Video file not found", path: videoPath },
        { status: 404 }
      );
    }
    
    // Create a unique directory structure for the extracted subtitles
    console.log('Setting up cache directory');
    const cacheDir = await ensureCacheDir();
    const videoSubDir = join(cacheDir, ...pathSegments.slice(0, -1));
    console.log('Video subtitle directory:', videoSubDir);
    
    if (!existsSync(videoSubDir)) {
      console.log('Creating subtitle directory:', videoSubDir);
      try {
        mkdirSync(videoSubDir, { recursive: true });
      } catch (error) {
        console.error('Error creating subtitle directory:', error);
        return NextResponse.json({ 
          success: false,
          error: "Failed to create subtitle directory",
          details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }
    }
    
    const videoFileBaseName = fileName.substring(0, fileName.lastIndexOf('.'));
    console.log('Video base name:', videoFileBaseName);
    
    try {
      // Check if FFmpeg is installed and working
      try {
        const ffmpegVersion = execSync('ffmpeg -version').toString().split('\n')[0];
        console.log('FFmpeg version:', ffmpegVersion);
        
        const ffprobeVersion = execSync('ffprobe -version').toString().split('\n')[0];
        console.log('FFprobe version:', ffprobeVersion);
      } catch (error) {
        console.error('FFmpeg or FFprobe not found or not working:', error);
        return NextResponse.json({ 
          success: false,
          error: "FFmpeg or FFprobe not installed or not working",
          details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }
      
      // Use ffprobe to extract subtitle track information
      console.log('Running ffprobe to get subtitle info');
      let output: string;
      try {
        output = execSync(`ffprobe -v error -select_streams s -show_entries stream=index:stream_tags=language,title -of json "${videoPath}"`).toString();
        console.log('FFprobe output:', output);
      } catch (error) {
        console.error('Error running ffprobe:', error);
        return NextResponse.json({ 
          success: false,
          error: "Failed to extract subtitle information with ffprobe",
          details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
      }
      
      let data;
      try {
        data = JSON.parse(output);
      } catch (error) {
        console.error('Error parsing ffprobe output:', error);
        return NextResponse.json({ 
          success: false,
          error: "Failed to parse ffprobe output",
          details: error instanceof Error ? error.message : String(error),
          output
        }, { status: 500 });
      }
      
      const streams = data.streams || [];
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
        
        // Create a unique filename for the extracted subtitle
        const subtitleFileName = `${videoFileBaseName}-${language}-${trackIndex}.vtt`;
        const subtitlePath = join(videoSubDir, subtitleFileName);
        
        console.log(`Processing subtitle track ${trackIndex} (${language})`);
        
        // Only extract if we haven't already
        if (!existsSync(subtitlePath)) {
          console.log(`Extracting to ${subtitlePath}`);
          try {
            const cmd = `ffmpeg -i "${videoPath}" -map 0:${trackIndex} "${subtitlePath}"`;
            console.log('Running command:', cmd);
            execSync(cmd);
            results.push({
              track: trackIndex,
              language,
              title,
              path: subtitlePath,
              success: true
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
        } else {
          console.log(`Subtitle file already exists: ${subtitlePath}`);
          results.push({
            track: trackIndex,
            language,
            title,
            path: subtitlePath,
            success: true
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        message: `Processed ${results.length} subtitle tracks`,
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