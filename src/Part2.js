import React, { useState, useEffect, useRef } from "react";
import { C, F, scoreColor, combinedGrade } from "./tokens";
import KPIBar from "./KPIBar";
import { savePart2, lookupPart1, recordVote, getLB } from "./firebase";

// ─── Baseline KPIs ─────────────────────────────────────────────────────────────
const BASELINE = {
  planAdh:  { label: "Plan Adherence",  base: 58, unit: "%", fmt: v => `${Math.round(v)}%`,  goodDir: 1 },
  invDOH:   { label: "Inventory (DoH)", base: 74, unit: "d", fmt: v => `${Math.round(v)}d`,  goodDir: -1 },
  svcLevel: { label: "Service Level",  base: 71, unit: "%", fmt: v => `${Math.round(v)}%`,  goodDir: 1 },
  capUtil:  { label: "Capacity Util.", base: 69, unit: "%", fmt: v => `${Math.round(v)}%`,  goodDir: 1 },
  fcBias:   { label: "Forecast Bias",  base: 18, unit: "%", fmt: v => `${Math.round(v)}%`,  goodDir: -1 },
};

// ─── Scenarios ─────────────────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: "2A", idx: 0,
    domain: "DEMAND & SUPPLY INTEGRATION", domainColor: "#6e3fc4", domainBg: "#f3f0fc",
    title: "The Blue Yonder Go-Live Decision",
    context: "Following Part 1's AI programme, BRRL has selected Blue Yonder Luminate Planning as its APS platform. The implementation is 14 weeks in. The core modules — Demand, Fulfillment & Replenishment, and Production Scheduling — are configured and technically ready. The SI partner is pushing hard for a go-live date confirmed 11 weeks ago.\n\nBut during UAT, the data team surfaced a serious problem. Blue Yonder's ML demand engine calibrates its baseline models on historical transaction data. BRRL's item-location-calendar master data — the foundational layer the models train on — has material quality issues: 23% of SKU-location combinations have incomplete demand history, 11% have duplicate records from a legacy system migration, and the seasonal index calibration has not been validated against BRRL's actual crop cycle timing.\n\nBlue Yonder's implementation methodology explicitly warns that ML model calibration in the first 90 days determines the baseline the system will optimise against for the next 12–18 months. Unlike rule-based APS systems where planners can manually override, Luminate's autonomous recommendations are trained outputs — planners will not see the underlying logic, only the output.",
    situation: "The programme director wants to go live on schedule. The data lead wants an 8-week master data remediation sprint before go-live. The CFO is watching the project budget.",
    question: "Do you go live on schedule, or delay for master data remediation?",
    options: [
      { id: "A", label: "Delay 8 weeks — complete master data remediation first", detail: "Pause go-live. Run a structured 8-week master data sprint: resolve duplicate records, backfill incomplete demand history using statistical interpolation, and validate seasonal indices against three years of actual BRRL crop cycle data. Go live on a clean foundation." },
      { id: "B", label: "Go live on schedule — fix data quality in parallel", detail: "Proceed to go-live on the confirmed date. Stand up a parallel data quality workstream that runs for 12 weeks post-go-live, progressively cleaning records while the system is in production. Accept that the first two planning cycles will have lower model accuracy." },
      { id: "C", label: "Go live with Demand module only — defer Fulfillment and Production Scheduling", detail: "Deploy only the Demand module on schedule. This module has the cleanest data and can go live with acceptable quality. Defer Fulfillment & Replenishment and Production Scheduling until the master data issues are resolved." },
    ],
    outcomes: {
      A: { score: 10, headline: "Eight weeks felt like a setback. It was the programme's best decision.",
        narrative: "The remediation sprint found more problems than the initial audit had identified — including a seasonal index calibrated against calendar quarters rather than BRRL's actual Kharif-Rabi planting windows. Correcting it alone was worth the delay. When Blue Yonder went live on the clean master data, the ML demand models calibrated accurately in the first cycle. Planners received recommendations that were directionally correct from week one — a rarity in APS implementations. The SI partner acknowledged that the data quality work had compressed what would otherwise have been a 6-month stabilisation period into 3 weeks.",
        lesson: "Blue Yonder's Luminate Planning is an ML-native system — its value is proportional to the quality of the data it calibrates on. Unlike rule-based APS tools where planners can manually correct for poor defaults, BY's autonomous recommendations are trained outputs: garbage in, systematically wrong recommendations out, at scale, for the next 18 months.",
        kpi: { planAdh: +19, invDOH: -15, svcLevel: +13, capUtil: +10, fcBias: -9 },
        kpiNote: "Plan adherence improves sharply as Blue Yonder's models calibrate accurately from the first cycle. All KPIs move simultaneously — the signature of a well-calibrated APS go-live." },
      B: { score: 4, headline: "On time. Eighteen months of systematically wrong recommendations.",
        narrative: "Go-live happened on schedule. Senior management celebrated. Then the planning team started receiving Blue Yonder recommendations that conflicted with their experience of the market. The seasonal demand peaks for the Fertilisers segment were consistently mistimed by 3–4 weeks — the duplicate records had created phantom demand patterns the model had learned as real. Planners began overriding recommendations routinely, then stopped looking at them. Within 14 weeks, six of fourteen planners were running parallel Excel processes.",
        lesson: "Going live on a poor data foundation with an ML-native system does not mean you fix the data later — it means the system learns the wrong patterns first and must unlearn them later. Unlearning in a trained model is harder than never learning incorrectly.",
        kpi: { planAdh: +5, invDOH: -4, svcLevel: +2, capUtil: +3, fcBias: -2 },
        kpiNote: "Marginal improvement — far below potential. Planners override the system routinely. The programme is technically live but behaviourally ignored." },
      C: { score: 6, headline: "Demand module worked well. The integration gap was expensive.",
        narrative: "The Demand module went live cleanly — demand planners quickly developed confidence in Blue Yonder's outputs. But deploying Demand without Fulfillment & Replenishment created an architectural gap: improved demand signals fed into an unchanged replenishment process that couldn't consume them. Supply planners continued using the legacy system. The demand forecasts improved — but the supply decisions didn't change.",
        lesson: "APS systems generate value through integration — not through individual modules. Deploying the demand module without the consumption layer is like improving a weather forecast without telling the farmer.",
        kpi: { planAdh: +8, invDOH: -5, svcLevel: +5, capUtil: +4, fcBias: -5 },
        kpiNote: "Forecast accuracy and demand signal quality improve meaningfully. But inventory and service level gains are limited — the improved demand signal doesn't connect to the supply execution layer." },
    },
  },
  {
    id: "2B", idx: 1,
    domain: "INVENTORY & CAPACITY OPTIMISATION", domainColor: "#0071e3", domainBg: "#e8f0fe",
    title: "The Replenishment Logic Question",
    context: "Blue Yonder Luminate Planning is now live with clean master data. The CFO's working capital target is clear: reduce finished goods inventory from 74 days of holding to 48–50 days within two quarters, while maintaining or improving service levels.\n\nBRRL's planning team is debating how to configure Blue Yonder's Fulfillment & Replenishment module. Three approaches are technically available within the platform — and they reflect fundamentally different philosophies about how inventory decisions should be made.\n\nThe current state: a manually-maintained uniform 30-day safety stock buffer applied to every SKU regardless of demand volatility, lead time, or margin. Blue Yonder can do significantly better — the question is which improvement path to take.",
    situation: "The programme steering committee meets tomorrow. You need a recommendation on which replenishment logic to configure as BRRL's primary approach in Blue Yonder.",
    question: "Which replenishment approach should BRRL configure in Blue Yonder?",
    options: [
      { id: "A", label: "Min-Max replenishment with BY-optimised parameters", detail: "Configure Blue Yonder's min-max replenishment module with statistically optimised reorder points and order quantities. BY replaces the manually-set 30-day buffer with analytically derived min and max thresholds per SKU, based on historical demand and lead time data." },
      { id: "B", label: "Probabilistic safety stock — demand-volatility segmented", detail: "Use Blue Yonder's statistical safety stock module to set buffers based on demand variability and desired service level by SKU segment. High volatility, high margin SKUs get larger buffers; stable, commoditised SKUs get lean buffers." },
      { id: "C", label: "Flowcasting — demand-driven replenishment from consumption signals", detail: "Configure Blue Yonder's Flowcasting methodology: instead of setting safety stock targets, the system propagates actual consumption signals backwards through the supply chain in near-real time, generating replenishment orders based on what is selling rather than what is forecast to sell." },
    ],
    outcomes: {
      A: { score: 6, headline: "Better than before. Still a stock-push model.",
        narrative: "BY-optimised min-max replaced 30 days of gut-feel safety stock with analytically derived thresholds — a genuine improvement. Average inventory fell by 14 days. But the fundamental limitation of min-max remained: the system reorders based on stock levels, not actual consumption signals. When demand patterns shifted mid-season — a late monsoon compressed the Kharif demand window — the min-max model continued reordering against its historical parameters. Inventory built up on one SKU family while another ran short.",
        lesson: "Min-max replenishment, however well-optimised, is a stock-push model responding to historical patterns. Blue Yonder's value is not in optimising traditional replenishment logic — it is in replacing it with consumption-signal-driven planning.",
        kpi: { planAdh: +7, invDOH: -14, svcLevel: +3, capUtil: +5, fcBias: -4 },
        kpiNote: "Inventory falls as analytically optimised min-max replaces manual buffers. But the gains plateau quickly — the model is still driven by stock levels rather than demand signals." },
      B: { score: 7, headline: "Analytically correct. Data quality was the binding constraint.",
        narrative: "The probabilistic safety stock approach was theoretically optimal — BY's demand variability analytics correctly identified that Specialty Chemicals had 3–4x the demand volatility of Industrial Minerals. But the implementation revealed a gap: 31% of BRRL's SKU-location combinations had fewer than 8 months of clean demand history — insufficient for reliable volatility estimation. The SKUs with the most unreliable safety stock settings were exactly the ones with the worst demand history.",
        lesson: "Probabilistic safety stock is the right answer when demand volatility data is clean and complete. When it isn't, the statistical engine defaults to parameters that aren't much better than experienced planner judgment.",
        kpi: { planAdh: +9, invDOH: -17, svcLevel: +7, capUtil: +7, fcBias: -6 },
        kpiNote: "Strong improvement where demand history is complete. Limited improvement on new and volatile SKUs where data is insufficient." },
      C: { score: 10, headline: "The safety stock problem disappeared. Because we stopped estimating it.",
        narrative: "Flowcasting changed the question. Instead of 'how much safety stock does this SKU need?', the system asked 'what is actually selling at each stocking location right now, and what does that imply for replenishment upstream?' Blue Yonder propagated consumption signals from BRRL's 12 CFAs back to the production planning layer daily. Within two cycles, planners stopped arguing about safety stock parameters entirely — the question had become irrelevant. Inventory fell to 49 days of holding. Service level improved to 96%.",
        lesson: "The most elegant solution to a safety stock problem is often to stop estimating safety stock. Flowcasting replaces the estimation problem with a signal propagation problem — and signal propagation, with connected data, is a problem Blue Yonder is specifically designed to solve.",
        kpi: { planAdh: +14, invDOH: -24, svcLevel: +14, capUtil: +11, fcBias: -10 },
        kpiNote: "Inventory falls sharply as demand-signal-driven replenishment eliminates structural over-stocking. Service level improves as supply decisions are made against actual consumption." },
    },
  },
  {
    id: "2C", idx: 2,
    domain: "CHANGE & SUSTAINMENT", domainColor: "#1d8348", domainBg: "#eafaf1",
    title: "The Adoption Cliff",
    context: "Blue Yonder has been live for four months. Technically, the deployment is complete. Practically, it is failing. A usage audit found that 6 of BRRL's 14 demand and supply planners have reverted to maintaining parallel Excel models — running Blue Yonder on screen while making actual decisions in spreadsheets.\n\nThe S&OP meeting has devolved: attendance is inconsistent, pre-reads are not circulated, and three of the last five sessions ended without a formal consensus decision.\n\nThe remaining planners describe Blue Yonder's exception management interface as 'overwhelming': the system surfaces an average of 340 exception flags per planning cycle, and planners cannot distinguish high-priority supply risk exceptions from low-priority forecast revision alerts. Everything looks equally urgent. So nothing gets acted on.",
    situation: "The programme steering committee has escalated. The COO wants a recommendation on how to recover adoption before the board review in 10 weeks.",
    question: "What is the right intervention to recover Blue Yonder adoption?",
    options: [
      { id: "A", label: "Mandate usage — remove Excel access, enforce compliance", detail: "Issue a directive removing Excel from planning team workstations. All decisions must be documented in Blue Yonder. Monthly compliance reports go to the COO. Planners who cannot demonstrate system proficiency within 6 weeks receive performance improvement plans." },
      { id: "B", label: "Fix the exception configuration first — reduce noise, then enforce", detail: "Before any compliance action, spend 3 weeks reconfiguring Blue Yonder's exception management rules. Reduce 340 weekly exceptions to a prioritised set of 40–60 genuinely high-impact flags. Separate supply risk exceptions from forecast revision alerts. Only then introduce usage mandates." },
      { id: "C", label: "Rebuild through people — external BY consultant, planner coaching", detail: "Bring in a Blue Yonder-certified external consultant for 8 weeks. Pair them with each planner team for structured coaching sessions. Rebuild process knowledge from the ground up. Reconstruct the planning champion network with two newly identified internal advocates." },
    ],
    outcomes: {
      A: { score: 3, headline: "Compliance achieved. Judgement lost.",
        narrative: "Excel was removed from planning workstations. Within two days, three planners had found workarounds. Two others were making decisions in Blue Yonder by clicking through 340 weekly exceptions mechanically, selecting the default recommendation to meet the compliance metric. Six weeks later, the COO reviewed compliance reports — green across the board. She also reviewed service level: down 4 points. Planners had stopped applying judgment and were rubber-stamping system recommendations to avoid performance reviews.",
        lesson: "Compliance and adoption are not the same thing. Mandating system usage while the system is poorly configured creates mechanical compliance — box-ticking that satisfies a metric while destroying the human judgment the system was designed to augment.",
        kpi: { planAdh: +4, invDOH: -4, svcLevel: -5, capUtil: +2, fcBias: +3 },
        kpiNote: "Plan adherence improves on paper. Service level falls as decision quality degrades. Forecast bias worsens as planners rubber-stamp recommendations uncritically." },
      B: { score: 10, headline: "The system wasn't being ignored. It was badly configured.",
        narrative: "The exception reconfiguration audit took 12 days. Blue Yonder had been configured with default thresholds from the SI partner's standard template — designed for an FMCG manufacturer with weekly demand cycles. BRRL's chemicals business had monthly production cycles that generated constant low-level exception noise. The 340 weekly flags were not 340 problems — they were 12 real problems buried under 328 alerts that no sensible planner should have been expected to action.\n\nWith exception rules reconfigured for BRRL's actual planning cadence, weekly exceptions fell to 47. Excel usage dropped from 6 of 14 to 1 of 14 within three weeks — without any mandate.",
        lesson: "Adoption failures in enterprise software are almost always configuration failures first and people failures second. Before changing the humans, check whether the system is configured for the work they actually do.",
        kpi: { planAdh: +20, invDOH: -17, svcLevel: +16, capUtil: +14, fcBias: -12 },
        kpiNote: "All KPIs improve substantially as genuine system engagement replaces mechanical compliance. Plan adherence reaches 78% — close to best-in-class." },
      C: { score: 6, headline: "Better planners. Same broken configuration.",
        narrative: "The BY consultant was excellent — genuinely expert and effective at rebuilding process knowledge. After 8 weeks, planner confidence was measurably higher and two new internal advocates were identified. But the 340-exception problem was not addressed. The coaching taught planners how to navigate the exception queue more efficiently — how to move through 340 items faster, not how to distinguish the 12 that mattered. The three most experienced planners remained on Excel and said the same thing: 'I'm faster in Excel for anything that matters.' They were right — because the configuration hadn't changed.",
        lesson: "Capability building solves knowledge gaps; it does not solve configuration problems. If the system is wrong for the work, training people to use the wrong system better does not close the gap.",
        kpi: { planAdh: +11, invDOH: -9, svcLevel: +8, capUtil: +8, fcBias: -6 },
        kpiNote: "Meaningful improvement as planner confidence increases. But gains plateau quickly — the exception noise problem limits how much even a confident planner can do with the system." },
    },
  },
];

