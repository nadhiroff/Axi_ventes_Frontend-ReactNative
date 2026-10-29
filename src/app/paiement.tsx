import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { errorMessage } from '../api/client';
import { api } from '../api/endpoints';
import { Button } from '../components/ui/Button';
import { EmptyView } from '../components/ui/StateViews';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { useT } from '../i18n';
import { confirmAction, notify } from '../lib/confirm';
import { fontSize, spacing, useTheme } from '../theme';

/**
 * Page de paiement FedaPay ou KkiaPay ouverte dans l'application (WebView, compatible Expo Go).
 * Au retour (adresse /v1/payments/return ou lien axi://), on ferme et on demande au SERVEUR de vérifier
 * le statut auprès de la passerelle : le retour de la page ne suffit jamais à marquer « payé ».
 */
export default function PaymentScreen() {
  const t = useT();
  const { colors } = useTheme();
  const { orderId, subRef, url, returnPrefix } = useLocalSearchParams<{ orderId?: string; subRef?: string; url?: string; returnPrefix?: string }>();
  const [verifying, setVerifying] = useState(false);
  const handled = useRef(false);

  const finish = async (returnUrl: string | null) => {
    if (handled.current) return;
    handled.current = true;
    setVerifying(true);
    // KkiaPay ajoute l'identifiant de transaction à l'adresse de retour : il est revérifié par le serveur
    const tx = returnUrl ? (/[?&]transaction_id=([^&#]+)/.exec(returnUrl)?.[1] ?? undefined) : undefined;
    try {
      if (orderId) {
        await api.verifyPayment(orderId, tx ? decodeURIComponent(tx) : undefined).catch(() => undefined);
        router.replace(`/commande/${orderId}`);
      } else if (subRef) {
        const result = await api.verifySubscription(subRef, tx ? decodeURIComponent(tx) : undefined);
        router.back();
        notify(t('merchant.subscription'), result.message);
      } else {
        router.back();
      }
    } catch (e) {
      router.back();
      notify(t('payment.title'), errorMessage(e), 'error');
    }
  };

  const isReturn = (target: string) => (returnPrefix ? target.startsWith(returnPrefix) : false) || target.startsWith('axi://');

  const onNavigation = (nav: WebViewNavigation) => {
    if (isReturn(nav.url)) finish(nav.url);
  };

  const close = () => confirmAction(t('payment.closeConfirm'), t('payment.closeText'), () => finish(null));

  if (!url) {
    return (
      <>
        <ScreenHeader title={t('payment.title')} />
        <EmptyView icon="wifi-off" title={t('payment.noUrl')} action={{ label: t('common.back'), onPress: () => (orderId ? router.replace(`/commande/${orderId}`) : router.back()) }} />
      </>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t('payment.title')} showBack={false} right={<Button label={t('common.close')} variant="ghost" size="sm" onPress={close} />} />
      {verifying ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl }}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.body, textAlign: 'center' }}>{t('payment.verifying')}</Text>
        </View>
      ) : (
        <WebView
          source={{ uri: url }}
          onNavigationStateChange={onNavigation}
          onShouldStartLoadWithRequest={(req) => {
            if (isReturn(req.url)) {
              finish(req.url);
              return false;
            }
            return true;
          }}
          startInLoadingState
          renderLoading={() => (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.md }}>
              <ActivityIndicator size="large" color={colors.brand} />
              <Text style={{ color: colors.textMuted }}>{t('payment.loading')}</Text>
            </View>
          )}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
        />
      )}
    </View>
  );
}
