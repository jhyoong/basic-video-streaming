// app/api/filesystem/route.ts
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
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
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedPath = searchParams.get('path') || '.';
    const depth = parseInt(searchParams.get('depth') || '1');
    const flatten = searchParams.get('flatten') === 'true';

    console.log(`Filesystem API: Requested path: ${requestedPath}`);
    const decodedPath = decodeURIComponent(requestedPath);
    console.log(`Filesystem API: Decoded path: ${decodedPath}`);

    // Special handling for home page - always show allowed paths when accessing root
    if (requestedPath === '.' || requestedPath === '/' || requestedPath === '') {
      console.log('Filesystem API: Showing home page with allowed paths');
      const allowedPaths = getAllowedBasePaths();
      return NextResponse.json({
        items: [],
        isHomePage: true,
        allowedPaths,
      });
    }
    
    // Resolve the path - this is where the bug was
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
  } catch (error) {
    console.error('Filesystem API error:', error);
    return NextResponse.json(
      { 
        items: [], 
        error: error instanceof Error ? error.message : 'Unknown error',
        allowedPaths: getAllowedBasePaths(),
      },
      { status: 500 }
    );
  }
}