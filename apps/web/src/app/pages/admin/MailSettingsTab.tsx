import { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  PaperAirplaneIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Badge, Button, Card, Input, Spinner, Switch } from "@/components/ui";
import { getMailConfig, testMail, updateMailConfig, type MailConfig } from "@/services/adminService";

const errMsg = (err: unknown, fallback: string) =>
  [(err as { message?: string | string[] })?.message ?? fallback].flat().join(", ");

/** Süper admin: platformun e-posta gönderim hesabı (teklif linkleri vb. buradan gider) */
export function MailSettingsTab({ onStatus }: { onStatus?: (configured: boolean) => void }) {
  const [config, setConfig] = useState<MailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ host: "", port: 465, secure: true, username: "", password: "", fromEmail: "", fromName: "" });
  const [testTo, setTestTo] = useState("");
  const [testOk, setTestOk] = useState<string | null>(null);

  const apply = (c: MailConfig) => {
    setConfig(c);
    onStatus?.(c.isConfigured);
    setForm({ host: c.host, port: c.port, secure: c.secure, username: c.username, password: "", fromEmail: c.fromEmail, fromName: c.fromName });
  };

  useEffect(() => {
    getMailConfig()
      .then(apply)
      .catch((err) => toast.error(errMsg(err, "E-posta ayarları alınamadı")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      apply(await updateMailConfig({ ...form, password: form.password || undefined }));
      toast.success("E-posta ayarları kaydedildi");
    } catch (err) {
      toast.error(errMsg(err, "Kaydedilemedi"));
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestOk(null);
    try {
      const r = await testMail(testTo.trim() || undefined);
      setTestOk(r.sentTo ? `Deneme e-postası ${r.sentTo} adresine gönderildi (${r.latencyMs} ms)` : `Sunucu bağlantısı ve giriş başarılı (${r.latencyMs} ms)`);
    } catch (err) {
      toast.error(errMsg(err, "Test başarısız"));
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <div className="flex items-center justify-between border-b border-gray-150 pb-4 dark:border-dark-600">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400">
              <EnvelopeIcon className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-dark-50">E-posta Gönderim Hesabı (SMTP)</h3>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Tüm firmaların teklif e-postaları bu hesaptan, firma adıyla gönderilir.
              </p>
            </div>
          </div>
          {config?.isConfigured ? (
            <Badge color="success" variant="soft" className="gap-1 px-2.5 py-1 text-xs">
              <CheckCircleIcon className="size-4" />
              Tanımlı
            </Badge>
          ) : (
            <Badge color="warning" variant="soft" className="gap-1 px-2.5 py-1 text-xs">
              <ExclamationTriangleIcon className="size-4" />
              Eksik
            </Badge>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="SMTP Sunucusu"
              className="col-span-2"
              placeholder="mail.firma.com"
              value={form.host}
              onChange={(e) => set("host", e.target.value)}
            />
            <Input
              label="Port"
              inputMode="numeric"
              value={form.port ? String(form.port) : ""}
              onChange={(e) => set("port", Number(e.target.value.replace(/\D/g, "").slice(0, 5)) || 0)}
            />
          </div>
          <Switch
            label={form.secure ? "SSL bağlantı (genelde port 465)" : "STARTTLS (genelde port 587)"}
            checked={form.secure}
            onChange={(e) => set("secure", e.target.checked)}
          />
          <Input label="Kullanıcı Adı" placeholder="crm@firma.com" value={form.username} onChange={(e) => set("username", e.target.value)} />
          <div>
            <Input
              label="Şifre"
              type={showPass ? "text" : "password"}
              placeholder={config?.maskedPassword ? `Kayıtlı (${config.maskedPassword}) — değiştirmek için yazın` : "E-posta hesabının şifresi"}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              prefix={<KeyIcon className="size-4.5 text-gray-400" />}
              suffix={
                <button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-200">
                  {showPass ? <EyeSlashIcon className="size-4.5" /> : <EyeIcon className="size-4.5" />}
                </button>
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Gönderen Adresi" placeholder="Boşsa kullanıcı adı" value={form.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} />
            <Input label="Varsayılan Gönderen Adı" placeholder="FilomOnline" value={form.fromName} onChange={(e) => set("fromName", e.target.value)} />
          </div>
          <p className="text-tiny text-gray-500 dark:text-dark-300">
            Teklif e-postalarında gönderen adı olarak firma adı görünür; müşteri yanıtlarsa e-posta teklifi gönderen kullanıcıya gider.
          </p>
          <div className="flex justify-end pt-2">
            <Button color="primary" onClick={save} disabled={saving} className="gap-2 px-5">
              {saving ? <Spinner className="size-4" /> : <CheckCircleIcon className="size-4" />}
              Ayarları Kaydet
            </Button>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col p-6">
        <div className="flex items-center gap-3 border-b border-gray-150 pb-4 dark:border-dark-600">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
            <PaperAirplaneIcon className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-dark-50">Bağlantı Testi</h3>
            <p className="text-xs text-gray-500 dark:text-dark-300">Kayıtlı ayarlarla sunucuya bağlanır; adres yazarsanız deneme e-postası gönderir.</p>
          </div>
        </div>
        <div className="mt-5 space-y-4">
          <Input label="Deneme e-postası adresi (isteğe bağlı)" type="email" placeholder="ornek@firma.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          <Button color="primary" onClick={runTest} disabled={testing || !config?.isConfigured} className="gap-2">
            {testing ? <Spinner className="size-4" /> : <PaperAirplaneIcon className="size-4" />}
            {testing ? "Deneniyor..." : testTo.trim() ? "Deneme E-postası Gönder" : "Bağlantıyı Test Et"}
          </Button>
          {testOk && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
              <CheckCircleIcon className="size-4 shrink-0" />
              {testOk}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
