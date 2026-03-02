import React, { useState, useEffect, useRef } from "react";
import { C, F, scoreColor, part1Grade } from "./tokens";
import KPIBar from "./KPIBar";
import { savePart1, recordVote, getLB } from "./firebase";

// ─── Baseline KPIs ─────────────────────────────────────────────────────────────
const BASELINE = {
  oee:        { label: "OEE (Dahej)",       base: 61,   unit: "%",  fmt: v => `${Math.round(v)}%`,  goodDir: 1 },
  forecastAcc:{ label: "Forecast Accuracy", base: 54,   unit: "%",  fmt: v => `${Math.round(v)}%`,  goodDir: 1 },
  marginPct:  { label: "EBITDA Margin",     base: 12.4, unit: "%",  fmt: v => `${v.toFixed(1)}%`,   goodDir: 1 },
  otif:       { label: "OTIF",              base: 67,   unit: "%",  fmt: v => `${Math.round(v)}%`,  goodDir: 1 },
  revenue:    { label: "Revenue Impact",    base: 0,    unit: "Cr", fmt: v => v === 0 ? "Baseline" : `${v > 0 ? "+" : ""}₹${v} Cr`, goodDir: 1 },
};

// ─── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: "1A", idx: 0,
    domain: "MANUFACTURING", domainColor: "#6e3fc4", domainBg: "#f3f0fc",
    title: "The Maintenance Model Governance Question",
    context: "BRRL's Dahej specialty chemicals plant now has a working Predictive Maintenance model — the result of a 90-day pilot that successfully flagged two near-miss failures. The model is technically sound. The problem is what happens next.\n\nThe CTO's team wants to own the model permanently: they will interpret all alerts, decide what constitutes a genuine anomaly, and issue work orders to the maintenance team. Their argument is quality control — operators, they say, will dismiss alerts that are inconvenient and the model will degrade through neglect.\n\nThe maintenance head sees it differently. His team lives with these machines. They know what a reactor sounds like when something is wrong. Ceding alert interpretation to a data science team that has never been on a plant floor, he argues, is how you build a system that nobody trusts.",
    situation: "You are in the room when both heads present their cases to the Plant Director. A third option — a joint ownership model — has been tabled as a compromise. You have been asked for your recommendation.",
    question: "Who should own the PdM model's operational outputs?",
    options: [
      { id: "A", label: "CTO's data science team owns all alert decisions", detail: "Data scientists interpret every anomaly flag, control the model parameters, and issue work orders to maintenance. Operators act on instructions. Quality control is centralised and alert logic remains consistent. Maintenance team has no override authority." },
      { id: "B", label: "Joint committee reviews every alert together", detail: "A standing committee of two data scientists and two senior operators reviews each alert flag before any action is taken. Decisions are documented and feed back into model training. Both teams share accountability for outcomes." },
      { id: "C", label: "Maintenance team owns outputs, data science advises", detail: "The maintenance head's team interprets all alerts and decides on response. Data science owns model quality, retraining, and drift monitoring — but has no operational authority. Operators are trained on how the model works and what its confidence intervals mean." },
    ],
    outcomes: {
      A: { score: 5, headline: "High precision. Catastrophic when the model was wrong.",
        narrative: "For 14 weeks, the arrangement worked. Data scientists caught three genuine anomalies that operators had missed. Then, in week 17, the model flagged a reactor heat exchanger as low-risk on a Friday evening. The on-call data scientist, not familiar with that unit's historical quirks, marked it 'monitor only.' The maintenance team, no longer empowered to override, followed protocol. The exchanger failed catastrophically on Saturday morning — a ₹28 Cr shutdown. The post-incident review found that two operators had felt uneasy but assumed the model knew better. You had accidentally built a system where nobody felt responsible.",
        lesson: "Centralising AI decision authority without operational domain knowledge creates a dangerous gap. When the model is wrong — and it will be wrong — nobody with contextual expertise is empowered to catch it.",
        kpi: { oee: -2, forecastAcc: 0, marginPct: -0.5, otif: -2, revenue: -80 },
        kpiNote: "OEE initially improves as the model catches some real failures — then drops sharply after the exchanger incident. Margin deteriorates with the emergency shutdown cost." },
      B: { score: 7, headline: "Responsible. But operationally too slow.",
        narrative: "The joint committee worked well for the first two months. Documentation was thorough, cross-functional trust improved, and two ambiguous cases were correctly escalated. But the committee met twice weekly — and anomaly flags don't follow a meeting cadence. Three genuine alerts sat unactioned for 36–72 hours while committee members were unavailable. One resulted in a minor incident. More critically, the process created the illusion of shared ownership without the reality: when pressed, both teams privately felt the other was the real decision-maker.",
        lesson: "Committees work for policy; they fail for operational decisions that require speed and clear ownership. Shared accountability at the design level often becomes nobody's accountability at the execution level.",
        kpi: { oee: +3, forecastAcc: 0, marginPct: +0.4, otif: +2, revenue: +60 },
        kpiNote: "Moderate OEE improvement as the committee catches most real anomalies — but not all, and not fast enough. Revenue uplift is limited." },
      C: { score: 10, headline: "Trust built. Model improved. Shop floor became the engine.",
        narrative: "The maintenance team's initial scepticism evaporated within three weeks of owning the outputs. When operators discovered they could override an alert — and were asked to document why — they engaged with the model seriously for the first time. Their overrides became the most valuable training data the model had ever received: annotated by people who understood the machines. Within four months, the maintenance head was running weekly sessions where operators reviewed the model's recent predictions against actual outcomes. Alert fatigue dropped to near zero. The CTO admitted, privately, that operator-owned interpretation had produced a better model than centralised ownership would have.",
        lesson: "Operational AI earns authority by being useful to the people closest to the problem. Giving domain experts ownership — with accountability, not just involvement — creates the feedback loop that makes models better over time.",
        kpi: { oee: +8, forecastAcc: 0, marginPct: +1.2, otif: +4, revenue: +180 },
        kpiNote: "OEE improves substantially as operator trust drives genuine engagement with model outputs. Alert fatigue near zero. Margin improves as emergency shutdowns fall." },
    },
  },
  {
    id: "1B", idx: 1,
    domain: "SALES & MARKETING", domainColor: "#0071e3", domainBg: "#e8f0fe",
    title: "The Data Foundation Decision",
    context: "BRRL's Fertilisers & Agrochemicals division has allocated ₹22 Cr for an AI-driven demand intelligence platform. The diagnostic is clear: regional managers are overriding statistical forecasts with gut feel, forecast accuracy sits at 54%, and BRRL is systematically under-pricing during demand peaks while over-stocking in district clusters that plateau early in the Kharif season.\n\nThree data assets are available to anchor the platform. The CMO's team has strong views on all three. Your job is to recommend which one becomes the foundational layer — because the platform can only be built coherently on one primary signal.",
    situation: "The CMO wants to move in four weeks. The Head of Data Science says the foundation choice will determine whether this platform is still useful in three years or has been quietly abandoned. You have been asked to break the impasse.",
    question: "Which data asset should anchor BRRL's demand intelligence platform?",
    options: [
      { id: "A", label: "BRRL's own dealer transaction history", detail: "14 months of SKU-level sell-out data from 28,000 dealers across 340 districts — messy, inconsistently formatted, and incomplete in 18% of districts. But it captures BRRL's actual demand patterns at the district level: what sold, when, to whom, and at what price. Proprietary and not available to any competitor." },
      { id: "B", label: "Satellite crop health and NDVI indices", detail: "Third-party satellite data tracking Normalised Difference Vegetation Index across BRRL's key geographies. Correlates strongly with fertiliser demand 6–8 weeks forward. Clean, structured, and already used by PI Industries and Coromandel. Available to any player willing to pay the data subscription." },
      { id: "C", label: "Competitor repricing signals via distributor network", detail: "Real-time price intelligence gathered from BRRL's distributor network — when PI or Coromandel reprice in a district, the signal reaches BRRL within 48 hours. Actionable immediately. But the intelligence depends on distributor loyalty, and competitors can detect when BRRL is responding to their moves." },
    ],
    outcomes: {
      A: { score: 10, headline: "Messy data. Permanent edge.",
        narrative: "Data cleaning took 11 weeks — longer than anyone wanted. But the output was unlike anything BRRL had built before: a district-level demand model trained entirely on BRRL's own customer behaviour. When the first crop season ran through the model, regional managers were confronted with predictions that contradicted their gut feel — and that turned out to be right. Forecast accuracy moved from 54% to 77%. Because the underlying data was proprietary, no competitor could replicate the model even if they knew it existed.",
        lesson: "The data asset that is hardest to clean is often the most valuable to own — because the cleaning investment is a moat. Proprietary behavioural data compounds in value as the model trains on more seasons.",
        kpi: { oee: 0, forecastAcc: +23, marginPct: +1.6, otif: +9, revenue: +210 },
        kpiNote: "Forecast accuracy jumps substantially. OTIF improves as supply decisions are made against a credible demand signal for the first time. Margin recovery follows." },
      B: { score: 6, headline: "A good signal. A shared one.",
        narrative: "The NDVI-anchored model was genuinely predictive — correlation with actual fertiliser demand ran at 0.71 across the test period. But two problems emerged. First, the 6–8 week lead time was insufficient for BRRL's production scheduling constraints. Second: when BRRL's commercial performance improved in Vidarbha, PI Industries improved in the same geographies in the same season. They were using the same satellite data.",
        lesson: "Shared data creates shared insights. A platform anchored on third-party signals can improve your decisions but cannot create competitive advantage — because every competitor who buys the same data feed reaches the same conclusions.",
        kpi: { oee: 0, forecastAcc: +12, marginPct: +0.7, otif: +4, revenue: +90 },
        kpiNote: "Forecast accuracy improves meaningfully but not transformatively. Margin gains are real but modest and not durable against competitors using the same data." },
      C: { score: 3, headline: "Fast intelligence. Fragile architecture.",
        narrative: "The competitor signal system worked brilliantly for the first two crop seasons. Then three things happened simultaneously: PI Industries changed its repricing patterns — apparently detecting BRRL's response cadence. One major distributor was found to be selling BRRL's response signals to a competitor broker. And BRRL's own sales team began gaming the system. The intelligence network had been compromised from three directions in under 18 months.",
        lesson: "Competitive intelligence built on third-party loyalty is not a data asset — it is a borrowed one. Its value decays as adversaries learn your response patterns.",
        kpi: { oee: 0, forecastAcc: +4, marginPct: +0.3, otif: -2, revenue: +30 },
        kpiNote: "Short-term margin gains from faster repricing. No improvement in underlying forecast accuracy. OTIF deteriorates as allocation gaming distorts production planning." },
    },
  },
  {
    id: "1C", idx: 2,
    domain: "LOGISTICS", domainColor: "#c2410c", domainBg: "#fff1ec",
    title: "The Capacity Triage Problem",
    context: "BRRL's Industrial Minerals segment is in active crisis. OTIF has fallen to 67% against a 92% contractual expectation. Three customers — Ramco Cements (₹140 Cr), UltraTech Minerals (₹120 Cr), and Saint-Gobain India (₹120 Cr) — have all issued formal service improvement notices within the same fortnight. Ramco has begun dual-sourcing.\n\nThe structural problem is well understood: 80+ fragmented transporters, 12 CFAs operating independently, and a scheduling process that assigns loads regardless of customer risk. The immediate problem is more urgent: BRRL has enough reliable transport capacity to serve approximately 60% of its contracted volumes at the 92% OTIF standard. Something has to give.",
    situation: "The Supply Chain Director needs a recommendation on how to allocate scarce reliable capacity before the week's loads are confirmed.",
    question: "How do you allocate BRRL's scarce reliable transport capacity this week?",
    options: [
      { id: "A", label: "Revenue-weighted — prioritise by account size", detail: "Rank all active shipments by customer revenue. Assign the reliable fleet to the top revenue accounts first. BRRL's largest accounts receive the best service; smaller customers absorb the OTIF failures. Clear, objective, defensible to the CFO." },
      { id: "B", label: "Risk-weighted — triage by defection probability", detail: "Identify the accounts most likely to churn in the next 30 days — those with formal notices, those actively dual-sourcing, those with imminent contract renewals. Allocate the reliable fleet specifically to prevent the most probable defections." },
      { id: "C", label: "Commit reduction — reset all volumes to what you can actually deliver", detail: "Call every customer this week. Proactively reduce committed volumes to what the current network can reliably deliver at 92% OTIF. Over-deliver against the lower commitment. Customers experience consistent reliability at lower volume." },
    ],
    outcomes: {
      A: { score: 5, headline: "The CFO approved. Ramco left anyway.",
        narrative: "Revenue-weighting was analytically clean. BRRL's three largest accounts received exceptional service that week. But Ramco Cements, which ranked fourth by revenue, continued receiving standard allocation. They experienced two more OTIF failures in the following week. On day 9, their procurement director signed the dual-sourcing agreement. Ramco's departure was entirely predictable: they had the lowest switching cost of any at-risk customer because they had already done the qualification work on the alternative supplier.",
        lesson: "In a retention crisis, the relevant variable is not revenue — it is switching cost and defection probability. A smaller account that is about to leave is more urgent than a larger account that is not.",
        kpi: { oee: 0, forecastAcc: 0, marginPct: -0.8, otif: +4, revenue: -140 },
        kpiNote: "OTIF improves for top revenue accounts. But Ramco's ₹140 Cr is already lost. Revenue falls, and margin deteriorates as fixed logistics costs spread over a smaller base." },
      B: { score: 10, headline: "Unglamorous prioritisation. No defections.",
        narrative: "Risk-weighting meant that Ramco Cements — fourth by revenue — received priority allocation. Their shipments ran at 94% OTIF for three consecutive weeks. On day 12, their procurement director paused the dual-sourcing process. He said: 'Something changed this week. I don't know what you did, but keep doing it.' All three formal service notices were formally withdrawn within 30 days.",
        lesson: "Retention crises require forward-looking triage, not backward-looking prioritisation. The accounts most likely to churn are not always the largest ones.",
        kpi: { oee: 0, forecastAcc: 0, marginPct: +1.1, otif: +14, revenue: +380 },
        kpiNote: "OTIF improvement concentrated on the accounts that matter most. All three formal notices withdrawn. All ₹380 Cr revenue retained." },
      C: { score: 4, headline: "Honest. But customers heard 'we cannot serve you.'",
        narrative: "The commitment reduction calls were made professionally. Two of the three at-risk customers appreciated the honesty. But Ramco Cements' response was immediate and final: 'If you can't deliver our contracted volumes, we will find someone who can.' They activated the dual-sourcing agreement the following day. The other two customers accepted revised commitments — but both simultaneously began alternative supplier qualification.",
        lesson: "Proactive honesty about a service failure can preserve relationships — but not when the customer's alternative is readily available and the commitment reduction signals a structural problem rather than a temporary constraint.",
        kpi: { oee: 0, forecastAcc: 0, marginPct: -0.5, otif: +6, revenue: -140 },
        kpiNote: "OTIF improves modestly. But Ramco's ₹140 Cr is lost immediately. The other two accounts are retained but destabilised." },
    },
  },
];

