import { getProfile } from "@/lib/profile";
import { SettingsForm } from "@/components/settings-form";
import { ThemeSettings } from "@/components/theme-settings";
import { DomainsManager } from "@/components/domains-manager";
import { ConnectionsForm } from "@/components/connections-form";
import { ApiKeysManager } from "@/components/api-keys-manager";
import { WebhooksManager } from "@/components/webhooks-manager";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const profile = getProfile();
  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-6 text-lg font-semibold tracking-tight">Settings</h1>
        <SettingsForm profile={profile} />
      </div>
      <div className="border-t border-neutral-200 pt-10">
        <ThemeSettings />
      </div>
      <div className="border-t border-neutral-200 pt-10">
        <DomainsManager />
      </div>
      <div className="border-t border-neutral-200 pt-10">
        <ConnectionsForm />
      </div>
      <div className="border-t border-neutral-200 pt-10">
        <ApiKeysManager />
      </div>
      <div className="border-t border-neutral-200 pt-10">
        <WebhooksManager />
      </div>
    </div>
  );
}
