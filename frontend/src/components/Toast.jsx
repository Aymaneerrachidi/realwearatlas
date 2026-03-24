import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const ToastCtx = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastId;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  }, []);

  const dismiss = useCallback((id) => setToasts(p => p.filter(t => t.id !== id)), []);

  return (
    <ToastCtx.Provider value={addToast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl
                       bg-[#1c1c1f] border border-white/10 shadow-xl shadow-black/40
                       animate-slide-up min-w-[260px] max-w-xs"
          >
            {t.type === 'success' && <CheckCircle size={15} className="text-emerald-400 shrink-0" />}
            {t.type === 'error'   && <XCircle     size={15} className="text-rose-400 shrink-0" />}
            {t.type === 'warning' && <AlertCircle size={15} className="text-amber-400 shrink-0" />}
            <p className="text-sm text-[#e8e8e6] flex-1 leading-snug">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-[#555] hover:text-[#999] transition-colors">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
