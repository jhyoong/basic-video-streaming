// src/app/api/video-folders/route.ts
import { readdirSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // The base path for videos
    const videosDirectory = join(process.cwd(), 'public', 'videos');
    
    // Read all directories under public/videos
    const folders = readdirSync(videosDirectory, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const folderPath = join(videosDirectory, dirent.name);
        
        // Count the number of subfolders in this folder
        let subfolderCount = 0;
        try {
          subfolderCount = readdirSync(folderPath, { withFileTypes: true })
            .filter(subDirent => subDirent.isDirectory())
            .length;
        } catch (err) {
          console.error(`Error reading subfolders in ${dirent.name}:`, err);
        }
        
        return {
          name: dirent.name,
          path: `/videos/${dirent.name}`,
          hasSubfolders: subfolderCount > 0,
          subfolderCount
        };
      });

    // Return the folders as JSON
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error reading video folders:', error);
    return NextResponse.json(
      { error: 'Failed to read video folders' },
      { status: 500 }
    );
  }
}