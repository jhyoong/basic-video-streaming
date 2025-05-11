// lib/config/paths.ts
import path from 'path';
import os from 'os';

export interface PathConfig {
  allowedBasePaths: string[];
  maxDepth: number;
  enforceAllowedPaths: boolean;
  defaultPath: string;
}

// Load configuration from environment variables with sensible defaults
export const pathConfig: PathConfig = {
  allowedBasePaths: process.env.ALLOWED_FILESYSTEM_PATHS 
    ? process.env.ALLOWED_FILESYSTEM_PATHS.split(',').map(p => p.trim()).map(p => path.resolve(p))
    : [
        path.resolve(os.homedir(), 'documents'), 
        path.resolve(os.homedir(), 'downloads'),
        path.resolve(process.cwd(), 'public', 'videos'), // Add video directories
        ...(process.env.EXTERNAL_VIDEOS_PATH ? [path.resolve(process.env.EXTERNAL_VIDEOS_PATH)] : [])
      ],
  maxDepth: parseInt(process.env.FILESYSTEM_MAX_DEPTH || '50'), // Increased to allow deeper paths
  enforceAllowedPaths: process.env.FILESYSTEM_ENFORCE_PATHS === 'true',
  defaultPath: process.env.FILESYSTEM_DEFAULT_PATH || os.homedir(),
};

/**
 * Check if a path is within the allowed base paths
 */
export function isPathAllowed(requestedPath: string): boolean {
  if (!pathConfig.enforceAllowedPaths) {
    return true;
  }

  const absolutePath = path.resolve(requestedPath);
  
  return pathConfig.allowedBasePaths.some(basePath => {
    const absoluteBase = path.resolve(basePath);
    const relativePath = path.relative(absoluteBase, absolutePath);
    
    // Check if the path is within the base path
    return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
  });
}

/**
 * Get all allowed base paths with their display names
 */
export function getAllowedBasePaths(): Array<{path: string, name: string}> {
  const basePaths = pathConfig.allowedBasePaths.map(basePath => ({
    path: basePath,
    name: path.basename(basePath) || basePath,
  }));
  
  // Add special video paths if not already included
  const videoPaths = [];
  const internalVideoPath = path.resolve(process.cwd(), 'public', 'videos');
  if (!basePaths.some(bp => bp.path === internalVideoPath)) {
    videoPaths.push({
      path: internalVideoPath,
      name: 'Video Collections'
    });
  }
  
  if (process.env.EXTERNAL_VIDEOS_PATH) {
    const externalVideoPath = path.resolve(process.env.EXTERNAL_VIDEOS_PATH);
    if (!basePaths.some(bp => bp.path === externalVideoPath)) {
      videoPaths.push({
        path: externalVideoPath,
        name: 'External Video Collections'
      });
    }
  }
  
  return [...basePaths, ...videoPaths];
}

/**
 * Resolve a requested path, handling both absolute and relative paths
 */
export function resolveRequestedPath(requestedPath: string): string {
  console.log(`PathConfig: Resolving path: ${requestedPath}`);
  
  // Handle special cases
  if (requestedPath === '.' || requestedPath === '/') {
    if (pathConfig.enforceAllowedPaths && pathConfig.allowedBasePaths.length > 0) {
      return pathConfig.allowedBasePaths[0];
    }
    return pathConfig.defaultPath;
  }
  
  // If it's already an absolute path, normalize it
  if (path.isAbsolute(requestedPath)) {
    const normalized = path.normalize(requestedPath);
    console.log(`PathConfig: Resolved absolute path: ${normalized}`);
    return normalized;
  }
  
  // Handle URL encoded paths
  const decodedPath = decodeURIComponent(requestedPath);
  
  // Check if the decoded path is absolute
  if (path.isAbsolute(decodedPath)) {
    const normalized = path.normalize(decodedPath);
    console.log(`PathConfig: Resolved decoded absolute path: ${normalized}`);
    return normalized;
  }
  
  // For relative paths, resolve from the first allowed base path if enforcement is on
  if (pathConfig.enforceAllowedPaths && pathConfig.allowedBasePaths.length > 0) {
    const resolved = path.resolve(pathConfig.allowedBasePaths[0], decodedPath);
    console.log(`PathConfig: Resolved relative path from base: ${resolved}`);
    return resolved;
  }
  
  // Otherwise resolve from current working directory
  const resolved = path.resolve(process.cwd(), decodedPath);
  console.log(`PathConfig: Resolved relative path from cwd: ${resolved}`);
  return resolved;
}

/**
 * Check if a path is within the maximum allowed depth
 */
export function isWithinMaxDepth(requestedPath: string): boolean {
  // Get the deepest allowed base path
  let deepestBasePath = '';
  let maxBasePathDepth = 0;
  
  for (const basePath of pathConfig.allowedBasePaths) {
    const depth = basePath.split(path.sep).length;
    if (depth > maxBasePathDepth) {
      maxBasePathDepth = depth;
      deepestBasePath = basePath;
    }
  }
  
  // Calculate depth relative to the deepest base path
  const targetDepth = requestedPath.split(path.sep).length;
  const relativeDepth = targetDepth - maxBasePathDepth;
  
  console.log(`PathConfig: Depth check - target: ${targetDepth}, base: ${maxBasePathDepth}, relative: ${relativeDepth}, max: ${pathConfig.maxDepth}`);
  
  return relativeDepth <= pathConfig.maxDepth;
}

/**
 * Calculate the depth of a path relative to a base path
 */
export function calculateRelativeDepth(targetPath: string, basePath: string): number {
  const relative = path.relative(basePath, targetPath);
  if (relative === '') return 0;
  return relative.split(path.sep).length;
}

/**
 * Get video directories configuration
 */
export function getVideoDirectories(): { internal: string; external?: string } {
  return {
    internal: path.resolve(process.cwd(), 'public', 'videos'),
    external: process.env.EXTERNAL_VIDEOS_PATH ? path.resolve(process.env.EXTERNAL_VIDEOS_PATH) : undefined
  };
}