// app/api/filesystem/route.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream, statSync } from 'fs';
import { 
  isPathAllowed, 
  getAllowedBasePaths, 
  resolveRequestedPath, 
  isWithinMaxDepth,
  pathConfig
} from '../../../lib/config/paths';
import { shouldShowFile, shouldShowFolder } from '../../../lib/config/fileFilters';

export interface FileSystemItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  size?: number;
  modified?: string;
  extension?: string;
  children?: FileSystemItem[];
}

export interface FileSystemResponse {
  items: FileSystemItem[];
  error?: string;
  isHomePage?: boolean;
  allowedPaths?: Array<{path: string, name: string}>;
}

export async function readDirectory(dirPath: string, depth: number = 0, maxDepth: number = 1): Promise<FileSystemItem[]> {
  try {
    const files = await fs.readdir(dirPath);
    const items: FileSystemItem[] = [];

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      let stats;
      
      try {
        stats = await fs.stat(filePath);
      } catch (error) {
        // Skip files we can't stat (permission issues, etc.)
        console.warn(`Could not stat ${filePath}:`, error);
        continue;
      }
      
      // Apply filters based on type
      if (stats.isDirectory()) {
        if (!shouldShowFolder(file)) {
          continue;
        }
      } else {
        const extension = path.extname(file).toLowerCase().slice(1);
        if (!shouldShowFile(file, extension)) {
          continue;
        }
      }
      
      const item: FileSystemItem = {
        id: filePath.replace(/\\/g, '/'), // Normalize path for consistent IDs
        name: file,
        type: stats.isDirectory() ? 'folder' : 'file',
        path: filePath.replace(/\\/g, '/'),
        size: stats.size,
        modified: stats.mtime.toISOString(),
      };

      if (item.type === 'file') {
        item.extension = path.extname(file).toLowerCase().slice(1);
      }

      // Recursively read subdirectories if we haven't reached maxDepth
      if (item.type === 'folder' && depth < maxDepth) {
        // Check if this subdirectory is within the maximum allowed depth
        if (isWithinMaxDepth(filePath)) {
          try {
            item.children = await readDirectory(filePath, depth + 1, maxDepth);
          } catch (error) {
            console.warn(`Could not read subdirectory ${filePath}:`, error);
            // Continue without children if we can't read the subdirectory
          }
        }
      }

      items.push(item);
    }

    // Sort: folders first, then files, both alphabetically
    return items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const requestedPath = searchParams.get('path') || '.';
  const depth = parseInt(searchParams.get('depth') || '1');
  const flatten = searchParams.get('flatten') === 'true';
  const isVideoStream = searchParams.get('stream') === 'true';

  // Handle video streaming
  if (isVideoStream) {
    return handleVideoStreaming(request, requestedPath);
  }

  console.log(`Filesystem API: Requested path: ${requestedPath}`);
  const decodedPath = decodeURIComponent(requestedPath);
  console.log(`Filesystem API: Decoded path: ${decodedPath}`);

  // Special handling for home page - always show allowed paths when accessing root
  if (requestedPath === '.' || requestedPath === '/' || requestedPath === '') {
    console.log('Filesystem API: Showing home page with allowed paths');
    const allowedPaths = getAllowedBasePaths();
    // Add video paths to allowed paths
    const videoPaths = [
      { path: process.cwd() + '/public/videos', name: 'Video Collections' }
    ];
    if (process.env.EXTERNAL_VIDEOS_PATH) {
      videoPaths.push({ path: process.env.EXTERNAL_VIDEOS_PATH, name: 'External Video Collections' });
    }
    return NextResponse.json({
      items: [],
      isHomePage: true,
      allowedPaths: [...allowedPaths, ...videoPaths],
    });
  }
  
  // Resolve the path
  let resolvedPath;
  try {
    resolvedPath = resolveRequestedPath(requestedPath);
    console.log(`Filesystem API: Resolved path: ${resolvedPath}`);
  } catch (error) {
    console.error('Filesystem API: Error resolving path:', error);
    return NextResponse.json(
      { 
        items: [], 
        error: 'Invalid path format',
        isHomePage: true,
        allowedPaths: getAllowedBasePaths(),
      },
      { status: 400 }
    );
  }
  
  // Check if the resolved path is allowed
  if (!isPathAllowed(resolvedPath)) {
    console.log(`Filesystem API: Path not allowed: ${resolvedPath}`);
    return NextResponse.json(
      { 
        items: [], 
        error: 'Access denied: Path not in allowed base paths',
        allowedPaths: getAllowedBasePaths(),
      },
      { status: 403 }
    );
  }
  
  // Check if the path is within the maximum allowed depth
  if (!isWithinMaxDepth(resolvedPath)) {
    console.log(`Filesystem API: Path exceeds max depth: ${resolvedPath}`);
    return NextResponse.json(
      { 
        items: [], 
        error: 'Access denied: Path exceeds maximum allowed depth',
        allowedPaths: getAllowedBasePaths(),
      },
      { status: 403 }
    );
  }

  // Verify the path exists
  try {
    const stats = await fs.stat(resolvedPath);
    if (!stats.isDirectory()) {
      console.log(`Filesystem API: Path is not a directory: ${resolvedPath}`);
      return NextResponse.json(
        { 
          items: [], 
          error: 'Path is not a directory',
          allowedPaths: getAllowedBasePaths(),
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error(`Filesystem API: Path does not exist: ${resolvedPath}`, error);
    return NextResponse.json(
      { 
        items: [], 
        error: 'Path does not exist or is not accessible',
        isHomePage: true,
        allowedPaths: getAllowedBasePaths(),
      },
      { status: 404 }
    );
  }

  console.log(`Filesystem API: Reading directory: ${resolvedPath}`);
  let items = await readDirectory(resolvedPath, 0, depth);

  // Optional: Flatten the structure if requested
  if (flatten) {
    function flattenItems(items: FileSystemItem[]): FileSystemItem[] {
      let flattened: FileSystemItem[] = [];
      for (const item of items) {
        const { children, ...itemWithoutChildren } = item;
        flattened.push(itemWithoutChildren);
        if (children) {
          flattened = flattened.concat(flattenItems(children));
        }
      }
      return flattened;
    }
    items = flattenItems(items);
  }

  const response: FileSystemResponse = { items };
  return NextResponse.json(response);
}

async function handleVideoStreaming(request: NextRequest, filePath: string): Promise<NextResponse> {
  try {
    // Handle filesystem video streaming
    console.log('Streaming video file from filesystem:', filePath);
    
    // Resolve and validate the path
    const resolvedPath = resolveRequestedPath(filePath);
    
    if (!isPathAllowed(resolvedPath)) {
      return NextResponse.json(
        { error: 'Access denied: Path not in allowed base paths' },
        { status: 403 }
      );
    }
    
    // Check if file exists and get stats
    let stats;
    try {
      stats = statSync(resolvedPath);
      if (!stats.isFile()) {
        return NextResponse.json(
          { error: 'Path is not a file' },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error('File not found:', resolvedPath, error);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    // Determine content type
    const ext = path.extname(resolvedPath).toLowerCase();
    let contentType = 'application/octet-stream';
    
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
      case '.wmv':
        contentType = 'video/x-ms-wmv';
        break;
      case '.flv':
        contentType = 'video/x-flv';
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
      const stream = createReadStream(resolvedPath, { start, end });
      
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
      
      const stream = createReadStream(resolvedPath);
      
      return new NextResponse(stream as any, {
        status: 200,
        headers,
      });
    }
  } catch (error) {
    console.error('Error streaming filesystem video:', error);
    return NextResponse.json(
      { error: 'Failed to stream video' },
      { status: 500 }
    );
  }
}