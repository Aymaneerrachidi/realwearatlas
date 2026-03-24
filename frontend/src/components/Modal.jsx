import { X } from 'lucide-react';
import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const desktopSizes = { sm: 'lg:max-w-md', md: 'lg:max-w-lg', lg: 'lg:max-w-2xl', xl: 'lg:max-w-3xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center lg:justify-center lg:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet — slides up from bottom on mobile, centered on desktop */}
      <div
        className={`
          relative w-full ${desktopSizes[size]}
          rounded-t-3xl lg:rounded-2xl
          p-5 lg:p-6
          shadow-2xl shadow-black/50
          animate-slide-up
          max-h-[92dvh] overflow-y-auto
        `}
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile only) */}
        <div className="lg:hidden flex justify-center mb-4 -mt-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--input-text)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            style={{ color: 'var(--input-placeholder)' }}
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
