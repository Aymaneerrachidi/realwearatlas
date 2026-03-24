import { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';

export default function ExportMenu({ onCSV, onPDF }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="btn-ghost gap-1.5">
        <Download size={13} /> Export
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-40 rounded-xl border border-white/[0.09]
                        bg-[#1c1c1f] shadow-xl shadow-black/40 overflow-hidden z-50 animate-fade-in"
             style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
          <button
            onClick={() => { onCSV(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-3 text-sm text-[#aaa] hover:bg-white/[0.07] hover:text-[#e8e8e6] transition-colors"
            style={{ color: 'var(--input-text)' }}
          >
            <FileSpreadsheet size={13} className="text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={() => { onPDF(); setOpen(false); }}
            className="w-full flex items-center gap-2.5 px-3.5 py-3 text-sm text-[#aaa] hover:bg-white/[0.07] hover:text-[#e8e8e6] transition-colors border-t border-white/[0.06]"
            style={{ color: 'var(--input-text)', borderColor: 'var(--card-border)' }}
          >
            <FileText size={13} className="text-rose-400" />
            Export PDF
          </button>
        </div>
      )}
    </div>
  );
}
