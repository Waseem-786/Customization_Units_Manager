/**
 * Icons — minimal lucide-style SVG icon set used across the app.
 * Stroke 1.75, 16x16 default, currentColor.
 */
import type { CSSProperties } from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
}

const base = (size = 16, className?: string, style?: CSSProperties, sw = 1.75) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: sw,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  style
});

export const I = {
  Home: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Settings: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Folder: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  ),
  FolderOpen: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  File: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  ChevronRight: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  ChevronDown: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  ChevronLeft: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ArrowLeft: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  ),
  ArrowRight: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  ),
  Plus: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  RefreshCw: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <polyline points="21 3 21 8 16 8" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <polyline points="3 21 3 16 8 16" />
    </svg>
  ),
  Search: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Sun: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  ),
  Moon: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  Layers: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Database: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  ),
  Code: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  Eye: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  ),
  Layout: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
  GitMerge: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M6 21V9a9 9 0 0 0 9 9" />
    </svg>
  ),
  GitBranch: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  ),
  AlertTriangle: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  CheckCircle: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  XCircle: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  X: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Sparkles: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z" />
    </svg>
  ),
  Tree: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <path d="M12 22V8" />
      <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
      <circle cx="12" cy="6" r="4" />
    </svg>
  ),
  Package: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="M3.3 7 12 12l8.7-5" />
      <path d="M12 22V12" />
    </svg>
  ),
  PanelLeft: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  ),
  Loader: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  ),
  Edit: (p: IconProps = {}) => (
    <svg {...base(p.size, p.className, p.style, p.strokeWidth)}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
};
