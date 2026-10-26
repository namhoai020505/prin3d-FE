import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { StaffSidebar } from './StaffSidebar';
import './staff.css';

export type ThemeMode = 'dark' | 'light';

export interface StaffOutletContext {
  themeMode: ThemeMode;
  isDark: boolean;
  isLightMode: boolean;
}

const THEME_STORAGE_KEY = 'g2c-theme';

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') {
    return 'dark';
  }
  return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
};

export const StaffLayout: React.FC = () => {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);
  const isDark = themeMode === 'dark';
  const isLightMode = !isDark;

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.classList.toggle('light', isLightMode);
    document.documentElement.classList.toggle('dark', isDark);
    document.body.classList.toggle('g2c-light-mode', isLightMode);
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [isDark, isLightMode, themeMode]);

  const toggleTheme = () => {
    setThemeMode((current) => (current === 'light' ? 'dark' : 'light'));
  };

  return (
    <div
      className="staff-portal"
      data-staff-theme={themeMode}
    >
      <StaffSidebar isDark={isDark} onToggleTheme={toggleTheme} />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet context={{ themeMode, isDark, isLightMode } satisfies StaffOutletContext} />
      </main>
    </div>
  );
};

export default StaffLayout;
