import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  X, Send, ArrowRight, MessageCircle, Building2,
  ThumbsUp, ThumbsDown, Loader2, Star, RefreshCw,
  Mic, Home, Info, Phone
} from 'lucide-react';
import { WP_AJAX_URL } from '../config';
import { PRODUCTS } from '../constants/products';

interface ChatBotProps {
  open: boolean;
  onClose: () => void;
}

type View = 'products' | 'chat' | 'adr' | 'consult' | 'success' | 'about' | 'contact';

// Quick-reply prompts shown when chatting about a specific product
// (mirrors the WordPress plugin defaults).
const QUICK_REPLIES = [
  'نحوه مصرف صحیح این محصول چگونه است؟',
  'عوارض جانبی شایع این محصول چیست؟',
  'این محصول با چه داروها یا غذاهایی تداخل دارد؟',
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isNew?: boolean;
  feedback?: 1 | 5 | null;
  logId?: number;
  suggestions?: string[];
}

// ── WordPress admin-ajax helper (form-encoded = no CORS preflight) ────────────
async function wpAjax(action: string, params: Record<string, string>): Promise<{ success: boolean; data: any }> {
  const body = new URLSearchParams({ action, ...params });
  const res = await fetch(WP_AJAX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body,
    signal: AbortSignal.timeout(30000),
  });
  return res.json();
}

// ── Minimal, safe inline markdown (no dangerouslySetInnerHTML) ────────────────
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2]) nodes.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[3]) nodes.push(<code key={key++} className="bg-skin-control-bg px-1 py-0.5 rounded text-[0.85em]">{m[3]}</code>);
    else if (m[4] && m[5]) nodes.push(<a key={key++} href={m[5]} target="_blank" rel="noopener noreferrer" className="text-skin-primary underline">{m[4]}</a>);
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

const MarkdownText: React.FC<{ text: string }> = ({ text }) => (
  <div className="space-y-1.5 leading-relaxed">
    {text.split('\n').map((line, i) => {
      const t = line.trim();
      if (!t) return <div key={i} className="h-1" />;
      if (/^[-*•]\s+/.test(t)) {
        return (
          <div key={i} className="flex gap-1.5">
            <span className="text-skin-primary">•</span>
            <span>{renderInline(t.replace(/^[-*•]\s+/, ''))}</span>
          </div>
        );
      }
      return <p key={i}>{renderInline(t)}</p>;
    })}
  </div>
);

// ── Typewriter for new assistant replies ──────────────────────────────────────
const Typewriter: React.FC<{ text: string; onDone: () => void }> = ({ text, onDone }) => {
  const [shown, setShown] = useState('');
  useEffect(() => {
    // Respect reduced-motion: show the full text immediately, no per-char churn.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(text);
      onDone();
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 3;
      setShown(text.slice(0, i));
      if (i >= text.length) { clearInterval(id); onDone(); }
    }, 18);
    return () => clearInterval(id);
  }, [text, onDone]);
  return <MarkdownText text={shown} />;
};

const uid = () => Math.random().toString(36).slice(2);

