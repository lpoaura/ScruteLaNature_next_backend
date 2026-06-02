'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Search, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string; // texte secondaire optionnel (ex: code du zonage)
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  /** Si true, affiche une option "Tous / Aucun" en haut (utile pour les filtres) */
  allowEmpty?: boolean;
  emptyLabel?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Sélectionner…',
  searchPlaceholder = 'Rechercher…',
  disabled = false,
  className,
  id,
  allowEmpty = false,
  emptyLabel = 'Tous',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const inputId = id ?? uid;

  const selectedOption = options.find((o) => o.value === value);

  // Filtrage local en temps réel
  const filtered = options.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.label.toLowerCase().includes(q) ||
      o.sublabel?.toLowerCase().includes(q)
    );
  });

  // Focus la recherche à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 30);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Fermer si clic en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Clavier : Escape pour fermer
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setIsOpen(false);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn('relative', className)} onKeyDown={handleKeyDown}>
      {/* Trigger button */}
      <button
        id={inputId}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm',
          'border border-input rounded-md bg-background',
          'focus:outline-none focus:ring-2 focus:ring-primary',
          'transition-colors',
          disabled && 'opacity-60 cursor-not-allowed',
          isOpen && 'ring-2 ring-primary border-primary',
        )}
      >
        <span className={cn('truncate text-left', !selectedOption && !value && 'text-muted-foreground')}>
          {selectedOption ? (
            <span className="flex items-center gap-1.5">
              <span>{selectedOption.label}</span>
              {selectedOption.sublabel && (
                <span className="text-muted-foreground text-xs">({selectedOption.sublabel})</span>
              )}
            </span>
          ) : allowEmpty && !value ? (
            emptyLabel
          ) : (
            placeholder
          )}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {/* Bouton clear si une valeur est sélectionnée et allowEmpty */}
          {allowEmpty && value && (
            <span
              role="button"
              tabIndex={0}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleSelect('');
              }}
              className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </span>
          )}
          <ChevronDown
            className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
          />
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] rounded-md border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95">
          {/* Barre de recherche */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 min-w-0 text-sm bg-transparent outline-none placeholder:text-muted-foreground text-ellipsis"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Liste d'options */}
          <ul
            role="listbox"
            className="max-h-60 overflow-y-auto py-1"
          >
            {/* Option vide */}
            {allowEmpty && (
              <li
                role="option"
                aria-selected={!value}
                onClick={() => handleSelect('')}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer',
                  'hover:bg-muted/60 transition-colors',
                  !value && 'bg-primary/5 text-primary font-medium',
                )}
              >
                <Check className={cn('h-3.5 w-3.5 shrink-0', value ? 'opacity-0' : 'opacity-100')} />
                <span className="text-muted-foreground italic">{emptyLabel}</span>
              </li>
            )}

            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-sm text-center text-muted-foreground">
                Aucun résultat pour « {search} »
              </li>
            ) : (
              filtered.map((option) => {
                const isSelected = option.value === value;
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option.value)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer',
                      'hover:bg-muted/60 transition-colors',
                      isSelected && 'bg-primary/5 text-primary',
                    )}
                  >
                    <Check
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 transition-opacity',
                        isSelected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="flex-1 min-w-0">
                      <span className={cn('block truncate', isSelected && 'font-medium')}>
                        {option.label}
                      </span>
                      {option.sublabel && (
                        <span className="text-xs text-muted-foreground">{option.sublabel}</span>
                      )}
                    </span>
                  </li>
                );
              })
            )}
          </ul>

          {/* Compteur */}
          {filtered.length > 0 && (
            <div className="border-t border-border px-3 py-1.5">
              <p className="text-[10px] text-muted-foreground">
                {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
                {search && ` pour « ${search} »`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
