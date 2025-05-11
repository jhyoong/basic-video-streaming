// components/BreadcrumbNavigator.tsx
'use client';

import React from 'react';
import path from 'path';

interface BreadcrumbNavigatorProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  className?: string;
}

export function BreadcrumbNavigator({
  currentPath,
  onNavigate,
  className = '',
}: BreadcrumbNavigatorProps) {
  // Normalize the path to handle different path separators consistently
  const normalizedPath = currentPath.replace(/\\/g, '/');
  
  // Split the path into segments
  const segments = normalizedPath.split('/').filter(segment => segment !== '');
  
  // For Windows, preserve the drive letter
  let isWindows = false;
  if (currentPath.match(/^[A-Za-z]:/)) {
    isWindows = true;
    if (segments.length > 0 && segments[0].match(/^[A-Za-z]:$/)) {
      // Convert C: to C:/ for proper path joining
      segments[0] = segments[0] + '/';
    }
  }
  
  // Build the breadcrumbs
  const breadcrumbs = [];
  
  // Add root element
  if (currentPath.startsWith('/') || normalizedPath === '/') {
    breadcrumbs.push({
      label: '/',
      path: '/',
      isLast: false,
    });
  }
  
  // Add the segments
  segments.forEach((segment, index) => {
    // Build the path up to this segment
    let fullPath;
    
    if (isWindows && index === 0 && segment.endsWith(':')) {
      // Windows drive letter
      fullPath = segment.replace(':', ':/');
    } else if (isWindows && index === 0 && segment.endsWith(':/')) {
      // Windows drive with slash
      fullPath = segment;
    } else {
      // Regular path segments
      const pathSegments = segments.slice(0, index + 1);
      if (isWindows && pathSegments[0].endsWith(':/')) {
        pathSegments[0] = pathSegments[0].replace('/:', ':');
      }
      
      if (currentPath.startsWith('/')) {
        fullPath = '/' + pathSegments.join('/');
      } else {
        fullPath = pathSegments.join('/');
      }
    }
    
    const isLast = index === segments.length - 1;
    const label = segment.replace(':/', ':'); // Clean up display for Windows drives
    
    breadcrumbs.push({
      label: label || 'Root',
      path: fullPath,
      isLast,
    });
  });
  
  // If we have no segments and no root, add a default root
  if (breadcrumbs.length === 0) {
    breadcrumbs.push({
      label: 'Root',
      path: '/',
      isLast: true,
    });
  }

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`}>
      {breadcrumbs.map((breadcrumb, index) => (
        <React.Fragment key={`${breadcrumb.path}-${index}`}>
          {index > 0 && (
            <span className="text-gray-400">
              /
            </span>
          )}
          {breadcrumb.isLast ? (
            <span className="text-gray-900 font-medium">
              {breadcrumb.label}
            </span>
          ) : (
            <button
              onClick={() => {
                console.log(`BreadcrumbNavigator: Navigating to ${breadcrumb.path}`);
                onNavigate(breadcrumb.path);
              }}
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {breadcrumb.label}
            </button>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}