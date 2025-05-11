// lib/config/fileFilters.ts

// File extensions to show (empty array means show all)
const ALLOWED_EXTENSIONS: string[] = [
  // Documents
  'txt', 'pdf', 'doc', 'docx', 'odt',
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp',
  // Videos
  'mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm',
  // Subtitles
  'vtt',
  // Audio
  'mp3', 'wav', 'ogg', 'flac', 'm4a',
  // Code
  'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'json', 'yaml', 'yml',
  'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs',
  // Archives
  'zip', 'rar', '7z', 'tar', 'gz',
];

// File extensions to explicitly hide
const HIDDEN_EXTENSIONS: string[] = [
  'exe', 'dll', 'sys', 'tmp', 'temp', 'log', 'cache',
];

// File names to hide (exact match)
const HIDDEN_FILES: string[] = [
  '.DS_Store', 'Thumbs.db', 'desktop.ini', '.git', '.svn', '.hg',
  'node_modules', '.next', '.nuxt', '.vscode', '.idea',
  '__pycache__', '.pytest_cache', '.mypy_cache',
];

// Folders to hide (exact match)
const HIDDEN_FOLDERS: string[] = [
  '.git', '.svn', '.hg', 'node_modules', '.next', '.nuxt',
  '__pycache__', '.pytest_cache', '.mypy_cache', '.vscode', '.idea',
  'dist', 'build', 'out', '.cache', 'temp', 'tmp',
];

/**
 * Check if a file should be shown based on its name and extension
 */
export function shouldShowFile(fileName: string, extension: string): boolean {
  // Hide files that start with .
  if (fileName.startsWith('.')) {
    return false;
  }
  
  // Hide files in the hidden list
  if (HIDDEN_FILES.includes(fileName)) {
    return false;
  }
  
  // Hide files with hidden extensions
  if (HIDDEN_EXTENSIONS.includes(extension)) {
    return false;
  }
  
  // If allowed extensions list is empty, show all remaining files
  if (ALLOWED_EXTENSIONS.length === 0) {
    return true;
  }
  
  // Only show files with allowed extensions
  return ALLOWED_EXTENSIONS.includes(extension);
}

/**
 * Check if a folder should be shown
 */
export function shouldShowFolder(folderName: string): boolean {
  // Hide folders that start with .
  if (folderName.startsWith('.')) {
    return false;
  }
  
  // Hide folders in the hidden list
  if (HIDDEN_FOLDERS.includes(folderName)) {
    return false;
  }
  
  return true;
}

/**
 * Get a list of common file types with icons for display
 */
export function getFileTypeInfo(extension: string): {icon: string, color: string, type: string} {
  const ext = extension.toLowerCase();
  
  // Documents
  if (['pdf'].includes(ext)) return {icon: '📄', color: 'text-red-600', type: 'PDF Document'};
  if (['doc', 'docx', 'odt'].includes(ext)) return {icon: '📝', color: 'text-blue-600', type: 'Document'};
  if (['txt'].includes(ext)) return {icon: '📄', color: 'text-gray-600', type: 'Text File'};
  
  // Images
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
    return {icon: '🖼️', color: 'text-purple-600', type: 'Image'};
  }
  
  // Videos
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
    return {icon: '🎥', color: 'text-green-600', type: 'Video'};
  }
  
  // Audio
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
    return {icon: '🎵', color: 'text-orange-600', type: 'Audio'};
  }
  
  // Code
  if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) return {icon: '📜', color: 'text-yellow-600', type: 'JavaScript/TypeScript'};
  if (['html', 'css', 'scss'].includes(ext)) return {icon: '🌐', color: 'text-blue-500', type: 'Web Code'};
  if (['py'].includes(ext)) return {icon: '🐍', color: 'text-green-500', type: 'Python'};
  if (['java'].includes(ext)) return {icon: '☕', color: 'text-orange-500', type: 'Java'};
  if (['cpp', 'c'].includes(ext)) return {icon: '⚡', color: 'text-blue-500', type: 'C/C++'};
  if (['json', 'yaml', 'yml'].includes(ext)) return {icon: '📋', color: 'text-gray-500', type: 'Configuration'};
  
  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return {icon: '📦', color: 'text-purple-500', type: 'Archive'};
  }
  
  // Default
  return {icon: '📄', color: 'text-gray-500', type: 'File'};
}