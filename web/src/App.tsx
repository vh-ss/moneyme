import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard.tsx';
import Transactions from './pages/Transactions.tsx';
import Analytics from './pages/Analytics.tsx';
import Accounts from './pages/Accounts.tsx';
import Categories from './pages/Categories.tsx';
import Settings from './pages/Settings.tsx';

const NAV = [
  { to: '/', label: 'Огляд', end: true },
  { to: '/transactions', label: 'Операції' },
  { to: '/analytics', label: 'Аналітика' },
  { to: '/accounts', label: 'Рахунки' },
  { to: '/categories', label: 'Категорії' },
  { to: '/settings', label: 'Налаштування' },
];

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-3 overflow-x-auto">
          <div className="mr-4 flex items-center gap-2 font-bold text-lg">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-white">₴</span>
            MoneyMe
          </div>
          <nav className="flex gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `btn ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  );
}
