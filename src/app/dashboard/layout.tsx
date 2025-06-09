import Header from '@/components/layout/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
         CableEye &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
