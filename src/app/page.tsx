// src/app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface VideoFolder {
  name: string;
  path: string;
  hasSubfolders: boolean;
  subfolderCount: number;
}

export default function Home() {
  const [folders, setFolders] = useState<VideoFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVideoFolders() {
      try {
        const response = await fetch('/api/video-folders');
        if (!response.ok) {
          throw new Error('Failed to fetch video folders');
        }
        const data = await response.json();
        setFolders(data);
        setLoading(false);
      } catch (err) {
        setError('Error loading video folders. Please try again later.');
        setLoading(false);
        console.error('Error fetching video folders:', err);
      }
    }

    fetchVideoFolders();
  }, []);

  return (
    <div className="min-h-screen p-8 pb-20 gap-8 flex flex-col">
      <header className="flex items-center justify-between w-full border-b pb-4">
        <div className="flex items-center gap-4">
          <Image
            src="/next.svg"
            alt="Next.js Logo"
            width={120}
            height={25}
            className="dark:invert"
            priority
          />
          <h1 className="text-2xl font-bold ml-2">Video Streaming</h1>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto mt-8">
        <h2 className="text-xl font-semibold mb-6">Video Collections</h2>

        {loading ? (
          <div className="text-center py-12">Loading video folders...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-12">{error}</div>
        ) : folders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-lg mb-4">No video folders found</p>
            <p className="text-sm text-gray-500">
              Create folders in public/videos/ to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {folders.map((folder) => (
              <Link
                href={`/videos/${folder.name}`}
                key={folder.name}
                className="block group"
              >
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md">
                  <div className="h-40 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <svg 
                      className="w-16 h-16 text-gray-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24" 
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="2" 
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      ></path>
                    </svg>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-medium capitalize group-hover:text-blue-600 transition-colors">
                      {folder.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {folder.hasSubfolders 
                        ? `${folder.subfolderCount} subfolders` 
                        : "Video Collection"}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t pt-6 mt-12 text-center text-sm text-gray-500">
        <p>Basic Video Streaming App - Built with Next.js</p>
      </footer>
    </div>
  );
}