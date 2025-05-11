// components/FileSystemTree.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileSystemItem } from '../app/api/filesystem/route';
import { getFileTypeInfo } from '@/lib/config/fileFilters';

interface FileSystemTreeProps {
  initialPath: string;
  maxDepth?: number;
  onItemClick?: (item: FileSystemItem) => void;
  className?: string;
  videoFilter?: boolean;
}

const VIDEO_EXTENSIONS = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'];

export function FileSystemTree({
  initialPath,
  maxDepth = 2,
  onItemClick,
  className = '',
  videoFilter = false,
}: FileSystemTreeProps) {
  const [items, setItems] = useState<FileSystemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const fetchItems = useCallback(async (path: string, depth: number = maxDepth) => {
    try {
      const params = new URLSearchParams({
        path,
        depth: depth.toString(),
      });

      const response = await fetch(`/api/filesystem?${params}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return null;
      }

      return data.items || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
      return null;
    }
  }, [maxDepth]);

  useEffect(() => {
    const loadInitialItems = async () => {
      setLoading(true);
      const items = await fetchItems(initialPath);
      if (items) {
        setItems(items);
      }
      setLoading(false);
    };

    loadInitialItems();
  }, [initialPath, fetchItems]);

  const toggleFolder = async (folder: FileSystemItem) => {
    const newExpandedFolders = new Set(expandedFolders);
    
    if (expandedFolders.has(folder.id)) {
      newExpandedFolders.delete(folder.id);
    } else {
      newExpandedFolders.add(folder.id);
      
      // If folder doesn't have children loaded yet, fetch them
      if (!folder.children) {
        const children = await fetchItems(folder.path, 1);
        if (children) {
          folder.children = children;
          // Force re-render by updating the items array
          setItems([...items]);
        }
      }
    }
    
    setExpandedFolders(newExpandedFolders);
  };

  const filterItems = (items: FileSystemItem[]): FileSystemItem[] => {
    if (!videoFilter) return items;
    
    return items.filter(item => {
      if (item.type === 'folder') {
        // Keep folders - they might contain videos
        return true;
      } else {
        // Only keep video files
        return item.extension && VIDEO_EXTENSIONS.includes(item.extension.toLowerCase());
      }
    });
  };

  const renderItem = (item: FileSystemItem, level: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(item.id);
    const indent = level * 20;
    const fileInfo = item.type === 'file' ? getFileTypeInfo(item.extension || '') : null;
    const isVideoFile = item.type === 'file' && item.extension && VIDEO_EXTENSIONS.includes(item.extension.toLowerCase());

    // Apply filter
    const displayChildren = item.children ? filterItems(item.children) : [];

    return (
      <div key={item.id}>
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer rounded transition-colors ${
            isVideoFile ? 'hover:bg-green-50' : ''
          } ${className}`}
          style={{ marginLeft: `${indent}px` }}
          onClick={() => {
            if (item.type === 'folder') {
              toggleFolder(item);
            }
            onItemClick?.(item);
          }}
        >
          {item.type === 'folder' && (
            <span className="mr-2 text-gray-400">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          
          <span className="mr-2">
            {item.type === 'folder' ? '📁' : fileInfo?.icon || '📄'}
          </span>
          
          <span className={`flex-1 text-sm ${
            item.type === 'file' && fileInfo ? fileInfo.color : 'text-gray-700'
          } ${isVideoFile ? 'font-medium' : ''}`}>
            {item.name}
          </span>
          
          {isVideoFile && (
            <span className="text-green-600 text-xs ml-2">▶ Video</span>
          )}
          
          {item.type === 'file' && item.size && (
            <span className="text-xs text-gray-400 ml-2">
              {formatFileSize(item.size)}
            </span>
          )}
        </div>
        
        {item.type === 'folder' && isExpanded && displayChildren.length > 0 && (
          <div>
            {displayChildren.map(child => renderItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 p-4 bg-red-50 rounded">
        Error: {error}
      </div>
    );
  }

  const displayItems = filterItems(items);

  return (
    <div className="border rounded bg-white overflow-auto" style={{ maxHeight: '500px' }}>
      {displayItems.length === 0 && videoFilter ? (
        <div className="p-4 text-center text-gray-500">
          No video files found in this directory.
        </div>
      ) : (
        displayItems.map(item => renderItem(item))
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}