// ─── Screens ────────────────────────────────────────────────────────────────────

function IntroScreen({ onStart }) {
  const [name, setName] = useState("");
  const [err, setErr]   = useState("");
  const go = () => name.trim() ? onStart(name.trim()) : setErr("Please enter your name.");
  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ maxWidth: 520, width: "100%" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, letterSpacing: "0.5px", fontFamily: F, marginBottom: 16, textTransform: "uppercase" }}>
          Accenture · Chemicals & Natural Resources · India
        </div>
        <h1 style={{ fontSize: "clamp(32px,6vw,54px)", fontWeight: 700, color: C.t1, fontFamily: F, lineHeight: 1.05, letterSpacing: "-2px", margin: "0 0 14px" }}>
          BRRL Digital<br />Transformation
        </h1>
        <div style={{ display: "inline-block", background: C.accentBg, color: C.accent, fontSize: 12, fontWeight: 600, fontFamily: F, borderRadius: 20, padding: "4px 14px", marginBottom: 18 }}>
          Part 1 of 2 — AI-Enabled Transformation
        </div>
        <p style={{ fontSize: 15, color: C.t2, fontFamily: F, lineHeight: 1.75, margin: "0 0 24px" }}>
          You are an Accenture consultant advising <strong style={{ color: C.t1 }}>Bharat Rasayan & Resources Ltd.</strong> — a ₹9,200 Cr diversified Indian chemicals conglomerate. Three high-stakes decisions await across Manufacturing, Sales & Marketing, and Logistics.
        </p>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 24 }}>
          {[["Founded","1984"],["HQ","Vadodara, Gujarat"],["Revenue (FY24)","₹9,200 Cr"],["Employees","11,400"],["Segments","Specialty Chemicals · Fertilisers · Industrial Minerals"]].map(([k,v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.borderLo}`, fontFamily: F }}>
              <span style={{ fontSize: 13, color: C.t3 }}>{k}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.t1 }}>{v}</span>
            </div>
          ))}
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: C.t2, fontFamily: F, display: "block", marginBottom: 8 }}>
          Your name — for the shared leaderboard
        </label>
        <input value={name} onChange={e => { setName(e.target.value); setErr(""); }}
          onKeyDown={e => e.key === "Enter" && go()}
          placeholder="e.g. Arjun Mehta"
          style={{ width: "100%", background: C.card, border: `1px solid ${err ? C.down : C.border}`, borderRadius: 10, color: C.t1, fontSize: 15, padding: "12px 14px", fontFamily: F, outline: "none", marginBottom: 6 }} />
        {err && <div style={{ fontSize: 12, color: C.down, fontFamily: F, marginBottom: 8 }}>{err}</div>}
        <div style={{ fontSize: 11, color: C.t3, fontFamily: F, marginBottom: 20 }}>3 scenarios · 30 pts max · Score carries into Part 2</div>
        <button onClick={go}
          style={{ background: C.accent, border: "none", color: "#fff", padding: "13px 32px", fontSize: 14, fontWeight: 600, cursor: "pointer", borderRadius: 50, fontFamily: F }}>
          Begin Engagement →
        </button>
      </div>
    </div>
  );
}

function ScenarioScreen({ scenario, onChoose }) {
  const [hov, setHov] = useState(null);
  const dc = scenario.domainColor;
  const db = scenario.domainBg;
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: dc, letterSpacing: "0.5px", border: `1px solid ${dc}33`, borderRadius: 20, padding: "4px 12px", background: db }}>{scenario.domain}</span>
        <span style={{ fontSize: 11, color: C.t3, fontFamily: F }}>Scenario {scenario.idx + 1} of 3</span>
      </div>
      <h2 style={{ fontSize: "clamp(22px,4vw,36px)", fontWeight: 700, color: C.t1, fontFamily: F, letterSpacing: "-1px", lineHeight: 1.15, margin: "0 0 16px" }}>{scenario.title}</h2>
      {scenario.context.split("\n\n").map((p, i) => (
        <p key={i} style={{ fontSize: 14, color: C.t2, fontFamily: F, lineHeight: 1.8, margin: "0 0 12px" }}>{p}</p>
      ))}
      <div style={{ background: db, border: `1px solid ${dc}33`, borderRadius: 12, padding: "12px 16px", margin: "20px 0" }}>
        <p style={{ fontSize: 14, color: C.t1, fontFamily: F, lineHeight: 1.7, margin: 0 }}>
          <strong style={{ color: dc }}>Your call: </strong>{scenario.question}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {scenario.options.map((opt, i) => (
          <button key={opt.id} onClick={() => onChoose(opt.id)}
            onMouseEnter={() => setHov(opt.id)} onMouseLeave={() => setHov(null)}
            style={{ display: "flex", gap: 14, alignItems: "flex-start", background: hov === opt.id ? db : C.card,
              border: `1px solid ${hov === opt.id ? dc + "55" : C.borderLo}`, borderRadius: 14,
              padding: "16px 18px", cursor: "pointer", textAlign: "left", transition: "all 0.15s",
              animation: `fadeUp 0.35s ${i * 0.07}s both` }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: db,
              border: `1px solid ${dc}33`, display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: dc, marginTop: 1 }}>{opt.id}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.t1, fontFamily: F, marginBottom: 4 }}>{opt.label}</div>
              <div style={{ fontSize: 13, color: C.t2, fontFamily: F, lineHeight: 1.7 }}>{opt.detail}</div>
            </div>
          </button>
        ))}
      </div>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }`}</style>
    </div>
  );
}

