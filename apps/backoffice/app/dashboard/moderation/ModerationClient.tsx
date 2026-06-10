'use client';

import { useState, useEffect, useTransition } from 'react';
import { Trash2, Star, Loader2, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { getAllReviews, deleteReview, type PaginatedReviews } from '@/src/services/reviews.service';
import type { Review } from '@/src/types/api.types';
import PaginationBar from '@/src/components/ui/PaginationBar';
import { cn } from '@/lib/utils';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn('h-4 w-4', s <= rating ? 'fill-amber-400 text-amber-400' : 'text-border')}
        />
      ))}
    </div>
  );
}

export default function ModerationClient() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [meta, setMeta] = useState<PaginatedReviews['meta'] | null>(null);
  const [page, setPage] = useState(1);
  const LIMIT = 20;
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    setIsLoading(true);
    getAllReviews(page, LIMIT, filterRating, sortOrder)
      .then((res) => {
        setReviews(res.data);
        setMeta(res.meta);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [page, filterRating, sortOrder]);

  // Retour à la page 1 si on change de filtre
  useEffect(() => {
    setPage(1);
  }, [filterRating, sortOrder]);

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer définitivement cet avis ?')) return;
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteReview(id);
        setReviews((prev) => prev.filter((r) => r.id !== id));
      } catch (err) {
        console.error(err);
        alert('Erreur lors de la suppression.');
      } finally {
        setDeletingId(null);
      }
    });
  };

  // Suppression du filtrage local et du calcul local des KPIs

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total avis', value: meta?.kpis.total ?? 0 },
          { label: 'Note moyenne', value: meta?.kpis.avgRating ? `${meta.kpis.avgRating} / 5` : '—' },
          { label: '5 étoiles', value: meta?.kpis.count5 ?? 0 },
          { label: '1 étoile', value: meta?.kpis.count1 ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Filtrer par note :</span>
        <button
          onClick={() => setFilterRating(null)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
            filterRating === null ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
          )}
        >
          Tous
        </button>
        {[5, 4, 3, 2, 1].map((n) => (
          <button
            key={n}
            onClick={() => setFilterRating(filterRating === n ? null : n)}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              filterRating === n ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'
            )}
          >
            <Star className="h-3 w-3" /> {n}
          </button>
        ))}

        <button
          onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')}
          className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border border-border hover:bg-muted transition-colors"
        >
          {sortOrder === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          {sortOrder === 'desc' ? 'Plus récents' : 'Plus anciens'}
        </button>
      </div>

      {/* Liste */}
      {reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mb-3 opacity-20" />
          <p className="text-sm">Aucun avis pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <StarRating rating={review.rating} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                  {review.parcours && (
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full truncate max-w-[200px]">
                      {review.parcours.title}
                    </span>
                  )}
                </div>

                {review.comment && (
                  <p className="text-sm text-foreground leading-relaxed">{review.comment}</p>
                )}

                <p className="text-xs text-muted-foreground">
                  Par{' '}
                  <span className="font-medium text-foreground">
                    {review.author?.pseudo ?? review.author?.email ?? 'Inconnu'}
                  </span>
                </p>
              </div>

              <button
                onClick={() => handleDelete(review.id)}
                disabled={isPending && deletingId === review.id}
                className="shrink-0 p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                title="Supprimer cet avis"
              >
                {isPending && deletingId === review.id
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Trash2 className="h-4 w-4" />}
              </button>
            </div>
          ))}
        </div>
      )}
      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <PaginationBar
          page={meta.page}
          totalPages={meta.totalPages}
          onPageChange={setPage}
          className="mt-6"
        />
      )}
    </div>
  );
}
