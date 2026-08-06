/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Sliders, 
  Plus, 
  Trash2, 
  Volume2, 
  ShieldAlert, 
  Gauge, 
  Check, 
  Compass, 
  Cpu, 
  Globe,
  Settings,
  X
} from 'lucide-react';
import { CustomProfile } from '../types';
import { TRANSLATIONS, Locale } from '../i18n';

interface DrivingModesProps {
  currentSpeed: number;
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  profiles: CustomProfile[];
  onUpdateProfiles: (updated: CustomProfile[]) => void;
  autoDetectEnabled: boolean;
  onToggleAutoDetect: (enabled: boolean) => void;
  locale: Locale;
}

const PRESET_ICONS = ['🏢', '🌳', '🛣️', '⚙️', '🏎️', '🛵', '🚨', '🏁'];

export const DrivingModes: React.FC<DrivingModesProps> = ({
  currentSpeed,
  activeProfileId,
  onSelectProfile,
  profiles,
  onUpdateProfiles,
  autoDetectEnabled,
  onToggleAutoDetect,
  locale
}) => {
  const t = TRANSLATIONS[locale];
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLimit, setEditLimit] = useState(60);
  const [editVolume, setEditVolume] = useState(80);
  const [editIcon, setEditIcon] = useState('🏢');

  // Add Mode State
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newModeName, setNewModeName] = useState('');
  const [newModeLimit, setNewModeLimit] = useState(60);
  const [newModeVolume, setNewModeVolume] = useState(80);
  const [newModeIcon, setNewModeIcon] = useState('🏢');

  // Helper to translate default Vietnamese profiles on the fly
  const getProfileLocalName = (profile: CustomProfile) => {
    if (locale === 'en') {
      if (profile.name === 'Nội thành (City Driving)') return 'City Driving (Urban)';
      if (profile.name === 'Ngoại thành (Suburban Road)') return 'Suburban (Outer Roads)';
      if (profile.name === 'Đường Cao Tốc (Expressway)') return 'Expressway speed limit';
    }
    return profile.name;
  };

  // Activate edit modal
  const handleStartEdit = (p: CustomProfile) => {
    setEditingProfileId(p.id);
    setEditName(p.name);
    setEditLimit(p.limit);
    setEditVolume(p.alertVolume);
    setEditIcon(p.icon);
  };

  const handleSaveEdit = () => {
    if (!editingProfileId) return;
    const updated = profiles.map(p => {
      if (p.id === editingProfileId) {
        return {
          ...p,
          name: editName,
          limit: editLimit,
          alertVolume: editVolume,
          icon: editIcon
        };
      }
      return p;
    });
    onUpdateProfiles(updated);
    setEditingProfileId(null);
  };

  // Add new profile
  const handleAddNewProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModeName.trim()) return;

    const newProfile: CustomProfile = {
      id: 'custom_' + Math.random().toString(36).substr(2, 9),
      name: newModeName,
      limit: newModeLimit,
      alertVolume: newModeVolume,
      icon: newModeIcon
    };

    onUpdateProfiles([...profiles, newProfile]);
    setNewModeName('');
    setIsAddingMode(false);
  };

  // Delete profile
  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (profiles.length <= 1) {
      alert(t.atLeastOneMode);
      return;
    }
    const filtered = profiles.filter(p => p.id !== id);
    onUpdateProfiles(filtered);
    if (activeProfileId === id) {
      onSelectProfile(filtered[0].id);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-[#0F0F11]/90 border border-white/5 shadow-xl space-y-6 flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between text-[11px] font-sans font-bold tracking-widest text-neutral-400 uppercase pb-2 border-b border-white/5">
        <span className="flex items-center gap-1.5">
          <Sliders size={12} className="text-white" /> {t.drivingModesHeader}
        </span>
        <button
          onClick={() => setIsAddingMode(true)}
          className="px-2 py-1 bg-white hover:bg-neutral-250 text-black font-mono font-black text-[9px] rounded-lg tracking-normal flex items-center gap-1 cursor-pointer select-none border-none"
        >
          <Plus size={10} /> {t.addMode}
        </button>
      </div>

      {/* Auto Detect Selector Toggle */}
      <div className="p-4 bg-black border border-white/5 rounded-2xl flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <span className="text-[10px] font-bold text-neutral-300 block">{t.autoDetectTitle}</span>
          <p className="text-[9px] leading-relaxed text-neutral-500 font-sans font-medium">
            {t.autoDetectDesc}
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input 
            type="checkbox" 
            checked={autoDetectEnabled}
            onChange={(e) => onToggleAutoDetect(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-neutral-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-black" />
        </label>
      </div>

      {/* Auto Detect Warning Banner */}
      {autoDetectEnabled && (
        <div className="text-[10px] font-mono text-cyan-400 flex items-center gap-1.5 bg-cyan-950/10 px-3.5 py-1.5 rounded-xl border border-cyan-900/40 animate-pulse select-none">
          <Cpu size={12} className="animate-spin" style={{ animationDuration: '4s' }} />
          <span>{t.autoDetectActive} {Math.round(currentSpeed)} km/h</span>
        </div>
      )}

      {/* Mode Profile Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {profiles.map((p) => {
          const isActive = activeProfileId === p.id;
          return (
            <div
              key={p.id}
              onClick={() => {
                if (!autoDetectEnabled) {
                  onSelectProfile(p.id);
                }
              }}
              className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between min-h-[145px] cursor-pointer select-none relative group ${
                isActive
                  ? 'bg-white border-white text-black shadow-lg scale-[1.01]'
                  : 'bg-black border-white/5 text-neutral-400 hover:border-white/10 hover:text-white'
              } ${autoDetectEnabled ? 'opacity-70 !cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start justify-between w-full">
                <span className="text-2xl mt-0.5">{p.icon}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(p);
                    }}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-neutral-100 hover:bg-neutral-200 border-neutral-300 text-black' 
                        : 'bg-neutral-900 border-white/5 text-neutral-400 hover:text-white'
                    }`}
                    title={locale === 'vi' ? 'Hiệu chỉnh chế độ' : 'Modify'}
                  >
                    <Settings size={10} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteProfile(p.id, e)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-neutral-100 hover:bg-red-50 hover:border-red-500/30 text-red-500' 
                        : 'bg-neutral-900 border-white/0 text-neutral-500 hover:text-red-400'
                    }`}
                    title={locale === 'vi' ? 'Xóa chế độ' : 'Delete'}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>

              <div className="mt-4 text-left">
                <span className="text-[10px] font-bold block truncate font-sans max-w-[130px]" title={getProfileLocalName(p)}>
                  {getProfileLocalName(p)}
                </span>

                <div className="flex items-baseline gap-1 mt-1 font-mono">
                  <span className={`text-[19px] font-black ${isActive ? 'text-black' : 'text-white'}`}>{p.limit}</span>
                  <span className="text-[8px] text-neutral-500 uppercase font-bold">km/h</span>
                </div>
              </div>

              {/* Volume metrics */}
              <div className="mt-2 flex items-center gap-1 text-[8px] tracking-tight text-neutral-500 uppercase font-mono border-t border-white/5 pt-1.5 select-none font-bold">
                <Volume2 size={10} /> {t.alertVolume} {p.alertVolume}%
              </div>

              {isActive && (
                <span className="absolute bottom-3 right-3 p-1 rounded-full bg-black text-white shrink-0">
                  <Check size={10} className="stroke-[3]" />
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Mode Modal Dialog Box */}
      {editingProfileId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0F0F11] border border-white/10 rounded-3xl p-6 w-full max-w-[380px] space-y-4 shadow-2xl overflow-hidden font-sans text-xs">
            <div className="flex items-center justify-between text-white pb-2 border-b border-white/5">
              <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-400">{t.editMode}</span>
              <button 
                onClick={() => setEditingProfileId(null)}
                className="p-1.5 bg-neutral-900 border border-white/5 hover:border-white/10 rounded-lg text-neutral-450 cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold uppercase text-neutral-400">{t.iconAndName}</label>
                <div className="flex gap-2">
                  <select 
                    value={editIcon} 
                    onChange={(e) => setEditIcon(e.target.value)}
                    className="bg-black border border-white/5 text-lg p-2 rounded-xl focus:outline-none cursor-pointer"
                  >
                    {PRESET_ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 bg-black border border-white/5 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-white font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase text-neutral-400">{t.speedLimitLabel}</label>
                  <span className="text-white font-mono font-bold text-[11px] bg-black px-2 py-0.5 rounded border border-white/5">
                    {editLimit} km/h
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="150"
                  step="5"
                  value={editLimit}
                  onChange={(e) => setEditLimit(Number(e.target.value))}
                  className="w-full h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-white"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase text-neutral-400">{t.ttsAlertVolume}</label>
                  <span className="text-white font-mono font-bold text-[11px] bg-black px-2 py-0.5 rounded border border-white/5">
                    {editVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="10"
                  value={editVolume}
                  onChange={(e) => setEditVolume(Number(e.target.value))}
                  className="w-full h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProfileId(null)}
                  className="w-full bg-[#121214] border border-white/5 text-neutral-400 font-bold py-2.5 rounded-xl hover:bg-neutral-900 cursor-pointer select-none"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="w-full bg-white text-black font-black py-2.5 rounded-xl hover:bg-neutral-200 cursor-pointer select-none border-none"
                >
                  {t.saveChanges}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Mode Modal Dialog Box */}
      {isAddingMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form 
            onSubmit={handleAddNewProfile}
            className="bg-[#0F0F11] border border-white/10 rounded-3xl p-6 w-full max-w-[380px] space-y-4 shadow-2xl overflow-hidden font-sans text-xs"
          >
            <div className="flex items-center justify-between text-white pb-2 border-b border-white/5">
              <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-400">{t.addModeHeader}</span>
              <button 
                type="button"
                onClick={() => setIsAddingMode(false)}
                className="p-1.5 bg-neutral-900 border border-white/5 hover:border-white/10 rounded-lg text-neutral-450 cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold uppercase text-neutral-400">{t.iconAndName}</label>
                <div className="flex gap-2">
                  <select 
                    value={newModeIcon} 
                    onChange={(e) => setNewModeIcon(e.target.value)}
                    className="bg-black border border-white/5 text-lg p-2 rounded-xl focus:outline-none cursor-pointer"
                  >
                    {PRESET_ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <input
                    type="text"
                    required
                    placeholder={locale === 'vi' ? 'Ví dụ: Dạo Phố' : 'e.g. City Drive'}
                    value={newModeName}
                    onChange={(e) => setNewModeName(e.target.value)}
                    className="flex-1 bg-black border border-white/5 rounded-xl px-3 text-xs text-white focus:outline-none focus:border-white font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase text-neutral-400">{t.speedLimitLabel}</label>
                  <span className="text-white font-mono font-bold text-[11px] bg-black px-2 py-0.5 rounded border border-white/5">
                    {newModeLimit} km/h
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="150"
                  step="5"
                  value={newModeLimit}
                  onChange={(e) => setNewModeLimit(Number(e.target.value))}
                  className="w-full h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-white"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase text-neutral-400">{t.alertVolume}</label>
                  <span className="text-white font-mono font-bold text-[11px] bg-black px-2 py-0.5 rounded border border-white/5">
                    {newModeVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="10"
                  value={newModeVolume}
                  onChange={(e) => setNewModeVolume(Number(e.target.value))}
                  className="w-full h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingMode(false)}
                  className="w-full bg-[#121214] border border-white/5 text-neutral-400 font-bold py-2.5 rounded-xl hover:bg-neutral-900 cursor-pointer select-none"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="w-full bg-white text-black font-black py-2.5 rounded-xl hover:bg-neutral-200 cursor-pointer select-none border-none animate-pulse"
                >
                  {t.createMode}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

