// src/app/videos-in-folder/[folder]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface VideoFile {
  name: string;
  path: string;
}

export default function VideosInMainFolder() {
  const params = useParams();
  const folder = params.folder as string;
  
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVideos() {
      try {
        const response = await fetch(`/api/videos/${folder}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch videos for ${folder}`);
        }
        const data = await response.json();
        setVideos(data);
        setLoading(false);
      } catch (err) {
        setError('Error loading videos. Please try again later.');
        setLoading(false);
        console.error('Error fetching videos:', err);
      }
    }

    if (folder) {
      fetchVideos();
    }
  }, [folder]);

  return (
    <div className="min-h-screen p-8 pb-20 gap-8 flex flex-col">
      <header className="flex items-center justify-between w-full border-b pb-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Image
              src="/next.svg"
              alt="Next.js Logo"
              width={120}
              height={25}
              className="dark:invert cursor-pointer"
              priority
            />
          </Link>
          <h1 className="text-2xl font-bold ml-2">Video Streaming</h1>
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto mt-8">
        <div className="flex items-center mb-6">
          <Link href={`/videos/${folder}`} className="text-blue-600 hover:underline mr-2">
            ← Back to {decodeURIComponent(folder)} Collections
          </Link>
          <h2 className="text-xl font-semibold capitalize">
            Videos in {decodeURIComponent(folder)}
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading videos...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-12">{error}</div>
        ) : videos.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-lg mb-4">No videos found in this folder</p>
            <p className="text-sm text-gray-500">
              Add some video files to the public/videos/{folder}/ directory
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div 
                key={video.name}
                className="bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
              >
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
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    ></path>
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    ></path>
                  </svg>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-medium truncate" title={video.name}>
                    {video.name}
                  </h3>
                  <div className="mt-4 flex justify-between items-center">
                    <Link 
                      href={`/player/${encodeURIComponent(folder)}/${encodeURIComponent(video.name)}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      Play Video
                    </Link>
                    <a 
                      href={video.path} 
                      download
                      className="text-blue-600 hover:underline"
                    >
                      Download
                    </a>
                  </div>
                </div>
              </div>
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