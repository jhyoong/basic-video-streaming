import type { NextConfig } from "next";
import path from 'path';
import fs from 'fs';

// Define the external videos path - this can be loaded from environment variables
const externalVideosPath = process.env.EXTERNAL_VIDEOS_PATH || '';

// Validate that the path exists if specified
if (externalVideosPath && !fs.existsSync(externalVideosPath)) {
  console.warn(`Warning: EXTERNAL_VIDEOS_PATH "${externalVideosPath}" does not exist or is not accessible`);
}

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    // Make the path available to the client-side code
    EXTERNAL_VIDEOS_PATH: externalVideosPath,
    // Flag to indicate if external path is configured
    HAS_EXTERNAL_VIDEOS: Boolean(externalVideosPath).toString()
  }
};

export default nextConfig;
