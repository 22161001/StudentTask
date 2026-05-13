import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import FeedbackBanner from '../components/FeedbackBanner';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function MainLayout({ title, subtitle, children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const routeMessage = location.state?.message;

  useEffect(() => {
    if (!isMobileSidebarOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMobileSidebarOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const closeMobileSidebar = () => {
      if (desktopQuery.matches) {
        setIsMobileSidebarOpen(false);
      }
    };

    closeMobileSidebar();
    desktopQuery.addEventListener('change', closeMobileSidebar);

    return () => desktopQuery.removeEventListener('change', closeMobileSidebar);
  }, []);

  return (
    <div className="app-shell min-h-screen lg:flex">
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      <div className="relative z-0 flex min-w-0 flex-1 flex-col pb-6">
        <Header
          title={title}
          subtitle={subtitle}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />
        <main className="page-content px-4 pb-4 pt-4 md:px-6 lg:px-8">
          {routeMessage ? <FeedbackBanner type="error" message={routeMessage} className="mb-5" /> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
