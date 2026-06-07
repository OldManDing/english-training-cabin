import React from 'react';
import { legalDocuments } from '../content/legal';

interface LegalLinksProps {
  onOpen?: (title: string, body: string) => void;
  className?: string;
  compact?: boolean;
}

export default function LegalLinks({ onOpen, className = '', compact = false }: LegalLinksProps) {
  const openDocument = (documentKey: keyof typeof legalDocuments) => {
    const document = legalDocuments[documentKey];
    onOpen?.(document.title, document.body);
  };

  const buttonClass = compact
    ? 'min-h-11 rounded-full px-3 text-[11px]'
    : 'min-h-11 rounded-xl px-3 text-xs';

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 font-black ${className}`} data-testid="legal-links">
      <button
        type="button"
        onClick={() => openDocument('privacy')}
        className={`${buttonClass} border border-[#cfe6f2] bg-white text-[#003178] transition hover:border-[#003178] hover:bg-[#eef7fc]`}
      >
        隐私协议
      </button>
      <button
        type="button"
        onClick={() => openDocument('terms')}
        className={`${buttonClass} border border-[#cfe6f2] bg-white text-[#003178] transition hover:border-[#003178] hover:bg-[#eef7fc]`}
      >
        服务条款
      </button>
    </div>
  );
}
