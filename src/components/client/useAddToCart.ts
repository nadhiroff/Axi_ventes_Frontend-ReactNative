import type { Product, StallSummary } from '../../api/types';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { t } from '../../i18n';
import { useCartStore } from '../../store/cartStore';

/** « Ajouter au panier » : réservé aux comptes connectés (sinon connexion, puis retour ici) */
export function useAddToCart(stall: Pick<StallSummary, 'id' | 'name' | 'verified' | 'location'>) {
  const add = useCartStore((s) => s.add);
  const items = useCartStore((s) => s.items);
  const requireAuth = useRequireAuth();
  return {
    quantityOf: (productId: string) => items.find((i) => i.product_id === productId)?.quantity ?? 0,
    add: (product: Product) =>
      requireAuth(() => {
        if (!product.price) return;
        add({
          product_id: product.id,
          stall_id: stall.id,
          stall_name: stall.name,
          stall_site: stall.location.label,
          stall_verified: stall.verified,
          name: product.name,
          unit_price: product.price.amount,
        });
      }, t('auth.reasonCart')),
  };
}
