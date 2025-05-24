// src/components/LogoutButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface LogoutButtonProps {
  className?: string;
}

export function LogoutButton({ className = '' }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    
    try {
      console.log('Initiating logout...');
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Ensure cookies are included
      });

      console.log('Logout response status:', response.status);

      if (response.ok) {
        console.log('Logout successful, clearing client state...');
        
        // Force a hard refresh to clear any client-side state
        window.location.href = '/login';
      } else {
        console.error('Logout failed with status:', response.status);
        // Even if logout API fails, try to redirect to login
        window.location.href = '/login';
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, redirect to login
      window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:underline disabled:opacity-50 ${className}`}
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  );
}