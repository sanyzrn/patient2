import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Command, X } from 'lucide-react';
import { Catalog } from '../types';

export interface PaletteCommand {
  id: string;
  label: string;
  group: string;
  icon?: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: PaletteCommand[];
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter and group commands
  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    const results = commands.filter(cmd =>
      cmd.label.toLowerCase().includes(query) ||
      (cmd.keywords?.some(kw => kw.toLowerCase().includes(query)))
    );

    // Group by category
    const grouped: Record<string, PaletteCommand[]> = {};
    results.forEach(cmd => {
      (grouped[cmd.group] ??= []).push(cmd);
    });

    return grouped;
  }, [search, commands]);

  const flatList = useMemo(() => {
    return Object.values(filtered).flat();
  }, [filtered]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => (i + 1) % flatList.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => (i - 1 + flatList.length) % flatList.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatList[selectedIndex]) {
          flatList[selectedIndex].action();
          onClose();
          setSearch('');
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, flatList, selectedIndex]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSelectedIndex(0);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-start justify-center bg-black/60 backdrop-blur-sm pt-20"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-2xl bg-skin-card border border-skin-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-skin-border">
              <Command size={20} className="text-skin-primary shrink-0" />
              <input
                ref={inputRef}
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="جستجوی دستورات..."
                className="flex-1 bg-transparent outline-none text-skin-text placeholder-skin-muted text-sm"
              />
              <button
                onClick={onClose}
                className="p-1 text-skin-muted hover:text-skin-text transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Commands list */}
            <div className="max-h-96 overflow-y-auto">
              {Object.entries(filtered).length === 0 ? (
                <div className="py-12 text-center text-skin-muted text-sm">
                  دستوری یافت نشد
                </div>
              ) : (
                Object.entries(filtered).map(([group, cmds]) => (
                  <div key={group}>
                    <div className="px-4 py-2 text-xs font-bold text-skin-muted uppercase bg-skin-control-bg/50 sticky top-0">
                      {group}
                    </div>
                    {cmds.map((cmd, idx) => {
                      const globalIdx = flatList.indexOf(cmd);
                      const isSelected = globalIdx === selectedIndex;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => {
                            cmd.action();
                            onClose();
                            setSearch('');
                          }}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-right transition-colors ${
                            isSelected
                              ? 'bg-skin-primary/10 text-skin-primary'
                              : 'text-skin-text hover:bg-skin-control-bg'
                          }`}
                        >
                          {cmd.icon && <span className="shrink-0">{cmd.icon}</span>}
                          <span className="flex-1">{cmd.label}</span>
                          <kbd className="hidden sm:inline bg-skin-control-bg px-2 py-1 rounded text-xs font-mono border border-skin-border text-skin-muted">
                            {cmd.keywords?.[0] || '⏎'}
                          </kbd>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-skin-border bg-skin-control-bg/30 text-xs text-skin-muted text-center">
              برای ناوبری از فلش‌های جهت دار استفاده کنید
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
