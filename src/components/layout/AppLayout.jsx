import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './layout.css';

export default function AppLayout({ children }) {
  return (
    <div className="gr-shell">
      <Sidebar />
      <div className="gr-main">
        <Topbar />
        <div className="gr-page">{children}</div>
      </div>
    </div>
  );
}
