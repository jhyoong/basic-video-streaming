// src/app/videos-in-folder/[folder]/page.tsx
'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

export default function VideosInMainFolder() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const folder = params.folder as string;
  const isExternal = searchParams.get('source') === 'external';

  useEffect(() => {
    // Determine the base video path
    const basePath = isExternal 
      ? process.env.EXTERNAL_VIDEOS_PATH || ''
      : `/videos`;
    
    // Build the full path for the folder
    const fullPath = `${basePath}/${folder}`;
    
    // Redirect to filesystem page with the appropriate path
    // Add a flag to indicate we want to see videos in this folder
    router.push(`/filesystem?path=${encodeURIComponent(fullPath)}&videoFilter=true`);
  }, [router, folder, isExternal]);

  return (
    <div className="min-h-screen p-8 pb-20 gap-8 flex flex-col items-center justify-center">
      <div className="text-center">
        <p className="text-lg">
          Redirecting to videos in {folder}...
        </p>
        <div className="mt-4">
          <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    </div>
  );
}