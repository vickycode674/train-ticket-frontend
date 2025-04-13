// app/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login'); // Redirect to login page
  }, [router]);

  return null; // You can return a loader here if you want
}
