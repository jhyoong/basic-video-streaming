// components/HomePage.tsx
'use client';

import React from 'react';
import Link from 'next/link';

interface HomePageProps {
  allowedPaths: Array<{path: string, name: string}>;
}

export function HomePage({ allowedPaths }: HomePageProps) {
  // Separate video paths from other paths
  const videoPaths = allowedPaths.filter(p => 
    p.name.toLowerCase().includes('video') || 
    p.path.endsWith('/videos') ||
    p.path.includes('videos/')
  );
  
  const otherPaths = allowedPaths.filter(p => !videoPaths.includes(p));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">File System Explorer</h1>
        <p className="text-gray-600">
          Select a directory below to start browsing files
        </p>
      </div>
      
      {videoPaths.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">📹 Video Collections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videoPaths.map((allowedPath) => (
              <Link
                key={allowedPath.path}
                href={`/filesystem?path=${encodeURIComponent(allowedPath.path)}`}
                className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🎬</span>
                  <div>
                    <h3 className="font-medium text-gray-800">{allowedPath.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {allowedPath.path}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {otherPaths.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-4">📂 File Directories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherPaths.map((allowedPath) => (
              <Link
                key={allowedPath.path}
                href={`/filesystem?path=${encodeURIComponent(allowedPath.path)}`}
                className="block p-6 bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📁</span>
                  <div>
                    <h3 className="font-medium text-gray-800">{allowedPath.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {allowedPath.path}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {allowedPaths.length === 0 && (
        <div className="text-center mt-12">
          <p className="text-gray-500">
            No paths are currently configured. Please contact your administrator.
          </p>
        </div>
      )}
      
      <div className="mt-12 text-center">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← Back to Video Streaming
        </Link>
      </div>
    </div>
  );
}