// src/app/player/[...path]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';

interface SubtitleTrack {
  index: number;
  language: string;
  label: string;
  url: string;
}

export default function VideoPlayer() {
  const params = useParams();
  const searchParams = useSearchParams();
  const path = params.path as string[];
  const isExternal = searchParams.get('source') === 'external';
  const source = isExternal ? 'external' : 'internal';
  const videoRef = useRef<HTMLVideoElement>(null);
  const [subtitles, setSubtitles] = useState<SubtitleTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [subtitlesLoading, setSubtitlesLoading] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<number | null>(null);
  const [videoReady, setVideoReady] = useState(false);
    
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
  const videoPath = `/api/videos/${path.join('/')}?source=${source}`;
  
  // Build the return path
  const returnPath = subfolder 
    ? `/videos/${folder}/${subfolder}?source=${source}` 
    : `/videos/${folder}?source=${source}`;
  
  // Display text for the collection
  const collectionText = subfolder 
    ? `${decodeURIComponent(folder)} / ${decodeURIComponent(subfolder)}` 
    : decodeURIComponent(folder);

  useEffect(() => {
    async function fetchAndProcessSubtitles() {
      // Check if the filename ends with .mkv
      if (decodedVideoName.toLowerCase().endsWith('.mkv')) {
        setSubtitlesLoading(true);
        try {
          console.log("Extracting subtitles for", decodedVideoName);
          
          // First, make a call to extract subtitles (this ensures they're processed and cached)
          // Pass the source parameter to the API
          const extractResponse = await fetch(`/api/extract-subtitles/${path.join('/')}?source=${source}`);
          if (!extractResponse.ok) {
            console.warn('Subtitle extraction may have failed:', extractResponse.status);
          } else {
            console.log('Subtitle extraction completed successfully');
          }
          
          // Then, fetch the extracted subtitle information
          // Pass the source parameter to the API
          const subtitlesResponse = await fetch(`/api/video-subtitles/${path.join('/')}?source=${source}`);
          if (subtitlesResponse.ok) {
            const data = await subtitlesResponse.json();
            console.log("Subtitle data received:", data);
            
            if (data.subtitles && data.subtitles.length > 0) {
              setSubtitles(data.subtitles);
              setSelectedTrack(0); // Auto-select first track
            }
          } else {
            console.error('Failed to fetch subtitles, status:', subtitlesResponse.status);
          }
        } catch (error) {
          console.error('Error processing subtitles:', error);
        } finally {
          setSubtitlesLoading(false);
          setVideoReady(true);
        }
      } else {
        console.log("Not an MKV file, skipping subtitle processing for", decodedVideoName);
        setVideoReady(true);
      }
      setLoading(false);
    }

    fetchAndProcessSubtitles();
  }, [decodedVideoName, path, source]);

  // Effect to handle track selection when video element is available
  useEffect(() => {
    if (videoRef.current && subtitles.length > 0) {
      console.log("Setting up subtitle tracks on video element");
      
      // Set the mode for each track based on selection
      setTimeout(() => {
        if (videoRef.current) {
          const tracks = videoRef.current.textTracks;
          console.log("Text tracks available:", tracks.length);
          
          for (let i = 0; i < tracks.length; i++) {
            tracks[i].mode = selectedTrack === i ? 'showing' : 'hidden';
            console.log(`Track ${i} mode set to ${tracks[i].mode}`);
          }
        }
      }, 500); // Small delay to ensure tracks are loaded
    }
  }, [subtitles, selectedTrack]);

  // Function to handle subtitle track selection
  const handleSubtitleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    console.log("Subtitle selection changed to:", value);
    
    if (value === 'off') {
      setSelectedTrack(null);
      
      // Hide all text tracks
      if (videoRef.current) {
        const tracks = videoRef.current.textTracks;
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].mode = 'hidden';
        }
      }
    } else {
      const index = parseInt(value, 10);
      setSelectedTrack(index);
      
      // Make the selected track active
      if (videoRef.current) {
        const tracks = videoRef.current.textTracks;
        for (let i = 0; i < tracks.length; i++) {
          tracks[i].mode = i === index ? 'showing' : 'hidden';
        }
      }
    }
  };

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
            <h1 className="text-xl font-bold ml-2 hidden sm:block">
              {isExternal ? 'External Video Player' : 'Video Player'}
            </h1>
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
          {!videoReady && decodedVideoName.toLowerCase().endsWith('.mkv') ? (
            <div className="aspect-video bg-black flex items-center justify-center">
              <div className="text-center">
                <div className="mb-4">
                  {subtitlesLoading ? (
                    <>
                      <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p>Preparing video and extracting subtitles...</p>
                    </>
                  ) : (
                    <p>Loading video...</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-black flex items-center justify-center">
              <video 
                ref={videoRef}
                controls 
                autoPlay 
                className="w-full h-full" 
                src={videoPath}
              >
                {/* Add subtitle tracks if available */}
                {subtitles.map((track, index) => (
                  <track 
                    key={track.index}
                    kind="subtitles"
                    src={track.url}
                    srcLang={track.language}
                    label={track.label}
                    default={index === selectedTrack}
                  />
                ))}
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          <div className="p-4">
            <h1 className="text-xl font-semibold mb-2">{decodedVideoName}</h1>
            <p className="text-gray-400 text-sm mb-4">
              From collection: <span className="capitalize">{collectionText}</span>
            </p>
            
            {subtitles.length > 0 && (
              <div className="mb-4">
                <label htmlFor="subtitle-select" className="text-sm text-gray-300 block mb-2">
                  Subtitles:
                </label>
                <select 
                  id="subtitle-select"
                  className="bg-gray-800 text-white rounded px-3 py-2 w-full max-w-xs"
                  onChange={handleSubtitleChange}
                  value={selectedTrack !== null ? selectedTrack.toString() : 'off'}
                >
                  <option value="off">Off</option>
                  {subtitles.map((track, index) => (
                    <option key={track.index} value={index}>
                      {track.label} ({track.language})
                    </option>
                  ))}
                </select>
              </div>
            )}
            
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
        <p>Video Streaming App - Built with Next.js</p>
      </footer>
    </div>
  );
}