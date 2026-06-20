import React from 'react';

/**
 * Converts Persian (۰-۹) and Arabic-Indic (٠-٩) digits to ASCII digits.
 */
export const normalizeDigits = (input: string): string =>
  (input || '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/**
 * Converts a (possibly Persian/Arabic) date string such as
 * "آخرین بروزرسانی: ۱۴۰۴/۱۰/۹" to a sortable integer like 14041009.
 * Returns 0 when no valid date is found.
 */
export const dateToNumber = (input: string): number => {
  const m = normalizeDigits(input).match(/(\d{3,4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return 0;
  return parseInt(m[1] ?? '0', 10) * 10000 + parseInt(m[2] ?? '0', 10) * 100 + parseInt(m[3] ?? '0', 10);
};

/**
 * Highlights matching substring in text with a marked element.
 * Used for search term highlighting in catalog cards.
 * MISSING-01: Search Term Highlighting in Catalog Grid
 */
export function highlightText(text: string, query: string): React.ReactNode {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return text;

  const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(matcher);
  if (parts.length === 1) return text;

  return React.createElement(
    React.Fragment,
    null,
    ...parts.map((part, index) => (
      part.toLowerCase() === trimmedQuery.toLowerCase()
        ? React.createElement(
            'mark',
            { key: index, className: 'bg-skin-primary/20 text-skin-primary rounded px-0.5 not-italic' },
            part
          )
        : part
    ))
  );
}
