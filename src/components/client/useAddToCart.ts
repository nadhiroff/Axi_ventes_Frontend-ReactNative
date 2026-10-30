import { router } from 'expo-router';

import type { Product, StallSummary } from '../../api/types';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { t } from '../../i18n';
import { toast } from '../../lib/confirm';
import { useCartStore } from '../../store/cartStore';

/**
 * « Ajouter au panier » : réservé aux comptes connectés (sinon connexion, puis retour ici).
 * On reste sur l'écran pour continuer ses achats ; le message propose « Voir le panier ».
 * « Acheter maintenant » (buy) ajoute le produit s'il n'y est pas encore, puis ouvre le panier.
 */
export function useAddToCart(stall: Pick<StallSummary, 'id' | 'name' | 'verified' | 'location'>) {
  const add = useCartStore((s) => s.add);
  const items = useCartStore((s) => s.items);
  const requireAuth = useRequireAuth();
  const put = (product: Product) =>
    add({
      product_id: product.id,
      stall_id: stall.id,
      stall_name: stall.name,
      stall_site: stall.location.label,
      stall_verified: stall.verified,
      name: product.name,
      unit_price: product.price!.amount,
    });
  return {
    quantityOf: (productId: string) => items.find((i) => i.product_id === productId)?.quantity ?? 0,
    add: (product: Product) =>
      requireAuth(() => {
        if (!product.price) return;
        put(product);
        toast(t('product.addedName', { name: product.name }), 'success', { label: t('product.seeCart'), onPress: () => router.navigate('/panier') });
      }, t('auth.reasonCart')),
    buy: (product: Product) =>
      requireAuth(() => {
        if (!product.price) return;
        if (!items.some((i) => i.product_id === product.id)) put(product);
        router.navigate('/panier');
      }, t('auth.reasonCart')),
  };
}
