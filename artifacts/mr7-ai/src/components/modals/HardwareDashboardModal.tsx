'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Power,
  BarChart3,
  LogOut,
  FileText,
  Search,
  Shield,
  Zap,
  Network,
  AlertTriangle,
  Cpu,
  HardDrive,
  Wifi,
  Gauge,
  TrendingUp,
  Check,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SystemStat {
  label: string;
  value: string;
  icon: React.ReactNode;
  status: 'active' | 'warning' | 'critical';
  color: string;
}

export const HardwareDashboardModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const systemStats: SystemStat[] = [
    {
      label: 'Network Status',
      value: 'Connected',
      icon: <Wifi className="w-5 h-5" />,
      status: 'active',
      color: 'from-green-500 to-emerald-600',
    },
    {
      label: 'CPU Usage',
      value: '28%',
      icon: <Cpu className="w-5 h-5" />,
      status: 'active',
      color: 'from-blue-500 to-blue-600',
    },
    {
      label: 'Memory',
      value: '45% / 32GB',
      icon: <HardDrive className="w-5 h-5" />,
      status: 'active',
      color: 'from-purple-500 to-purple-600',
    },
    {
      label: 'Bandwidth',
      value: '1000 Mbps',
      icon: <Gauge className="w-5 h-5" />,
      status: 'active',
      color: 'from-orange-500 to-red-600',
    },
  ];

  const modules = [
    {
      id: 'osint',
      name: 'OSINT Intelligence',
      description: 'جمع معلومات من مصادر عامة',
      icon: <Search className="w-6 h-6" />,
      color: 'from-cyan-500 to-blue-600',
      capability: 'Public Data Collection',
    },
    {
      id: 'network',
      name: 'Network Enumeration',
      description: 'تعداد وكشف الأجهزة على الشبكة',
      icon: <Network className="w-6 h-6" />,
      color: 'from-green-500 to-teal-600',
      capability: 'Network Discovery',
    },
    {
      id: 'vulnerability',
      name: 'Vulnerability Scanning',
      description: 'مسح الثغرات الأمنية',
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'from-yellow-500 to-orange-600',
      capability: 'Security Assessment',
    },
    {
      id: 'exploitation',
      name: 'Exploitation Framework',
      description: 'اختبار واستغلال الثغرات',
      icon: <Zap className="w-6 h-6" />,
      color: 'from-red-500 to-pink-600',
      capability: 'Vulnerability Testing',
    },
    {
      id: 'post-exploit',
      name: 'Post-Exploitation',
      description: 'الحفاظ على الوصول واستخراج البيانات',
      icon: <Shield className="w-6 h-6" />,
      color: 'from-indigo-500 to-purple-600',
      capability: 'Persistence & Data Exfil',
    },
    {
      id: 'privilege',
      name: 'Privilege Escalation',
      description: 'تصعيد الصلاحيات في النظام',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'from-violet-500 to-fuchsia-600',
      capability: 'Privilege Elevation',
    },
  ];

  const menuItems = [
    { icon: <Power className="w-5 h-5" />, label: 'Start All Services', action: 'start' },
    { icon: <Power className="w-5 h-5" />, label: 'Stop All Services', action: 'stop' },
    { icon: <BarChart3 className="w-5 h-5" />, label: 'System Statistics', action: 'stats' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', action: 'settings' },
    { icon: <FileText className="w-5 h-5" />, label: 'Activity Logs', action: 'logs' },
  ];

  const handleModuleClick = (moduleId: string) => {
    setSelectedModule(moduleId);
    setShowDetails(true);
  };

  const containerVariants: import('framer-motion').Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants: import('framer-motion').Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 12,
      },
    },
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-2xl"
          >
            {/* Header */}
            <motion.div className="sticky top-0 z-40 border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Hardware Control Center
                  </h1>
                  <p className="text-slate-400 mt-1 text-sm">Advanced Systems & Tools Management</p>
                </div>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  onClick={onClose}
                  className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-slate-400" />
                </motion.button>
              </div>
            </motion.div>

            {/* Content */}
            <div className="p-6">
              {/* System Status Cards */}
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
              >
                {systemStats.map((stat, index) => (
                  <motion.div
                    key={index}
                    variants={itemVariants}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className={`group relative p-4 rounded-lg border border-slate-700/50 backdrop-blur-sm bg-gradient-to-br ${stat.color} opacity-10 hover:opacity-20 transition-opacity`}
                  >
                    <div className="relative">
                      <div className="flex items-center justify-between mb-3">
                        <div className="p-2 rounded-lg bg-slate-800/50">
                          <div className="text-white">{stat.icon}</div>
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full ${
                            stat.status === 'active'
                              ? 'bg-green-400 animate-pulse'
                              : stat.status === 'warning'
                                ? 'bg-yellow-400'
                                : 'bg-red-400'
                          }`}
                        ></div>
                      </div>
                      <p className="text-slate-300 text-xs font-medium">{stat.label}</p>
                      <p className="text-lg font-bold text-white mt-1">{stat.value}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Modules Grid */}
              <div className="mb-8">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-3 text-white">
                    <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                    Available Modules
                  </h2>
                </motion.div>

                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {modules.map((module) => (
                    <motion.div
                      key={module.id}
                      variants={itemVariants}
                      whileHover={{ y: -8, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleModuleClick(module.id)}
                      className="group relative cursor-pointer"
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-lg blur-lg`}
                      ></div>

                      <div className="relative p-4 rounded-lg border border-slate-700/50 backdrop-blur-sm bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
                        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${module.color} rounded-t-lg`}></div>

                        <div
                          className={`p-2 rounded-lg bg-gradient-to-br ${module.color} opacity-80 group-hover:opacity-100 transition-opacity w-fit mb-3`}
                        >
                          <div className="text-white text-lg">{module.icon}</div>
                        </div>

                        <h3 className="text-sm font-bold text-white mb-1">{module.name}</h3>
                        <p className="text-xs text-slate-400 mb-3">{module.description}</p>

                        <div className="flex items-center justify-between">
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-700/50 text-slate-200">
                            {module.capability}
                          </span>
                          <motion.div initial={{ x: 0 }} whileHover={{ x: 3 }} className="text-slate-400 group-hover:text-white transition-colors text-sm">
                            →
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Important Notice */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-lg border-l-4 border-yellow-500 bg-yellow-500/10 backdrop-blur-sm">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-yellow-400 text-sm mb-1">Legal Notice</h3>
                    <p className="text-slate-300 text-xs">
                      These tools are for authorized security testing ONLY. Unauthorized access is illegal. See Hardware.md for details on what's actually possible.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HardwareDashboardModal;
