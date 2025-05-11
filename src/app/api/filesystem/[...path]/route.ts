// app/api/filesystem/[...path]/route.ts
// This allows for more RESTful paths like /api/filesystem/src/components
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { readDirectory, FileSystemResponse, FileSystemItem } from '../route';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const depth = parseInt(searchParams.get('depth') || '1');
    const flatten = searchParams.get('flatten') === 'true';

    // Construct path from URL segments
    const requestedPath = params.path ? params.path.join('/') : '.';
    
    // Security: Prevent directory traversal attacks
    const safePath = path.normalize(requestedPath).replace(/\.\./g, '');
    const fullPath = path.resolve(process.cwd(), safePath);

    // Ensure the requested path is within the project directory
    if (!fullPath.startsWith(process.cwd())) {
      return NextResponse.json(
        { items: [], error: 'Access denied: Path outside project directory' },
        { status: 403 }
      );
    }

    let items = await readDirectory(fullPath, 0, depth);

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
      { items: [], error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}