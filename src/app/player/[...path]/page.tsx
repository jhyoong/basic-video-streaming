// src/app/player/[...path]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';

export default function VideoPlayer() {
  const params = useParams();
  const path = params.path as string[];
  
  if (!path || path.length < 2) {
    return <div>Invalid video path</div>;
  }
  
  // The last segment is always the video name
  const videoName = path[path.length - 1];
  const decodedVideoName = decodeURIComponent(videoName);
  
  // Determine if we're in a main folder or subfolder
  const folder = path[0];
  const subfolder = path.length > 2 ? path[1] : null;
  
  // Build the video path
  const videoPath = `/videos/${path.join('/')}`;
  
  // Build the return path
  const returnPath = subfolder 
    ? `/videos/${folder}/${subfolder}` 
    : `/videos/${folder}`;
  
  // Display text for the collection
  const collectionText = subfolder 
    ? `${decodeURIComponent(folder)} / ${decodeURIComponent(subfolder)}` 
    : decodeURIComponent(folder);

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="p-4 bg-gray-900">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Image
                src="/next.svg"
                alt="Next.js Logo"
                width={100}
                height={20}
                className="invert"
                priority
              />
            </Link>
            <h1 className="text-xl font-bold ml-2 hidden sm:block">Video Streaming</h1>
          </div>
          <Link 
            href={returnPath}
            className="text-sm text-blue-400 hover:underline"
          >
            ← Back to {subfolder ? decodeURIComponent(subfolder) : decodeURIComponent(folder)}
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl mx-auto bg-gray-900 rounded-lg overflow-hidden shadow-lg">
          <div className="aspect-video bg-black flex items-center justify-center">
            <video 
              controls 
              autoPlay 
              className="w-full h-full" 
              src={videoPath}
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="p-4">
            <h1 className="text-xl font-semibold mb-2">{decodedVideoName}</h1>
            <p className="text-gray-400 text-sm mb-4">
              From collection: <span className="capitalize">{collectionText}</span>
            </p>
            <div className="flex gap-4">
              <a
                href={videoPath}
                download
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
              >
                Download Video
              </a>
              <Link
                href={returnPath}
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors text-sm"
              >
                Back to Collection
              </Link>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="p-4 bg-gray-900 text-center text-sm text-gray-500">
        <p>Basic Video Streaming App - Built with Next.js</p>
      </footer>
    </div>
  );
}