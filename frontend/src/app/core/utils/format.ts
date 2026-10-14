import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type DateInput = string | null | undefined;

export const timeAgo = (date: string): string =>
  formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });

export const initials = (name: string): string => {
  const p = name.trim().split(' ');
  return p.length >= 2 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2);
};

export const formatDate = (d: DateInput): string =>
  d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : '';

export const formatDateTime = (d: string): string =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

export const formatDateYear = (d: string): string =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
