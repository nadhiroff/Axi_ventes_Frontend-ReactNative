import { ConversationList } from '../../components/chat/ConversationList';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useT } from '../../i18n';
import { useAuthStore } from '../../store/authStore';

/** Messages (ouvert depuis l'espace commerçant ou le compte) */
export default function MessagesScreen() {
  const t = useT();
  const mode = useAuthStore((s) => s.mode);
  return (
    <>
      <ScreenHeader title={t('chat.title')} subtitle={mode === 'merchant' ? t('chat.merchantSubtitle') : undefined} />
      <ConversationList role={mode === 'merchant' ? 'merchant' : undefined} />
    </>
  );
}
