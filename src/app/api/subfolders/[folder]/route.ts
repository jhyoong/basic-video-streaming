// src/app/api/subfolders/[folder]/route.ts
import { readdirSync } from 'fs';
import { join } from 'path';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ folder: string }> }
) {

  const folder = (await params).folder;
  
  try {
    // Decode the folder name for filesystem access
    const decodedFolder = decodeURIComponent(folder);
    
    // The path to the main folder
    const folderPath = join(process.cwd(), 'public', 'videos', decodedFolder);
    
    // Read all directories under this folder
    const subfolders = readdirSync(folderPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const subfolderPath = join(folderPath, dirent.name);
        
        // Count the number of accepted video files in this subfolder
        const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
        let videoCount = 0;
        
        try {
          videoCount = readdirSync(subfolderPath, { withFileTypes: true })
            .filter(file => 
              file.isFile() && 
              videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
            )
            .length;
        } catch (err) {
          console.error(`Error counting videos in ${dirent.name}:`, err);
        }
        
        return {
          name: dirent.name,
          path: `/videos/${folder}/${encodeURIComponent(dirent.name)}`,
          videoCount
        };
      });

    // Return the subfolders as JSON
    return NextResponse.json(subfolders);
  } catch (error) {
    console.error(`Error reading subfolders from ${folder}:`, error);
    return NextResponse.json(
      { error: `Failed to read subfolders from ${folder}` },
      { status: 500 }
    );
  }
}