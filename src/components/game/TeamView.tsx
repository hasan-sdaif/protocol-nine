"use client";

// ═══════════════════════════════════════════════════════════
// الفريق — حلف الثقة: إنشاء / انضمام / قناة ٢٤ ساعة / انفصال
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { Users, Copy, Check, Loader2, DoorOpen, MessageSquare, Send, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { PhonePlayer, sfx } from "./audio";
import { SectionHead } from "./effects";
import type { Game } from "./useGame";

function ttlLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "محو...";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h} س ${m} د` : `${m} د`;
}

export default function TeamView({ game }: { game: Game }) {
  const state = game.state;
  const [mode, setMode] = useState<"none" | "create" | "join">("none");
  const [teamName, setTeamName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSecede, setConfirmSecede] = useState(false);
  const [copied, setCopied] = useState(false);

  // تحديث دوري لقناة الفريق كل ٨ ثوانٍ
  useEffect(() => {
    if (!state?.team) return;
    const t = setInterval(() => void game.refresh(), 8000);
    return () => clearInterval(t);
  }, [state?.team?.name, game]);

  if (!state) return null;
  const team = state.team;

  const run = async (fn: () => Promise<{ ok: boolean; data: { error?: string } }>, success?: boolean) => {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res.ok) {
      if (success) sfx.success();
      return true;
    }
    sfx.error();
    setError(res.data.error ?? "خلل.");
    return false;
  };

  // ── لا حلف بعد ──
  if (!team) {
    return (
      <div className="space-y-5">
        <div className="panel panel-corner-ticks p-4 sm:p-5">
          <SectionHead
            code="ALLIANCE // TRUST"
            title="حلف الثقة"
            sub="الفريق قرار ثقة لا أداة تنظيمية — من تُشاركه المعلومة؟ ومن تُقرر أنه «معك»؟"
            icon={<Users className="h-4 w-4" />}
          />
          <PhonePlayer src="/audio/deep-phone-alliance-trust.mp3" label="إرسالية الحلف" compact />
          <div className="mt-4 space-y-2 text-sm leading-7 text-muted-foreground">
            <p>• الحلف حتى ١٠ وكلاء — الرقم مقصود: فوق عشرة تتفكك الشبكات إلى مجموعات صامتة.</p>
            <p>• معرّفك الرباعي <span className="font-mono text-primary" dir="ltr">#{state.agent.memberNo}</span> تشاركه مع من تثق به — وبه يدعوك الآخرون.</p>
            <p>• قناة الحلف تُمحى رسائلها بعد ٢٤ ساعة. ما قلتَه هناك لن يبقى... إلا في ذاكرة من قرأه.</p>
            <p>• الانضماس والانفصال قرارات لا رجعة فيها — الثقة تُبنى مرة وتُختبر للأبد.</p>
          </div>

          {state.canJoinTeam ? (
            <div className="mt-5 space-y-4 border-t border-border pt-4">
              {mode === "none" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="outline" onClick={() => { sfx.click(); setMode("create"); }}>
                    <Users className="ml-2 h-4 w-4" /> شكّل حلفاً جديداً
                  </Button>
                  <Button variant="outline" onClick={() => { sfx.click(); setMode("join"); }}>
                    <DoorOpen className="ml-2 h-4 w-4" /> انضم برمز دعوة
                  </Button>
                </div>
              )}

              {mode === "create" && (
                <div className="space-y-3">
                  <Label htmlFor="team-name">اسم الحلف السري (عربي)</Label>
                  <Input
                    id="team-name"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="مثال: عيون الليل"
                    maxLength={24}
                    dir="auto"
                  />
                  <div className="flex gap-2">
                    <Button
                      disabled={busy || teamName.trim().length < 3}
                      onClick={async () => {
                        if (await run(() => game.teamAction("create", { name: teamName }), true)) {
                          setMode("none");
                          setTeamName("");
                        }
                      }}
                    >
                      {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                      أنشئ الحلف
                    </Button>
                    <Button variant="ghost" onClick={() => setMode("none")}>رجوع</Button>
                  </div>
                </div>
              )}

              {mode === "join" && (
                <div className="space-y-3">
                  <Label htmlFor="invite-code">رمز الدعوة (٦ أرقام)</Label>
                  <Input
                    id="invite-code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="٤٤٧١٢٨"
                    dir="ltr"
                    className="font-mono text-lg tracking-[0.3em]"
                  />
                  <div className="flex gap-2">
                    <Button
                      disabled={busy || inviteCode.length !== 6}
                      onClick={async () => {
                        if (await run(() => game.teamAction("join", { code: inviteCode }), true)) {
                          setMode("none");
                          setInviteCode("");
                        }
                      }}
                    >
                      {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                      انضم
                    </Button>
                    <Button variant="ghost" onClick={() => setMode("none")}>رجوع</Button>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
          ) : (
            <p className="mt-4 rounded border border-dashed border-border px-4 py-4 text-sm text-muted-foreground">
              ملفك يحمل قراراً سابقاً — الانفصال كان هادئاً... ودائماً.
            </p>
          )}
        </div>
      </div>
    );
  }

  // ── داخل الحلف ──
  return (
    <div className="space-y-5">
      <div className="panel panel-corner-ticks p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHead
            code={`ALLIANCE // ${team.inviteCode}`}
            title={`حلف «${team.name}»`}
            sub={`${team.members.filter((m) => !m.seceded).length}/10 أعضاء نشطون — ${team.teamPoints} نقطة الحلف`}
            icon={<Users className="h-4 w-4" />}
          />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">رمز الدعوة:</span>
          <span className="rounded border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-lg tracking-[0.25em] text-primary" dir="ltr">
            {team.inviteCode}
          </span>
          <button
            type="button"
            onClick={async () => {
              sfx.click();
              try { await navigator.clipboard.writeText(team.inviteCode); } catch { /* محظور */ }
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[0.65rem] text-muted-foreground hover:text-primary"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            انسخ الرمز
          </button>
        </div>

        {/* الأعضاء */}
        <div className="overflow-hidden rounded border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card/95 text-[0.65rem] text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-right font-normal">الوكيل</th>
                <th className="px-2 py-2 text-center font-normal">المعرّف</th>
                <th className="px-2 py-2 text-center font-normal">الرتبة</th>
                <th className="px-2 py-2 text-center font-normal">ألغاز</th>
                <th className="px-3 py-2 text-center font-normal">النقاط</th>
              </tr>
            </thead>
            <tbody>
              {team.members.map((m) => (
                <tr
                  key={m.memberNo}
                  className={cn(
                    "border-b border-border/40",
                    m.isMe && "bg-primary/10",
                    m.seceded && "opacity-50"
                  )}
                >
                  <td className="px-2 py-2">
                    <span className={cn("font-bold", m.isMe ? "text-primary" : "text-foreground")}>
                      {m.codename}
                    </span>
                    {m.seceded && <span className="ml-1.5 text-[0.6rem] text-red-400">— اختار مسار الوحيد</span>}
                  </td>
                  <td className="px-2 py-2 text-center font-mono text-muted-foreground" dir="ltr">#{m.memberNo}</td>
                  <td className="px-2 py-2 text-center text-[0.65rem] text-muted-foreground">{m.rankName}</td>
                  <td className="px-2 py-2 text-center font-mono text-muted-foreground" dir="ltr">{m.solvedCount}</td>
                  <td className="px-3 py-2 text-center font-mono font-bold text-primary" dir="ltr">{m.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* الانفصال */}
        <div className="mt-4">
          {team.mySeceded ? (
            <p className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-red-400/90">
              اخترتَ مسار الوحيد. ترى الحلف... ولا يرونك. لا طريق للرجوع.
            </p>
          ) : team.canSecede ? (
            <Dialog open={confirmSecede} onOpenChange={setConfirmSecede}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded border border-destructive/40 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-destructive/10"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                  الانفصال الهادئ — مرة واحدة، لا رجعة
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>الانفصال الهادئ</DialogTitle>
                  <DialogDescription className="leading-7">
                    ستسير منفرداً من هذه اللحظة، محتفظاً بكل ما وجدت.
                    سيُخبر الأرشيف الحلف أن «أحداً» اختار مسار الوحيد — دون اسمك.
                    لا أحد يعلم من هو... إلا الوسيط. لا رجعة بعد القرار.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setConfirmSecede(false)}>تراجع</Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (await run(() => game.teamAction("secede"), true)) {
                        setConfirmSecede(false);
                      }
                    }}
                  >
                    {busy ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                    انفصل بهدوء
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <p className="text-[0.65rem] text-muted-foreground">{team.secedeHint}</p>
          )}
        </div>
      </div>

      {/* القناة */}
      <div className="panel overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-border bg-primary/5 px-4 py-3">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="font-bold text-primary">قناة الحلف — تُمحى بعد ٢٤ ساعة</h3>
        </div>
        <div className="max-h-80 overflow-y-auto scroll-thin p-3">
          {team.messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">القناة صامتة...</p>
          ) : (
            <ul className="space-y-2">
              {team.messages.map((msg) => (
                <li
                  key={msg.id}
                  className={cn(
                    "rounded border px-3 py-2 text-sm leading-6",
                    msg.system
                      ? "border-primary/25 bg-primary/5 text-primary/90"
                      : "border-border bg-card/40 text-foreground/90"
                  )}
                >
                  <div className="mb-0.5 flex items-center justify-between text-[0.6rem] text-muted-foreground">
                    <span className={cn(msg.system && "font-bold text-primary/80")}>{msg.codename}</span>
                    <span dir="ltr">{ttlLeft(msg.expiresAt)} ← المحو</span>
                  </div>
                  {msg.text}
                </li>
              ))}
            </ul>
          )}
        </div>
        {!team.mySeceded && (
          <div className="flex gap-2 border-t border-border p-3">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && message.trim()) {
                  if (await run(() => game.teamAction("message", { text: message }))) setMessage("");
                }
              }}
              placeholder="همس في القناة... يُمحى بعد ٢٤ ساعة"
              maxLength={280}
              dir="auto"
            />
            <Button
              disabled={busy || !message.trim()}
              onClick={async () => {
                if (await run(() => game.teamAction("message", { text: message }))) setMessage("");
              }}
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">أرسل</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
