import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function MainLayout({ title, subtitle, children }) {
  return (
    <div className="app-shell min-h-screen md:flex">
      <Sidebar />
      <div className="flex-1 pb-6">
        <Header title={title} subtitle={subtitle} />
        <main className="page-content px-4 pb-4 pt-5 md:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
