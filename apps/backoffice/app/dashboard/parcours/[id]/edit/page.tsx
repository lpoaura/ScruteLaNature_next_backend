import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from '@/src/components/layout/Header';
import ParcoursForm from '@/src/components/parcours/ParcoursForm';
import { getParcoursById } from '@/src/services/parcours.service';

export const metadata: Metadata = { title: 'Modifier Parcours' };

export default async function EditParcoursPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  try {
    const parcours = await getParcoursById(id);
    
    return (
      <>
        <Header title={`Modifier : ${parcours.title}`} />
        <div className="flex-1 p-6 overflow-y-auto">
          <ParcoursForm initialData={parcours} isEdit />
        </div>
      </>
    );
  } catch (error) {
    notFound();
  }
}
