// src/app/page.tsx
// 'use client';

// import { useEffect } from 'react';
// import { useRouter } from 'next/navigation';

// export default function Home() {
//   const router = useRouter();

//   useEffect(() => {
//     // Redirect to filesystem page
//     router.push('/filesystem');
//   }, [router]);

//   return (
//     <div className="min-h-screen p-8 pb-20 gap-8 flex flex-col items-center justify-center">
//       <div className="text-center">
//         <p className="text-lg">Redirecting to file system...</p>
//       </div>
//     </div>
//   );
// }

// src/app/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function Home() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  // If logged in, redirect to filesystem
  redirect('/filesystem');
}