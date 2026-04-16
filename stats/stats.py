#!/usr/bin/env python3
"""
anni-stats — lightweight system stats API for yumehana.dev status dashboard
Reads real data from /proc, vcgencmd, df, systemctl, and fail2ban.
Runs on port 5000, proxied through nginx at /api/stats
"""

import json
import time
import subprocess
import os
import re
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone

PORT = 5000

# ── Helpers ──────────────────────────────────────────────

def run(cmd):
    """Run a shell command, return stdout or empty string on failure."""
    try:
        return subprocess.check_output(
            cmd, shell=True, stderr=subprocess.DEVNULL, timeout=3
        ).decode().strip()
    except Exception:
        return ""

def read(path):
    """Read a file, return content or empty string."""
    try:
        with open(path) as f:
            return f.read()
    except Exception:
        return ""

# ── Stats collectors ─────────────────────────────────────

def get_uptime():
    raw = read("/proc/uptime")
    if not raw:
        return {"seconds": 0, "human": "unknown"}
    secs = float(raw.split()[0])
    days    = int(secs // 86400)
    hours   = int((secs % 86400) // 3600)
    minutes = int((secs % 3600) // 60)
    parts = []
    if days:    parts.append(f"{days}d")
    if hours:   parts.append(f"{hours}h")
    if minutes: parts.append(f"{minutes}m")
    return {"seconds": int(secs), "human": " ".join(parts) or "< 1m"}

def get_cpu_temp():
    # Try vcgencmd first (RPi specific)
    out = run("vcgencmd measure_temp")
    if out:
        match = re.search(r"[\d.]+", out)
        if match:
            temp = float(match.group())
            return {"celsius": temp, "status": "hot" if temp > 70 else "warm" if temp > 60 else "ok"}
    # Fallback: thermal zone
    raw = read("/sys/class/thermal/thermal_zone0/temp")
    if raw:
        temp = int(raw) / 1000
        return {"celsius": round(temp, 1), "status": "hot" if temp > 70 else "warm" if temp > 60 else "ok"}
    return {"celsius": None, "status": "unknown"}

def get_cpu_load():
    raw = read("/proc/loadavg")
    if not raw:
        return {"load1": 0, "load5": 0, "load15": 0}
    parts = raw.split()
    return {
        "load1":  float(parts[0]),
        "load5":  float(parts[1]),
        "load15": float(parts[2]),
    }

# CPU usage per core (two samples, 200ms apart)
_cpu_prev = {}

def get_cpu_usage():
    def read_cpu_stats():
        stats = {}
        for line in read("/proc/stat").splitlines():
            if line.startswith("cpu"):
                parts = line.split()
                name = parts[0]
                vals = list(map(int, parts[1:8]))
                idle = vals[3] + vals[4]  # idle + iowait
                total = sum(vals)
                stats[name] = (idle, total)
        return stats

    global _cpu_prev
    curr = read_cpu_stats()

    if not _cpu_prev:
        _cpu_prev = curr
        time.sleep(0.2)
        curr = read_cpu_stats()

    result = {}
    for name, (idle, total) in curr.items():
        if name in _cpu_prev:
            prev_idle, prev_total = _cpu_prev[name]
            diff_total = total - prev_total
            diff_idle  = idle - prev_idle
            pct = 0 if diff_total == 0 else round((1 - diff_idle / diff_total) * 100, 1)
            result[name] = pct

    _cpu_prev = curr
    return result

def get_memory():
    mem = {}
    for line in read("/proc/meminfo").splitlines():
        parts = line.split()
        if len(parts) >= 2:
            mem[parts[0].rstrip(":")] = int(parts[1])  # kB

    total    = mem.get("MemTotal", 0)
    free     = mem.get("MemFree", 0)
    buffers  = mem.get("Buffers", 0)
    cached   = mem.get("Cached", 0) + mem.get("SReclaimable", 0)
    used     = total - free - buffers - cached
    swap_t   = mem.get("SwapTotal", 0)
    swap_u   = swap_t - mem.get("SwapFree", 0)

    def kb_to_gb(kb): return round(kb / 1024 / 1024, 2)
    def pct(a, b): return round(a / b * 100, 1) if b else 0

    return {
        "total_gb":    kb_to_gb(total),
        "used_gb":     kb_to_gb(used),
        "cached_gb":   kb_to_gb(buffers + cached),
        "free_gb":     kb_to_gb(free),
        "used_pct":    pct(used, total),
        "cached_pct":  pct(buffers + cached, total),
        "swap_total_gb": kb_to_gb(swap_t),
        "swap_used_gb":  kb_to_gb(swap_u),
        "swap_pct":    pct(swap_u, swap_t),
    }

def get_storage():
    mounts = [
        {"label": "/ · System SD",                   "path": "/"},
        {"label": "/srv/storage · External Drive 1", "path": "/srv/storage"},
        {"label": "/srv/backup · External Drive 2",  "path": "/srv/backup"},
    ]
    result = []
    for m in mounts:
        try:
            st = os.statvfs(m["path"])
            total = st.f_blocks * st.f_frsize
            free  = st.f_bavail * st.f_frsize
            used  = total - free
            result.append({
                "label":    m["label"],
                "path":     m["path"],
                "total_gb": round(total / 1e9, 1),
                "used_gb":  round(used  / 1e9, 1),
                "free_gb":  round(free  / 1e9, 1),
                "used_pct": round(used / total * 100, 1) if total else 0,
            })
        except Exception:
            result.append({"label": m["label"], "path": m["path"], "error": "unavailable"})
    return result

# Network: calculate MB/s from two /proc/net/dev samples
_net_prev = {}
_net_prev_time = 0

def get_network():
    global _net_prev, _net_prev_time

    def read_net():
        stats = {}
        for line in read("/proc/net/dev").splitlines()[2:]:
            parts = line.split()
            if len(parts) < 10:
                continue
            iface = parts[0].rstrip(":")
            if iface in ("lo",):
                continue
            stats[iface] = {"rx": int(parts[1]), "tx": int(parts[9])}
        return stats

    now  = time.time()
    curr = read_net()

    rx_rate = tx_rate = 0
    rx_total = tx_total = 0

    if _net_prev and (now - _net_prev_time) > 0:
        dt = now - _net_prev_time
        for iface, vals in curr.items():
            if iface in _net_prev:
                drx = vals["rx"] - _net_prev[iface]["rx"]
                dtx = vals["tx"] - _net_prev[iface]["tx"]
                rx_rate += max(0, drx / dt)
                tx_rate += max(0, dtx / dt)
            rx_total += vals["rx"]
            tx_total += vals["tx"]

    _net_prev      = curr
    _net_prev_time = now

    def fmt_rate(bps):
        if bps > 1e6:  return f"{bps/1e6:.1f} MB/s"
        if bps > 1e3:  return f"{bps/1e3:.1f} KB/s"
        return f"{bps:.0f} B/s"

    def fmt_total(b):
        if b > 1e9: return f"{b/1e9:.2f} GB"
        if b > 1e6: return f"{b/1e6:.1f} MB"
        return f"{b/1e3:.0f} KB"

    return {
        "rx_rate":   fmt_rate(rx_rate),
        "tx_rate":   fmt_rate(tx_rate),
        "rx_total":  fmt_total(rx_total),
        "tx_total":  fmt_total(tx_total),
    }

def get_services():
    services = [
        {"name": "nginx",       "port": ":80/:443"},
        {"name": "tailscaled",  "port": "VPN mesh"},
        {"name": "smbd",        "port": ":445"},
        {"name": "cloudflared", "port": "tunnel"},
        {"name": "fail2ban",    "port": "SSH guard"},
        {"name": "anni-website","port": ":4000"},
        {"name": "anni-stats",  "port": ":5000"},
    ]
    result = []
    for s in services:
        status = run(f"systemctl is-active {s['name']}")
        result.append({
            "name":   s["name"],
            "port":   s["port"],
            "status": status if status in ("active", "inactive", "failed") else "unknown",
            "up":     status == "active",
        })
    return result

def get_fail2ban():
    out = run("sudo fail2ban-client status sshd 2>/dev/null")
    banned = 0
    total  = 0
    if out:
        for line in out.splitlines():
            if "Currently banned" in line:
                m = re.search(r"\d+", line)
                if m: banned = int(m.group())
            if "Total banned" in line:
                m = re.search(r"\d+", line)
                if m: total = int(m.group())
    return {"currently_banned": banned, "total_banned": total}

def get_recent_logs():
    logs = []
    # nginx access log — last 5 lines
    out = run("tail -5 /var/log/nginx/anni-access.log 2>/dev/null")
    for line in out.splitlines():
        if line.strip():
            logs.append({"source": "nginx", "message": line.strip()})
    # journalctl for anni-website
    out = run("journalctl -u anni-website -n 5 --no-pager --output=short 2>/dev/null")
    for line in out.splitlines():
        if line.strip():
            logs.append({"source": "anni-website", "message": line.strip()})
    return logs[-10:]  # max 10 combined

# ── Request handler ───────────────────────────────────────

class StatsHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # silence default access log

    def send_json(self, data, status=200):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "http://127.0.0.1")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/stats":
            try:
                data = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "uptime":    get_uptime(),
                    "cpu_temp":  get_cpu_temp(),
                    "cpu_load":  get_cpu_load(),
                    "cpu_usage": get_cpu_usage(),
                    "memory":    get_memory(),
                    "storage":   get_storage(),
                    "network":   get_network(),
                    "services":  get_services(),
                    "fail2ban":  get_fail2ban(),
                    "logs":      get_recent_logs(),
                }
                self.send_json(data)
            except Exception as e:
                self.send_json({"error": str(e)}, 500)
        elif self.path == "/api/stats/health":
            self.send_json({"ok": True, "uptime": get_uptime()["human"]})
        else:
            self.send_json({"error": "not found"}, 404)

# ── Main ─────────────────────────────────────────────────

if __name__ == "__main__":
    # Warm up network stats (first sample has no delta)
    get_network()
    get_cpu_usage()

    print(f"🖥️  anni-stats running on http://127.0.0.1:{PORT}")
    print(f"   Endpoints: /api/stats  /api/stats/health")

    server = HTTPServer(("127.0.0.1", PORT), StatsHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")