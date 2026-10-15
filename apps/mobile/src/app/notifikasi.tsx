import { Page, Copy } from '../components/ui';
import { Notifications } from '../components/Notifications';
import { t } from '../lib/copy';
export default function NotificationsScreen() {
  return (
    <Page title={t.insights.notif.title}>
      <Copy muted>{t.mobile.notificationsBody}</Copy>
      <Notifications />
    </Page>
  );
}
