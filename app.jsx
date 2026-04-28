const { useState, useRef, useEffect } = React;
// SEGL Manager v2.5


// ─────────────────────────────────────────────────────────────────────────────
// DATA
// ─────────────────────────────────────────────────────────────────────────────
const LEAGUE_URL = "https://app.squabbitgolf.com/w/league/Lyq9tjMVg";
const REGISTER_URL = "https://app.squabbitgolf.com/league?inviteCode=UQTACB";

const FIXTURE = [
  { round:"01", course:"Ivanhoe",        date:"22 Feb 2026", month:"February",  booked:true,  completed:true  },
  { round:"02", course:"Morack",         date:"29 Mar 2026", month:"March",     booked:true,  completed:true  },
  { round:"03", course:"Gardiners Run",  date:"26 Apr 2026", month:"April",     booked:false, completed:false },
  { round:"04", course:"Ringwood",       date:"31 May 2026", month:"May",       booked:true,  completed:false },
  { round:"05", course:"Freeway",        date:"28 Jun 2026", month:"June",      booked:false, completed:false },
  { round:"06", course:"Sandy Links",    date:"26 Jul 2026", month:"July",      booked:false, completed:false },
  { round:"07", course:"Dorset",         date:"30 Aug 2026", month:"August",    booked:false, completed:false },
  { round:"08", course:"TBC",            date:"TBC",         month:"September", booked:false, completed:false },
  { round:"09", course:"Yering Meadows", date:"25 Oct 2026", month:"October",   booked:false, completed:false },
  { round:"10", course:"Growling Frog",  date:"29 Nov 2026", month:"November",  booked:false, completed:false },
  { round:"CH", course:"TBC",            date:"6 Dec 2026",  month:"December",  booked:false, completed:false },
];

const BOOKING_STEPS = [
  "Find course contact / online booking link",
  "Confirm Social Day date availability",
  "Agree group size & green fee pricing",
  "Lock in pre-paid group booking",
  "Share booking confirmation with members",
  "Collect green fees (BSB 083-125 · ACC 77-820-8961)",
];

const POST_TYPES = [
  { id:"announcement", label:"📣 Round Announcement", hasImage:true  },
  { id:"reminder",     label:"⏰ Social Day Reminder",  hasImage:true  },
  { id:"golive",       label:"🟢 Go Live Reminder",     hasImage:false },
  { id:"results",      label:"🏆 Round Results",        hasImage:true  },
  { id:"leaderboard",  label:"📊 Leaderboard Update",   hasImage:true  },
  { id:"newmember",    label:"👋 New Member Welcome",   hasImage:false },
];

const SAMPLE_LB = [
  { name:"Matt Disseldorp", pts:7.50 },
  { name:"Scott Mainzer",   pts:7.00 },
  { name:"Jesse Yarde",     pts:6.50 },
  { name:"Dayne Halliday",  pts:5.50 },
  { name:"Brad Parker",     pts:5.00 },
  { name:"Lewis Andrews",   pts:4.75 },
  { name:"Jay Barbera",     pts:4.50 },
  { name:"Michael Collett", pts:3.25 },
  { name:"Sam Wright",      pts:2.00 },
  { name:"Jaryd Coghill",   pts:2.00 },
];

// ─────────────────────────────────────────────────────────────────────────────
// CANVAS UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}

// Draw text with a subtle drop shadow for legibility over photos
function shadowText(ctx, text, x, y, shadowColor="rgba(0,0,0,0.85)", blur=18) {
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur  = blur;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 3;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Compact SEGL wordmark badge (for top-left corner of images)
function drawBadge(ctx, x, y) {
  const W=180, H=52, R=10;
  rrect(ctx,x,y,W,H,R);
  ctx.fillStyle="rgba(5,46,22,0.88)"; ctx.fill();
  ctx.strokeStyle="#22c55e"; ctx.lineWidth=2; ctx.stroke();
  // green left stripe
  ctx.fillStyle="#16a34a";
  rrect(ctx,x,y,6,H,R); ctx.fill();
  // text
  ctx.fillStyle="#fff";
  ctx.font="900 22px 'Arial Black',sans-serif";
  ctx.textAlign="left"; ctx.textBaseline="middle";
  ctx.fillText("SEGL", x+16, y+H/2-5);
  ctx.fillStyle="#4ade80";
  ctx.font="bold 11px Arial";
  ctx.fillText("GOLF LEAGUE · 2026", x+16, y+H/2+10);
}

// Fetch a golf photo as a crossorigin-loaded Image, resolving when ready
// Uses Unsplash Source (free, no API key, CORS-friendly via proxy)
function loadGolfPhoto(keyword) {
  // We use a set of pre-selected Unsplash photo IDs that are reliably golf-related,
  // high quality, and landscape/square friendly. Cycling by keyword hash keeps
  // variety across post types.
  const PHOTO_IDS = [
    "1530126483408-aa533e55bdb2", // aerial fairway
    "1535131323232-d37b35a1dc38", // golfer swing at sunset
    "1592919505780-303950b19b36", // green with flag
    "1561183379-9ce6e12cde02", // golf course panorama
    "1587174486073-ae5e5cff23aa", // putting green close
    "1622547748225-3fc4abd2cca0", // fairway morning mist
    "1575429988-7ac1e3c4faec", // golfer walking fairway
    "1611267254323-ced3fc73a5d6", // golf cart on course
    "1554284126-aa88f22d8b74", // close-up golf ball on tee
    "1606924447656-b6783ded6c80", // sunset over green
  ];
  // pick deterministically from keyword
  let hash = 0;
  for(let c of keyword) hash = (hash*31 + c.charCodeAt(0)) & 0xffff;
  const id = PHOTO_IDS[hash % PHOTO_IDS.length];

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    // 1080px wide, Unsplash photo by ID
    img.src = `https://images.unsplash.com/photo-${id}?w=1080&q=85&fit=crop&crop=center`;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // graceful fallback
  });
}

