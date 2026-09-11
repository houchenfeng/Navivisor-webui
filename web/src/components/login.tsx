/**
 * Login page for WebUI API key authentication.
 * Full-screen animated gradient background + glass card.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Loader2 } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';

interface Props {
  onLogin: (apiKey: string) => Promise<boolean>;
}

export function LoginPage({ onLogin }: Props) {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');

    try {
      const ok = await onLogin(trimmed);
      if (!ok) {
        setError(t('Invalid API key'));
      }
    } catch {
      setError(t('Failed to connect to server'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="navivisor-auth relative flex min-h-[100dvh] items-center justify-center overflow-hidden p-5">
      <div className="brand-orb brand-orb-one" aria-hidden="true" />
      <div className="brand-orb brand-orb-two" aria-hidden="true" />
      <form
        onSubmit={handleSubmit}
        className="glass-5 brand-enter relative z-10 w-full max-w-md space-y-5 rounded-[28px] border-white/70 p-7 shadow-[0_28px_80px_rgba(31,77,203,0.22)] sm:p-9"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <BrandLogo className="scale-110" />
          <h1 className="mt-6 text-2xl font-extrabold tracking-[-0.04em] text-[#173778]">欢迎启航</h1>
          <p className="mt-2 text-sm text-[#627da9]">从研究问题到论文成果，让每一步更清晰</p>
        </div>
        <p className="flex items-center gap-2 text-sm font-semibold text-[#375986]">
          <KeyRound className="h-4 w-4 text-[#1F4DCB]" />
          {t('Enter your API key to continue.')}
        </p>

        <Input
          type="password"
          placeholder={t('API Key')}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="h-12 rounded-xl border-[#aac6f3] bg-white/65 backdrop-blur-sm transition-all focus:border-[#1F4DCB] focus:bg-white focus:ring-4 focus:ring-[#1F4DCB]/10"
          autoFocus
        />

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <Button type="submit" className="h-12 w-full rounded-xl bg-gradient-to-r from-[#1F4DCB] to-[#3975e8] font-bold text-white shadow-[0_10px_24px_rgba(31,77,203,0.24)] transition-transform hover:-translate-y-0.5" disabled={loading || !apiKey.trim()}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          {t('Login')}
        </Button>
      </form>
    </div>
  );
}
