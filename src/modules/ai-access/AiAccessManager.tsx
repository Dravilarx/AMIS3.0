import React, { useState } from 'react';
import { Bot, BookOpen, Settings2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { AccessDirectory } from './AccessDirectory';
import { BotRulesEditor } from './BotRulesEditor';

type TabId = 'directory' | 'rules';

const TABS: { id: TabId; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'directory', label: 'Directorio de Accesos', icon: BookOpen, description: 'Whitelisting & identidades médicas' },
  { id: 'rules', label: 'Reglas y Comportamiento', icon: Settings2, description: 'System prompt & personalidad del bot' },
];

export const AiAccessManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('directory');

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* === HEADER === */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl border border-cyan-500/20">
              <Bot className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-brand-text tracking-tight uppercase leading-none">
                Configuración Bot
              </h1>
              <p className="text-[10px] text-brand-text/40 font-bold uppercase tracking-[0.3em]">
                Directorio Médico · Reglas de Comportamiento · Motor IA AMIS
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* === TAB SELECTOR === */}
      <div className="flex bg-brand-surface/50 border border-brand-border p-1.5 rounded-2xl w-fit gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2.5 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === tab.id
                ? "bg-brand-bg text-brand-text shadow-sm"
                : "text-brand-text/40 hover:text-brand-text/80"
            )}
          >
            <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-cyan-400" : "text-brand-text/30")} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* === TAB CONTENT === */}
      {activeTab === 'directory' ? (
        <AccessDirectory />
      ) : (
        <BotRulesEditor />
      )}
    </div>
  );
};