// Cover-fill an image into a rect (like CSS background-size:cover)
function drawCover(ctx, img, x, y, w, h) {
  if(!img) return;
  const ir = img.width / img.height;
  const cr = w / h;
  let sw, sh, sx, sy;
  if(ir > cr) { sh=img.height; sw=sh*cr; sx=(img.width-sw)/2; sy=0; }
  else         { sw=img.width;  sh=sw/cr; sx=0; sy=(img.height-sh)/2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// ── Promo image (Announcement / Reminder / Results) ───────────────────────────
async function drawPromoImage(canvas, { type, round, course, date, month }) {
  const S=1080; canvas.width=S; canvas.height=S;
  const ctx=canvas.getContext("2d");

  const isReminder = type==="reminder";
  const isResults  = type==="results";

  // 1. Load golf photo
  const keyword = isResults ? "trophy golf" : isReminder ? "golf social" : "golf course";
  const photo = await loadGolfPhoto(keyword + course);

  // 2. Draw photo full bleed
  if(photo) {
    drawCover(ctx, photo, 0, 0, S, S);
  } else {
    // fallback gradient
    const fb=ctx.createLinearGradient(0,0,0,S);
    fb.addColorStop(0,"#064e3b"); fb.addColorStop(1,"#052e16");
    ctx.fillStyle=fb; ctx.fillRect(0,0,S,S);
  }

  // 3. Gradient scrim — darkens bottom 65% heavily for text legibility
  const scrim = ctx.createLinearGradient(0, 0, 0, S);
  scrim.addColorStop(0,   "rgba(0,0,0,0.15)");
  scrim.addColorStop(0.3, "rgba(0,0,0,0.35)");
  scrim.addColorStop(0.55,"rgba(0,0,0,0.72)");
  scrim.addColorStop(1,   "rgba(0,0,0,0.92)");
  ctx.fillStyle=scrim; ctx.fillRect(0,0,S,S);

  // 4. Green accent bar top
  const topG=ctx.createLinearGradient(0,0,S,0);
  topG.addColorStop(0,"#15803d"); topG.addColorStop(0.5,"#4ade80"); topG.addColorStop(1,"#15803d");
  ctx.fillStyle=topG; ctx.fillRect(0,0,S,10);

  // 5. SEGL badge top-left
  drawBadge(ctx, 36, 28);

  // ── Content layout ─────────────────────────────────────────────────────────
  ctx.textBaseline = "alphabetic";

  if(isResults) {
    // BIG RESULTS headline
    ctx.fillStyle="#fbbf24";
    ctx.font="900 72px 'Arial Black',sans-serif";
    ctx.textAlign="center";
    shadowText(ctx,"ROUND RESULTS",S/2,520);

    ctx.fillStyle="#ffffff";
    ctx.font="bold 52px Arial";
    shadowText(ctx,course.toUpperCase(),S/2,596);

    // date chip
    rrect(ctx,S/2-140,618,280,52,26);
    ctx.fillStyle="rgba(0,0,0,0.55)"; ctx.fill();
    ctx.strokeStyle="#fbbf24"; ctx.lineWidth=2.5; ctx.stroke();
    ctx.fillStyle="#fde68a"; ctx.font="bold 26px Arial"; ctx.textAlign="center";
    ctx.textBaseline="middle";
    shadowText(ctx,`Round ${round}  ·  ${date}`,S/2,645);
    ctx.textBaseline="alphabetic";

    // "Check Squabbit for full results"
    ctx.fillStyle="rgba(0,0,0,0.6)";
    rrect(ctx,60,710,S-120,60,14); ctx.fill();
    ctx.fillStyle="#86efac"; ctx.font="bold 24px Arial"; ctx.textAlign="center";
    shadowText(ctx,"🏆  Full results now live on Squabbit",S/2,748);

  } else {
    // Round tag pill
    const tag = isReminder ? "⛳  SOCIAL DAY" : `ROUND ${round}`;
    const pillW = 280;
    rrect(ctx, S/2-pillW/2, 440, pillW, 50, 25);
    ctx.fillStyle="#16a34a"; ctx.fill();
    ctx.fillStyle="#ffffff"; ctx.font="900 22px 'Arial Black',sans-serif";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    shadowText(ctx, tag, S/2, 466);
    ctx.textBaseline="alphabetic";

    // Course name — big, bold, white with shadow
    const fs = course.length>13 ? 76 : course.length>9 ? 92 : 108;
    ctx.fillStyle="#ffffff";
    ctx.font=`900 ${fs}px 'Arial Black',sans-serif`;
    ctx.textAlign="center";
    shadowText(ctx, course.toUpperCase(), S/2, 578, "rgba(0,0,0,0.9)", 24);

    // Green underline
    const tw = ctx.measureText(course.toUpperCase()).width;
    ctx.fillStyle="#4ade80";
    ctx.fillRect(S/2-tw/2, 586, tw, 5);

    // Date chip
    rrect(ctx, S/2-170, 606, 340, 58, 29);
    ctx.fillStyle="rgba(0,0,0,0.55)"; ctx.fill();
    ctx.strokeStyle="#4ade80"; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle="#ffffff"; ctx.font="bold 28px Arial";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    shadowText(ctx, `📅  ${date}`, S/2, 636);
    ctx.textBaseline="alphabetic";

    if(isReminder){
      // Prize info box
      const bx=60, by=690, bw=S-120, bh=130;
      rrect(ctx,bx,by,bw,bh,18);
      ctx.fillStyle="rgba(5,46,22,0.82)"; ctx.fill();
      ctx.strokeStyle="#22c55e"; ctx.lineWidth=2; ctx.stroke();

      ctx.fillStyle="#4ade80"; ctx.font="bold 20px Arial"; ctx.textAlign="center";
      ctx.textBaseline="top";
      ctx.fillText("TODAY'S PRIZES", S/2, by+16);

      ctx.fillStyle="#ffffff"; ctx.font="bold 26px Arial";
      shadowText(ctx,"🥇  Best Score · $25 Drummond Voucher",S/2,by+50);
      ctx.fillStyle="#d1fae5"; ctx.font="24px Arial";
      shadowText(ctx,"🎯  Longest Drive  ·  Nearest the Pin",S/2,by+86);
      ctx.textBaseline="alphabetic";
    } else {
      // Info box
      const bx=60, by=690, bw=S-120, bh=106;
      rrect(ctx,bx,by,bw,bh,18);
      ctx.fillStyle="rgba(5,46,22,0.75)"; ctx.fill();
      ctx.strokeStyle="#22c55e"; ctx.lineWidth=2; ctx.stroke();
      ctx.fillStyle="#86efac"; ctx.font="bold 24px Arial"; ctx.textAlign="center";
      ctx.textBaseline="top";
      shadowText(ctx,`Play any day in ${month} with a fellow SEGL member`,S/2,by+18);
      ctx.fillStyle="#4ade80"; ctx.font="bold 26px Arial";
      shadowText(ctx,"🟢  Declare 'Going Live' in chat first",S/2,by+58);
      ctx.textBaseline="alphabetic";
    }
  }

  // Bottom strip
  ctx.fillStyle="rgba(5,46,22,0.92)";
  ctx.fillRect(0, S-62, S, 62);
  ctx.fillStyle="#ffffff"; ctx.font="bold 22px Arial"; ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.fillText("SEGL Golf League  ·  Victoria  ·  Est. 2022", S/2, S-36);
  ctx.fillStyle="#4ade80"; ctx.font="17px Arial";
  ctx.fillText("app.squabbitgolf.com/w/league/Lyq9tjMVg", S/2, S-14);
}

// ── Leaderboard image (Results / Leaderboard Update) ──────────────────────────
// Layout: real golf photo top-third, dark leaderboard panel bottom two-thirds
async function drawLeaderboardImage(canvas, { players, title, subtitle, roundLabel }) {
  const S=1080; canvas.width=S; canvas.height=S;
  const ctx=canvas.getContext("2d");

  // 1. Golf photo — top portion
  const photo = await loadGolfPhoto("golf course green flag");
  const photoH = 310;
  if(photo) {
    drawCover(ctx, photo, 0, 0, S, photoH);
    // darken photo
    const ps=ctx.createLinearGradient(0,0,0,photoH);
    ps.addColorStop(0,"rgba(0,0,0,0.3)");
    ps.addColorStop(1,"rgba(0,0,0,0.7)");
    ctx.fillStyle=ps; ctx.fillRect(0,0,S,photoH);
  } else {
    const fb=ctx.createLinearGradient(0,0,0,photoH);
    fb.addColorStop(0,"#064e3b"); fb.addColorStop(1,"#022c22");
    ctx.fillStyle=fb; ctx.fillRect(0,0,S,photoH);
  }

  // 2. Leaderboard panel — rest of canvas
  ctx.fillStyle="#0a0f0b"; ctx.fillRect(0,photoH,S,S-photoH);

  // subtle dot grid on panel
  ctx.save(); ctx.globalAlpha=0.04; ctx.fillStyle="#4ade80";
  for(let x=30;x<S;x+=40) for(let y=photoH+20;y<S;y+=40){
    ctx.beginPath(); ctx.arc(x,y,1.5,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  // 3. Top accent bar
  const topG=ctx.createLinearGradient(0,0,S,0);
  topG.addColorStop(0,"#15803d"); topG.addColorStop(0.5,"#4ade80"); topG.addColorStop(1,"#15803d");
  ctx.fillStyle=topG; ctx.fillRect(0,0,S,8);

  // 4. SEGL badge on photo
  drawBadge(ctx, 36, 26);

  // 5. Title on photo (right-aligned, big)
  ctx.textAlign="right"; ctx.textBaseline="alphabetic";
  ctx.fillStyle="#ffffff";
  ctx.font="900 66px 'Arial Black',sans-serif";
  shadowText(ctx, title, S-44, 110, "rgba(0,0,0,0.9)", 20);
  ctx.fillStyle="#4ade80"; ctx.font="bold 28px Arial";
  shadowText(ctx, subtitle, S-44, 148);

  // 6. Divider between photo and panel
  const dg=ctx.createLinearGradient(0,0,S,0);
  dg.addColorStop(0,"#064e3b"); dg.addColorStop(0.5,"#4ade80"); dg.addColorStop(1,"#064e3b");
  ctx.fillStyle=dg; ctx.fillRect(0,photoH-4,S,4);

  // 7. Col headers
  const panelTop = photoH + 22;
  ctx.fillStyle="#6b7280"; ctx.font="bold 18px Arial";
  ctx.textAlign="left"; ctx.textBaseline="alphabetic";
  ctx.fillText("POS", 52, panelTop+18);
  ctx.fillText("PLAYER", 148, panelTop+18);
  ctx.textAlign="right";
  ctx.fillText("PTS", S-48, panelTop+18);

  // divider under headers
  ctx.fillStyle="#1f2937"; ctx.fillRect(48,panelTop+26,S-96,1);

  // 8. Player rows
  const MEDALS = ["#fbbf24","#d4d4d8","#b45309"];
  const maxRows = Math.min(players.length, 8);
  // Calculate row height to fit nicely
  const availH = S - photoH - 22 - 42 - 70; // minus headers, footer, padding
  const rowH = Math.min(70, Math.floor(availH / maxRows));
  const startY = panelTop + 38;

  players.slice(0,maxRows).forEach((p,i)=>{
    const y = startY + i*rowH;
    const top3 = i<3, top6 = i<6;

    // row bg
    rrect(ctx, 44, y+3, S-88, rowH-6, 10);
    if(top3) {
      const rc={fillStyle:`rgba(${i===0?"251,191,36":i===1?"212,212,216":"180,83,9"},0.12)`};
      ctx.fillStyle=rc.fillStyle;
    } else if(top6) {
      ctx.fillStyle="rgba(22,163,74,0.07)";
    } else {
      ctx.fillStyle="rgba(255,255,255,0.03)";
    }
    ctx.fill();

    // medal stripe
    if(top3){ ctx.fillStyle=MEDALS[i]; ctx.fillRect(44,y+3,5,rowH-6); }

    // position number
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillStyle = top3 ? MEDALS[i] : "#6b7280";
    ctx.font = top3 ? "900 26px 'Arial Black',sans-serif" : "bold 22px Arial";
    ctx.fillText(i+1, 90, y+rowH/2);

    // name — truncate long names
    ctx.textAlign="left";
    ctx.fillStyle = top3 ? "#ffffff" : top6 ? "#e4e4e7" : "#9ca3af";
    ctx.font = top3 ? "bold 28px Arial" : top6 ? "bold 25px Arial" : "22px Arial";
    let name = p.name;
    // Shorten if needed
    while(ctx.measureText(name).width > 580 && name.length > 6) name = name.slice(0,-1);
    if(name !== p.name) name += "…";
    ctx.fillText(name, 148, y+rowH/2);

    // FINAL badge for 4-6
    if(i>=3 && i<6){
      const nw = Math.min(ctx.measureText(p.name).width, 580);
      rrect(ctx,148+nw+12,y+rowH/2-12,68,24,12);
      ctx.fillStyle="rgba(22,163,74,0.2)"; ctx.fill();
      ctx.strokeStyle="#22c55e"; ctx.lineWidth=1; ctx.stroke();
      ctx.fillStyle="#4ade80"; ctx.font="bold 13px Arial"; ctx.textAlign="left";
      ctx.fillText("FINAL",148+nw+22,y+rowH/2);
    }

    // points
    ctx.textAlign="right";
    ctx.fillStyle = top3 ? MEDALS[i] : top6 ? "#86efac" : "#6b7280";
    ctx.font = top3 ? "900 28px 'Arial Black',sans-serif" : "bold 24px Arial";
    const ptsStr = typeof p.pts==="number" ? p.pts.toFixed(2) : p.pts;
    ctx.fillText(ptsStr, S-48, y+rowH/2);
  });

  // 9. Footer
  ctx.fillStyle="#064e3b"; ctx.fillRect(0,S-64,S,64);
  ctx.fillStyle="#ffffff"; ctx.font="bold 21px Arial";
  ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(`Top 6 qualify for the Championship Final  ·  ${roundLabel}`, S/2, S-40);
  ctx.fillStyle="#4ade80"; ctx.font="17px Arial";
  ctx.fillText("app.squabbitgolf.com/w/league/Lyq9tjMVg", S/2, S-16);
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Badge({ children, color="green" }) {
  const C={
    green:"bg-emerald-900/60 text-emerald-300 border-emerald-700",
    yellow:"bg-amber-900/60 text-amber-300 border-amber-700",
    red:"bg-red-900/60 text-red-300 border-red-700",
    gray:"bg-zinc-800 text-zinc-400 border-zinc-700",
    blue:"bg-sky-900/60 text-sky-300 border-sky-700",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${C[color]}`}>{children}</span>;
}

function Card({ children, className="" }) {
  return <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl p-5 ${className}`}>{children}</div>;
}

function SectionTitle({ children }) {
  return <h2 className="text-base font-bold text-white mb-4 tracking-tight">{children}</h2>;
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function RoundCard({ label, round, bookedRounds, accent="emerald" }) {
  if (!round) return null;
  const isBooked = bookedRounds[round.round] ?? round.booked;
  const borders = { emerald:"border-emerald-800/60 bg-emerald-950/20", sky:"border-sky-800/60 bg-sky-950/20" };
  const labelC  = { emerald:"text-emerald-500", sky:"text-sky-500" };
  return (
    <Card className={borders[accent]}>
      <div className={`text-xs font-semibold uppercase tracking-widest mb-2 ${labelC[accent]}`}>{label}</div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-2xl font-black text-white">{round.course}</div>
          <div className="text-sm text-zinc-400">{round.date} · Round {round.round}</div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {round.completed
            ? <Badge color="gray">Completed</Badge>
            : isBooked
              ? <Badge color="green">✓ Booked</Badge>
              : <Badge color="red">⚠ Needs Booking</Badge>}
          <a href={LEAGUE_URL} target="_blank" rel="noreferrer"
            className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1 rounded-full font-semibold transition">
            Squabbit ↗
          </a>
        </div>
      </div>
    </Card>
  );
}

function Dashboard({ setTab, bookedRounds={} }) {
  const now          = new Date();
  const currentMonth = MONTHS[now.getMonth()];
  const nextMonth    = MONTHS[(now.getMonth()+1) % 12];

  const currentRound = FIXTURE.find(f => f.month === currentMonth);
  const nextRound    = FIXTURE.find(f => f.month === nextMonth);

  const nextUnbooked = FIXTURE.find(f=>!(bookedRounds[f.round]??f.booked)&&!f.completed);
  const completed    = FIXTURE.filter(f=>f.completed).length;
  const booked       = FIXTURE.filter(f=>bookedRounds[f.round]??f.booked).length;

  return (
    <div className="space-y-4">
      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {label:"Completed",   val:completed, c:"text-zinc-300"},
          {label:"Booked",      val:booked,    c:"text-emerald-400"},
          {label:"Total Rounds",val:10,        c:"text-zinc-400"},
          {label:"Members",     val:34,        c:"text-amber-400"},
        ].map(s=>(
          <Card key={s.label} className="text-center py-4">
            <div className={`text-3xl font-black ${s.c}`}>{s.val}</div>
            <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Current & Next round cards */}
      <RoundCard label={"⛳ Current Round — " + currentMonth} round={currentRound} bookedRounds={bookedRounds} accent="emerald" />
      <RoundCard label={"→ Next Round — " + nextMonth}   round={nextRound}    bookedRounds={bookedRounds} accent="sky" />

      {/* action items */}
      <Card>
        <SectionTitle>⚡ Action Items</SectionTitle>
        <div className="space-y-2">
          {nextUnbooked&&(
            <button onClick={()=>setTab("booking")}
              className="w-full flex gap-3 items-start bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-left hover:bg-amber-950/70 hover:border-amber-700 transition group">
              <span className="text-amber-400 mt-0.5">📅</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-amber-300">Book Round {nextUnbooked.round} — {nextUnbooked.course}</div>
                <div className="text-xs text-zinc-500">Social Day: {nextUnbooked.date}</div>
              </div>
              <span className="text-amber-600 group-hover:text-amber-400 text-xs mt-0.5 transition">→</span>
            </button>
          )}
          <button onClick={()=>setTab("social")}
            className="w-full flex gap-3 items-start bg-sky-950/40 border border-sky-800/60 rounded-xl p-3 text-left hover:bg-sky-950/70 hover:border-sky-700 transition group">
            <span className="text-sky-400 mt-0.5">📣</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-sky-300">Generate round announcement</div>
              <div className="text-xs text-zinc-500">Round Announcement → Generate Post + Image</div>
            </div>
            <span className="text-sky-600 group-hover:text-sky-400 text-xs mt-0.5 transition">→</span>
          </button>
          <div className="flex gap-3 items-start bg-zinc-800/50 border border-zinc-700 rounded-xl p-3">
            <span className="text-zinc-400 mt-0.5">💰</span>
            <div>
              <div className="text-sm font-semibold text-zinc-300">Follow up outstanding $50 season fees</div>
              <div className="text-xs text-zinc-500 font-mono">BSB 083-125 · ACC 77-820-8961 · Brad Parker</div>
            </div>
          </div>
        </div>
      </Card>

      {/* fixture table */}
      <Card>
        <SectionTitle>📅 2026 Season Fixture</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                <th className="text-left pb-2 pr-3">Rnd</th>
                <th className="text-left pb-2 pr-3">Course</th>
                <th className="text-left pb-2 pr-3">Social Day</th>
                <th className="text-left pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {FIXTURE.map(f=>(
                <tr key={f.round} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition">
                  <td className="py-2 pr-3 text-zinc-500 font-mono text-xs">{f.round}</td>
                  <td className="py-2 pr-3 text-white font-medium">{f.course}</td>
                  <td className="py-2 pr-3 text-zinc-400 text-xs">{f.date}</td>
                  <td className="py-2">
                    {f.completed?<Badge color="gray">Done</Badge>:(bookedRounds[f.round]??f.booked)?<Badge color="green">Booked</Badge>:<Badge color="yellow">Pending</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: BOOKING WORKFLOW
// ─────────────────────────────────────────────────────────────────────────────
// Step index 3 = "Lock in pre-paid group booking" — triggers booked status
const BOOKED_TRIGGER_STEP = 3;

function BookingWorkflow({ checks, setChecks, bookedRounds, setBookedRounds }) {
  const [selected, setSelected] = useState(
    FIXTURE.find(f=>!bookedRounds[f.round]&&!f.completed)?.round ||
    FIXTURE.find(f=>!f.completed)?.round || "03"
  );

  const round      = FIXTURE.find(f=>f.round===selected);
  const isBooked   = bookedRounds[selected] ?? false;
  const stepsDone  = BOOKING_STEPS.filter((_,i)=>checks[`${selected}-${i}`]).length;
  const allStepsDone = stepsDone === BOOKING_STEPS.length;

  const toggleCheck = (roundKey, stepIdx) => {
    const k = `${roundKey}-${stepIdx}`;
    const next = { ...checks, [k]: !checks[k] };
    setChecks(next);
    if (stepIdx === BOOKED_TRIGGER_STEP) {
      setBookedRounds({ ...bookedRounds, [roundKey]: !!next[k] });
    }
  };

  const toggleBooked = () => {
    setBookedRounds({ ...bookedRounds, [selected]: !bookedRounds[selected] });
  };

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>🏌️ Course Booking Workflow</SectionTitle>
        <p className="text-sm text-zinc-400 mb-4">Ringwood (Rnd 04) is already confirmed. Work through each remaining round below.</p>

        {/* round pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {FIXTURE.filter(f=>!f.completed).map(f=>{
            const roundBooked = bookedRounds[f.round] ?? f.booked;
            return (
              <button key={f.round} onClick={()=>setSelected(f.round)}
                className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition ${
                  selected===f.round?"bg-emerald-700 border-emerald-500 text-white":"border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}>
                R{f.round} {f.course!=="TBC"?`· ${f.course}`:"· TBC"}{roundBooked?" ✓":""}
              </button>
            );
          })}
        </div>

        {round&&(<>
          <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
            <div>
              <div className="text-xl font-black text-white">{round.course}</div>
              <div className="text-sm text-zinc-400">Social Day: {round.date}</div>
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              {/* Manually toggle booked status */}
              <button
                onClick={toggleBooked}
                className={`text-xs px-3 py-1 rounded-full border font-semibold transition ${
                  isBooked
                    ? "bg-emerald-900/60 border-emerald-700 text-emerald-300 hover:bg-red-900/40 hover:border-red-700 hover:text-red-300"
                    : "bg-amber-900/40 border-amber-700 text-amber-300 hover:bg-emerald-900/40 hover:border-emerald-700 hover:text-emerald-300"
                }`}
                title={isBooked ? "Click to mark as not booked" : "Click to mark as booked"}
              >
                {isBooked ? "✓ Booked" : "⚠ Not Booked"}
              </button>
              <span className="text-xs text-zinc-600">{stepsDone}/{BOOKING_STEPS.length} steps</span>
            </div>
          </div>

          {/* progress */}
          <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-4">
            <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{width:`${(stepsDone/BOOKING_STEPS.length)*100}%`}} />
          </div>

          {/* checklist */}
          <div className="space-y-2">
            {BOOKING_STEPS.map((step,i)=>{
              const k=`${selected}-${i}`, ticked=!!checks[k];
              return (
                <button key={i} onClick={()=>toggleCheck(selected,i)}
                  className={`w-full flex gap-3 items-center p-3 rounded-xl border text-left transition ${
                    ticked?"bg-emerald-950/40 border-emerald-800 text-emerald-200":"bg-zinc-800/30 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                  }`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${ticked?"bg-emerald-500 border-emerald-500":"border-zinc-600"}`}>
                    {ticked&&<span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <span className="text-sm">{step}</span>
                </button>
              );
            })}
          </div>

          {/* auto-booked banner */}
          {allStepsDone && (
            <div className="mt-3 bg-emerald-950/60 border border-emerald-700 rounded-xl p-3 text-sm text-emerald-300 font-semibold text-center">
              🎉 All steps complete — round marked as booked!
            </div>
          )}

          <div className="mt-3 bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 text-sm">
            <span className="text-zinc-300 font-semibold">Payment details: </span>
            <span className="font-mono text-emerald-400">BSB 083-125 · ACC 77-820-8961 · Brad Parker</span>
          </div>
        </>)}
      </Card>

      {/* full season status */}
      <Card>
        <SectionTitle>📋 Season Booking Overview</SectionTitle>
        <div className="space-y-1.5">
          {FIXTURE.map(f=>{
            const roundBooked = bookedRounds[f.round] ?? f.booked;
            return (
              <div key={f.round} className="flex items-center justify-between py-1.5 border-b border-zinc-800/40">
                <div className="flex gap-3 items-center">
                  <span className="text-zinc-600 font-mono text-xs w-7">R{f.round}</span>
                  <span className={`text-sm ${f.completed?"text-zinc-600":roundBooked?"text-white":"text-zinc-400"}`}>{f.course}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs text-zinc-600">{f.date}</span>
                  {f.completed
                    ? <Badge color="gray">Done</Badge>
                    : roundBooked
                      ? <Badge color="green">✓ Booked</Badge>
                      : <Badge color="yellow">Pending</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: SOCIAL MEDIA (with image generation)
// ─────────────────────────────────────────────────────────────────────────────
function SocialMedia({ lbData, saveLbData }) {
  const [postType,   setPostType]   = useState("announcement");
  const [roundSel,   setRoundSel]   = useState("03");
  const [platform,   setPlatform]   = useState("instagram");
  const [caption,    setCaption]    = useState("");
  const [imgDataUrl, setImgDataUrl] = useState(null);
  const [loadingCap, setLoadingCap] = useState(false);
  const [loadingImg, setLoadingImg] = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [editLb,     setEditLb]     = useState(false);
  const setLbData = saveLbData;

  const round     = FIXTURE.find(f=>f.round===roundSel);
  const postMeta  = POST_TYPES.find(p=>p.id===postType);
  const isLbType  = postType==="leaderboard"||postType==="results";
  const showImage = (platform==="instagram"||platform==="facebook") && postMeta?.hasImage;

  // ── Build Claude prompt ────────────────────────────────────────────────────
  const buildPrompt = () => {
    const pi={
      instagram:"Write for Instagram. Use emojis, line breaks, 3–5 relevant hashtags at end. Max 280 words.",
      facebook:"Write for Facebook. Conversational, friendly, include key details. No hashtags. Max 200 words.",
      chat:"Write for a WhatsApp group chat. Very short, punchy, key info only. Max 80 words.",
    };
    const base={
      announcement:`Announce Round ${round?.round} of SEGL Golf League 2026 at ${round?.course} on ${round?.date}. Players can play the Social Day OR any day in ${round?.month} with at least 1 other member. They must "Go Live" in the chat. Leaderboard: ${LEAGUE_URL}. ${pi[platform]}`,
      reminder:`Hype up the SEGL Social Day for Round ${round?.round} at ${round?.course} on ${round?.date}. Prizes: $25 Drummond voucher for best score, Longest Drive & Nearest the Pin from the pro shop. ${pi[platform]}`,
      golive:`Remind SEGL members to declare "Going Live" in the group chat before teeing off at ${round?.course} this ${round?.month}. They need at least 1 other member to witness the round. Keep it short. ${pi[platform]}`,
      results:`Celebrate the completion of SEGL Round ${round?.round} at ${round?.course}! Congratulate players, direct to Squabbit for results: ${LEAGUE_URL}. Hype up the next round. ${pi[platform]}`,
      leaderboard:`Post a mid-season SEGL 2026 leaderboard update. FedEx Cup style points, top 6 reach the Championship final in December. Direct to: ${LEAGUE_URL}. Build competitive excitement. ${pi[platform]}`,
      newmember:`Welcome a new member to SEGL 2026. Mention: $50 season fee to Brad Parker (BSB 083-125, ACC 77-820-8961), need a handicap record or 3 scorecards, register on Squabbit: ${REGISTER_URL}. ${pi[platform]}`,
    };
    return base[postType]||base.announcement;
  };

  const generateCaption = async () => {
    setLoadingCap(true); setCaption(""); setCopied(false);
    try {
      const d = await claudeCall(
        "You are the social media manager for SEGL Golf League — a fun, social golf league in Victoria, Australia est. 2022. Tone: enthusiastic, community-focused, casual-but-professional.",
        buildPrompt()
      );
      setCaption(d.content?.map(b=>b.text||"").join("\n") || d.error || "API error — please retry.");
    } catch(e){ setCaption("Connection error: " + e.message); }
    setLoadingCap(false);
  };

  const generateImage = async () => {
    setLoadingImg(true); setImgDataUrl(null);
    try {
      const canvas = document.createElement("canvas");
      if(isLbType){
        await drawLeaderboardImage(canvas,{
          players:lbData,
          title:postType==="results"?"ROUND RESULTS":"LEADERBOARD",
          subtitle:postType==="results"?`Round ${round?.round} · ${round?.course}`:"Season 2026 Standings",
          roundLabel:postType==="results"?`After Round ${round?.round} of 10`:`After ${FIXTURE.filter(f=>f.completed).length} of 10 Rounds`,
        });
      } else {
        await drawPromoImage(canvas,{
          type:postType,
          round:round?.round,
          course:round?.course||"TBC",
          date:round?.date||"TBC",
          month:round?.month||"",
        });
      }
      setImgDataUrl(canvas.toDataURL("image/png"));
    } catch(e){ console.error(e); }
    setLoadingImg(false);
  };

  const download=()=>{
    const a=document.createElement("a");
    a.href=imgDataUrl;
    a.download=`segl-r${round?.round}-${postType}.png`;
    a.click();
  };

  const copy=()=>{
    const doFallback = () => {
      const ta = document.createElement("textarea");
      ta.value = caption;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); } catch(e) {}
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(()=>setCopied(false),2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(caption).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); }).catch(doFallback);
    } else { doFallback(); }
  };

  const updateLb=(i,field,val)=>setLbData(p=>p.map((r,idx)=>idx===i?{...r,[field]:field==="pts"?parseFloat(val)||0:val}:r));

  return (
    <div className="space-y-4">
      {/* controls */}
      <Card>
        <SectionTitle>✍️ Post Generator</SectionTitle>

        {/* post type */}
        <div className="mb-4">
          <label className="text-xs text-zinc-500 uppercase tracking-widest mb-2 block">Post Type</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3">
            {POST_TYPES.map(t=>(
              <button key={t.id}
                onClick={()=>{setPostType(t.id);setImgDataUrl(null);setCaption("");}}
                className={`text-xs p-2.5 rounded-xl border text-left transition leading-snug ${
                  postType===t.id?"bg-emerald-900/60 border-emerald-600 text-emerald-200":"border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}>
                {t.label}
                {t.hasImage&&<div className="text-zinc-600 mt-0.5 text-[10px]">+ Image</div>}
              </button>
            ))}
          </div>
        </div>

        {/* platform */}
        <div className="mb-4">
          <label className="text-xs text-zinc-500 uppercase tracking-widest mb-2 block">Platform</label>
          <div className="flex gap-2 flex-wrap">
            {[
              {id:"instagram",label:"📸 Instagram"},
              {id:"facebook", label:"👥 Facebook"},
              {id:"chat",     label:"💬 Group Chat"},
            ].map(p=>(
              <button key={p.id} onClick={()=>setPlatform(p.id)}
                className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition ${
                  platform===p.id?"bg-sky-900/60 border-sky-600 text-sky-200":"border-zinc-700 text-zinc-400 hover:border-zinc-500"
                }`}>{p.label}</button>
            ))}
          </div>
        </div>

        {/* round */}
        <div className="mb-4">
          <label className="text-xs text-zinc-500 uppercase tracking-widest mb-2 block">Round</label>
          <div className="flex flex-wrap gap-1.5">
            {FIXTURE.map(f=>(
              <button key={f.round}
                onClick={()=>{setRoundSel(f.round);setImgDataUrl(null);}}
                className={`text-xs px-2.5 py-1 rounded-full border transition ${
                  roundSel===f.round?"bg-zinc-600 border-zinc-400 text-white":"border-zinc-700 text-zinc-500 hover:border-zinc-500"
                }`}>
                R{f.round}{f.course!=="TBC"?` · ${f.course}`:""}
              </button>
            ))}
          </div>
        </div>

        {/* leaderboard editor */}
        {isLbType&&(
          <div className="mb-4 bg-zinc-800/50 border border-zinc-700 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-400 font-semibold uppercase tracking-widest">Leaderboard Data</span>
              <button onClick={()=>setEditLb(!editLb)}
                className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-2.5 py-1 rounded-full transition">
                {editLb?"✓ Done":"✏️ Edit"}
              </button>
            </div>
            <div className="space-y-1.5">
              {lbData.map((p,i)=>(
                <div key={i} className="flex gap-2 items-center">
                  <span className="text-xs text-zinc-600 w-4 text-right">{i+1}</span>
                  {editLb?(
                    <>
                      <input value={p.name} onChange={e=>updateLb(i,"name",e.target.value)}
                        className="flex-1 bg-zinc-700 text-white text-xs rounded-lg px-2 py-1 border border-zinc-600 focus:border-emerald-500 outline-none"/>
                      <input value={p.pts} onChange={e=>updateLb(i,"pts",e.target.value)} type="number" step="0.25"
                        className="w-16 bg-zinc-700 text-emerald-400 text-xs rounded-lg px-2 py-1 border border-zinc-600 focus:border-emerald-500 outline-none text-right font-mono"/>
                    </>
                  ):(
                    <>
                      <span className={`flex-1 text-sm ${i<3?"text-white font-semibold":"text-zinc-400"}`}>{p.name}</span>
                      <span className={`text-sm font-mono font-bold ${i<3?"text-yellow-400":i<6?"text-emerald-400":"text-zinc-500"}`}>
                        {typeof p.pts==="number"?p.pts.toFixed(2):p.pts}
                      </span>
                    </>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-2">Update from Squabbit before generating the leaderboard image.</p>
          </div>
        )}

        {/* action buttons */}
        <div className="flex gap-3">
          <button onClick={generateCaption} disabled={loadingCap}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-700 text-white font-bold py-3 rounded-xl transition text-sm">
            {loadingCap?<><Spinner/> Writing...</>:"✨ Generate Caption"}
          </button>
          {showImage&&(
            <button onClick={generateImage} disabled={loadingImg}
              className="flex-1 flex items-center justify-center gap-2 bg-sky-800 hover:bg-sky-700 disabled:bg-zinc-700 text-white font-bold py-3 rounded-xl transition text-sm">
              {loadingImg?<><Spinner/> Drawing...</>:"🎨 Generate Image"}
            </button>
          )}
        </div>
      </Card>

      {/* image output + caption — side by side on desktop */}
      {(imgDataUrl||loadingImg)&&(
        <Card>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>🖼️ Instagram Image (1080×1080)</SectionTitle>
            {imgDataUrl&&(
              <button onClick={download}
                className="text-xs bg-sky-700 hover:bg-sky-600 text-white px-3 py-1 rounded-full font-semibold transition">
                ⬇ Download PNG
              </button>
            )}
          </div>
          {loadingImg?(
            <div className="flex items-center gap-3 text-zinc-400 text-sm py-8 justify-center">
              <Spinner/> Rendering image...
            </div>
          ):(
            <>
              <div className="rounded-xl overflow-hidden border border-zinc-700">
                <img src={imgDataUrl} alt="Instagram post" className="w-full aspect-square object-cover"/>
              </div>
              <p className="text-xs text-zinc-600 mt-2">1080×1080px · Download PNG to post on Instagram or Facebook.</p>
            </>
          )}
        </Card>
      )}

      {/* caption output */}
      {(caption||loadingCap)&&(
        <Card>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>📝 Caption</SectionTitle>
            {caption&&(
              <button onClick={copy}
                className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-1 rounded-full transition">
                {copied?"✓ Copied!":"Copy"}
              </button>
            )}
          </div>
          {loadingCap?(
            <div className="flex gap-3 items-center text-zinc-400 text-sm py-4">
              <Spinner/> Claude is writing your caption...
            </div>
          ):(
            <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed bg-zinc-800/50 rounded-xl p-4">
              {caption}
            </pre>
          )}
        </Card>
      )}

      {/* monthly workflow */}
      <Card>
        <SectionTitle>📱 Monthly Posting Workflow</SectionTitle>
        <div className="space-y-3">
          {[
            {t:"1 week before",    a:"Round Announcement → Instagram + Facebook + Chat"},
            {t:"3 days before",    a:"Social Day Reminder → Instagram + Facebook"},
            {t:"Morning of Social Day", a:"Go Live Reminder → Group Chat"},
            {t:"During Social Day",a:"Live photos / stories (manual)"},
            {t:"After round closes",a:"Results Post + Leaderboard Image → Instagram + Facebook"},
          ].map((s,i)=>(
            <div key={i} className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-900 text-emerald-300 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                {i+1}
              </div>
              <div>
                <div className="text-xs text-emerald-400 font-semibold">{s.t}</div>
                <div className="text-sm text-zinc-300">{s.a}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: LEAGUE INFO
// ─────────────────────────────────────────────────────────────────────────────
function LeagueInfo() {
  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>🏆 Points System</SectionTitle>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[["1st","4.0","text-yellow-400"],["2nd","3.5","text-zinc-300"],["3rd","3.0","text-amber-600"],["4th","2.5","text-zinc-400"],
            ["5th","2.0","text-zinc-400"],["6th","1.75","text-zinc-400"],["7th","1.5","text-zinc-500"],["8th","1.25","text-zinc-500"]].map(([p,v,c])=>(
            <div key={p} className="bg-zinc-800 rounded-xl p-2.5 text-center">
              <div className={`text-base font-black ${c}`}>{p}</div>
              <div className="text-xs text-zinc-600">{v} pts</div>
            </div>
          ))}
        </div>
        <div className="text-xs text-zinc-600">All other players: 1.0 pt · Ties resolved by countback then average points</div>
        <div className="mt-3 bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-sm text-amber-300">
          🏅 Top 6 reach the Championship Final · Bonus stableford: 1st +2, 2nd +1, 3rd +0.5
        </div>
      </Card>

      <Card>
        <SectionTitle>📜 Key Rules</SectionTitle>
        <div className="space-y-2 text-sm text-zinc-300">
          {["New course each month","Play Social Day OR any day that month","Must play with ≥1 other SEGL member","Declare 'Going Live' in group chat first","You don't have to play every month"].map(r=>(
            <div key={r} className="flex gap-2"><span className="text-emerald-500 flex-shrink-0">⛳</span>{r}</div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle>💳 Fees & Payment</SectionTitle>
        <div className="space-y-2">
          <div className="bg-zinc-800 rounded-xl p-3">
            <div className="text-xs text-zinc-500 mb-1">Season Fee (one-off)</div>
            <div className="text-white font-black text-xl">$50</div>
            <div className="text-xs text-zinc-500">Prizes · merchandise · trophy engraving. No points until paid.</div>
          </div>
          <div className="bg-zinc-800 rounded-xl p-3">
            <div className="text-xs text-zinc-500 mb-1.5">Bank Transfer</div>
            <div className="font-mono text-emerald-400 text-sm">BSB: 083-125</div>
            <div className="font-mono text-emerald-400 text-sm">ACC: 77-820-8961</div>
            <div className="text-zinc-400 text-sm">Name: Brad Parker</div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle>🎯 Handicaps</SectionTitle>
        <div className="text-sm text-zinc-400 space-y-2">
          <p>Golf Australia formula. Only SEGL + establishing rounds count toward league handicap.</p>
          <div className="flex gap-3">
            <div className="flex-1 bg-zinc-800 rounded-xl p-3 text-center"><div className="text-white font-bold">Max 36</div><div className="text-xs text-zinc-500">Long tees</div></div>
            <div className="flex-1 bg-zinc-800 rounded-xl p-3 text-center"><div className="text-white font-bold">Max 45</div><div className="text-xs text-zinc-500">Short tees</div></div>
          </div>
          <p className="text-xs">New members: provide GA handicap record OR 3 recent 18-hole scorecards.</p>
        </div>
      </Card>

      <Card>
        <SectionTitle>🔗 Quick Links</SectionTitle>
        <div className="space-y-2">
          {[
            {label:"Squabbit Leaderboard",     href:LEAGUE_URL},
            {label:"Member Registration",       href:REGISTER_URL},
            {label:"Golf Australia Handicapping",href:"https://golf.com.au/resource-detail/golf-australias-national-handicapping-service"},
          ].map(l=>(
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
              className="flex justify-between items-center p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition">
              <span className="text-sm text-white">{l.label}</span>
              <span className="text-emerald-400 text-xs">↗</span>
            </a>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: GROUPINGS
// ─────────────────────────────────────────────────────────────────────────────
const ALL_MEMBERS = [
  "Aaron Kitchell","Anthony Dorrington","Ben Kaiser","Brad Parker","Brandon Kelly",
  "Dave Sobey","Dayne Halliday","Declan Lee","Dieter Werner","Eoin Connery",
  "James Tong","Jaryd Coghill","Jay Barbera","Jaze Dubois","Jesse Yarde",
  "John Dorrington","Lewis Andrews","Matt Disseldorp","Matt Hawes","Matthew Kos",
  "Maurice Mills-Rolfe","Megan Freeman","Michael Collett","Mitch Lucas","Olivia Tolich",
  "Petar Tolich","Quinton Smith","Sam Wright","Samuel Freeman","Scott Becker",
  "Scott Mainzer","Stephen Daw","Ted Jones","Warren Halliday",
];

function chunkIntoFours(players) {
  const groups = [];
  for (let i = 0; i < players.length; i += 4) {
    groups.push(players.slice(i, i + 4));
  }
  return groups;
}

function Groupings({ groupingState, setGroupingState }) {
  // groupingState shape: { [roundKey]: { selected: string[], groups: string[][] } }
  const now          = new Date();
  const currentMonth = MONTHS[now.getMonth()];
  const defaultRound = FIXTURE.find(f => f.month === currentMonth)?.round ||
                       FIXTURE.find(f => !f.completed)?.round || "03";

  const [roundSel,    setRoundSel]    = useState(defaultRound);
  const [copied,      setCopied]      = useState(false);
  const [moving,      setMoving]      = useState(null); // {player, fromGroup} — tap-to-move
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult,  setScanResult]  = useState(null);

  // ── Image scan via Claude vision ──────────────────────────────────────────
  const processImageFile = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setScanLoading(true);
    setScanResult(null);

    const base64 = await new Promise((res) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result.split(",")[1]);
      reader.readAsDataURL(file);
    });

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01", "anthropic-dangerous-allow-browser": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are extracting names from a screenshot of a chat member list. Return ONLY a JSON object with key \"names\" containing an array of name strings. No preamble, no markdown, just raw JSON.",
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: file.type || "image/png", data: base64 } },
              { type: "text",  text: "Extract all person names visible in this image. Return only JSON." },
            ],
          }],
        }),
      });
      const data = await response.json();
      const raw  = data.content?.map(b => b.text || "").join("") || "{}";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const extractedNames = parsed.names || [];

      const normalize = s => s.toLowerCase().replace(/[^a-z\s]/g,"").trim();
      const matched   = [];
      const unmatched = [];

      extractedNames.forEach(name => {
        const normName = normalize(name);
        const found = ALL_MEMBERS.find(m => {
          const normM = normalize(m);
          return normM === normName ||
            normM.split(" ").every(part => normName.includes(part)) ||
            normName.split(" ").every(part => normM.includes(part));
        });
        if (found) { if (!matched.includes(found)) matched.push(found); }
        else unmatched.push(name);
      });

      setRoundState(s => ({
        ...s,
        selected: [...new Set([...s.selected, ...matched])],
      }));
      setScanResult({ matched, unmatched });
    } catch (err) {
      setScanResult({ matched: [], unmatched: [], error: "Could not read image. Please try again." });
    }
    setScanLoading(false);
  };

  // Process image from a URL (Google Photos or direct image link)
  const [imageUrl, setImageUrl] = useState("");

  const processImageUrl = async (url) => {
    if (!url.trim()) return;
    setScanLoading(true);
    setScanResult(null);

    // Google Photos share links aren't direct image URLs — we need to
    // convert them to a direct image by appending =d0 to get the full res download
    // or =w2048 for a large rendition. We'll try fetching as a URL source via
    // the Anthropic API's url image type first.
    let imageSource;

    // Try to get a direct image URL from Google Photos share link
    let directUrl = url.trim();
    // Google Photos: https://photos.app.goo.gl/... or https://photos.google.com/photo/...
    // We can't bypass Google auth for private photos, but public share links
    // work with ?authuser=0 and the direct download trick
    if (directUrl.includes("photos.app.goo.gl") || directUrl.includes("photos.google.com")) {
      // Fetch the page to find the og:image meta tag which gives a direct CDN URL
      try {
        const proxyUrl = "https://api.allorigins.win/get?url=" + encodeURIComponent(directUrl);
        const res = await fetch(proxyUrl);
        const json = await res.json();
        const html = json.contents || "";
        // Extract og:image URL from meta tag
        const match = html.match(/property="og:image"\s+content="([^"]+)"/i)
                   || html.match(/content="([^"]+)"\s+property="og:image"/i)
                   || html.match(/og:image['"]\s+content=['"]([^'"]+)['"]/i);
        if (match?.[1]) {
          directUrl = match[1].replace(/&amp;/g, "&");
        }
      } catch(e) { /* fall through to try URL directly */ }
    }

    // Use URL source type in Anthropic API
    imageSource = { type: "url", url: directUrl };

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01", "anthropic-dangerous-allow-browser": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: "You are extracting names from a screenshot of a chat member list. Return ONLY a JSON object with key \"names\" containing an array of name strings. No preamble, no markdown, just raw JSON.",
          messages: [{
            role: "user",
            content: [
              { type: "image", source: imageSource },
              { type: "text",  text: "Extract all person names visible in this image. Return only JSON." },
            ],
          }],
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "API error");
      const raw   = data.content?.map(b => b.text || "").join("") || "{}";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      const extractedNames = parsed.names || [];

      const normalize = s => s.toLowerCase().replace(/[^a-z\s]/g,"").trim();
      const matched   = [];
      const unmatched = [];

      extractedNames.forEach(name => {
        const normName = normalize(name);
        const found = ALL_MEMBERS.find(m => {
          const normM = normalize(m);
          return normM === normName ||
            normM.split(" ").every(part => normName.includes(part)) ||
            normName.split(" ").every(part => normM.includes(part));
        });
        if (found) { if (!matched.includes(found)) matched.push(found); }
        else unmatched.push(name);
      });

      setRoundState(s => ({
        ...s,
        selected: [...new Set([...s.selected, ...matched])],
      }));
      setScanResult({ matched, unmatched });
    } catch (err) {
      setScanResult({ matched: [], unmatched: [], error: "Could not load image. Make sure the Google Photos link is set to 'Anyone with the link can view', then try again. Error: " + err.message });
    }
    setScanLoading(false);
  };

  const round = FIXTURE.find(f => f.round === roundSel);
  const state = groupingState[roundSel] || { selected: [], groups: [] };

  // Keep a ref so async handlers (image scan) always see latest groupingState
  const groupingStateRef = useRef(groupingState);
  useEffect(() => { groupingStateRef.current = groupingState; }, [groupingState]);

  const setRoundState = (updater) => {
    const latest = groupingStateRef.current;
    const current = latest[roundSel] || { selected: [], groups: [] };
    const next = updater(current);
    const nextFull = { ...latest, [roundSel]: next };
    setGroupingState(nextFull);
  };

  // Toggle a player in/out of the selected list (does not touch groups)
  const togglePlayer = (name) => {
    setRoundState(s => {
      const alreadySelected = s.selected.includes(name);
      const newSelected = alreadySelected
        ? s.selected.filter(p => p !== name)
        : [...s.selected, name];
      // Remove from groups if deselected
      const newGroups = alreadySelected
        ? s.groups.map(g => g.filter(p => p !== name)).filter(g => g.length > 0)
        : s.groups;
      return { ...s, selected: newSelected, groups: newGroups };
    });
  };

  // Auto-sort selected players into groups of 4
  const autoSort = () => {
    setRoundState(s => ({
      ...s,
      groups: chunkIntoFours([...s.selected]),
    }));
  };

  // ── Tap-to-move ────────────────────────────────────────────────────────────
  // Tap a player chip to select it for moving, then tap a group to move them there.
  const tapPlayer = (player, fromGroup) => {
    if (moving?.player === player && moving?.fromGroup === fromGroup) {
      setMoving(null); // tap same player again to deselect
    } else {
      setMoving({ player, fromGroup });
    }
  };

  const tapGroup = (toGroupIdx) => {
    if (!moving) return;
    const { player, fromGroup } = moving;
    if (fromGroup === toGroupIdx) { setMoving(null); return; }
    setRoundState(s => {
      const groups = s.groups.map(g => [...g]);
      groups[fromGroup] = groups[fromGroup].filter(p => p !== player);
      groups[toGroupIdx] = [...groups[toGroupIdx], player];
      return { ...s, groups: groups.filter(g => g.length > 0) };
    });
    setMoving(null);
  };

  const tapNewGroup = () => {
    if (!moving) return;
    const { player, fromGroup } = moving;
    setRoundState(s => {
      const groups = s.groups.map(g => [...g]);
      groups[fromGroup] = groups[fromGroup].filter(p => p !== player);
      const cleaned = groups.filter(g => g.length > 0);
      return { ...s, groups: [...cleaned, [player]] };
    });
    setMoving(null);
  };

  // ── Chat summary ───────────────────────────────────────────────────────────
  const buildSummary = () => {
    const lines = [
      `⛳ SEGL Round ${round?.round} — ${round?.course} (${round?.date})`,
      `Social Day Groups`,
      ``,
    ];
    state.groups.forEach((g, i) => {
      lines.push(`Group ${i + 1}:`);
      g.forEach(p => lines.push(`  • ${p}`));
      lines.push(``);
    });
    const ungrouped = state.selected.filter(
      p => !state.groups.flat().includes(p)
    );
    if (ungrouped.length) {
      lines.push(`Unassigned:`);
      ungrouped.forEach(p => lines.push(`  • ${p}`));
    }
    return lines.join("\n").trim();
  };

  const copySummary = () => {
    const text = buildSummary();
    // Try modern clipboard API first, fall back to execCommand for mobile/iframe
    const doFallback = () => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); } catch(e) {}
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(doFallback);
    } else {
      doFallback();
    }
  };

  const ungrouped = state.selected.filter(p => !state.groups.flat().includes(p));

  return (
    <div className="space-y-4">

      {/* Round selector */}
      <Card>
        <SectionTitle>👥 Social Day Groupings</SectionTitle>
        <label className="text-xs text-zinc-500 uppercase tracking-widest mb-2 block">Select Round</label>
        <div className="flex flex-wrap gap-1.5">
          {FIXTURE.filter(f => !f.completed).map(f => (
            <button key={f.round} onClick={() => setRoundSel(f.round)}
              className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${
                roundSel === f.round
                  ? "bg-emerald-700 border-emerald-500 text-white"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}>
              R{f.round} · {f.course !== "TBC" ? f.course : "TBC"}
            </button>
          ))}
        </div>
        {round && (
          <div className="mt-3 text-xs text-zinc-500">
            📅 {round.date} &nbsp;·&nbsp; {state.selected.length} player{state.selected.length !== 1 ? "s" : ""} selected
          </div>
        )}
      </Card>

      {/* Image scan */}
      <Card>
        <SectionTitle>📷 Import from Chat Screenshot</SectionTitle>
        <p className="text-sm text-zinc-400 mb-3">
          Screenshot your chat member list then either upload the file or paste a Google Photos link — Claude reads the names and auto-selects matching players.
        </p>

        {/* Tab switcher */}
        {(() => {
          const [scanMode, setScanMode] = React.useState("upload");
          return (
            <div>
              <div className="flex gap-2 mb-3">
                {[{id:"upload",label:"📁 Upload File"},{id:"link",label:"🔗 Google Photos Link"}].map(m => (
                  <button key={m.id} onClick={() => setScanMode(m.id)}
                    className={`flex-1 text-xs font-semibold py-2 rounded-lg border transition ${scanMode===m.id ? "bg-sky-800 border-sky-600 text-white" : "border-zinc-700 text-zinc-400 hover:border-zinc-500"}`}>
                    {m.label}
                  </button>
                ))}
              </div>

              {scanMode === "upload" ? (
                <div>
                  {scanLoading ? (
                    <div className="w-full flex items-center justify-center gap-2 bg-zinc-800 border border-zinc-700 text-zinc-400 font-bold py-4 rounded-xl text-sm">
                      <Spinner/> Scanning...
                    </div>
                  ) : (
                    <div className="relative w-full">
                      <div className="w-full bg-sky-700 text-white font-bold py-4 rounded-xl text-sm text-center pointer-events-none select-none">
                        📁 Choose Image File
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => { const f = e.target.files?.[0]; if (f) processImageFile(f); e.target.value=""; }}
                        style={{position:"absolute",inset:0,width:"100%",height:"100%",opacity:0,cursor:"pointer"}}
                      />
                    </div>
                  )}
                  <p className="text-xs text-zinc-500 mt-2">Tap above to open your photo library and select the screenshot.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="Paste Google Photos share link here..."
                    className="w-full bg-zinc-800 border border-zinc-600 focus:border-sky-500 text-white text-sm rounded-xl px-4 py-3 outline-none placeholder-zinc-500"
                  />
                  <button
                    onClick={() => processImageUrl(imageUrl)}
                    disabled={scanLoading || !imageUrl.trim()}
                    className="w-full flex items-center justify-center gap-2 bg-sky-700 hover:bg-sky-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold py-3 rounded-xl text-sm transition"
                  >
                    {scanLoading ? <><Spinner/> Scanning...</> : "🔍 Scan Image"}
                  </button>
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-400 space-y-1">
                    <div className="font-semibold text-zinc-300">How to share from Google Photos:</div>
                    <div>1. Open the photo in Google Photos</div>
                    <div>2. Tap <span className="text-white font-medium">Share</span> → <span className="text-white font-medium">Create link</span></div>
                    <div>3. Set to <span className="text-emerald-400 font-medium">"Anyone with the link"</span> → copy & paste above</div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {scanResult && !scanResult.error && (
          <div className="mt-3 space-y-2">
            <div className="bg-emerald-950/50 border border-emerald-800/60 rounded-xl p-3">
              <div className="text-xs text-emerald-400 font-semibold uppercase tracking-widest mb-1.5">
                ✓ {scanResult.matched.length} player{scanResult.matched.length !== 1 ? "s" : ""} matched & selected
              </div>
              <div className="flex flex-wrap gap-1.5">
                {scanResult.matched.map(n => (
                  <span key={n} className="text-xs bg-emerald-900 text-emerald-200 border border-emerald-700 px-2.5 py-1 rounded-full">{n}</span>
                ))}
              </div>
            </div>
            {scanResult.unmatched.length > 0 && (
              <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-3">
                <div className="text-xs text-amber-400 font-semibold uppercase tracking-widest mb-1.5">
                  ⚠ {scanResult.unmatched.length} name{scanResult.unmatched.length !== 1 ? "s" : ""} not found in player list
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {scanResult.unmatched.map((n,i) => (
                    <span key={i} className="text-xs bg-zinc-800 text-zinc-400 border border-zinc-700 px-2.5 py-1 rounded-full">{n}</span>
                  ))}
                </div>
                <p className="text-xs text-zinc-600 mt-2">These may be non-SEGL members or names formatted differently. Select them manually below if needed.</p>
              </div>
            )}
          </div>
        )}
        {scanResult?.error && (
          <div className="mt-3 bg-red-950/40 border border-red-800/50 rounded-xl p-3 text-sm text-red-300">{scanResult.error}</div>
        )}
      </Card>

      {/* Player selection */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionTitle>Select Players</SectionTitle>
          <div className="flex items-center gap-2">
            <div className={`text-sm font-black tabular-nums px-3 py-1 rounded-full border ${
              state.selected.length === 0 ? "text-zinc-500 border-zinc-700 bg-zinc-800"
              : state.selected.length % 4 === 0 ? "text-emerald-300 border-emerald-700 bg-emerald-900/50"
              : "text-amber-300 border-amber-700 bg-amber-900/40"
            }`}>
              {state.selected.length}
              <span className="text-xs font-normal ml-1 opacity-70">
                selected {state.selected.length > 0 && `· ${Math.floor(state.selected.length/4)} full group${Math.floor(state.selected.length/4)!==1?"s":""}`}{state.selected.length % 4 !== 0 && state.selected.length > 0 ? ` +${state.selected.length%4}` : ""}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_MEMBERS.map(name => {
            const sel = state.selected.includes(name);
            return (
              <button key={name} onClick={() => togglePlayer(name)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition ${
                  sel
                    ? "bg-emerald-800 border-emerald-600 text-emerald-100"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                }`}>
                {sel ? "✓ " : ""}{name}
              </button>
            );
          })}
        </div>

        {state.selected.length > 0 && (
          <button onClick={autoSort}
            className="mt-4 w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-2.5 rounded-xl text-sm transition">
            🎲 Auto-sort into Groups of 4
          </button>
        )}
      </Card>

      {/* Groups */}
      {state.groups.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>🏌️ Groups</SectionTitle>
            <button onClick={copySummary}
              className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-1.5 rounded-full font-semibold transition">
              {copied ? "✓ Copied!" : "📋 Copy for Chat"}
            </button>
          </div>

          {/* Tap-to-move instruction */}
          {moving ? (
            <div className="mb-3 bg-emerald-900/60 border border-emerald-600 rounded-xl px-3 py-2 text-sm text-emerald-200 font-semibold flex items-center justify-between">
              <span>Moving: <span className="text-white">{moving.player}</span> — tap a group below</span>
              <button onClick={() => setMoving(null)} className="text-emerald-400 text-lg leading-none ml-2">✕</button>
            </div>
          ) : (
            <p className="text-xs text-zinc-500 mb-3">Tap a player to pick them up, then tap a group to move them.</p>
          )}

          <div className="space-y-3">
            {state.groups.map((group, gi) => (
              <div key={gi}
                onClick={() => { if (moving) tapGroup(gi); }}
                className={`rounded-xl border p-3 transition ${
                  moving
                    ? "border-emerald-500 bg-emerald-950/30 cursor-pointer"
                    : "border-zinc-700 bg-zinc-800/40"
                }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    Group {gi + 1}
                    {moving && <span className="text-emerald-400 ml-2">← tap to move here</span>}
                  </span>
                  <span className={`text-xs font-semibold ${
                    group.length === 4 ? "text-emerald-400" :
                    group.length === 3 ? "text-amber-400" : "text-zinc-500"
                  }`}>
                    {group.length} player{group.length !== 1 ? "s" : ""}
                    {group.length === 4 ? " ✓" : ""}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                  {group.map(player => {
                    const isMoving = moving?.player === player && moving?.fromGroup === gi;
                    return (
                      <button key={player}
                        onClick={() => tapPlayer(player, gi)}
                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border font-medium transition select-none ${
                          isMoving
                            ? "bg-emerald-600 border-emerald-400 text-white ring-2 ring-emerald-400"
                            : "bg-zinc-700 hover:bg-zinc-600 text-white border-zinc-600"
                        }`}>
                        <span className="text-zinc-400 text-xs">{isMoving ? "✦" : "⠿"}</span>
                        {player}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* New group target */}
            <button
              onClick={tapNewGroup}
              disabled={!moving}
              className={`w-full rounded-xl border-2 border-dashed p-4 text-center text-xs font-semibold transition ${
                moving
                  ? "border-emerald-500 text-emerald-400 bg-emerald-950/30"
                  : "border-zinc-700 text-zinc-600"
              }`}>
              {moving ? "＋ Tap to create new group" : "＋ New group"}
            </button>
          </div>

          {/* Ungrouped players */}
          {ungrouped.length > 0 && (
            <div className="mt-4 bg-amber-950/30 border border-amber-800/50 rounded-xl p-3">
              <div className="text-xs text-amber-400 font-semibold mb-2 uppercase tracking-widest">
                ⚠ Unassigned ({ungrouped.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {ungrouped.map(player => (
                  <span key={player} className="text-xs bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded-full border border-zinc-600">
                    {player}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Preview of chat output */}
      {state.groups.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <SectionTitle>💬 Chat Summary</SectionTitle>
            <button onClick={copySummary}
              className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-full font-semibold transition">
              {copied ? "✓ Copied!" : "Copy"}
            </button>
          </div>
          <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed bg-zinc-800/50 rounded-xl p-4">
            {buildSummary()}
          </pre>
        </Card>
      )}

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────
function Payments({ payments, setPayments, groupingState }) {
  const getP = (name) => payments[name] || { seasonFee: false, roundsPaid: {} };

  const isInSocialGroup = (name, roundKey) => {
    const groups = groupingState[roundKey]?.groups || [];
    return groups.some(g => g.includes(name));
  };

  const greenFeePaid = (name, roundKey) => !!getP(name).roundsPaid?.[roundKey];

  const toggleSeasonFee = (name) => {
    const p = getP(name);
    setPayments({ ...payments, [name]: { ...p, seasonFee: !p.seasonFee } });
  };

  const toggleRoundPaid = (name, roundKey) => {
    const p = getP(name);
    const roundsPaid = { ...p.roundsPaid, [roundKey]: !p.roundsPaid?.[roundKey] };
    setPayments({ ...payments, [name]: { ...p, roundsPaid } });
  };

  // Only rounds that have social day groups set up (these are the ones with green fees)
  const greenFeeRounds = FIXTURE.filter(f =>
    f.round !== "CH" && (groupingState[f.round]?.groups?.length > 0)
  );

  const paidSeason   = ALL_MEMBERS.filter(n => getP(n).seasonFee).length;
  const unpaidSeason = ALL_MEMBERS.length - paidSeason;
  const outstandingGreen = ALL_MEMBERS.reduce((total, name) =>
    total + greenFeeRounds.filter(f => isInSocialGroup(name, f.round) && !greenFeePaid(name, f.round)).length, 0);

  const doFallbackCopy = (text) => {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand("copy"); } catch(e) {}
    document.body.removeChild(ta);
  };

  const copyChase = () => {
    const unpaid = ALL_MEMBERS.filter(n => !getP(n).seasonFee);
    const text = [
      "SEGL 2026 — Outstanding Season Fees", "",
      "The following players haven't paid their $50 season fee yet:",
      ...unpaid.map(n => "  * " + n), "",
      "Please transfer to: BSB 083-125 · ACC 77-820-8961 · Brad Parker",
    ].join("\n");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => doFallbackCopy(text));
    } else { doFallbackCopy(text); }
  };

  const COL = 52;   // px width of each round column
  const NAME = 140; // px width of frozen name column

  return (
    <div className="space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Season Paid",      val: paidSeason,      color: "#4ade80" },
          { label: "Season Owed",      val: unpaidSeason,    color: "#f87171" },
          { label: "Green Fees Owed",  val: outstandingGreen,color: "#fbbf24" },
        ].map(s => (
          <Card key={s.label} className="text-center py-3">
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
            <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Chase button */}
      {unpaidSeason > 0 && (
        <button onClick={copyChase}
          className="w-full bg-amber-700 hover:bg-amber-600 text-white font-bold py-3 rounded-xl text-sm transition">
          Copy Outstanding Season Fee Message
        </button>
      )}

      {/* Bank details */}
      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-400">
        <span className="text-zinc-200 font-semibold">$50 season fee · </span>
        <span className="font-mono text-emerald-400">BSB 083-125 · ACC 77-820-8961 · Brad Parker</span>
      </div>

      {/* Scrollable grid */}
      <Card>
        <SectionTitle>Member Payments</SectionTitle>
        <p className="text-xs text-zinc-500 mb-3">
          Scroll right to see green fees. Green fees auto-appear when a player is in a social day group.
        </p>

        {/* Outer wrapper — clips horizontal scroll but keeps name column frozen */}
        <div style={{ position: "relative" }}>

          {/* Scrollable area (only this scrolls horizontally) */}
          <div style={{ overflowX: "auto", overflowY: "visible" }}>
            <div style={{ minWidth: NAME + COL * greenFeeRounds.length + 60 }}>

              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
                {/* Frozen name header */}
                <div style={{
                  width: NAME, minWidth: NAME, flexShrink: 0,
                  position: "sticky", left: 0, zIndex: 2,
                  background: "#18181b", paddingLeft: 8,
                }}>
                  <span className="text-xs text-zinc-500 font-semibold uppercase tracking-widest">Player</span>
                </div>
                {/* Season fee header */}
                <div style={{ width: 52, minWidth: 52, flexShrink: 0, textAlign: "center" }}>
                  <span className="text-xs text-zinc-500 font-semibold">$50</span>
                </div>
                {/* Round headers */}
                {greenFeeRounds.map(f => (
                  <div key={f.round} style={{ width: COL, minWidth: COL, flexShrink: 0, textAlign: "center" }}>
                    <span className="text-xs text-zinc-500 font-semibold">R{f.round}</span>
                    <div className="text-xs text-zinc-700 leading-none" style={{ fontSize: 9 }}>{f.course.slice(0,6)}</div>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: "#27272a", marginBottom: 4 }} />

              {/* Member rows */}
              {ALL_MEMBERS.map(name => {
                const p = getP(name);
                return (
                  <div key={name} style={{ display: "flex", alignItems: "center", minHeight: 40, borderBottom: "1px solid #27272a" }}>

                    {/* Frozen name + season fee toggle */}
                    <div style={{
                      width: NAME, minWidth: NAME, flexShrink: 0,
                      position: "sticky", left: 0, zIndex: 2,
                      background: "#18181b", display: "flex", alignItems: "center", gap: 8, paddingLeft: 8, paddingRight: 4,
                    }}>
                      <span className="text-sm truncate" style={{ color: p.seasonFee ? "#fff" : "#71717a", maxWidth: NAME - 16 }}>
                        {name}
                      </span>
                    </div>

                    {/* Season fee toggle */}
                    <div style={{ width: 52, minWidth: 52, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                      <button onClick={() => toggleSeasonFee(name)} style={{
                        width: 24, height: 24, borderRadius: "50%", border: "2px solid",
                        borderColor: p.seasonFee ? "#22c55e" : "#52525b",
                        background: p.seasonFee ? "#22c55e" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                        flexShrink: 0,
                      }}>
                        {p.seasonFee && <span style={{ color: "#fff", fontSize: 12, fontWeight: "bold", lineHeight: 1 }}>✓</span>}
                      </button>
                    </div>

                    {/* Green fee columns */}
                    {greenFeeRounds.map(f => {
                      const inGroup = isInSocialGroup(name, f.round);
                      const paid    = greenFeePaid(name, f.round);
                      if (!inGroup) {
                        return (
                          <div key={f.round} style={{ width: COL, minWidth: COL, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                            <span style={{ color: "#3f3f46", fontSize: 16 }}>–</span>
                          </div>
                        );
                      }
                      return (
                        <div key={f.round} style={{ width: COL, minWidth: COL, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                          <button onClick={() => toggleRoundPaid(name, f.round)} style={{
                            width: 28, height: 28, borderRadius: "50%", border: "2px solid",
                            borderColor: paid ? "#22c55e" : "#d97706",
                            background: paid ? "#22c55e" : "#451a03",
                            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                            flexShrink: 0,
                          }}>
                            {paid
                              ? <span style={{ color: "#fff", fontSize: 12, fontWeight: "bold", lineHeight: 1 }}>✓</span>
                              : <span style={{ color: "#fbbf24", fontSize: 12, fontWeight: "bold", lineHeight: 1 }}>$</span>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 text-xs text-zinc-500">
          <div className="flex items-center gap-1.5">
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#22c55e" }} />
            Paid
          </div>
          <div className="flex items-center gap-1.5">
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#451a03", border: "2px solid #d97706" }} />
            Owed
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ color: "#3f3f46", fontSize: 16, lineHeight: 1 }}>–</span>
            Not in group
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: ROUND RESULTS
// ─────────────────────────────────────────────────────────────────────────────
function Results({ results, setResults, groupingState, payments }) {
  // results shape: { [roundKey]: { winner: string|null, ntp: string|null, ld: string|null } }

  const now = new Date();
  const currentMonth = MONTHS[now.getMonth()];
  const defaultRound = FIXTURE.find(f => f.month === currentMonth)?.round ||
                       FIXTURE.find(f => !f.completed)?.round || "04";

  const [roundSel,  setRoundSel]  = useState(defaultRound);
  const [copied,    setCopied]    = useState(false);
  const [generating,setGenerating]= useState(false);
  const [announcement, setAnnouncement] = useState("");

  const round        = FIXTURE.find(f => f.round === roundSel);
  const roundData    = results[roundSel] || { winner: null, ntp: null, ld: null };
  const socialPlayers= groupingState[roundSel]?.selected || [];
  const getP         = (name) => payments[name] || { seasonFee: false, roundsPaid: {} };

  const setRoundData = (patch) => {
    const next = { ...roundData, ...patch };
    setResults({ ...results, [roundSel]: next });
  };

  // Toggle: if already selected → deselect; else select this player
  const toggle = (field, name) => {
    setRoundData({ [field]: roundData[field] === name ? null : name });
  };

  const doFallbackCopy = (text) => {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand("copy"); } catch(e) {}
    document.body.removeChild(ta);
  };

  const generateAnnouncement = async () => {
    setGenerating(true);
    const winner = roundData.winner || "TBC";
    const ntp    = roundData.ntp    || "TBC";
    const ld     = roundData.ld     || "TBC";

    const prompt = `Write an exciting group chat announcement for SEGL Golf League Round ${round?.round} results at ${round?.course} (${round?.date}).
Social Day Best Score (wins $25 Drummond Golf Voucher): ${winner}
Nearest the Pin: ${ntp}
Longest Drive: ${ld}
Mention the full season leaderboard is on Squabbit: ${LEAGUE_URL}.
Keep it punchy, fun, under 150 words. Use emojis.`;

    try {
      const d = await claudeCall(
        "You are the SEGL Golf League social media manager. Tone: fun, energetic, community-focused.",
        prompt, 500
      );
      setAnnouncement(d.content?.map(b => b.text || "").join("") || d.error || "Error generating.");
    } catch(e) { setAnnouncement("Error: " + e.message); }
    setGenerating(false);
  };

  const copyAnnouncement = () => {
    const text = announcement;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => doFallbackCopy(text));
    } else { doFallbackCopy(text); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Badge for each toggle field
  const FIELDS = [
    { key: "winner", label: "Winner", emoji: "🏆", color: { on: "#854d0e", border: "#ca8a04", text: "#fde68a" } },
    { key: "ntp",    label: "NTP",    emoji: "🎯", color: { on: "#1e3a5f", border: "#3b82f6", text: "#bfdbfe" } },
    { key: "ld",     label: "LD",     emoji: "💨", color: { on: "#3b0764", border: "#a855f7", text: "#e9d5ff" } },
  ];


  return (
    <div className="space-y-4">

      {/* Round selector */}
      <Card>
        <SectionTitle>🏆 Social Day Results</SectionTitle>
        <label className="text-xs text-zinc-500 uppercase tracking-widest mb-2 block">Round</label>
        <div className="flex flex-wrap gap-1.5">
          {FIXTURE.filter(f => f.round !== "CH").map(f => (
            <button key={f.round} onClick={() => { setRoundSel(f.round); setAnnouncement(""); }}
              className={`text-xs px-2.5 py-1 rounded-full border transition font-medium ${
                roundSel === f.round
                  ? "bg-emerald-700 border-emerald-500 text-white"
                  : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}>
              R{f.round} · {f.course !== "TBC" ? f.course : "TBC"}
            </button>
          ))}
        </div>
        {round && <div className="mt-2 text-xs text-zinc-500">📅 {round.date}</div>}
      </Card>

      {/* Winners summary */}
      {(roundData.winner || roundData.ntp || roundData.ld) && (
        <div className="grid grid-cols-3 gap-2">
          {FIELDS.map(f => (
            roundData[f.key] ? (
              <div key={f.key} style={{ background: f.color.on, border: `1px solid ${f.color.border}`, borderRadius: 16, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 20 }}>{f.emoji}</div>
                <div style={{ fontSize: 10, color: f.color.text, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{f.label}</div>
                <div style={{ fontSize: 12, color: "#fff", fontWeight: 700, marginTop: 2, lineHeight: 1.2 }}>{roundData[f.key]}</div>
              </div>
            ) : (
              <div key={f.key} style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 16, padding: "10px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 20, opacity: 0.3 }}>{f.emoji}</div>
                <div style={{ fontSize: 10, color: "#52525b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{f.label}</div>
                <div style={{ fontSize: 11, color: "#52525b", marginTop: 2 }}>TBC</div>
              </div>
            )
          ))}
        </div>
      )}

      {/* Player toggles */}
      <Card>
        <SectionTitle>🎖️ Assign Prizes</SectionTitle>
        {socialPlayers.length === 0 ? (
          <p className="text-sm text-zinc-500">No social day players set for this round. Add them in the Groupings tab first.</p>
        ) : (
          <>
            {/* Column headers */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="flex-1 text-xs text-zinc-500 uppercase tracking-widest">Player</span>
              {FIELDS.map(f => (
                <span key={f.key} style={{ width: 52, textAlign: "center", fontSize: 11, color: "#71717a", fontWeight: 700 }}>
                  {f.emoji} {f.label}
                </span>
              ))}
            </div>

            <div className="space-y-1">
              {socialPlayers.map(name => (
                  <div key={name} className="flex items-center gap-2 py-1.5 border-b border-zinc-800/60 last:border-0">
                    <span className="flex-1 text-sm truncate text-white">{name}</span>
                    {FIELDS.map(f => {
                      const isSelected = roundData[f.key] === name;
                      return (
                        <div key={f.key} style={{ width: 52, display: "flex", justifyContent: "center" }}>
                          <button onClick={() => toggle(f.key, name)}
                            style={{
                              width: 32, height: 32, borderRadius: "50%",
                              border: `2px solid ${isSelected ? f.color.border : "#3f3f46"}`,
                              background: isSelected ? f.color.on : "transparent",
                              cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              transition: "all 0.15s",
                            }}>
                            {isSelected && <span style={{ fontSize: 14 }}>{f.emoji}</span>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
              ))}
            </div>


          </>
        )}
      </Card>

      {/* Announcement generator */}
      <Card>
        <SectionTitle>📣 Generate Announcement</SectionTitle>
        <button onClick={generateAnnouncement}
          disabled={generating || (!roundData.winner && !roundData.ntp && !roundData.ld)}
          className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-bold py-3 rounded-xl text-sm transition">
          {generating ? <><Spinner/> Generating...</> : "✨ Generate Results Announcement"}
        </button>
        {!roundData.winner && !roundData.ntp && !roundData.ld && (
          <p className="text-xs text-zinc-600 mt-2 text-center">Assign at least one prize above first.</p>
        )}

        {announcement && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Announcement</span>
              <button onClick={copyAnnouncement}
                className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-200 px-3 py-1 rounded-full transition">
                {copied ? "✓ Copied!" : "📋 Copy"}
              </button>
            </div>
            <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-sans leading-relaxed bg-zinc-800/50 rounded-xl p-4">
              {announcement}
            </pre>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DESKTOP LAYOUT VARIANTS
// ─────────────────────────────────────────────────────────────────────────────

function DashboardDesktop({ setTab, bookedRounds={} }) {
  const now          = new Date();
  const currentMonth = MONTHS[now.getMonth()];
  const nextMonth    = MONTHS[(now.getMonth()+1) % 12];
  const currentRound = FIXTURE.find(f => f.month === currentMonth);
  const nextRound    = FIXTURE.find(f => f.month === nextMonth);
  const nextUnbooked = FIXTURE.find(f=>!(bookedRounds[f.round]??f.booked)&&!f.completed);
  const completed    = FIXTURE.filter(f=>f.completed).length;
  const booked       = FIXTURE.filter(f=>bookedRounds[f.round]??f.booked).length;

  return (
    <div className="space-y-6">
      {/* 4-up stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          {label:"Completed",   val:completed, c:"text-zinc-300"},
          {label:"Booked",      val:booked,    c:"text-emerald-400"},
          {label:"Total Rounds",val:10,        c:"text-zinc-400"},
          {label:"Members",     val:34,        c:"text-amber-400"},
        ].map(s=>(
          <Card key={s.label} className="text-center py-5">
            <div className={`text-4xl font-black ${s.c}`}>{s.val}</div>
            <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Current + Next round side by side */}
      <div className="grid grid-cols-2 gap-4">
        <RoundCard label={"⛳ Current Round — " + currentMonth} round={currentRound} bookedRounds={bookedRounds} accent="emerald" />
        <RoundCard label={"→ Next Round — " + nextMonth}        round={nextRound}    bookedRounds={bookedRounds} accent="sky" />
      </div>

      {/* Action items + fixture side by side */}
      <div className="grid grid-cols-2 gap-4 items-start">
        <Card>
          <SectionTitle>⚡ Action Items</SectionTitle>
          <div className="space-y-2">
            {nextUnbooked&&(
              <button onClick={()=>setTab("booking")}
                className="w-full flex gap-3 items-start bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-left hover:bg-amber-950/70 hover:border-amber-700 transition group">
                <span className="text-amber-400 mt-0.5">📅</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-amber-300">Book Round {nextUnbooked.round} — {nextUnbooked.course}</div>
                  <div className="text-xs text-zinc-500">Social Day: {nextUnbooked.date}</div>
                </div>
                <span className="text-amber-600 group-hover:text-amber-400 text-xs mt-0.5 transition">→</span>
              </button>
            )}
            <button onClick={()=>setTab("social")}
              className="w-full flex gap-3 items-start bg-sky-950/40 border border-sky-800/60 rounded-xl p-3 text-left hover:bg-sky-950/70 hover:border-sky-700 transition group">
              <span className="text-sky-400 mt-0.5">📣</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-sky-300">Generate round announcement</div>
                <div className="text-xs text-zinc-500">Round Announcement → Generate Post + Image</div>
              </div>
              <span className="text-sky-600 group-hover:text-sky-400 text-xs mt-0.5 transition">→</span>
            </button>
            <div className="flex gap-3 items-start bg-zinc-800/50 border border-zinc-700 rounded-xl p-3">
              <span className="text-zinc-400 mt-0.5">💰</span>
              <div>
                <div className="text-sm font-semibold text-zinc-300">Follow up outstanding $50 season fees</div>
                <div className="text-xs text-zinc-500 font-mono">BSB 083-125 · ACC 77-820-8961 · Brad Parker</div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle>📅 2026 Season Fixture</SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-zinc-500 border-b border-zinc-800">
                  <th className="text-left pb-2 pr-3">Rnd</th>
                  <th className="text-left pb-2 pr-3">Course</th>
                  <th className="text-left pb-2 pr-3">Social Day</th>
                  <th className="text-left pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {FIXTURE.map(f=>(
                  <tr key={f.round} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition">
                    <td className="py-1.5 pr-3 text-zinc-500 font-mono text-xs">{f.round}</td>
                    <td className="py-1.5 pr-3 text-white font-medium">{f.course}</td>
                    <td className="py-1.5 pr-3 text-zinc-400 text-xs">{f.date}</td>
                    <td className="py-1.5">
                      {f.completed?<Badge color="gray">Done</Badge>:(bookedRounds[f.round]??f.booked)?<Badge color="green">Booked</Badge>:<Badge color="yellow">Pending</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function LeagueInfoDesktop() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 items-start">
        {/* Left column */}
        <div className="space-y-4">
          <Card>
            <SectionTitle>🏆 Points System</SectionTitle>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[["1st","4.0","text-yellow-400"],["2nd","3.5","text-zinc-300"],["3rd","3.0","text-amber-600"],["4th","2.5","text-zinc-400"],
                ["5th","2.0","text-zinc-400"],["6th","1.75","text-zinc-400"],["7th","1.5","text-zinc-500"],["8th","1.25","text-zinc-500"]].map(([p,v,c])=>(
                <div key={p} className="bg-zinc-800 rounded-xl p-2.5 text-center">
                  <div className={`text-base font-black ${c}`}>{p}</div>
                  <div className="text-xs text-zinc-600">{v} pts</div>
                </div>
              ))}
            </div>
            <div className="text-xs text-zinc-600">All other players: 1.0 pt · Ties resolved by countback then average points</div>
            <div className="mt-3 bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 text-sm text-amber-300">
              🏅 Top 6 reach the Championship Final · Bonus stableford: 1st +2, 2nd +1, 3rd +0.5
            </div>
          </Card>

          <Card>
            <SectionTitle>📜 Key Rules</SectionTitle>
            <div className="space-y-2 text-sm text-zinc-300">
              {["New course each month","Play Social Day OR any day that month","Must play with at least 1 other SEGL member","Declare 'Going Live' in group chat first","You don't have to play every month"].map(r=>(
                <div key={r} className="flex gap-2"><span className="text-emerald-500 flex-shrink-0">⛳</span>{r}</div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <Card>
            <SectionTitle>💳 Fees & Payment</SectionTitle>
            <div className="space-y-2">
              <div className="bg-zinc-800 rounded-xl p-3">
                <div className="text-xs text-zinc-500 mb-1">Season Fee (one-off)</div>
                <div className="text-white font-black text-xl">$50</div>
                <div className="text-xs text-zinc-500">Prizes · merchandise · trophy engraving. No points until paid.</div>
              </div>
              <div className="bg-zinc-800 rounded-xl p-3">
                <div className="text-xs text-zinc-500 mb-1.5">Bank Transfer</div>
                <div className="font-mono text-emerald-400 text-sm">BSB: 083-125</div>
                <div className="font-mono text-emerald-400 text-sm">ACC: 77-820-8961</div>
                <div className="text-zinc-400 text-sm">Name: Brad Parker</div>
              </div>
            </div>
          </Card>

          <Card>
            <SectionTitle>🎯 Handicaps</SectionTitle>
            <div className="text-sm text-zinc-400 space-y-2">
              <p>Golf Australia formula. Only SEGL + establishing rounds count toward league handicap.</p>
              <div className="flex gap-3">
                <div className="flex-1 bg-zinc-800 rounded-xl p-3 text-center"><div className="text-white font-bold">Max 36</div><div className="text-xs text-zinc-500">Long tees</div></div>
                <div className="flex-1 bg-zinc-800 rounded-xl p-3 text-center"><div className="text-white font-bold">Max 45</div><div className="text-xs text-zinc-500">Short tees</div></div>
              </div>
              <p className="text-xs">New members: provide GA handicap record OR 3 recent 18-hole scorecards.</p>
            </div>
          </Card>

          <Card>
            <SectionTitle>🔗 Quick Links</SectionTitle>
            <div className="space-y-2">
              {[
                {label:"Squabbit Leaderboard",     href:LEAGUE_URL},
                {label:"Member Registration",       href:REGISTER_URL},
                {label:"Golf Australia Handicapping",href:"https://golf.com.au/resource-detail/golf-australias-national-handicapping-service"},
              ].map(l=>(
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
                  className="flex justify-between items-center p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition">
                  <span className="text-sm text-white">{l.label}</span>
                  <span className="text-emerald-400 text-xs">↗</span>
                </a>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — shared password gate
// ─────────────────────────────────────────────────────────────────────────────
// Token is stored in memory after login; also cached in sessionStorage so
// refreshing the page within the same browser session doesn't re-prompt.
let _token = localStorage.getItem("segl_token") || "";
const getToken = () => _token;
const setToken = (t) => { _token = t; localStorage.setItem("segl_token", t); };

// ── Unified Claude API caller — works in artifact AND on Netlify ─────────────
// On Netlify: calls the serverless proxy (key stays secret)
// In artifact / local: calls Anthropic directly (key injected by Claude)
async function claudeCall(system, userContent, maxTokens = 1000) {
  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userContent }],
  };
  // Try the Netlify proxy first
  try {
    const r = await fetch("/.netlify/functions/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-app-token": getToken() },
      body: JSON.stringify(body),
    });
    if (r.ok) return await r.json();
  } catch(e) { /* proxy not available — fall through */ }
  // Fallback: direct Anthropic API (works in Claude artifact)
  const r2 = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-allow-browser": "true",
    },
    body: JSON.stringify(body),
  });
  return await r2.json();
}

// The correct password is set as a Netlify environment variable SEGL_APP_PASSWORD
// and baked into the HTML at build time. We verify it client-side for the gate,
// AND the Netlify function verifies it server-side before calling Anthropic.
// SEGL_APP_PASSWORD is injected by the build — see instructions below.
const APP_PASSWORD = (window.__APP_PASSWORD__ || "");

function PasswordGate({ onUnlock }) {
  const [input,  setInput]  = useState("");
  const [error,  setError]  = useState(false);
  const [shake,  setShake]  = useState(false);

  const attempt = () => {
    if (input === APP_PASSWORD) {
      setToken(input);
      onUnlock();
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setTimeout(() => setError(false), 2000);
      setInput("");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-800 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">⛳</div>
          <div className="text-2xl font-black text-white">SEGL Golf League</div>
          <div className="text-zinc-500 text-sm mt-1">2026 Season Manager</div>
        </div>

        {/* Password form */}
        <div
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4"
          style={{ transform: shake ? "translateX(-6px)" : "none", transition: "transform 0.1s" }}
        >
          <div className="text-sm text-zinc-400 text-center">Enter the league password to continue</div>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && attempt()}
            placeholder="Password"
            autoFocus
            className={`w-full bg-zinc-800 border rounded-xl px-4 py-3 text-white text-sm outline-none transition ${
              error ? "border-red-500" : "border-zinc-700 focus:border-emerald-500"
            }`}
          />
          {error && <div className="text-xs text-red-400 text-center">Incorrect password. Try again.</div>}
          <button
            onClick={attempt}
            className="w-full bg-emerald-700 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm transition"
          >
            Enter
          </button>
        </div>

        <div className="text-center mt-6 text-xs text-zinc-700">
          Contact your league admin for access
        </div>
      </div>
    </div>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE REST API — no SDK, works everywhere
// ─────────────────────────────────────────────────────────────────────────────
const FB_URL = "https://segl-manager-2026-default-rtdb.asia-southeast1.firebasedatabase.app";
const fbFetch = (path) =>
  fetch(`${FB_URL}/${path}.json`).then(r => r.json());

const fbSet = (path, val) =>
  fetch(`${FB_URL}/${path}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(val),
  });

// Long-poll: Firebase REST SSE stream for real-time updates
function fbSubscribe(path, callback) {
  const url = `${FB_URL}/${path}.json`;
  let es;
  try {
    es = new EventSource(url);
    es.addEventListener("put", (e) => {
      try { callback(JSON.parse(e.data)); } catch(err) {}
    });
    es.addEventListener("patch", (e) => {
      try { callback(JSON.parse(e.data)); } catch(err) {}
    });
  } catch(e) {}
  return () => { if (es) es.close(); };
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "Dashboard",    icon: "🏠" },
  { id: "booking",   label: "Booking",      icon: "📅" },
  { id: "results",   label: "Results",      icon: "🏆" },
  { id: "payments",  label: "Payments",     icon: "💳" },
  { id: "social",    label: "Social Media", icon: "📣" },
  { id: "groupings", label: "Groupings",    icon: "👥" },
  { id: "info",      label: "League Info",  icon: "ℹ️" },
];

const DEFAULT_BOOKED = Object.fromEntries(FIXTURE.map(f => [f.round, f.booked]));

function App() {
  // Auth — all hooks must be declared before any conditional returns
  const [unlocked, setUnlocked] = useState(() => {
    // localStorage persists across browser sessions (unlike sessionStorage)
    const saved = localStorage.getItem("segl_token");
    if (saved) { _token = saved; } // restore token for API calls
    return !!saved;
  });

  const [tab,           setTab]           = useState("dashboard");
  const [checks,        setChecks]        = useState({});
  const [bookedRounds,  setBookedRounds]  = useState(DEFAULT_BOOKED);
  const [groupingState, setGroupingState] = useState({});
  const [payments,      setPayments]      = useState({});
  const [roundResults,  setRoundResults]  = useState({});
  const [lbData,        setLbData]        = useState(SAMPLE_LB);
  const [fbReady,       setFbReady]       = useState(false);
  const [fbError,       setFbError]       = useState(null);

  // ── Initial load + SSE subscription ──────────────────────────────────────
  useEffect(() => {
    // Initial fetch
    fbFetch("segl2026").then(data => {
      if (data && typeof data === "object") {
        if (data.checks)        setChecks(data.checks);
        if (data.bookedRounds)  setBookedRounds({ ...DEFAULT_BOOKED, ...data.bookedRounds });
        if (data.groupingState) setGroupingState(data.groupingState);
        if (data.payments)      setPayments(data.payments);
        if (data.roundResults)  setRoundResults(data.roundResults);
        if (data.lbData)        setLbData(data.lbData);
      }
      setFbReady(true);
      setFbError(null);
    }).catch(err => {
      setFbError(err.message);
      setFbReady(true);
    });

    // Real-time subscription via SSE
    const unsub = fbSubscribe("segl2026", (event) => {
      const data = event?.data;
      if (!data || typeof data !== "object") return;
      if (data.checks)        setChecks(d => ({ ...d, ...data.checks }));
      if (data.bookedRounds)  setBookedRounds(d => ({ ...DEFAULT_BOOKED, ...d, ...data.bookedRounds }));
      if (data.groupingState) setGroupingState(d => ({ ...d, ...data.groupingState }));
      if (data.payments)      setPayments(d => ({ ...d, ...data.payments }));
      if (data.roundResults)  setRoundResults(d => ({ ...d, ...data.roundResults }));
      if (data.lbData)        setLbData(data.lbData);
    });

    return unsub;
  }, []);

  // ── Save helpers ──────────────────────────────────────────────────────────
  const saveChecks = (next) => {
    setChecks(next);
    fbSet("segl2026/checks", next);
  };

  const saveBookedRounds = (next) => {
    setBookedRounds(next);
    fbSet("segl2026/bookedRounds", next);
  };

  const saveGroupingState = (next) => {
    setGroupingState(next);
    fbSet("segl2026/groupingState", next);
  };

  const savePayments = (next) => {
    setPayments(next);
    fbSet("segl2026/payments", next);
  };

  const saveRoundResults = (next) => {
    setRoundResults(next);
    fbSet("segl2026/roundResults", next);
  };

  const saveLbData = (next) => {
    setLbData(next);
    fbSet("segl2026/lbData", next);
  };

  // Auth gate — after all hooks are declared (React rules of hooks)
  if (!unlocked) return <PasswordGate onUnlock={() => { setUnlocked(true); }} />;

  if (!fbReady) return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 rounded-full animate-spin"
        style={{ borderWidth: 3, borderStyle: "solid", borderColor: "#22c55e", borderTopColor: "transparent" }} />
      <div className="text-zinc-400 text-sm">Connecting to SEGL database...</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Sans','Helvetica Neue',sans-serif" }} className="min-h-screen bg-zinc-950 text-white">
      {/* ── MOBILE: top tab bar ── */}
      <div className="lg:hidden bg-zinc-900 border-b border-zinc-800 px-4 pt-4 pb-0 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-emerald-800 rounded-full flex items-center justify-center text-base">⛳</div>
          <div>
            <div className="text-base font-black leading-none">SEGL Golf League</div>
            <div className="text-xs text-zinc-500 flex items-center gap-1.5">
              2026 Season Manager
              {fbError ? <span className="text-red-400">· offline</span> : <span className="text-emerald-500">· live</span>}
            </div>
          </div>
        </div>
        <div className="flex overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 text-xs font-semibold px-3 py-2.5 border-b-2 transition flex items-center gap-1.5 ${
                tab === t.id ? "border-emerald-500 text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}>
              <span>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── MOBILE: content ── */}
      <div className="lg:hidden px-4 py-5 max-w-xl mx-auto">
        {tab === "dashboard" && <Dashboard setTab={setTab} bookedRounds={bookedRounds} />}
        {tab === "booking"   && <BookingWorkflow checks={checks} setChecks={saveChecks} bookedRounds={bookedRounds} setBookedRounds={saveBookedRounds} />}
        {tab === "results"   && <Results results={roundResults} setResults={saveRoundResults} groupingState={groupingState} payments={payments} />}
        {tab === "payments"  && <Payments payments={payments} setPayments={savePayments} groupingState={groupingState} />}
        {tab === "social"    && <SocialMedia lbData={lbData} saveLbData={saveLbData} />}
        {tab === "groupings" && <Groupings groupingState={groupingState} setGroupingState={saveGroupingState} />}
        {tab === "info"      && <LeagueInfo />}
      </div>

      {/* ── DESKTOP: sidebar + main panel ── */}
      <div className="hidden lg:flex h-screen overflow-hidden">

        {/* Left sidebar */}
        <div className="w-56 bg-zinc-900 border-r border-zinc-800 flex flex-col flex-shrink-0 h-full overflow-y-auto">
          {/* Logo */}
          <div className="px-5 py-5 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-emerald-800 rounded-full flex items-center justify-center text-base flex-shrink-0">⛳</div>
              <div>
                <div className="text-sm font-black leading-none">SEGL</div>
                <div className="text-xs text-zinc-500 leading-tight">Golf League 2026</div>
              </div>
            </div>
            <div className="mt-2 text-xs flex items-center gap-1">
              {fbError ? <span className="text-red-400">● offline</span> : <span className="text-emerald-500">● live</span>}
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition text-left ${
                  tab === t.id
                    ? "bg-emerald-900/60 text-emerald-300 border border-emerald-800/60"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                }`}>
                <span className="text-base">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Main content — scrollable */}
        <div className="flex-1 overflow-y-auto bg-zinc-950">
          <div className="px-8 py-6 max-w-4xl mx-auto">
            {tab === "dashboard" && <DashboardDesktop setTab={setTab} bookedRounds={bookedRounds} />}
            {tab === "booking"   && <BookingWorkflow checks={checks} setChecks={saveChecks} bookedRounds={bookedRounds} setBookedRounds={saveBookedRounds} />}
            {tab === "results"   && <Results results={roundResults} setResults={saveRoundResults} groupingState={groupingState} payments={payments} />}
            {tab === "payments"  && <Payments payments={payments} setPayments={savePayments} groupingState={groupingState} />}
            {tab === "social"    && <SocialMedia lbData={lbData} saveLbData={saveLbData} />}
            {tab === "groupings" && <Groupings groupingState={groupingState} setGroupingState={saveGroupingState} />}
            {tab === "info"      && <LeagueInfoDesktop />}
          </div>
        </div>
      </div>
    </div>
  );
}
