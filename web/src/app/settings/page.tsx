import type { Metadata } from 'next';
import {
  Settings,
  Globe,
  Bell,
  Shield,
  Database,
  Info,
  Building2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Configuració',
};

export default function SettingsPage() {
  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050';

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#e6edf3]">Configuració</h1>
        <p className="text-sm text-[#8b949e] mt-0.5">
          Preferències i ajustos de la plataforma
        </p>
      </div>

      {/* API Connection */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-lg">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
          <Globe className="w-4 h-4 text-[#8b949e]" />
          <h2 className="text-sm font-semibold text-[#e6edf3]">Connexió API</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-[#8b949e] font-medium block mb-2">
              URL de l&apos;API
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                defaultValue={apiUrl}
                readOnly
                className="flex-1 px-3 py-2 text-sm bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] focus:outline-none"
              />
              <span className="flex items-center gap-1.5 text-xs text-[#4ade80] px-2 py-1 rounded-lg bg-[#052e16] border border-[#14532d]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] inline-block" />
                Configurada
              </span>
            </div>
            <p className="text-xs text-[#6e7681] mt-1.5">
              Configura la variable d&apos;entorn NEXT_PUBLIC_API_URL
            </p>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-lg">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
          <Bell className="w-4 h-4 text-[#8b949e]" />
          <h2 className="text-sm font-semibold text-[#e6edf3]">Notificacions</h2>
        </div>
        <div className="p-5 space-y-4">
          {[
            {
              label: 'Alertes d\'alta prioritat',
              desc: 'Rep notificació immediata per alertes d\'alta severitat',
              defaultChecked: true,
            },
            {
              label: 'Resum setmanal',
              desc: 'Informe setmanal enviat cada dilluns a les 9:00',
              defaultChecked: true,
            },
            {
              label: 'Noves actes processades',
              desc: 'Notificació quan es processa una nova acta',
              defaultChecked: false,
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#e6edf3]">{item.label}</p>
                <p className="text-xs text-[#6e7681] mt-0.5">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={item.defaultChecked}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#30363d] peer-checked:bg-[#2563eb] rounded-full peer-focus:outline-none transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Data & Privacy */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-lg">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
          <Database className="w-4 h-4 text-[#8b949e]" />
          <h2 className="text-sm font-semibold text-[#e6edf3]">Dades</h2>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
            <div>
              <p className="text-sm text-[#e6edf3]">Municipis monitorats</p>
              <p className="text-xs text-[#6e7681]">947 municipis de Catalunya</p>
            </div>
            <span className="text-sm font-bold text-[#60a5fa]">947</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
            <div>
              <p className="text-sm text-[#e6edf3]">Interval de consulta</p>
              <p className="text-xs text-[#6e7681]">
                Freqüència de cerca de noves actes
              </p>
            </div>
            <span className="text-sm font-medium text-[#8b949e]">24h</span>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="bg-[#161b22] border border-[#30363d] rounded-lg">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#30363d]">
          <Info className="w-4 h-4 text-[#8b949e]" />
          <h2 className="text-sm font-semibold text-[#e6edf3]">Sobre AyuntamentIA</h2>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1e3a8a] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#60a5fa]" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#e6edf3]">AyuntamentIA</p>
              <p className="text-xs text-[#8b949e]">
                Plataforma d&apos;intel·ligència política municipal
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
              <p className="text-[#6e7681]">Versió</p>
              <p className="text-[#e6edf3] font-medium mt-0.5">1.0.0</p>
            </div>
            <div className="p-3 rounded-lg bg-[#0d1117] border border-[#30363d]">
              <p className="text-[#6e7681]">Entorn</p>
              <p className="text-[#e6edf3] font-medium mt-0.5">
                {process.env.NODE_ENV || 'development'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
