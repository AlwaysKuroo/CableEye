'use client';

import { Button } from '@/components/ui/button';
import { LogOut, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Header() {
  const router = useRouter();

  const handleLogout = () => {
    // Mock logout logic
    console.log('Logging out...');
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-accent" />
          <span className="font-headline text-2xl font-bold text-accent">CableEye</span>
        </Link>
        <Button variant="ghost" onClick={handleLogout} className="font-headline">
          <LogOut className="mr-2 h-5 w-5" />
          Logout
        </Button>
      </div>
    </header>
  );
}