function OutcomeScreen({ scenario, chosenId, totalSoFar, isLast, onNext }) {
  const outcome = scenario.outcomes[chosenId];
  const dc = scenario.domainColor;
  const db = scenario.domainBg;
  const isCorrect = outcome.score >= 9;
  const isPartial = outcome.score >= 6 && outcome.score < 9;
  const statusColor = isCorrect ? C.up : isPartial ? C.warn : C.down;
  const statusBg    = isCorrect ? C.upBg : isPartial ? C.warnBg : C.downBg;
  const statusLabel = isCorrect ? "Strong call" : isPartial ? "Reasonable — but there was a better path" : "Costly mistake";
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 20px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: dc, border: `1px solid ${dc}33`, borderRadius: 20, padding: "4px 12px", background: db, letterSpacing: "0.5px" }}>{scenario.domain}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: statusColor, background: statusBg, borderRadius: 20, padding: "3px 12px", border: `1px solid ${statusColor}33` }}>{statusLabel}</span>
      </div>
      <h2 style={{ fontSize: "clamp(20px,3.5vw,32px)", fontWeight: 700, color: C.t1, fontFamily: F, letterSpacing: "-0.8px", margin: "0 0 6px" }}>{outcome.headline}</h2>
      <div style={{ fontSize: 12, color: C.t3, fontFamily: F, marginBottom: 20 }}>
        Option {chosenId} — {scenario.options.find(o => o.id === chosenId)?.label} · <span style={{ color: scoreColor(outcome.score), fontWeight: 700 }}>{outcome.score}/10 pts</span>
      </div>
      <p style={{ fontSize: 14, color: C.t2, fontFamily: F, lineHeight: 1.8, margin: "0 0 16px" }}>{outcome.narrative}</p>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: F, marginBottom: 6 }}>Key lesson</div>
        <p style={{ fontSize: 13, color: C.t1, fontFamily: F, lineHeight: 1.75, margin: 0, fontStyle: "italic" }}>{outcome.lesson}</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, color: C.t3, fontFamily: F }}>
          Running total: <strong style={{ color: C.t1 }}>{totalSoFar}/30</strong>
        </div>
        <button onClick={onNext}
          style={{ background: C.accent, border: "none", color: "#fff", padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", borderRadius: 50, fontFamily: F }}>
          {isLast ? "See Results →" : "Next Scenario →"}
        </button>
      </div>
    </div>
  );
}

