import type { Metadata } from 'next';
import { Header } from '@/src/components/layout/Header';
import AnecdoteForm from '../components/AnecdoteForm';

export const metadata: Metadata = { title: 'Nouvelle anecdote' };

export default function NewAnecdotePage() {
  return (
    <>
      <Header title="Nouvelle anecdote" />
      <div className="flex-1 p-6 overflow-y-auto">
        <AnecdoteForm />
      </div>
    </>
  );
}