const VERDICTS = {
  "A+": "Outstanding. You demonstrated Managing Director-level judgement — knowing when to slow down to go faster, which data to trust, and how to make technology work for the people using it.",
  "A":  "Strong performance. You understood the sequencing logic and the human factors that determine whether an APS programme succeeds or becomes shelfware. A few decisions showed room to sharpen the prioritisation instinct under pressure.",
  "B":  "Solid foundations and good instincts. Manager-level decision quality — you identified the right direction in most cases but occasionally defaulted to the technically correct answer over the operationally correct one.",
  "C":  "Consultant-level analytical capability but struggled with the genuinely hard trade-offs — particularly where the right answer was counterintuitive or politically uncomfortable.",
  "D":  "Analyst-level performance. The content and context are there — the decision instinct under uncertainty is still developing. Review the key lessons from each scenario with your team.",
  "E":  "Early-career performance. Every scenario represents a real client situation. Work through each lesson with a senior colleague and these decisions will become clearer with context and experience.",
};

// ─── Screens ────────────────────────────────────────────────────────────────────

function IntroScreen({ onStart }) {
  const [name,    setName]    = useState("");
  const [err,     setErr]     = useState("");
  const [p1,      setP1]      = useState(null);
  const [loading, setLoading] = useState(false);
  const debounceRef           = useRef(null);

  function handleNameChange(val) {
    setName(val); setErr(""); setP1(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) return;
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const score = await lookupPart1(val);
      setP1(score);
      setLoading(false);
    }, 600);
  }

  const go = () => name.trim() ? onStart(name.trim(), p1) : setErr("Please enter your name.");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ maxWidth: 520, width: "100%" }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, letterSpacing: "0.5px", fontFamily: F, marginBottom: 16, textTransform: "uppercase" }}>
          Accenture · Chemicals & Natural Resources · India
        </div>
        <h1 style={{ fontSize: "clamp(32px,6vw,54px)", fontWeight: 700, color: C.t1, fontFamily: F, lineHeight: 1.05, letterSpacing: "-2px", margin: "0 0 14px" }}>
          BRRL APS<br />Transformation
        </h1>
        <div style={{ display: "inline-block", background: C.accentBg, color: C.accent, fontSize: 12, fontWeight: 600, fontFamily: F, borderRadius: 20, padding: "4px 14px", marginBottom: 18 }}>
          Part 2 of 2 — Advanced Planning & Scheduling
        </div>
        <p style={{ fontSize: 15, color: C.t2, fontFamily: F, lineHeight: 1.75, margin: "0 0 14px" }}>
          The AI transformation from Part 1 has stabilised BRRL's commercial and logistics operations. Now the focus shifts inward — to Blue Yonder Luminate Planning, inventory optimisation, and the hardest challenge in any APS programme: making change stick.
        </p>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 18px", marginBottom: 22 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Continuing from Part 1</div>
          <div style={{ fontSize: 13, color: C.t2, fontFamily: F, lineHeight: 1.7 }}>BRRL enters Part 2 with improved forecast accuracy and restored customer confidence. Blue Yonder Luminate Planning has been selected as the APS platform — but planning fragmentation and working capital bloat remain unresolved.</div>
        </div>
        <label style={{ fontSize: 12, fontWeight: 600, color: C.t2, fontFamily: F, display: "block", marginBottom: 8 }}>
          Your name — enter the same name you used in Part 1
        </label>
        <input value={name} onChange={e => handleNameChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && go()}
          placeholder="e.g. Arjun Mehta"
          style={{ width: "100%", background: C.card, border: `1px solid ${err ? C.down : C.border}`, borderRadius: 10, color: C.t1, fontSize: 15, padding: "12px 14px", fontFamily: F, outline: "none", marginBottom: 6 }} />
        {err && <div style={{ fontSize: 12, color: C.down, fontFamily: F, marginBottom: 6 }}>{err}</div>}
        {loading && <div style={{ fontSize: 12, color: C.t3, fontFamily: F, marginBottom: 6 }}>Looking up your Part 1 score…</div>}
        {!loading && p1 !== null && (
          <div style={{ fontSize: 13, color: C.up, fontWeight: 600, fontFamily: F, marginBottom: 6 }}>✓ Part 1 score found: {p1}/30 — will be added to your final total.</div>
        )}
        {!loading && name.trim().length > 2 && p1 === null && (
          <div style={{ fontSize: 12, color: C.t3, fontFamily: F, marginBottom: 6 }}>No Part 1 score found under this name. Your total will reflect Part 2 only.</div>
        )}
        <div style={{ fontSize: 11, color: C.t3, fontFamily: F, marginBottom: 20 }}>3 scenarios · 30 pts · Combined total out of 60</div>
        <button onClick={go}
          style={{ background: C.accent, border: "none", color: "#fff", padding: "13px 32px", fontSize: 14, fontWeight: 600, cursor: "pointer", borderRadius: 50, fontFamily: F }}>
          Begin Part 2 →
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

