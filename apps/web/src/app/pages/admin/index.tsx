import { useEffect, useState } from "react";
import {
  PlusIcon,
  BuildingOffice2Icon,
  BuildingStorefrontIcon,
  SparklesIcon,
  KeyIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  BoltIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import clsx from "clsx";

import { Page } from "@/components/shared/Page";
import { Button, Card, Input, Spinner, Tag, Badge, Textarea, Select } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";
import {
  createCompany,
  createTenant,
  listCompanies,
  listTenants,
  type AdminCompany,
  type Tenant,
} from "@/services/adminService";
import {
  getClaudeConfig,
  updateClaudeConfig,
  testClaudeConnection,
  type ClaudeConfigData,
  type TestClaudeResult,
} from "@/services/aiService";

export default function AdminConsolePage() {
  const { isSuperAdmin } = useAuthContext();

  // Tab: "tenants" | "claude"
  const [activeTab, setActiveTab] = useState<"tenants" | "claude">("tenants");

  // --- Şirket / Holding Durumu ---
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTenant, setNewTenant] = useState("");
  const [newCompany, setNewCompany] = useState("");

  // --- Claude AI Durumu ---
  const [aiConfig, setAiConfig] = useState<ClaudeConfigData | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("claude-haiku-5-5");
  const [maxTokens, setMaxTokens] = useState<number>(1024);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [showKey, setShowKey] = useState(false);
  const [isSavingAi, setIsSavingAi] = useState(false);

  // Test Konsolu
  const [testPrompt, setTestPrompt] = useState(
    "Merhaba! FilomOnline filo yönetim sistemi için Claude AI bağlantı testi yapıyoruz. Lütfen sistemin hazır olduğunu belirten kısa ve profesyonel bir selamlama yap.",
  );
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestClaudeResult | null>(null);

  const loadTenants = async () => {
    setLoading(true);
    try {
      const t = await listTenants();
      setTenants(t);
      if (!selected && t.length) selectTenant(t[0]);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Holdingler alınamadı");
    } finally {
      setLoading(false);
    }
  };

  const selectTenant = async (t: Tenant) => {
    setSelected(t);
    try {
      setCompanies(await listCompanies(t.id));
    } catch {
      setCompanies([]);
    }
  };

  const loadAiConfig = async () => {
    setAiLoading(true);
    try {
      const cfg = await getClaudeConfig();
      setAiConfig(cfg);
      setSelectedModel(cfg.model || "claude-haiku-5-5");
      setMaxTokens(cfg.maxTokens || 1024);
      setTemperature(cfg.temperature ?? 0.7);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "AI konfigürasyonu alınamadı");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadTenants();
      loadAiConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const addTenant = async () => {
    if (newTenant.trim().length < 2) return;
    try {
      const t = await createTenant(newTenant.trim());
      setNewTenant("");
      toast.success("Holding oluşturuldu");
      await loadTenants();
      selectTenant(t);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  const addCompany = async () => {
    if (!selected || newCompany.trim().length < 2) return;
    try {
      await createCompany(selected.id, newCompany.trim());
      setNewCompany("");
      toast.success("Firma oluşturuldu");
      selectTenant(selected);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  const handleSaveAiConfig = async () => {
    setIsSavingAi(true);
    try {
      const updated = await updateClaudeConfig({
        apiKey: apiKeyInput.trim() || undefined,
        model: selectedModel,
        maxTokens: Number(maxTokens) || 1024,
        temperature: Number(temperature) ?? 0.7,
      });
      setAiConfig(updated);
      setApiKeyInput("");
      toast.success("Claude AI ayarları başarıyla kaydedildi");
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Ayar kaydedilemedi");
    } finally {
      setIsSavingAi(false);
    }
  };

  const handleRunTest = async () => {
    if (!testPrompt.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testClaudeConnection(testPrompt.trim());
      setTestResult(res);
      toast.success("Claude yanıt verdi!");
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Test başarısız oldu");
    } finally {
      setIsTesting(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <Page title="Platform Yönetimi">
        <div className="w-full px-(--margin-x) py-6">
          <Card className="p-8 text-center text-gray-400">
            Bu alan yalnızca platform yöneticisine açıktır.
          </Card>
        </div>
      </Page>
    );
  }

  const modelOptions = (aiConfig?.availableModels || []).map((m) => ({
    value: m.id,
    label: m.name,
  }));

  return (
    <Page title="Platform Yönetimi">
      <div className="w-full px-(--margin-x) py-6">
        {/* Başlık ve Sekmeler */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-50">Platform & Süper Admin Konsolu</h2>
            <p className="text-sm text-gray-500 dark:text-dark-300">
              Holding/şirket organizasyonu ve Claude AI servis yapılandırması
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 dark:bg-dark-800">
            <button
              type="button"
              onClick={() => setActiveTab("tenants")}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                activeTab === "tenants"
                  ? "bg-white text-gray-900 shadow-xs dark:bg-dark-700 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-dark-300 dark:hover:text-white",
              )}
            >
              <BuildingOffice2Icon className="size-4" />
              <span>Holding & Şirketler</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("claude")}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                activeTab === "claude"
                  ? "bg-white text-gray-900 shadow-xs dark:bg-dark-700 dark:text-white"
                  : "text-gray-600 hover:text-gray-900 dark:text-dark-300 dark:hover:text-white",
              )}
            >
              <SparklesIcon className="size-4 text-primary-500" />
              <span>Claude AI Servisi</span>
              {aiConfig?.isConfigured ? (
                <span className="size-2 rounded-full bg-success" title="Bağlantı Hazır" />
              ) : (
                <span className="size-2 rounded-full bg-warning" title="Kurulum Bekliyor" />
              )}
            </button>
          </div>
        </div>

        {/* TAB 1: Holding & Firmalar */}
        {activeTab === "tenants" && (
          <div className="mt-6">
            {loading ? (
              <div className="flex justify-center py-16">
                <Spinner className="size-8" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
                {/* Holdingler */}
                <Card className="p-5">
                  <div className="mb-3 flex items-center gap-2 text-gray-800 dark:text-dark-100">
                    <BuildingOffice2Icon className="size-5 text-primary-500" />
                    <h3 className="font-semibold">Holdingler (Tenant)</h3>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Yeni holding adı"
                      value={newTenant}
                      onChange={(e) => setNewTenant(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTenant()}
                    />
                    <Button color="primary" isIcon onClick={addTenant}>
                      <PlusIcon className="size-5" />
                    </Button>
                  </div>
                  <div className="mt-4 space-y-1.5">
                    {tenants.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => selectTenant(t)}
                        className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors ${
                          selected?.id === t.id
                            ? "bg-primary-50 font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                            : "hover:bg-gray-100 dark:hover:bg-dark-600 text-gray-700 dark:text-dark-200"
                        }`}
                      >
                        <span className="truncate">{t.name}</span>
                        <Tag color={t.isActive ? "success" : "neutral"} className="text-tiny">
                          {t._count?.companies ?? 0} firma
                        </Tag>
                      </button>
                    ))}
                  </div>
                </Card>

                {/* Seçili holdingin firmaları */}
                <Card className="p-5">
                  <div className="mb-3 flex items-center gap-2 text-gray-800 dark:text-dark-100">
                    <BuildingStorefrontIcon className="size-5 text-primary-500" />
                    <h3 className="font-semibold">
                      {selected ? `${selected.name} — Alt Firmalar` : "Firmalar"}
                    </h3>
                  </div>
                  {selected ? (
                    <>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Yeni firma adı (örn: Filom Otomotiv A.Ş.)"
                          value={newCompany}
                          onChange={(e) => setNewCompany(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && addCompany()}
                        />
                        <Button color="primary" isIcon onClick={addCompany}>
                          <PlusIcon className="size-5" />
                        </Button>
                      </div>
                      <div className="mt-4 space-y-2">
                        {companies.length === 0 ? (
                          <p className="py-8 text-center text-sm text-gray-400">
                            Bu holdinge ait henüz kayıtlı firma bulunmuyor.
                          </p>
                        ) : (
                          companies.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between rounded-xl border border-gray-150 bg-gray-50/50 px-4 py-3 text-sm dark:border-dark-600 dark:bg-dark-750"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex size-8 items-center justify-center rounded-lg bg-white shadow-xs dark:bg-dark-600">
                                  <BuildingStorefrontIcon className="size-4 text-gray-600 dark:text-dark-200" />
                                </div>
                                <span className="font-medium text-gray-800 dark:text-dark-100">
                                  {c.name}
                                </span>
                              </div>
                              <Tag color={c.isActive ? "success" : "neutral"} className="text-tiny">
                                {c._count?.memberships ?? 0} kullanıcı
                              </Tag>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="py-8 text-center text-sm text-gray-400">Soldan bir holding seçin.</p>
                  )}
                </Card>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Claude AI Yapılandırması */}
        {activeTab === "claude" && (
          <div className="mt-6 space-y-6">
            {aiLoading ? (
              <div className="flex justify-center py-16">
                <Spinner className="size-8" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* 1. Yapılandırma Kartı */}
                <Card className="p-6">
                  <div className="flex items-center justify-between border-b border-gray-150 pb-4 dark:border-dark-600">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400">
                        <SparklesIcon className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-dark-50">
                          Claude AI Entegrasyon Ayarları
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-dark-300">
                          Anthropic API anahtarınızı ve varsayılan yapay zeka modelini belirleyin.
                        </p>
                      </div>
                    </div>

                    {aiConfig?.isConfigured ? (
                      <Badge color="success" variant="soft" className="gap-1 px-2.5 py-1 text-xs">
                        <CheckCircleIcon className="size-4" />
                        Aktif
                      </Badge>
                    ) : (
                      <Badge color="warning" variant="soft" className="gap-1 px-2.5 py-1 text-xs">
                        <ExclamationTriangleIcon className="size-4" />
                        Anahtar Eksik
                      </Badge>
                    )}
                  </div>

                  <div className="mt-6 space-y-5">
                    {/* Model Seçimi */}
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                        Varsayılan Model
                      </label>
                      <Select
                        data={modelOptions}
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full"
                      />
                      <p className="mt-1 text-tiny text-gray-500 dark:text-dark-300">
                        Haiku modeli sistem için en hızlı, hafif ve uygun maliyetli çözümdür.
                      </p>
                    </div>

                    {/* API Key */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                          Anthropic API Anahtarı
                        </label>
                        {aiConfig?.maskedApiKey && (
                          <span className="text-tiny font-mono text-gray-400 dark:text-dark-400">
                            Kayıtlı: {aiConfig.maskedApiKey}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          type={showKey ? "text" : "password"}
                          placeholder={
                            aiConfig?.maskedApiKey
                              ? "Yeni anahtar girmek için yazın (boşsa mevcut korunur)"
                              : "sk-ant-api03-..."
                          }
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          prefix={<KeyIcon className="size-4.5 text-gray-400" />}
                          suffix={
                            <button
                              type="button"
                              onClick={() => setShowKey(!showKey)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-200"
                            >
                              {showKey ? <EyeSlashIcon className="size-4.5" /> : <EyeIcon className="size-4.5" />}
                            </button>
                          }
                        />
                      </div>
                      <p className="mt-1 text-tiny text-gray-500 dark:text-dark-300">
                        API anahtarınızı <span className="font-mono text-primary-600">secure.md</span> dosyasından kopyalayabilir veya Anthropic Console&apos;dan temin edebilirsiniz.
                      </p>
                    </div>

                    {/* Gelişmiş Ayarlar (Token & Sıcaklık) */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <Input
                        label="Maksimum Token"
                        type="number"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(Number(e.target.value))}
                        min={128}
                        max={4096}
                      />
                      <Input
                        label="Sıcaklık (Temperature)"
                        type="number"
                        step="0.1"
                        min={0}
                        max={1}
                        value={temperature}
                        onChange={(e) => setTemperature(Number(e.target.value))}
                      />
                    </div>

                    <div className="flex justify-end pt-3">
                      <Button
                        color="primary"
                        onClick={handleSaveAiConfig}
                        disabled={isSavingAi}
                        className="gap-2 px-5 py-2.5 font-medium shadow-xs"
                      >
                        {isSavingAi ? <Spinner className="size-4" /> : <CheckCircleIcon className="size-4" />}
                        <span>Ayarları Kaydet</span>
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* 2. Canlı Test Konsolu */}
                <Card className="flex flex-col p-6">
                  <div className="flex items-center gap-3 border-b border-gray-150 pb-4 dark:border-dark-600">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                      <BoltIcon className="size-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-dark-50">
                        Canlı Claude Bağlantı Testi
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-dark-300">
                        Aktif API anahtarı ve seçili Haiku modeliyle gerçek zamanlı sorgu yapın.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex grow flex-col space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                        Test İstemi (Prompt)
                      </label>
                      <Textarea
                        rows={3}
                        value={testPrompt}
                        onChange={(e) => setTestPrompt(e.target.value)}
                        placeholder="Claude'a göndermek istediğiniz test mesajını yazın..."
                        className="text-sm"
                      />
                    </div>

                    <div>
                      <Button
                        color="primary"
                        onClick={handleRunTest}
                        disabled={isTesting || (!aiConfig?.isConfigured && !apiKeyInput)}
                        className="gap-2 font-medium"
                      >
                        {isTesting ? <Spinner className="size-4" /> : <PaperAirplaneIcon className="size-4" />}
                        <span>{isTesting ? "Claude Yanıt Veriyor..." : "Bağlantıyı Test Et"}</span>
                      </Button>
                    </div>

                    {/* Test Yanıtı */}
                    {testResult && (
                      <div className="mt-auto space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                        <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                          <span className="flex items-center gap-1.5">
                            <CheckCircleIcon className="size-4 text-emerald-600" />
                            Yanıt Başarılı
                          </span>
                          <span className="font-mono text-tiny">
                            ⚡ {testResult.latencyMs} ms • {testResult.model}
                          </span>
                        </div>

                        <div className="rounded-lg bg-white p-3 text-xs leading-relaxed text-gray-800 shadow-2xs dark:bg-dark-800 dark:text-dark-100">
                          {testResult.response}
                        </div>

                        {testResult.usage && (
                          <div className="text-right text-[10px] text-gray-400 dark:text-dark-400">
                            Token: {testResult.usage.inputTokens} girdi / {testResult.usage.outputTokens} çıktı
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}
