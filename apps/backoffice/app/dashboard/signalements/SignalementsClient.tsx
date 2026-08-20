'use client';

import React, { useState } from 'react';
import { Signalement, updateSignalementStatus } from '@/src/services/signalements.service';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MapPin, User, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function SignalementsClient({ initialData }: { initialData: Signalement[] }) {
  const [signalements, setSignalements] = useState(initialData);

  const getReportTypeLabel = (type: Signalement['type']) => {
    switch (type) {
      case 'INACCESSIBLE': return 'Lieu inaccessible';
      case 'MISSING_CLUE': return 'Indice disparu/illisible';
      case 'TECHNICAL_ERROR': return 'Erreur technique (app)';
      default: return 'Autre problème';
    }
  };

  const getStatusBadge = (status: Signalement['status']) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"><Clock size={12}/> En attente</span>;
      case 'RESOLVED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"><CheckCircle size={12}/> Résolu</span>;
      case 'IGNORED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"><XCircle size={12}/> Ignoré</span>;
    }
  };

  const handleStatusChange = async (id: string, newStatus: Signalement['status']) => {
    try {
      const updated = await updateSignalementStatus(id, newStatus);
      setSignalements(prev => prev.map(s => s.id === id ? updated : s));
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut', error);
      alert('Impossible de mettre à jour le statut.');
    }
  };

  if (signalements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-white border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Aucun signalement</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Tout semble parfait sur le terrain !</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl dark:bg-slate-900 border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium">Date & Joueur</th>
              <th className="px-6 py-4 font-medium">Lieu du signalement</th>
              <th className="px-6 py-4 font-medium">Problème signalé</th>
              <th className="px-6 py-4 font-medium">Statut</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {signalements.map((sig) => (
              <tr key={sig.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900 dark:text-white">
                    {format(new Date(sig.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-slate-500 dark:text-slate-400 text-xs">
                    <User size={12} />
                    {sig.user?.pseudo || 'Joueur invité'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MapPin size={14} className="text-emerald-500" />
                    {sig.parcours.title}
                  </div>
                  {sig.etape && (
                    <div className="text-slate-500 dark:text-slate-400 text-xs mt-1 ml-5">
                      Étape {sig.etape.order} : {sig.etape.title}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <div className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-red-500" />
                    {getReportTypeLabel(sig.type)}
                  </div>
                  {sig.description && (
                    <div className="text-slate-500 dark:text-slate-400 text-xs mt-1 truncate" title={sig.description}>
                      "{sig.description}"
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(sig.status)}
                </td>
                <td className="px-6 py-4 text-right">
                  {sig.status === 'PENDING' ? (
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleStatusChange(sig.id, 'RESOLVED')}
                        className="p-1.5 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-colors"
                        title="Marquer comme résolu"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button 
                        onClick={() => handleStatusChange(sig.id, 'IGNORED')}
                        className="p-1.5 text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                        title="Ignorer"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleStatusChange(sig.id, 'PENDING')}
                      className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Ré-ouvrir
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
