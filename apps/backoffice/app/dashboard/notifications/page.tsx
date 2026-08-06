'use client';

import { useState } from 'react';
import { sendPushToAll } from '@/src/services/notifications.service';
import { Bell, Send } from 'lucide-react';

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    setIsSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await sendPushToAll(title, body);

      if (res.report && !res.report.success) {
        const details = res.report.errors?.map((e) => e.message).join(' | ');
        setErrorMsg(`${res.message}${details ? ` (${details})` : ''}`);
      } else {
        setSuccessMsg(res.message || 'Notifications envoyées à tous les utilisateurs !');
        setTitle('');
        setBody('');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Impossible d'envoyer les notifications.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">Notifications Push</h2>
      </div>

      <div className="max-w-2xl">
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <Bell className="h-5 w-5" />
              Campagne Manuelle
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Envoyer une notification push (alerte sur le téléphone) à TOUS les utilisateurs ayant l'application installée.
            </p>
          </div>

          {successMsg && (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-medium">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-6 pt-2">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium text-foreground">Titre de la notification</label>
              <input
                id="title"
                type="text"
                placeholder="Ex: Mise à jour majeure !"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="body" className="text-sm font-medium text-foreground">Message</label>
              <textarea
                id="body"
                placeholder="Ex: Découvrez les nouveaux parcours dans votre région."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={150}
                required
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:ring-2 focus:ring-primary outline-none resize-none"
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || !title || !body} 
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 w-full sm:w-auto"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer à tout le monde'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
