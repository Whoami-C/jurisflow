import { requireChatGPTUser } from './chatgpt-auth';
import { CrmApp } from './crm-app';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await requireChatGPTUser('/');
  return <CrmApp user={{ name: user.displayName, email: user.email }} />;
}
