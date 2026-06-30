#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════
#  MR7.AI — System Performance Tuning Script
#  Optimizes kernel, network, and I/O for AI workloads
# ══════════════════════════════════════════════════════════
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "${BLUE}[STEP]${NC} $1"; }

check_root() { [[ $EUID -eq 0 ]] || { log_error "Must be run as root."; exit 1; }; }
backup_sysctl() { cp /etc/sysctl.conf "/etc/sysctl.conf.backup.$(date +%Y%m%d_%H%M%S)"; }

tune_kernel() {
    log_step "Tuning kernel parameters..."
    cat >> /etc/sysctl.conf << 'EOF'

# ── MR7.AI Network Tuning ─────────────────────────────────
net.core.rmem_max = 67108864
net.core.wmem_max = 67108864
net.core.rmem_default = 31457280
net.core.wmem_default = 31457280
net.core.netdev_max_backlog = 30000
net.core.somaxconn = 65535
net.ipv4.tcp_rmem = 4096 87380 67108864
net.ipv4.tcp_wmem = 4096 65536 67108864
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq
net.ipv4.tcp_mtu_probing = 1
net.ipv4.tcp_fin_timeout = 10
net.ipv4.tcp_keepalive_time = 120
net.ipv4.tcp_keepalive_intvl = 10
net.ipv4.tcp_keepalive_probes = 6
net.ipv4.tcp_tw_reuse = 1
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_fastopen = 3
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_max_tw_buckets = 400000
net.ipv4.tcp_syncookies = 1

# ── Memory Management ─────────────────────────────────────
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.vfs_cache_pressure = 50
vm.overcommit_memory = 1
vm.overcommit_ratio = 80
vm.nr_hugepages = 2048
kernel.numa_balancing = 1

# ── File System ───────────────────────────────────────────
fs.file-max = 2097152
fs.inotify.max_user_watches = 524288
fs.inotify.max_user_instances = 512
fs.aio-max-nr = 1048576

# ── Security ──────────────────────────────────────────────
kernel.randomize_va_space = 2
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
EOF
    sysctl -p /etc/sysctl.conf
    log_info "Kernel parameters applied."
}

tune_limits() {
    log_step "Tuning system limits..."
    cat > /etc/security/limits.d/mr7-ai.conf << 'EOF'
*       soft    nofile      1048576
*       hard    nofile      1048576
*       soft    nproc       131072
*       hard    nproc       131072
*       soft    stack       unlimited
*       hard    stack       unlimited
*       soft    memlock     unlimited
*       hard    memlock     unlimited
root    soft    nofile      1048576
root    hard    nofile      1048576
EOF
    log_info "System limits configured."
}

tune_cpu() {
    log_step "Tuning CPU settings..."
    if command -v cpupower &>/dev/null; then
        cpupower frequency-set -g performance 2>/dev/null || log_warn "Could not set CPU governor."
    fi
    if [[ -d /sys/devices/system/cpu ]]; then
        for cpu in /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor; do
            [[ -f "$cpu" ]] && echo performance > "$cpu" 2>/dev/null || true
        done
        log_info "CPU governors set to performance."
    fi
    for c in /sys/devices/system/cpu/cpu*/cpuidle/state*/disable; do
        [[ -f "$c" ]] && echo 1 > "$c" 2>/dev/null || true
    done
    log_info "CPU idle states disabled."
}

tune_disk_io() {
    log_step "Tuning disk I/O..."
    for disk in /sys/block/sd* /sys/block/nvme*; do
        [[ -d "$disk" ]] || continue
        name=$(basename "$disk")
        scheduler_path="$disk/queue/scheduler"
        read_ahead_path="$disk/queue/read_ahead_kb"
        if [[ -f "$scheduler_path" ]]; then
            if grep -q "mq-deadline" "$scheduler_path" 2>/dev/null; then
                echo mq-deadline > "$scheduler_path"
            elif grep -q "deadline" "$scheduler_path" 2>/dev/null; then
                echo deadline > "$scheduler_path"
            elif grep -q "none" "$scheduler_path" 2>/dev/null; then
                echo none > "$scheduler_path"
            fi
        fi
        [[ -f "$read_ahead_path" ]] && echo 2048 > "$read_ahead_path"
        log_info "Tuned disk: $name"
    done
}

tune_nvidia() {
    log_step "Tuning NVIDIA GPU..."
    if command -v nvidia-smi &>/dev/null; then
        nvidia-smi -pm 1 && log_info "Persistence mode enabled."
        nvidia-smi --auto-boost-default=0 && log_info "Auto-boost disabled."
        nvidia-smi -ac 877,1530 2>/dev/null || log_warn "Could not set GPU clocks."
        nvidia-smi --compute-mode=DEFAULT && log_info "GPU compute mode set."
        log_info "NVIDIA GPU tuned."
    else
        log_warn "nvidia-smi not found — skipping GPU tuning."
    fi
}

tune_memory_hugepages() {
    log_step "Configuring Transparent HugePages..."
    if [[ -f /sys/kernel/mm/transparent_hugepage/enabled ]]; then
        echo madvise > /sys/kernel/mm/transparent_hugepage/enabled
        echo defer+madvise > /sys/kernel/mm/transparent_hugepage/defrag
        log_info "THP set to madvise."
    fi
}

tune_network_offloading() {
    log_step "Enabling network offloading..."
    PRIMARY_IF=$(ip route | awk '/^default/{print $5}' | head -1)
    if [[ -n "$PRIMARY_IF" ]]; then
        ethtool -K "$PRIMARY_IF" tso on gso on gro on 2>/dev/null || log_warn "Could not set TSO/GRO."
        ethtool -G "$PRIMARY_IF" rx 4096 tx 4096 2>/dev/null || log_warn "Could not set ring buffers."
        ethtool -C "$PRIMARY_IF" rx-usecs 50 2>/dev/null || log_warn "Could not set IRQ coalescing."
        log_info "Network offloading configured for $PRIMARY_IF."
    else
        log_warn "No primary interface found."
    fi
}

install_bbr() {
    log_step "Enabling TCP BBR congestion control..."
    modprobe tcp_bbr 2>/dev/null || log_warn "Could not load tcp_bbr module."
    if grep -q "tcp_bbr" /proc/net/tcp_allowed_congestion_control 2>/dev/null; then
        log_info "BBR is available and enabled."
    else
        log_warn "BBR not available on this kernel."
    fi
}

print_summary() {
    log_info "Performance tuning complete."
    echo ""
    echo "Summary:"
    echo "  - Kernel params: /etc/sysctl.conf"
    echo "  - System limits: /etc/security/limits.d/mr7-ai.conf"
    echo "  - CPU: Performance mode"
    echo "  - Disk: Deadline scheduler + read-ahead 2MB"
    echo "  - GPU: Persistence mode + clocks"
    echo "  - Network: BBR + TSO/GRO offloading"
    echo ""
    echo "Reboot recommended for full effect."
}

main() {
    check_root
    backup_sysctl
    tune_kernel
    tune_limits
    tune_cpu
    tune_disk_io
    tune_nvidia
    tune_memory_hugepages
    tune_network_offloading
    install_bbr
    print_summary
}

main "$@"
