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
}

export function FileSystemTree({
  initialPath,
  maxDepth = 2,
  onItemClick,
  className = '',
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

  const renderItem = (item: FileSystemItem, level: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(item.id);
    const indent = level * 20;
    const fileInfo = item.type === 'file' ? getFileTypeInfo(item.extension || '') : null;

    return (
      <div key={item.id}>
        <div
          className={`flex items-center py-1 px-2 hover:bg-gray-100 cursor-pointer rounded transition-colors ${className}`}
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
          
          <span className={`flex-1 text-sm ${item.type === 'file' && fileInfo ? fileInfo.color : 'text-gray-700'}`}>
            {item.name}
          </span>
          
          {item.type === 'file' && item.size && (
            <span className="text-xs text-gray-400 ml-2">
              {formatFileSize(item.size)}
            </span>
          )}
        </div>
        
        {item.type === 'folder' && isExpanded && item.children && (
          <div>
            {item.children.map(child => renderItem(child, level + 1))}
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

  return (
    <div className="border rounded bg-white overflow-auto" style={{ maxHeight: '500px' }}>
      {items.map(item => renderItem(item))}
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