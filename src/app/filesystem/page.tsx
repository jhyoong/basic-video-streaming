// app/filesystem/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { FileSystemTree } from '../../components/FileSystemTree';
import { BreadcrumbNavigator } from '../../components/BreadcrumbNavigator';
import { HomePage } from '../../components/HomePage';
import { FileSystemItem, FileSystemResponse } from '../api/filesystem/route';
import { useRouter, useSearchParams } from 'next/navigation';

// Import the file filter to check if a file is a video
const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'];

export default function FileSystemPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const path = searchParams.get('path') || '.';
  
  const [currentPath, setCurrentPath] = useState<string>(path);
  const [selectedItem, setSelectedItem] = useState<FileSystemItem | null>(null);
  const [isHomePage, setIsHomePage] = useState(false);
  const [allowedPaths, setAllowedPaths] = useState<Array<{path: string, name: string}>>([]);
  const [error, setError] = useState<string | null>(null);
  const [videoFilter, setVideoFilter] = useState<boolean>(false);

  useEffect(() => {
    // Update currentPath when URL parameter changes
    setCurrentPath(path);
    checkPathAccess(path);
  }, [path]);

  const checkPathAccess = async (checkPath: string) => {
    try {
      const params = new URLSearchParams({
        path: checkPath,
        depth: '1',
      });

      const response = await fetch(`/api/filesystem?${params}`);
      const data: FileSystemResponse = await response.json();

      if (data.isHomePage) {
        setIsHomePage(true);
        setAllowedPaths(data.allowedPaths || []);
      } else if (data.error) {
        setError(data.error);
        // If access denied, show home page with allowed paths
        if (response.status === 403) {
          setIsHomePage(true);
          setAllowedPaths(data.allowedPaths || []);
        }
      } else {
        setIsHomePage(false);
        setError(null);
      }
    } catch (err) {
      setError('Failed to check path access');
      console.error(err);
    }
  };

  const handleItemClick = (item: FileSystemItem) => {
    setSelectedItem(item);
    
    // Handle folder clicks - maintain existing behavior
    if (item.type === 'folder') {
      setCurrentPath(item.path);
      router.push(`/filesystem?path=${encodeURIComponent(item.path)}`);
      return;
    }
    
    // Handle video file clicks - redirect to video player
    if (item.type === 'file' && item.extension && VIDEO_EXTENSIONS.includes(item.extension.toLowerCase())) {
      // Convert filesystem path to player path format
      // Remove leading slashes and encode path segments
      const pathSegments = item.path
        .replace(/^\/+/, '') // Remove leading slashes
        .split('/')
        .map(segment => encodeURIComponent(segment));
      
      // Construct the player URL with filesystem prefix and external source
      const playerUrl = `/player/filesystem/${pathSegments.join('/')}?source=external`;
      console.log('Redirecting to video player:', playerUrl);
      router.push(playerUrl);
    }
    // For non-video files, maintain existing behavior (just select them)
  };

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    setSelectedItem(null);
    router.push(`/filesystem?path=${encodeURIComponent(path)}`);
  };

  const isVideoPath = currentPath.includes('videos') || currentPath.includes('Video');

  if (isHomePage) {
    return <HomePage allowedPaths={allowedPaths} />;
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/filesystem')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {isVideoPath ? 'Video Collections' : 'File System Explorer'}
        </h1>
        <div className="flex items-center gap-4">
          {isVideoPath && (
            <button
              onClick={() => setVideoFilter(!videoFilter)}
              className={`px-4 py-2 rounded text-sm ${
                videoFilter
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {videoFilter ? 'Show All Files' : 'Show Only Videos'}
            </button>
          )}
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Back to Video Streaming
          </button>
        </div>
      </div>
      
      {isVideoPath && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            📹 You're viewing video collections. Click on videos to watch them in the player.
          </p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <BreadcrumbNavigator
          currentPath={currentPath}
          onNavigate={handleNavigate}
          className="mb-4"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <FileSystemTree
              initialPath={currentPath}
              maxDepth={2}
              onItemClick={handleItemClick}
              videoFilter={videoFilter}
            />
          </div>
          
          <div className="border-l border-gray-200 pl-4">
            <h2 className="font-medium text-gray-700 mb-2">Details</h2>
            {selectedItem ? (
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Name:</span> {selectedItem.name}</p>
                <p><span className="text-gray-500">Type:</span> {selectedItem.type}</p>
                <p><span className="text-gray-500">Path:</span> {selectedItem.path}</p>
                {selectedItem.size && (
                  <p><span className="text-gray-500">Size:</span> {formatFileSize(selectedItem.size)}</p>
                )}
                {selectedItem.modified && (
                  <p><span className="text-gray-500">Modified:</span> {new Date(selectedItem.modified).toLocaleString()}</p>
                )}
                {selectedItem.type === 'file' && selectedItem.extension && VIDEO_EXTENSIONS.includes(selectedItem.extension.toLowerCase()) && (
                  <div className="mt-4 p-3 bg-green-50 rounded">
                    <p className="text-green-600 text-sm">
                      🎥 This video will open in the player when clicked
                    </p>
                    <button
                      onClick={() => handleItemClick(selectedItem)}
                      className="mt-2 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Play Video
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Select a file or folder to see details</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}