function SummaryScreen({ playerName, decisions, totalScore, leaderboard }) {
  const [showLB, setShowLB] = useState(false);
  const grade = part1Grade(totalScore);
  const pct = Math.round((totalScore / 30) * 100);
  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, letterSpacing: "0.5px", fontFamily: F, marginBottom: 14, textTransform: "uppercase" }}>Part 1 Complete</div>
        <h1 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 700, color: C.t1, fontFamily: F, letterSpacing: "-1.5px", margin: "0 0 6px" }}>Performance Report</h1>
        <div style={{ fontSize: 13, color: C.t3, fontFamily: F }}>{playerName} · BRRL AI Transformation</div>
        <div style={{ width: 88, height: 88, borderRadius: "50%", border: `2px solid ${grade.c}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "20px auto", background: C.card }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: grade.c, fontFamily: F, lineHeight: 1 }}>{grade.l}</div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: grade.c, fontFamily: F, letterSpacing: "-1px" }}>
          {totalScore}<span style={{ fontSize: 15, color: C.t3, fontWeight: 400 }}> / 30</span>
        </div>
        <div style={{ fontSize: 12, color: C.t3, fontFamily: F, marginTop: 4 }}>{pct}% · {grade.label}</div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 18px", maxWidth: 380, margin: "20px auto 0", textAlign: "left" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, fontFamily: F, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 6 }}>Part 2 carry-over</div>
          <div style={{ fontSize: 13, color: C.t2, fontFamily: F, lineHeight: 1.7 }}>
            Your <strong style={{ color: C.t1 }}>{totalScore} pts</strong> are saved to the shared leaderboard and will carry into Part 2 automatically when you enter the same name.
          </div>
        </div>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, fontFamily: F, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 14 }}>Decision Log</div>
        {decisions.map((d, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < decisions.length - 1 ? `1px solid ${C.borderLo}` : "none" }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: d.domainColor, fontFamily: F, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.5px" }}>{d.domain}</div>
              <div style={{ fontSize: 13, color: C.t1, fontWeight: 600, fontFamily: F }}>{d.scenario}</div>
              <div style={{ fontSize: 11, color: C.t3, fontFamily: F }}>Option {d.choice} — {d.label}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: scoreColor(d.score), fontFamily: F }}>{d.score}</span>
              <span style={{ fontSize: 11, color: C.t3, fontFamily: F }}>/10</span>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setShowLB(v => !v)}
        style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, color: C.t2, padding: "12px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 12, fontFamily: F, marginBottom: 10 }}>
        {showLB ? "▲ Hide Leaderboard" : "▼ Show Leaderboard"}
      </button>
      {showLB && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, fontFamily: F, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 14 }}>Leaderboard — All Players</div>
          {leaderboard.length === 0 && <div style={{ fontSize: 13, color: C.t3, fontFamily: F }}>No scores yet.</div>}
          {leaderboard.slice(0, 15).map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < Math.min(leaderboard.length, 15) - 1 ? `1px solid ${C.borderLo}` : "none" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: i === 0 ? "#b8860b" : C.t4, width: 20, fontWeight: 700, fontFamily: F }}>#{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: F, color: e.key === playerName.trim().toLowerCase().replace(/\s+/g,"_") ? C.accent : C.t1 }}>{e.name}</span>
              </div>
              <div>
                <span style={{ fontSize: 18, fontWeight: 700, color: scoreColor(e.part1 || 0), fontFamily: F }}>{e.part1 || 0}</span>
                <span style={{ fontSize: 11, color: C.t3, fontFamily: F }}>/30</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root ───────────────────────────────────────────────────────────────────────
export default function Part1() {
  const [screen,     setScreen]     = useState("intro");
  const [player,     setPlayer]     = useState("");
  const [scenIdx,    setScenIdx]    = useState(0);
  const [chosenId,   setChosen]     = useState(null);
  const [decisions,  setDecisions]  = useState([]);
  const [total,      setTotal]      = useState(0);
  const scoreRef                    = useRef(0);
  const [lb,         setLb]         = useState([]);
  const [cumulative, setCumulative] = useState({ oee: 0, forecastAcc: 0, marginPct: 0, otif: 0, revenue: 0 });
  const [lastDelta,  setLastDelta]  = useState(null);
  const [impactNote, setImpactNote] = useState(null);
  const [saving,     setSaving]     = useState(false);

  const scenario   = SCENARIOS[scenIdx];
  const showTopbar = screen !== "intro";

  useEffect(() => { window.scrollTo(0, 0); }, [screen, scenIdx]);

  function handleChoose(optId) {
    const outcome = scenario.outcomes[optId];
    setChosen(optId);
    scoreRef.current += outcome.score;
    setTotal(scoreRef.current);
    setCumulative(prev => {
      const next = {};
      Object.keys(prev).forEach(k => next[k] = (prev[k] || 0) + (outcome.kpi[k] || 0));
      return next;
    });
    setLastDelta(outcome.kpi);
    setImpactNote(outcome.kpiNote);
    setDecisions(d => [...d, { domain: scenario.domain, domainColor: scenario.domainColor, scenario: scenario.title, choice: optId, label: scenario.options.find(o => o.id === optId)?.label, score: outcome.score }]);
    recordVote(scenario.id, player, optId);
    setScreen("outcome");
  }

  async function handleNext() {
    setLastDelta(null);
    setImpactNote(null);
    if (scenIdx + 1 >= SCENARIOS.length) {
      setSaving(true);
      const board = await savePart1(player, scoreRef.current);
      setLb(board);
      setSaving(false);
      setScreen("summary");
    } else {
      setScenIdx(i => i + 1);
      setChosen(null);
      setScreen("scenario");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.t1, fontFamily: F }}>
      {showTopbar && (
        <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(245,245,247,0.9)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 20px", maxWidth: 1200, margin: "0 auto" }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, letterSpacing: "0.5px", fontFamily: F, textTransform: "uppercase" }}>Accenture CNR · India</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, fontFamily: F }}>BRRL Simulation — Part 1</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {(screen === "scenario" || screen === "outcome") && (
                <div style={{ display: "flex", gap: 4 }}>
                  {SCENARIOS.map((_, i) => <div key={i} style={{ width: 20, height: 3, borderRadius: 2, background: i <= scenIdx ? C.accent : C.borderLo, transition: "background 0.3s" }} />)}
                </div>
              )}
              <div style={{ fontSize: 11, color: C.t3, fontFamily: F }}>{player}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, fontFamily: F, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "3px 12px" }}>
                {total}<span style={{ color: C.t3, fontWeight: 400 }}>/30</span>
              </div>
            </div>
          </div>
          {(screen === "scenario" || screen === "outcome") && (
            <KPIBar baseline={BASELINE} cumulative={cumulative} lastDelta={lastDelta} impactNote={impactNote} />
          )}
        </div>
      )}
      {saving && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(245,245,247,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, fontFamily: F }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.t1, marginBottom: 8 }}>Saving your score…</div>
            <div style={{ fontSize: 13, color: C.t3 }}>Updating the shared leaderboard</div>
          </div>
        </div>
      )}
      {screen === "intro"    && <IntroScreen onStart={n => { setPlayer(n); setScreen("scenario"); }} />}
      {screen === "scenario" && <ScenarioScreen scenario={scenario} onChoose={handleChoose} />}
      {screen === "outcome"  && <OutcomeScreen scenario={scenario} chosenId={chosenId} totalSoFar={total} isLast={scenIdx + 1 >= SCENARIOS.length} onNext={handleNext} />}
      {screen === "summary"  && <SummaryScreen playerName={player} decisions={decisions} totalScore={total} leaderboard={lb} />}
    </div>
  );
}