function OutcomeScreen({ scenario, chosenId, p2Score, combined, isLast, onNext }) {
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
        Option {chosenId} · <span style={{ color: scoreColor(outcome.score), fontWeight: 700 }}>{outcome.score}/10 pts</span>
        {combined !== null && <span> · Running combined: <strong style={{ color: C.t1 }}>{combined}/60</strong></span>}
      </div>
      <p style={{ fontSize: 14, color: C.t2, fontFamily: F, lineHeight: 1.8, margin: "0 0 16px" }}>{outcome.narrative}</p>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", marginBottom: 24 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: F, marginBottom: 6 }}>Key lesson</div>
        <p style={{ fontSize: 13, color: C.t1, fontFamily: F, lineHeight: 1.75, margin: 0, fontStyle: "italic" }}>{outcome.lesson}</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, color: C.t3, fontFamily: F }}>
          Part 2 score: <strong style={{ color: C.t1 }}>{p2Score}/30</strong>
        </div>
        <button onClick={onNext}
          style={{ background: C.accent, border: "none", color: "#fff", padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", borderRadius: 50, fontFamily: F }}>
          {isLast ? "See Final Results →" : "Next Scenario →"}
        </button>
      </div>
    </div>
  );
}

function SummaryScreen({ playerName, decisions, p2Score, p1Score, leaderboard }) {
  const [showLB, setShowLB] = useState(false);
  const combined = p1Score !== null ? p1Score + p2Score : p2Score;
  const grade = combinedGrade(combined);
  const pct = Math.round((combined / (p1Score !== null ? 60 : 30)) * 100);

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "32px 20px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, letterSpacing: "0.5px", fontFamily: F, marginBottom: 14, textTransform: "uppercase" }}>Full Engagement Complete</div>
        <h1 style={{ fontSize: "clamp(24px,4vw,40px)", fontWeight: 700, color: C.t1, fontFamily: F, letterSpacing: "-1.5px", margin: "0 0 6px" }}>Final Performance Report</h1>
        <div style={{ fontSize: 13, color: C.t3, fontFamily: F }}>{playerName} · BRRL Full Engagement</div>
        <div style={{ width: 88, height: 88, borderRadius: "50%", border: `2px solid ${grade.c}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "20px auto", background: C.card }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: grade.c, fontFamily: F, lineHeight: 1 }}>{grade.l}</div>
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: grade.c, fontFamily: F, letterSpacing: "-1px" }}>
          {combined}<span style={{ fontSize: 15, color: C.t3, fontWeight: 400 }}>/{p1Score !== null ? 60 : 30}</span>
        </div>
        <div style={{ fontSize: 12, color: C.t3, fontFamily: F, marginTop: 4 }}>{pct}% · {grade.label}</div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18, flexWrap: "wrap" }}>
          {[["Part 1 — AI Transformation", p1Score, 30], ["Part 2 — APS", p2Score, 30]].map(([lbl, s, mx]) => (
            <div key={lbl} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 18px", minWidth: 130, textAlign: "center" }}>
              <div style={{ fontSize: 9, color: C.t3, fontFamily: F, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>{lbl}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: scoreColor(s || 0), fontFamily: F }}>{s != null ? s : "—"}</div>
              <div style={{ fontSize: 11, color: C.t3, fontFamily: F }}>/ {mx}</div>
            </div>
          ))}
        </div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", maxWidth: 460, margin: "20px auto 0", textAlign: "left" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.accent, fontFamily: F, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Partner Assessment</div>
          <div style={{ fontSize: 13, color: C.t2, fontFamily: F, lineHeight: 1.8 }}>{VERDICTS[grade.l]}</div>
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, fontFamily: F, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 14 }}>Part 2 Decision Log</div>
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
        {showLB ? "▲ Hide Leaderboard" : "▼ Show Final Leaderboard"}
      </button>
      {showLB && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.t3, fontFamily: F, letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 14 }}>Final Leaderboard — All Players</div>
          {leaderboard.length === 0 && <div style={{ fontSize: 13, color: C.t3, fontFamily: F }}>No scores yet.</div>}
          {leaderboard.slice(0, 20).map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < Math.min(leaderboard.length, 20) - 1 ? `1px solid ${C.borderLo}` : "none" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: i === 0 ? "#b8860b" : C.t4, width: 20, fontWeight: 700, fontFamily: F }}>#{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: F, color: e.key === playerName.trim().toLowerCase().replace(/\s+/g, "_") ? C.accent : C.t1 }}>{e.name}</span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: scoreColor((e.total || 0) / 2), fontFamily: F }}>{e.total || 0}</span>
                <span style={{ fontSize: 11, color: C.t3, fontFamily: F }}>/60</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Root ───────────────────────────────────────────────────────────────────────
export default function Part2() {
  const [screen,     setScreen]     = useState("intro");
  const [player,     setPlayer]     = useState("");
  const [p1Score,    setP1]         = useState(null);
  const [scenIdx,    setScenIdx]    = useState(0);
  const [chosenId,   setChosen]     = useState(null);
  const [decisions,  setDecisions]  = useState([]);
  const [p2Score,    setP2]         = useState(0);
  const p2Ref                       = useRef(0);
  const [lb,         setLb]         = useState([]);
  const [cumulative, setCumulative] = useState({ planAdh: 0, invDOH: 0, svcLevel: 0, capUtil: 0, fcBias: 0 });
  const [lastDelta,  setLastDelta]  = useState(null);
  const [impactNote, setImpactNote] = useState(null);
  const [saving,     setSaving]     = useState(false);

  const scenario   = SCENARIOS[scenIdx];
  const showTopbar = screen !== "intro";
  const combined   = p1Score !== null ? p1Score + p2Score : null;

  useEffect(() => { window.scrollTo(0, 0); }, [screen, scenIdx]);

  function handleChoose(optId) {
    const outcome = scenario.outcomes[optId];
    setChosen(optId);
    p2Ref.current += outcome.score;
    setP2(p2Ref.current);
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
    setLastDelta(null); setImpactNote(null);
    if (scenIdx + 1 >= SCENARIOS.length) {
      setSaving(true);
      const board = await savePart2(player, p2Ref.current);
      setLb(board);
      setSaving(false);
      setScreen("summary");
    } else {
      setScenIdx(i => i + 1); setChosen(null); setScreen("scenario");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.t1, fontFamily: F }}>
      {showTopbar && (
        <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(245,245,247,0.9)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 20px", maxWidth: 1200, margin: "0 auto" }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.accent, letterSpacing: "0.5px", fontFamily: F, textTransform: "uppercase" }}>Accenture CNR · India</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, fontFamily: F }}>BRRL Simulation — Part 2</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {(screen === "scenario" || screen === "outcome") && (
                <div style={{ display: "flex", gap: 4 }}>
                  {SCENARIOS.map((_, i) => <div key={i} style={{ width: 20, height: 3, borderRadius: 2, background: i <= scenIdx ? C.accent : C.borderLo, transition: "background 0.3s" }} />)}
                </div>
              )}
              <div style={{ fontSize: 11, color: C.t3, fontFamily: F }}>{player}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.t1, fontFamily: F, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "3px 12px" }}>
                {combined !== null ? <>{combined}<span style={{ color: C.t3, fontWeight: 400 }}>/60</span></> : <>{p2Score}<span style={{ color: C.t3, fontWeight: 400 }}>/30</span></>}
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
      {screen === "intro"    && <IntroScreen onStart={(n, p1) => { setPlayer(n); setP1(p1); setScreen("scenario"); }} />}
      {screen === "scenario" && <ScenarioScreen scenario={scenario} onChoose={handleChoose} />}
      {screen === "outcome"  && <OutcomeScreen scenario={scenario} chosenId={chosenId} p2Score={p2Score} combined={combined} isLast={scenIdx + 1 >= SCENARIOS.length} onNext={handleNext} />}
      {screen === "summary"  && <SummaryScreen playerName={player} decisions={decisions} p2Score={p2Score} p1Score={p1Score} leaderboard={lb} />}
    </div>
  );
}