const ChatBot: React.FC<ChatBotProps> = ({ open, onClose }) => {
  const [view, setView] = useState<View>('chat');
  const [messages, setMessages] = useState<Message[]>([{
    id: uid(),
    role: 'assistant',
    content: 'سلام! 👋\nبه دستیار هوشمند نفس زیست فارمد خوش آمدید. چطور می‌تونیم کمکتون کنیم؟',
    suggestions: ['سوال دربارهٔ محصولات', 'ثبت عوارض دارویی', 'درخواست مشاوره', 'سوال دربارهٔ شرکت']
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<{ id: string; name: string } | null>(null);
  const [nonce, setNonce] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const formOpenedAt = useRef(0);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<{ stop: () => void } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechCtor: any = typeof window !== 'undefined' ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) : null;
  const toggleMic = () => {
    if (listening) { recogRef.current?.stop(); return; }
    if (!SpeechCtor) return;
    const r = new SpeechCtor();
    r.lang = 'fa-IR'; r.interimResults = false; r.continuous = false;
    r.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      const t = e.results?.[0]?.[0]?.transcript;
      if (t) setInput(prev => (prev ? prev + ' ' : '') + t);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    recogRef.current = r;
    setListening(true);
    r.start();
  };

  // Stable client id for server-side rate limiting.
  const cid = useRef<string>('');
  if (!cid.current) {
    cid.current = localStorage.getItem('nafas_chat_cid') || uid();
    localStorage.setItem('nafas_chat_cid', cid.current);
  }

  // Lazily fetch a nonce only when the user actually sends a message or a
  // form — so the menu always works even if the WordPress backend isn't
  // reachable yet. Returns '' on failure.
  const ensureNonce = useCallback(async (): Promise<string> => {
    if (nonce) return nonce;
    try {
      const res = await fetch(`${WP_AJAX_URL}?action=nafas_chatbot_nonce`, { signal: AbortSignal.timeout(15000) });
      const json = await res.json();
      const n: string = json?.success && json.data?.nonce ? json.data.nonce : '';
      if (n) setNonce(n);
      return n;
    } catch {
      return '';
    }
  }, [nonce]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, view, loading]);

  const startChat = (p: { id: string; name: string } | null, seed?: string) => {
    setProduct(p);
    // For a product chat, surface the quick-reply prompts as suggestions.
    const isProduct = !!p && p.id !== 'nafas';
    const copy = [...messages];
    // Remove suggestions from last message if any (immutably — it is in state)
    if (copy.length > 0) {
      copy[copy.length - 1] = { ...copy[copy.length - 1]!, suggestions: undefined };
    }

    setMessages([
      ...copy,
      {
        id: uid(),
        role: 'assistant',
        content: seed || 'سلام! چطور می‌تونم کمکتون کنم؟ سوالتون رو بنویسید.',
        suggestions: isProduct ? QUICK_REPLIES : undefined,
        isNew: true,
      }
    ]);
    setView('chat');
  };

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (trimmed === 'سوال دربارهٔ محصولات') {
      setView('products');
      return;
    }
    
    // Add User Message Helper
    const addPromptWithSuggestions = (content: string, prefix: string) => {
      setMessages(prev => {
        const copy = [...prev];
        if (copy.length > 0) {
          copy[copy.length - 1] = { ...copy[copy.length - 1]!, suggestions: undefined };
        }
        return [...copy, { id: uid(), role: 'user', content: trimmed }, {
          id: uid(), role: 'assistant', content,
          suggestions: PRODUCTS.map(p => `${prefix} ${p.name}`),
          isNew: true
        }];
      });
    };

    if (trimmed === 'ثبت عوارض دارویی' || trimmed === 'ثبت عوارض') {
      addPromptWithSuggestions('عارضه مربوط به کدام دارو بوده است؟', 'عوارض');
      return;
    }
    const adrProduct = PRODUCTS.find(p => `عوارض ${p.name}` === trimmed);
    if (adrProduct) {
      setProduct(adrProduct);
      formOpenedAt.current = Date.now();
      setView('adr');
      return;
    }

    if (trimmed === 'درخواست مشاوره') {
      setProduct(null);
      formOpenedAt.current = Date.now();
      setView('consult');
      return;
    }

    if (trimmed === 'سوال دربارهٔ شرکت') {
      startChat({ id: 'nafas', name: 'نفس زیست فارمد' }, 'دربارهٔ شرکت نفس زیست فارمد چه سوالی دارید؟');
      return;
    }

    const userMsg: Message = { id: uid(), role: 'user', content: trimmed };
    const history = [...messages, userMsg]
      .filter(m => m.content)
      .slice(-8)
      .map(m => ({ role: m.role, content: m.content }));
      
    // clear suggestions from previous message
    setMessages(prev => {
      const copy = [...prev];
      if (copy.length > 0) {
        copy[copy.length - 1] = { ...copy[copy.length - 1]!, suggestions: undefined };
      }
      return [...copy, userMsg];
    });
    setInput('');
    setLoading(true);
    try {
      const n = await ensureNonce();
      if (!n) {
        setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: 'در حال حاضر ارتباط با دستیار برقرار نیست. لطفاً بعداً دوباره تلاش کنید.' }]);
        return;
      }
      const json = await wpAjax('nafas_chatbot_chat', {
        message: trimmed,
        product: product?.id || 'general',
        history: JSON.stringify(history),
        nonce: n,
        cid: cid.current,
      });
      if (json.success && json.data?.reply) {
        setMessages(prev => [...prev, {
          id: uid(), role: 'assistant', content: json.data.reply, isNew: true,
          logId: json.data.log_id, suggestions: json.data.suggestions || [],
        }]);
      } else {
        const msg = json?.data?.message || 'در حال حاضر امکان پاسخ‌گویی نیست. لطفاً بعداً تلاش کنید.';
        setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: msg }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: 'ارتباط با سرور برقرار نشد.' }]);
    } finally {
      setLoading(false);
    }
  }, [loading, ensureNonce, messages, product]);

  const sendFeedback = async (logId: number | undefined, rating: 1 | 5) => {
    setMessages(prev => prev.map(m => m.logId === logId ? { ...m, feedback: rating } : m));
    if (logId) {
      const n = await ensureNonce();
      if (n) { try { await wpAjax('nafas_chatbot_feedback', { log_id: String(logId), rating: String(rating), nonce: n }); } catch { /* best effort */ } }
    }
  };

  const hadConversation = messages.some(m => m.role === 'user');

  // handle outside click
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // Don't auto-close when interacting with the mobile bottom nav — it stays
      // visible above the chat and controls open/close itself.
      if (target instanceof Element && target.closest('#mobile-nav')) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  const resetChat = () => {
    setView('chat'); 
    setMessages([{
      id: uid(),
      role: 'assistant',
      content: 'سلام! 👋\nبه دستیار هوشمند نفس زیست فارمد خوش آمدید. چطور می‌تونیم کمکتون کنیم؟',
      suggestions: ['سوال دربارهٔ محصولات', 'ثبت عوارض دارویی', 'درخواست مشاوره', 'سوال دربارهٔ شرکت']
    }]);
    setProduct(null); setInput('');
  };

  const handleClose = () => {
    onClose();
  };
  const resetAndClose = () => {
    resetChat();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] md:inset-auto md:bottom-24 md:left-6 md:flex md:items-stretch md:justify-start" dir="rtl">
      {/* Mobile backdrop */}
      <motion.div
        className="md:hidden absolute inset-0 bg-black/40"
        onClick={handleClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      />

      {/* Mobile: smaller box (narrower from the right, shorter top & bottom),
          floating above the bottom nav. Desktop: anchored beside the launcher. */}
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        style={{ transformOrigin: 'bottom left' }}
        className="absolute md:static left-4 right-[13%] bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.25rem)] md:bottom-auto h-[68vh] w-auto md:w-[380px] md:h-[600px] max-h-[600px] md:max-h-[calc(100vh-7rem)] bg-skin-card rounded-2xl shadow-2xl border border-skin-border flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 bg-gradient-to-l from-skin-primary to-skin-primary-hover text-white px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            {view !== 'chat' && (
              <button onClick={() => setView('chat')} className="p-1 hover:bg-white/15 rounded-lg transition-colors" aria-label="بازگشت">
                <ArrowRight size={18} />
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-white/20 ring-1 ring-white/25 flex items-center justify-center">
              <MessageCircle size={18} />
            </div>
            <div className="leading-tight">
              <p className="font-bold text-sm">دستیار هوشمند نفس</p>
              <p className="text-[11px] text-white/80 flex items-center gap-1">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-300" />
                </span>
                آنلاین
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={resetChat} className="p-1 hover:bg-white/15 rounded-lg transition-colors" aria-label="شروع مجدد">
              <RefreshCw size={18} />
            </button>
            <button onClick={handleClose} className="p-1 hover:bg-white/15 rounded-lg transition-colors" aria-label="بستن">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 bg-skin-base">
          {view === 'chat' ? (
            <ChatView
              messages={messages}
              loading={loading}
              onFeedback={sendFeedback}
              onSuggestion={(s) => send(s)}
              onTypewriterDone={(id) => setMessages(prev => prev.map(m => m.id === id ? { ...m, isNew: false } : m))}
            />
          ) : view === 'products' ? (
            <ProductsView onPick={(p) => startChat(p, `دربارهٔ «${p.name}» چه سوالی دارید؟`)} onCancel={() => setView('chat')} />
          ) : view === 'adr' ? (
            <AdrForm ensureNonce={ensureNonce} product={product} openedAt={formOpenedAt} onDone={() => setView('success')} onCancel={() => setView('chat')} />
          ) : view === 'consult' ? (
            <ConsultForm ensureNonce={ensureNonce} product={product} openedAt={formOpenedAt} onDone={() => setView('success')} onCancel={() => setView('chat')} />
          ) : view === 'success' ? (
            <SuccessView onBack={() => setView('chat')} />
          ) : view === 'about' ? (
            <AboutView />
          ) : view === 'contact' ? (
            <ContactView />
          ) : null}
        </div>

        {/* Composer (chat only) */}
        {view === 'chat' && (
          <div className="shrink-0 border-t border-skin-border p-2 bg-skin-card">
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex items-end gap-2"
            >
              {/* Minimal animated gradient/glow border around the input */}
              <div className="ai-input-border flex-1 rounded-xl p-[1.5px]">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  rows={1}
                  placeholder="پیامتان را بنویسید…"
                  className="w-full resize-none max-h-24 px-3 py-2 text-sm bg-skin-control-bg rounded-[11px] outline-none border-0 block"
                />
              </div>
              {SpeechCtor && (
                <button type="button" onClick={toggleMic} aria-label="گفتن با صدا" className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-colors ${listening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-skin-control-bg text-skin-muted hover:text-skin-primary'}`}>
                  <Mic size={18} />
                </button>
              )}
              <button type="submit" disabled={loading || !input.trim()} className="w-10 h-10 shrink-0 rounded-xl bg-skin-primary hover:bg-skin-primary-hover text-white flex items-center justify-center disabled:opacity-50 transition-colors">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
            <div className="flex items-center justify-between mt-1.5 px-1 opacity-50 hover:opacity-100 transition-opacity">
               <span className="text-[9px] text-skin-muted">هوش مصنوعی ممکن است اشتباه کند.</span>
               <span className="text-[9px] text-skin-muted font-sans tracking-tight shrink-0" dir="ltr">Developed by DBS &amp; Claude</span>
            </div>
          </div>
        )}

        {/* Bottom nav */}
        {(
          <div className="shrink-0 grid grid-cols-3 border-t border-skin-border bg-skin-card text-[11px]">
            <button onClick={() => setView('chat')} className={`flex flex-col items-center gap-0.5 py-2 transition-colors ${view === 'chat' ? 'text-skin-primary' : 'text-skin-muted hover:text-skin-primary'}`}>
              <Home size={16} /> گفتگو
            </button>
            <button onClick={() => setView('about')} className={`flex flex-col items-center gap-0.5 py-2 transition-colors ${view === 'about' ? 'text-skin-primary' : 'text-skin-muted hover:text-skin-primary'}`}>
              <Info size={16} /> دربارهٔ نفس
            </button>
            <button onClick={() => setView('contact')} className={`flex flex-col items-center gap-0.5 py-2 transition-colors ${view === 'contact' ? 'text-skin-primary' : 'text-skin-muted hover:text-skin-primary'}`}>
              <Phone size={16} /> تماس با نفس
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const ProductsView: React.FC<{ onPick: (p: { id: string; name: string }) => void; onCancel: () => void }> = ({ onPick, onCancel }) => (
  <div className="space-y-2">
    <p className="text-xs text-skin-muted px-1 mb-1">محصول مورد نظر را انتخاب کنید:</p>
    {PRODUCTS.map(p => (
      <button key={p.id} onClick={() => onPick({ id: p.id, name: p.name })} className="w-full flex items-center gap-3 p-3 bg-skin-card border border-skin-border rounded-xl hover:border-skin-primary/40 transition-all text-right">
        <img src={p.image} alt="" className="w-9 h-9 rounded-lg object-cover bg-white" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
        <span className="flex-1 font-bold text-sm text-skin-text">{p.name}</span>
        <ArrowRight size={16} className="text-skin-muted rotate-180" />
      </button>
    ))}
    <button onClick={onCancel} className="mt-2 w-full flex items-center justify-center p-3 text-sm font-bold text-skin-text bg-skin-control-bg hover:bg-skin-control-hover rounded-xl transition-all">
      بازگشت به گفتگو
    </button>
  </div>
);

// ── Chat ──────────────────────────────────────────────────────────────────────
const ChatView: React.FC<{
  messages: Message[];
  loading: boolean;
  onFeedback: (logId: number | undefined, rating: 1 | 5) => void;
  onSuggestion: (s: string) => void;
  onTypewriterDone: (id: string) => void;
}> = ({ messages, loading, onFeedback, onSuggestion, onTypewriterDone }) => (
  <div className="space-y-3">
    {messages.map(m => (
      <div key={m.id} className={m.role === 'user' ? 'flex justify-start' : 'flex justify-end'}>
        <div className={`max-w-[85%] ${m.role === 'user' ? 'order-2' : ''}`}>
          <div className={`px-3 py-2 rounded-2xl text-sm ${m.role === 'user' ? 'bg-skin-primary text-white rounded-tr-sm' : 'bg-skin-card border border-skin-border text-skin-text rounded-tl-sm'}`}>
            {m.role === 'assistant' && m.isNew
              ? <Typewriter text={m.content} onDone={() => onTypewriterDone(m.id)} />
              : <MarkdownText text={m.content} />}
          </div>
          {m.role === 'assistant' && !m.isNew && m.logId && (
            <div className="flex items-center gap-1 mt-1 px-1">
              <button onClick={() => onFeedback(m.logId, 5)} className={`p-1 rounded ${m.feedback === 5 ? 'text-emerald-600' : 'text-skin-muted hover:text-emerald-600'}`} aria-label="مفید بود"><ThumbsUp size={13} /></button>
              <button onClick={() => onFeedback(m.logId, 1)} className={`p-1 rounded ${m.feedback === 1 ? 'text-red-600' : 'text-skin-muted hover:text-red-600'}`} aria-label="مفید نبود"><ThumbsDown size={13} /></button>
            </div>
          )}
          {m.role === 'assistant' && !m.isNew && m.suggestions && m.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {m.suggestions.map((s, i) => (
                <button key={i} onClick={() => onSuggestion(s)} className="text-[11px] px-2.5 py-1 rounded-full bg-skin-primary/10 text-skin-primary hover:bg-skin-primary/20 transition-colors">{s}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    ))}
    {loading && (
      <div className="flex justify-end">
        <div className="bg-skin-card border border-skin-border rounded-2xl rounded-tl-sm px-3 py-2.5">
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-skin-muted animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-skin-muted animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 rounded-full bg-skin-muted animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
        </div>
      </div>
    )}
  </div>
);

// ── Shared form field ─────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="text-xs text-skin-muted mb-1 block">{label}</span>
    {children}
  </label>
);
const inputCls = 'w-full px-3 py-2 text-sm bg-skin-control-bg border border-skin-border rounded-xl outline-none focus:border-skin-primary';

const Honeypot: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <input aria-hidden tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
);

// ── ADR form (adverse drug reaction) ──────────────────────────────────────────
const AdrForm: React.FC<{ ensureNonce: () => Promise<string>; product: { id: string; name: string } | null; openedAt: React.MutableRefObject<number>; onDone: () => void; onCancel: () => void; }> = ({ ensureNonce, product, openedAt, onDone, onCancel }) => {
  const [f, setF] = useState({ name: '', phone: '', description: '', severity: '', batch_number: '', concomitant_drugs: '' });
  const [hp, setHp] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f, v: string) => setF(prev => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.phone.trim() || f.description.trim().length < 10) { setErr('نام، تلفن و شرح حداقل ۱۰ کاراکتر الزامی است.'); return; }
    if (!/^(\+98|0)?9\d{9}$/.test(f.phone.trim())) { setErr('شمارهٔ موبایل معتبر نیست.'); return; }
    setBusy(true); setErr('');
    try {
      const nonce = await ensureNonce();
      if (!nonce) { setErr('ارتباط با سرور برقرار نشد. لطفاً بعداً تلاش کنید.'); return; }
      const json = await wpAjax('nafas_chatbot_submit', {
        type: 'گزارش عوارض دارویی', name: f.name, phone: f.phone, description: f.description,
        product: product?.id || '', severity: f.severity, outcome: '', batch_number: f.batch_number,
        concomitant_drugs: f.concomitant_drugs, reporter_type: 'بیمار',
        nfx_hp: hp, nfx_elapsed: String(Date.now() - openedAt.current), nonce,
      });
      if (json.success) onDone(); else setErr(json?.data?.message || 'ثبت ناموفق بود.');
    } catch { setErr('ارتباط با سرور برقرار نشد.'); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm font-bold text-skin-text">ثبت گزارش عوارض دارویی</p>
      <Honeypot value={hp} onChange={setHp} />
      <Field label="محصول مرتبط"><input className={`${inputCls} disabled:opacity-75 disabled:bg-skin-base text-skin-muted`} value={product?.name || ''} disabled /></Field>
      <Field label="نام و نام خانوادگی"><input className={inputCls} value={f.name} onChange={e => set('name', e.target.value)} /></Field>
      <Field label="شمارهٔ تماس"><input className={inputCls} dir="ltr" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="09xxxxxxxxx" /></Field>
      <Field label="شدت عارضه">
        <select className={inputCls} value={f.severity} onChange={e => set('severity', e.target.value)}>
          <option value="">انتخاب…</option>
          <option>خفیف</option><option>متوسط</option><option>شدید</option><option>تهدیدکننده حیات</option>
        </select>
      </Field>
      <Field label="شمارهٔ سری ساخت (اختیاری)"><input className={inputCls} value={f.batch_number} onChange={e => set('batch_number', e.target.value)} /></Field>
      <Field label="داروهای همزمان (اختیاری)"><input className={inputCls} value={f.concomitant_drugs} onChange={e => set('concomitant_drugs', e.target.value)} /></Field>
      <Field label="شرح عارضه"><textarea className={`${inputCls} resize-y`} rows={3} value={f.description} onChange={e => set('description', e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <p className="text-[11px] text-skin-muted leading-relaxed">
        با ارسال این فرم، با ثبت و پردازش اطلاعات تماس شما برای پیگیری موافقت می‌کنید.
      </p>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button disabled={busy} className="bg-skin-primary hover:bg-skin-primary-hover text-white py-2 rounded-xl text-sm font-bold disabled:opacity-60 transition-colors w-full">{busy ? 'در حال ارسال…' : 'ثبت گزارش'}</button>
        <button type="button" onClick={() => onCancel()} disabled={busy} className="bg-skin-control-bg hover:bg-skin-control-hover text-skin-text py-2 rounded-xl text-sm font-bold transition-colors w-full">انصراف</button>
      </div>
    </form>
  );
};

// ── Consult form ──────────────────────────────────────────────────────────────
const ConsultForm: React.FC<{ ensureNonce: () => Promise<string>; product: { id: string; name: string } | null; openedAt: React.MutableRefObject<number>; onDone: () => void; onCancel: () => void; }> = ({ ensureNonce, product, openedAt, onDone, onCancel }) => {
  const [f, setF] = useState({ name: '', phone: '', description: '' });
  const [hp, setHp] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k: keyof typeof f, v: string) => setF(prev => ({ ...prev, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.phone.trim() || f.description.trim().length < 10) { setErr('نام، تلفن و توضیحات حداقل ۱۰ کاراکتر الزامی است.'); return; }
    if (!/^(\+98|0)?9\d{9}$/.test(f.phone.trim())) { setErr('شمارهٔ موبایل معتبر نیست.'); return; }
    setBusy(true); setErr('');
    try {
      const nonce = await ensureNonce();
      if (!nonce) { setErr('ارتباط با سرور برقرار نشد. لطفاً بعداً تلاش کنید.'); return; }
      const json = await wpAjax('nafas_chatbot_submit', {
        type: 'درخواست مشاوره', name: f.name, phone: f.phone, description: f.description,
        product: product?.id || '', severity: '', outcome: '', batch_number: '', concomitant_drugs: '', reporter_type: 'بیمار',
        nfx_hp: hp, nfx_elapsed: String(Date.now() - openedAt.current), nonce,
      });
      if (json.success) onDone(); else setErr(json?.data?.message || 'ثبت ناموفق بود.');
    } catch { setErr('ارتباط با سرور برقرار نشد.'); } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm font-bold text-skin-text">درخواست مشاوره</p>
      <Honeypot value={hp} onChange={setHp} />
      <Field label="نام و نام خانوادگی"><input className={inputCls} value={f.name} onChange={e => set('name', e.target.value)} /></Field>
      <Field label="شمارهٔ تماس"><input className={inputCls} dir="ltr" value={f.phone} onChange={e => set('phone', e.target.value)} placeholder="09xxxxxxxxx" /></Field>
      <Field label="توضیحات"><textarea className={`${inputCls} resize-y`} rows={4} value={f.description} onChange={e => set('description', e.target.value)} /></Field>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <p className="text-[11px] text-skin-muted leading-relaxed">
        با ارسال این فرم، با ثبت و پردازش اطلاعات تماس شما برای پیگیری موافقت می‌کنید.
      </p>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <button disabled={busy} className="bg-skin-primary hover:bg-skin-primary-hover text-white py-2 rounded-xl text-sm font-bold disabled:opacity-60 transition-colors w-full">{busy ? 'در حال ارسال…' : 'ارسال درخواست'}</button>
        <button type="button" onClick={() => onCancel()} disabled={busy} className="bg-skin-control-bg hover:bg-skin-control-hover text-skin-text py-2 rounded-xl text-sm font-bold transition-colors w-full">انصراف</button>
      </div>
    </form>
  );
};

const SuccessView: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="h-full flex flex-col items-center justify-center text-center gap-3">
    <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">✓</div>
    <p className="font-bold text-skin-text">با موفقیت ثبت شد</p>
    <p className="text-sm text-skin-muted">کارشناسان ما در اسرع وقت با شما تماس می‌گیرند.</p>
    <button onClick={onBack} className="text-sm font-bold text-skin-primary">بازگشت به گفتگو</button>
  </div>
);

const AboutView: React.FC = () => (
  <div className="space-y-4 text-center pb-4">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-skin-primary/10 text-skin-primary flex items-center justify-center">
      <Building2 size={26} />
    </div>
    <p className="font-black text-lg text-skin-text">نفس زیست فارمد</p>
    <p className="text-sm font-bold text-skin-primary">مراقب شما در هر نفس</p>
    <div className="text-[13px] text-skin-muted leading-relaxed text-justify px-2 space-y-3">
      <p>شرکت دانش‌بنیان نفس زیست فارمد از سال ۱۳۹۸ با هدف توسعه داروهای استنشاقی پیشرفته و ارتقای سلامت جامعه آغاز به کار کرده است.</p>
      <p>این شرکت با بهره‌گیری از دانش فنی بومی و تیمی متخصص، موفق به تولید اولین محصول DPI ایرانی و کسب تأییدیه دانش‌بنیان نوع یک شده است.</p>
      <p>نفس فارمد با تکیه بر نوآوری، کیفیت و مسئولیت‌پذیری، در مسیر خودکفایی و صادرات گام برمی‌دارد.</p>
    </div>
    <a href="https://nafaspharmed.com" target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-sm font-bold text-skin-primary underline">nafaspharmed.com</a>
  </div>
);

const ContactView: React.FC = () => (
  <div className="space-y-4 text-center pb-4">
    <div className="w-14 h-14 mx-auto rounded-2xl bg-skin-primary/10 text-skin-primary flex items-center justify-center">
      <Phone size={26} />
    </div>
    <p className="font-black text-lg text-skin-text">تماس با نفس</p>
    
    <div className="space-y-4 mt-6 px-2 text-right">
      <div className="bg-skin-control-bg p-3 rounded-xl">
        <p className="text-[11px] font-bold text-skin-primary mb-1">شماره تماس (دفتر مرکزی)</p>
        <a href="tel:02192001520" className="text-skin-text font-bold text-sm" dir="ltr">۰۲۱ ۹۲۰۰ ۱۵۲۰</a>
      </div>
      
      <div className="bg-skin-control-bg p-3 rounded-xl">
        <p className="text-[11px] font-bold text-skin-primary mb-1">آدرس دفتر مرکزی</p>
        <p className="text-sm text-skin-muted leading-relaxed">تهران، بلوار پژوهش، پژوهشگاه ملی و مهندسی ژنتیک، ساختمان بیوتک سنتر، واحد ۱۰۱</p>
      </div>

      <div className="bg-skin-control-bg p-3 rounded-xl">
        <p className="text-[11px] font-bold text-skin-primary mb-1">آدرس کارخانه</p>
        <p className="text-sm text-skin-muted leading-relaxed">صفادشت، بلوار مطهری شمالی (پدم)، کوچهٔ دوم شرقی، پلاک ۴، مجموعهٔ پیشتاز</p>
      </div>
    </div>
  </div>
);

export default ChatBot;
