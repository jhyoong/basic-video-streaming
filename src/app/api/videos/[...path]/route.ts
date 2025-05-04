// src/app/api/videos/[...path]/route.ts
import { readdirSync } from 'fs';
import { join } from 'path';
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
    // Decode the URL segments for filesystem access
    const decodedPathSegments = pathSegments.map(segment => decodeURIComponent(segment));
    
    // Construct the path based on the number of segments
    const relativePathSegments = ['public', 'videos', ...decodedPathSegments];
    const folderPath = join(process.cwd(), ...relativePathSegments);
    
    // Build the URL path for the videos - keep original path segments to preserve encoding
    const urlPathPrefix = `/videos/${pathSegments.join('/')}`;
    const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
    
    // Get all files in the directory
    const files = readdirSync(folderPath, { withFileTypes: true })
      .filter(file => 
        file.isFile() && 
        videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      )
      .map(file => ({
        name: file.name,
        path: `${urlPathPrefix}/${encodeURIComponent(file.name)}`,
      }));

    // Return the files as JSON
    return NextResponse.json(files);
  } catch (error) {
    console.error(`Error reading videos from path ${pathSegments.join('/')}:`, error);
    return NextResponse.json(
      { error: `Failed to read videos from path ${pathSegments.join('/')}` },
      { status: 500 }
    );
  }
}