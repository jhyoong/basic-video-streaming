// src/app/videos/[folder]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Subfolder {
  name: string;
  path: string;
  videoCount: number;
}

interface FolderInfo {
  hasVideos: boolean;
  videoCount: number;
  hasSubfolders: boolean;
  subfolderCount: number;
}

export default function FolderPage() {
  const params = useParams();
  const folder = params.folder as string;
  
  const [subfolders, setSubfolders] = useState<Subfolder[]>([]);
  const [folderInfo, setFolderInfo] = useState<FolderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch subfolders
        const subfoldersResponse = await fetch(`/api/subfolders/${folder}`);
        if (!subfoldersResponse.ok) {
          const errorData = await subfoldersResponse.json().catch(() => ({ error: 'Failed to parse error response' }));
          throw new Error(errorData.error || `Failed to fetch subfolders: ${subfoldersResponse.status}`);
        }
        const subfoldersData = await subfoldersResponse.json();
        setSubfolders(subfoldersData);
        
        // Check if the folder has videos directly in it
        try {
          const folderInfoResponse = await fetch(`/api/folder-has-videos/${folder}`);
          if (folderInfoResponse.ok) {
            const folderInfoData = await folderInfoResponse.json();
            setFolderInfo(folderInfoData);
          } else {
            console.error(`Failed to fetch folder info: ${folderInfoResponse.status}`);
            // Don't throw here, we can continue without this info
          }
        } catch (folderInfoErr) {
          console.error('Error fetching folder info:', folderInfoErr);
          // Don't set error state, we can continue without this info
        }
        
        setLoading(false);
      } catch (err) {
        setError(`Error loading data: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
        console.error('Error fetching data:', err);
      }
    }

    if (folder) {
      fetchData();
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Link href="/" className="text-blue-600 hover:underline mr-2">
              ← Back to Collections
            </Link>
            <h2 className="text-xl font-semibold capitalize">
              {folder} Collections
            </h2>
          </div>
          
          {folderInfo && folderInfo.hasVideos && (
            <Link
              href={`/videos-in-folder/${folder}`}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              View {folderInfo.videoCount} Videos in This Folder
            </Link>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">Loading subfolders...</div>
        ) : error ? (
          <div className="text-red-500 text-center py-12">{error}</div>
        ) : subfolders.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-lg mb-4">No subfolders found</p>
            <p className="text-sm text-gray-500">
              Create subfolders in public/videos/{folder}/ to organize your videos
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subfolders.map((subfolder) => (
              <Link
                href={`/videos/${folder}/${subfolder.name}`}
                key={subfolder.name}
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
                        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      ></path>
                    </svg>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-medium capitalize group-hover:text-blue-600 transition-colors">
                      {subfolder.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {subfolder.videoCount} videos
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