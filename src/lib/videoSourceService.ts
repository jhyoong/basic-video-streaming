// src/lib/videoSourceService.ts
import { readdirSync, statSync, createReadStream } from 'fs';
import { join, extname } from 'path';
import { NextRequest, NextResponse } from 'next/server';

export type VideoSource = 'internal' | 'external';

export interface VideoFolder {
  name: string;
  path: string;
  hasSubfolders: boolean;
  subfolderCount: number;
}

export interface VideoFile {
  name: string;
  path: string;
}

export interface Subfolder {
  name: string;
  path: string;
  videoCount: number;
}

export interface FolderInfo {
  hasVideos: boolean;
  videoCount: number;
  hasSubfolders: boolean;
  subfolderCount: number;
}

export function getBasePath(source: VideoSource): string {
  return source === 'internal' 
    ? join(process.cwd(), 'public', 'videos')
    : (process.env.EXTERNAL_VIDEOS_PATH || '');
}

export function isExternalPathConfigured(): boolean {
  const externalPath = process.env.EXTERNAL_VIDEOS_PATH;
  return Boolean(externalPath) && externalPath.trim() !== '';
}

export function getVideoExtensions(): string[] {
  return ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
}

export function getPathPrefix(source: VideoSource): string {
  return source === 'internal' ? '/videos' : '/external-videos';
}

// Get all top-level video folders
export function getVideoFolders(source: VideoSource): VideoFolder[] {
  const basePath = getBasePath(source);
  const pathPrefix = getPathPrefix(source);
  
  if (source === 'external' && !isExternalPathConfigured()) {
    return [];
  }
  
  try {
    return readdirSync(basePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const folderPath = join(basePath, dirent.name);
        
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
          path: `${pathPrefix}/${dirent.name}`,
          hasSubfolders: subfolderCount > 0,
          subfolderCount
        };
      });
  } catch (error) {
    console.error(`Error reading ${source} video folders:`, error);
    return [];
  }
}

// Get all subfolders for a specific folder
export function getSubfolders(source: VideoSource, folder: string): Subfolder[] {
  const basePath = getBasePath(source);
  const pathPrefix = getPathPrefix(source);
  const folderPath = join(basePath, folder);
  
  if (source === 'external' && !isExternalPathConfigured()) {
    return [];
  }
  
  try {
    return readdirSync(folderPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => {
        const subfolderPath = join(folderPath, dirent.name);
        
        // Count the number of video files in this subfolder
        const videoExtensions = getVideoExtensions();
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
          path: `${pathPrefix}/${folder}/${dirent.name}`,
          videoCount
        };
      });
  } catch (error) {
    console.error(`Error reading subfolders from ${folder}:`, error);
    return [];
  }
}

// Get information about a folder
export function getFolderInfo(source: VideoSource, folder: string): FolderInfo | null {
  const basePath = getBasePath(source);
  const folderPath = join(basePath, folder);
  
  if (source === 'external' && !isExternalPathConfigured()) {
    return null;
  }
  
  try {
    // Video file extensions we want to detect
    const videoExtensions = getVideoExtensions();
    
    // Get all files in the directory that are videos
    const files = readdirSync(folderPath, { withFileTypes: true });
    
    const videos = files.filter(file => 
      file.isFile() && 
      videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    );
    
    const subfolders = files.filter(item => item.isDirectory());
    
    // Return info about videos and subfolders
    return {
      hasVideos: videos.length > 0,
      videoCount: videos.length,
      hasSubfolders: subfolders.length > 0,
      subfolderCount: subfolders.length
    };
  } catch (error) {
    console.error(`Error checking videos in folder ${folder}:`, error);
    return null;
  }
}

// Get all videos in a folder or subfolder
export function getVideos(source: VideoSource, pathSegments: string[]): VideoFile[] {
  const basePath = getBasePath(source);
  const pathPrefix = getPathPrefix(source);
  const folderPath = join(basePath, ...pathSegments);
  
  if (source === 'external' && !isExternalPathConfigured()) {
    return [];
  }
  
  try {
    // Build the URL path for the videos
    const urlPathPrefix = `${pathPrefix}/${pathSegments.join('/')}`;
    
    // Video file extensions we want to detect
    const videoExtensions = getVideoExtensions();
    
    // Get all files in the directory
    return readdirSync(folderPath, { withFileTypes: true })
      .filter(file => 
        file.isFile() && 
        videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      )
      .map(file => ({
        name: file.name,
        path: `${urlPathPrefix}/${file.name}`,
      }));
  } catch (error) {
    console.error(`Error reading videos from path ${pathSegments.join('/')}:`, error);
    return [];
  }
}

// Stream a video file
export function streamVideo(request: NextRequest, source: VideoSource, pathSegments: string[]): NextResponse {
  const basePath = getBasePath(source);
  
  if (source === 'external' && !isExternalPathConfigured()) {
    return NextResponse.json(
      { error: 'External videos path is not configured' },
      { status: 404 }
    );
  }
  
  try {
    const fullPath = join(basePath, ...pathSegments);
    const stats = statSync(fullPath);
    
    if (!stats.isFile()) {
      return NextResponse.json(
        { error: 'Path is not a file' },
        { status: 400 }
      );
    }
    
    const ext = extname(fullPath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    // Set appropriate content type based on file extension
    switch (ext) {
      case '.mp4':
        contentType = 'video/mp4';
        break;
      case '.webm':
        contentType = 'video/webm';
        break;
      case '.mov':
        contentType = 'video/quicktime';
        break;
      case '.avi':
        contentType = 'video/x-msvideo';
        break;
      case '.mkv':
        contentType = 'video/x-matroska';
        break;
    }
    
    // Get the range header to support seeking in videos
    const range = request.headers.get('range');
    
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunkSize = (end - start) + 1;
      
      const headers = {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': contentType,
      };
      
      // Create a stream for the file chunk
      const stream = createReadStream(fullPath, { start, end });
      
      // Return the stream with appropriate headers
      return new NextResponse(stream as any, {
        status: 206,
        headers,
      });
    } else {
      // Return the whole file if no range is specified
      const headers = {
        'Content-Length': stats.size.toString(),
        'Content-Type': contentType,
      };
      
      const stream = createReadStream(fullPath);
      
      return new NextResponse(stream as any, {
        status: 200,
        headers,
      });
    }
  } catch (error) {
    console.error(`Error streaming video from path ${pathSegments.join('/')}:`, error);
    return NextResponse.json(
      { error: `Failed to stream video from path ${pathSegments.join('/')}` },
      { status: 500 }
    );
  }
}