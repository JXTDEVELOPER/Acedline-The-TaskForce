import React from 'react';
import { ThemeSettings } from '../hooks/useSettings';

interface ThemeInjectorProps {
  theme?: ThemeSettings;
}

export function ThemeInjector({ theme }: ThemeInjectorProps) {
  if (!theme) return null;

  const css = `
    :root, .dark {
      ${theme.backgroundColor ? `--color-natural-bg: ${theme.backgroundColor} !important;` : ''}
      ${theme.panelColor ? `--color-natural-panel: ${theme.panelColor} !important;` : ''}
      ${theme.accentColor ? `--color-natural-accent: ${theme.accentColor} !important;` : ''}
      ${theme.fontColor ? `--color-natural-text-primary: ${theme.fontColor} !important;` : ''}
      ${theme.fontColor ? `--color-natural-text-dark: ${theme.fontColor} !important;` : ''}
      ${theme.fontFamily ? `--font-sans: ${theme.fontFamily}, ui-sans-serif, system-ui, sans-serif !important;` : ''}
    }
  `;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
