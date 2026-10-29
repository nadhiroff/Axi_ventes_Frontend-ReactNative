import { ConversationList } from '../../components/chat/ConversationList';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useT } from '../../i18n';
import { useAuthStore } from '../../store/authStore';
import { Screen } from '../../components/ui/Screen';
import { EmptyView } from '../../components/ui/StateViews';
import { useRequireAuth } from '../../hooks/useRequireAuth';

/** Onglet « Messages » du client : ses conversations avec les commerçants */
export default function ClientMessagesTab() {
  const t = useT();
  const signedIn = useAuthStore((s) => s.status === 'signedIn');
  const requireAuth = useRequireAuth();
  return (
    <>
      <ScreenHeader title={t('chat.title')} showBack={false} />
      {signedIn ? (
        <ConversationList role="client" />
      ) : (
        <Screen>
          <EmptyView icon="message-circle" title={t('chat.title')} text={t('auth.reasonChat')} action={{ label: t('auth.signIn'), onPress: () => requireAuth(() => undefined, t('auth.reasonChat')) }} />
        </Screen>
      )}
    </>
  );
}
