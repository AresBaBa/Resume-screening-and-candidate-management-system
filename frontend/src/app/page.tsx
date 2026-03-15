'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useUserStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/resumes');
    } else {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-200"></div>
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}
