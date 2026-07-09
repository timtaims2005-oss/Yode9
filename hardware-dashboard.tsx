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

const HardwareDashboard = () => {
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-50 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                🔧 Hardware Control Center
              </h1>
              <p className="text-slate-400 mt-2">Advanced Systems & Tools Management Platform</p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-green-500/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400">System Online</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* System Status Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12"
        >
          {systemStats.map((stat, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.02 }}
              className={`group relative p-6 rounded-xl border border-slate-700/50 backdrop-blur-sm bg-gradient-to-br ${stat.color} opacity-10 hover:opacity-20 transition-opacity`}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-slate-800/50`}>
                    <div className={`text-white`}>{stat.icon}</div>
                  </div>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      stat.status === 'active'
                        ? 'bg-green-400 animate-pulse'
                        : stat.status === 'warning'
                          ? 'bg-yellow-400'
                          : 'bg-red-400'
                    }`}
                  ></div>
                </div>
                <p className="text-slate-300 text-sm font-medium">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Module Grid */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
              Available Modules
            </h2>
            <p className="text-slate-400 mt-2">Advanced cybersecurity and reconnaissance tools</p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {modules.map((module) => (
              <motion.div
                key={module.id}
                variants={itemVariants}
                whileHover={{ y: -10, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleModuleClick(module.id)}
                className="group relative cursor-pointer"
              >
                {/* Gradient background */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-20 transition-opacity duration-300 rounded-xl blur-xl`}
                ></div>

                {/* Card */}
                <div className="relative p-6 rounded-xl border border-slate-700/50 backdrop-blur-sm bg-slate-800/40 hover:bg-slate-800/60 transition-colors">
                  {/* Top accent */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${module.color} rounded-t-xl`}></div>

                  {/* Icon */}
                  <div
                    className={`p-3 rounded-lg bg-gradient-to-br ${module.color} opacity-80 group-hover:opacity-100 transition-opacity w-fit mb-4`}
                  >
                    <div className="text-white">{module.icon}</div>
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-bold text-white mb-2">{module.name}</h3>
                  <p className="text-sm text-slate-400 mb-4">{module.description}</p>

                  {/* Capability badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs px-3 py-1 rounded-full bg-slate-700/50 text-slate-200">
                      {module.capability}
                    </span>
                    <motion.div
                      initial={{ x: 0 }}
                      whileHover={{ x: 5 }}
                      className="text-slate-400 group-hover:text-white transition-colors"
                    >
                      →
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 p-6 rounded-xl border-l-4 border-yellow-500 bg-yellow-500/10 backdrop-blur-sm"
        >
          <div className="flex gap-4">
            <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-yellow-400 mb-2">⚠️ Legal Notice</h3>
              <p className="text-slate-300 text-sm">
                These tools are for authorized security testing ONLY. Unauthorized access to computer systems is illegal.
                Use only on systems you own or have written permission to test. See Hardware.md for details on what's
                actually possible vs. theoretical concepts.
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Control Button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setMenuOpen(!menuOpen)}
        className="fixed bottom-8 right-8 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center text-2xl hover:from-blue-600 hover:to-purple-700"
      >
        <Settings className="w-8 h-8" style={{ transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
      </motion.button>

      {/* Control Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-28 right-8 z-50 w-72 rounded-2xl bg-slate-800/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>

            <div className="relative">
              {/* Menu Header */}
              <div className="px-6 py-4 border-b border-slate-700/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <h3 className="font-bold text-white text-sm">System Control Panel</h3>
              </div>

              {/* Menu Items */}
              <div className="divide-y divide-slate-700/30">
                {menuItems.map((item, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ paddingLeft: 32 }}
                    className="w-full px-6 py-4 text-left flex items-center gap-3 hover:bg-slate-700/30 transition-colors text-sm text-slate-200 hover:text-white"
                  >
                    <div className="text-slate-400 hover:text-blue-400 transition-colors">{item.icon}</div>
                    <span>{item.label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Menu Footer */}
              <div className="px-6 py-3 bg-slate-900/50 border-t border-slate-700/50">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full py-2 rounded-lg text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Exit Control Panel
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Module Details Modal */}
      <AnimatePresence>
        {showDetails && selectedModule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDetails(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-2xl w-full rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {modules.find((m) => m.id === selectedModule)?.name}
                </h2>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  onClick={() => setShowDetails(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              <p className="text-slate-300 mb-6">
                {modules.find((m) => m.id === selectedModule)?.description}
              </p>

              <div className="bg-slate-700/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-400">
                  📌 This module provides security testing capabilities. Always ensure you have proper authorization
                  before using on any system.
                </p>
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 py-3 rounded-lg font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 transition-all"
                >
                  View Details
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDetails(false)}
                  className="flex-1 py-3 rounded-lg font-medium text-white bg-slate-700 hover:bg-slate-600 transition-all"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom animations */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default HardwareDashboard;
