import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/src/components/layout/Header';
import AnecdoteForm from '../../components/AnecdoteForm';
import { getAnecdote } from '@/src/services/anecdotes.service';

export const metadata: Metadata = { title: 'Modifier Anecdote' };

export default async function EditAnecdotePage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  try {
    const anecdote = await getAnecdote(id);
    
    return (
      <>
        <Header title={`Modifier l'anecdote`} />
        <div className="flex-1 p-6 overflow-y-auto">
          <AnecdoteForm initialData={anecdote} />
        </div>
      </>
    );
  } catch (error) {
    notFound();
  }
}
