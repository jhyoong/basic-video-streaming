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
  // Split the path into segments
  const segments = currentPath.split(path.sep).filter(segment => segment !== '');
  
  // For Windows, preserve the drive letter
  if (currentPath.match(/^[A-Za-z]:/)) {
    segments[0] = segments[0] + path.sep;
  }
  
  // Build the breadcrumbs
  const breadcrumbs = segments.map((segment, index) => {
    // Build the path up to this segment
    const pathSegments = segments.slice(0, index + 1);
    const fullPath = pathSegments.join(path.sep);
    const isLast = index === segments.length - 1;
    
    return {
      label: segment === '' ? 'Root' : segment,
      path: fullPath || '/',
      isLast,
    };
  });
  
  // Add a root element if we don't have one
  if (breadcrumbs.length === 0 || !currentPath.startsWith('/')) {
    breadcrumbs.unshift({
      label: 'Root',
      path: '/',
      isLast: false,
    });
  }

  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`}>
      {breadcrumbs.map((breadcrumb, index) => (
        <React.Fragment key={index}>
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
              onClick={() => onNavigate(breadcrumb.path)}
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