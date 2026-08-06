import { HashRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';
import { ThemeProvider } from '../context/ThemeContext';
import { SettingsProvider } from '../context/SettingsContext';
import { RolesProvider } from '../context/RolesContext';
import { ToastProvider } from '../components/Toast';
import type { ReactNode } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <SettingsProvider>
            <RolesProvider>
              <ToastProvider>
                <HashRouter>{children}</HashRouter>
              </ToastProvider>
            </RolesProvider>
          </SettingsProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
