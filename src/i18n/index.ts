import { createContext, useContext } from 'react';
import { en, type Dict } from './en';
import { zh } from './zh';
import type { Locale } from '../data/topics';

export const DICTS: Record<Locale, Dict> = { en, zh };

export const I18nContext = createContext<Dict>(en);

export const useT = (): Dict => useContext(I18nContext);

export type { Dict };
