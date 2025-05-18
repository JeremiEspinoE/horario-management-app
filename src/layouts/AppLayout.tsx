
import React from 'react';
import Sidebar from '@/components/Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 ml-64 p-6">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
