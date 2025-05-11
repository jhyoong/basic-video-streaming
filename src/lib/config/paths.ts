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
    ? process.env.ALLOWED_FILESYSTEM_PATHS.split(',').map(p => p.trim())
    : [path.join(os.homedir(), 'documents'), path.join(os.homedir(), 'downloads')],
  maxDepth: parseInt(process.env.FILESYSTEM_MAX_DEPTH || '3'),
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
    return absolutePath.startsWith(absoluteBase);
  });
}

/**
 * Get all allowed base paths with their display names
 */
export function getAllowedBasePaths(): Array<{path: string, name: string}> {
  return pathConfig.allowedBasePaths.map(basePath => ({
    path: basePath,
    name: path.basename(basePath) || basePath,
  }));
}

/**
 * Resolve a requested path, handling both absolute and relative paths
 */
export function resolveRequestedPath(requestedPath: string): string {
  // If it's already an absolute path, use it directly
  if (path.isAbsolute(requestedPath)) {
    return path.normalize(requestedPath);
  }
  
  // If it's relative, resolve it from the current working directory
  // But if enforcement is on and no allowed paths, use default path
  if (pathConfig.enforceAllowedPaths && pathConfig.allowedBasePaths.length === 0) {
    return path.resolve(pathConfig.defaultPath, requestedPath);
  }
  
  return path.resolve(process.cwd(), requestedPath);
}

/**
 * Check if a path is within the maximum allowed depth
 */
export function isWithinMaxDepth(requestedPath: string): boolean {
  const depth = requestedPath.split(path.sep).length;
  return depth <= pathConfig.maxDepth + 10; // Add some buffer for reasonable system paths
}

/**
 * Calculate the depth of a path relative to a base path
 */
export function calculateRelativeDepth(targetPath: string, basePath: string): number {
  const relative = path.relative(basePath, targetPath);
  if (relative === '') return 0;
  return relative.split(path.sep).length;
}