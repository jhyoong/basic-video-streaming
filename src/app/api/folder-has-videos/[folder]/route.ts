// src/app/api/folder-has-videos/[folder]/route.ts
import { readdirSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folder: string }> }
) {
  const folder = (await params).folder;
  
  try {
    // The path to the specific folder
    const folderPath = join(process.cwd(), 'public', 'videos', folder);
    
    // Video file extensions we want to detect
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    
    // Get all files in the directory that are videos
    const files = readdirSync(folderPath, { withFileTypes: true });
    
    const videos = files.filter(file => 
      file.isFile() && 
      videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    );
    
    const subfolders = files.filter(item => item.isDirectory());
    
    // Return info about videos and subfolders
    return NextResponse.json({
      hasVideos: videos.length > 0,
      videoCount: videos.length,
      hasSubfolders: subfolders.length > 0,
      subfolderCount: subfolders.length
    });
  } catch (error) {
    console.error(`Error checking videos in folder ${folder}:`, error);
    return NextResponse.json(
      { error: `Failed to check videos in folder ${folder}` },
      { status: 500 }
    );
  }
}