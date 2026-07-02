import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Settings, Radio, Zap as ZapIcon, Globe, Wind, AlertTriangle, Code, Users, Layers, Cpu, HardDrive } from 'lucide-react';
import { useStore } from '../lib/store';
import HardwareDashboardModal from './modals/HardwareDashboardModal';

// [استبدل المحتويات الأساسية للملف - سأضيف فقط الأجزاء الضرورية]
// يتم إضافة import الـ Modal في الأعلى

export function TopBarHardwareButton({ onOpenHardware }: { onOpenHardware: () => void }) {
  return (
    <motion.button
      onClick={onOpenHardware}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide text-white"
      style={{
        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
        boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)',
        border: '1px solid rgba(139, 92, 246, 0.5)',
      }}
      title="Hardware Control Center"
    >
      <HardDrive className="w-4 h-4" />
      <span className="hidden sm:inline">Hardware</span>
    </motion.button>
  );
}
