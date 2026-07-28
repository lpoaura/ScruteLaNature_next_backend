'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/src/hooks/useAuth';
import { Bell, Send } from 'lucide-react';

export default function NotificationsPage() {
  const { getToken } = useAuth();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    setIsSubmitting(true);
    try {
      const token = getToken();
      const res = await fetch('/api/admin/notifications/send-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, body }),
      });

      if (!res.ok) {
        throw new Error('Erreur lors de l\\'envoi');
      }

      toast.success('Notifications envoyées à tous les utilisateurs !');
      setTitle('');
      setBody('');
    } catch (err) {
      console.error(err);
      toast.error('Impossible d\\'envoyer les notifications.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Notifications Push</h2>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Campagne Manuelle
            </CardTitle>
            <CardDescription>
              Envoyer une notification push (alerte sur le téléphone) à TOUS les utilisateurs ayant l'application installée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Titre de la notification</Label>
                <Input
                  id="title"
                  placeholder="Ex: Mise à jour majeure !"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={50}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  placeholder="Ex: Découvrez les nouveaux parcours dans votre région."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  maxLength={150}
                  required
                />
              </div>

              <Button type="submit" disabled={isSubmitting || !title || !body} className="w-full sm:w-auto flex gap-2">
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer à tout le monde'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
