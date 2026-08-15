# Project Pitch — AI Cannibalism / Model Collapse Immune System

## 1. The Competition

**All Things Agentic Hackathon** (Google-sponsored, deadline **August 31, 2026, 5:00pm PDT**).

The hackathon has seven prize tracks:

| Track | Focus | Prize |
|---|---|---|
| **The Taskmaster** | Autonomous workflow automation — agents that handle multi-step processes and take real action, not just chat | $20,000 + $2,000 GCP credits |
| The Collaborative Partner | Interactive agents that ask clarifying questions, adapt to feedback, personalize over time | $20,000 + $2,000 GCP credits |
| The Fortified Enterprise Fleet | Scalable networks of institutional agents wired into enterprise infra (registry, runtime, memory bank, security, telemetry) | $20,000 + $2,000 GCP credits |
| Startup Excellence | Incorporated orgs only, corporate email required | $20,000 + $5,000 GCP credits |
| Individual/Hobbyist | Best solo/team build from non-corporate participants (eligibility-based, not idea-based) | $10,000 x2 + $1,000 GCP credits |
| Grand Prize | Open to all entries across all tracks | $50,000 + $5,000 GCP credits |
| Specialty Prizes | Best Architectural Design, Best Multimodal UX, Honorable Mentions | $2,000–$5,000 each |

Every submission — regardless of track — must satisfy these universal technical requirements:
- **Gemini 3.5 or newer** (via Gemini API or Vertex AI)
- At least one **Google Agent Framework**: ADK, GenAI SDK, Antigravity SDK, or GenKit
- At least one **Google Cloud infrastructure service**: Cloud Run, Cloud SQL, Firestore, GKE, or Pub/Sub

Judging is weighted: **Innovation & Operational Utility (40%)**, **Architectural Discipline & Tech Stack (30%)**, **Demo & Production Readiness (30%)**.

## 2. What We Chose

**Track: The Taskmaster.**

## 3. Why We Chose It

The Taskmaster track rewards agents that autonomously execute **multi-step processes and take real action** — not conversational assistants. Our idea is structurally exactly that: a pipeline of agents that generate data, monitor for degradation across generations, and then — without a human in the loop — diagnose the problem, trace its root cause, and repair the downstream agent. There's no "ask the user a clarifying question" step and no enterprise-infra registry/runtime requirement, which rules out the other content-based tracks (Collaborative Partner, Fortified Enterprise Fleet). The work is inherently a chain of autonomous actions ending in a verifiable outcome (reliability recovered or not), which maps directly onto what Taskmaster judges are scoring for.

We may also independently qualify for the **Individual/Hobbyist** track depending on team composition (eligibility, not idea, gates that one) — but Taskmaster is the track our idea is *designed* for.

## 4. What The Taskmaster Track Requires

From the hackathon rules, on top of the universal requirements above:

- **Demonstrated autonomy**: the agent must complete complex, multi-step tasks independently — not simply respond to prompts one at a time.
- **Real action, not just planning**: judges want to see the agent actually do something (generate data, run a detection pass, modify a downstream system), not just describe a plan.
- **Gemini 3.5+** as the underlying model, called via Gemini API or Vertex AI.
- **A Google Agent Framework** (ADK / GenAI SDK / Antigravity SDK / GenKit) — this needs to be picked early since it shapes how we structure the multi-agent orchestration.
- **A Google Cloud infra service** — for us, this is likely Cloud Run (hosting the agent pipeline) and/or Firestore (storing generation history, contamination traces, and recovery metrics) and/or Pub/Sub (passing data between the generation, detection, and repair agents).
- **Submission package**: text description (features/tech/data sources/learnings), public or private repo with spin-up instructions, an architecture diagram, and a ~4 minute demo video that shows the problem, the value proposition, a live run, and visible proof of the backend actually deployed on Google Cloud.
- **Bonus points** (optional): a public blog/video about the project, a social post tagged `#AllThingsAgenticHackathon`, and integrating Gemma, Veo, or Lyria somewhere in the pipeline.

## 5. Our Idea

### The problem: AI Cannibalism / Model Collapse

As more of the web becomes AI-generated, new models increasingly train on the outputs of older models — which trained on even older models before them. Research (Shumailov et al., *Nature*, 2024; corroborated by Stanford/MIT/Harvard SEAS/UMD's *Collapse or Thrive?*, ICLR 2025's *Strong Model Collapse*, and a May 2026 King's College London / NTNU / Abdus Salam ICTP study in *Physical Review Letters*) shows this recursive loop causes **model collapse**: hallucination amplification, loss of output diversity, factual drift, repetitive reasoning, and inflated confidence in wrong answers. A February 2026 Communications of the ACM piece confirmed this is no longer theoretical — it's already visible in production tools today.

Known mitigations exist in the research literature (mixing real data back in at the right ratio, or even injecting a single verified real-world data point per generation), but they're manual, researcher-driven techniques. **Nobody has automated the detect → trace → repair → verify loop into an autonomous agent system.** That's our white space.

### What we're building

A simulated multi-generation pipeline plus an autonomous "immune system" that watches it and fights back:

```
Human data → Agent A → synthetic data → Agent B → synthetic data → Agent C → ...
```

We simulate generations via prompting/RAG (not full model retraining — infeasible in a hackathon timeframe) so each "generation" is a distinct agent producing outputs conditioned only on the prior generation's synthetic corpus.

A **Taskmaster orchestrator agent** continuously monitors every generation for:
- Hallucination amplification
- Loss of diversity
- Factual drift
- Repetitive reasoning
- Confidence inflation
- Overall model collapse signal (composite score)

When it detects degradation (e.g., generation 3 becoming unreliable), it autonomously:
1. **Identifies** the contaminated synthetic data
2. **Traces** where it originated (which generation, which samples)
3. **Retrieves** high-quality human/real-world evidence to replace it
4. **Removes** the bad samples
5. **Reconfigures/re-grounds** the downstream agent on the cleaned data
6. **Tests** whether reliability actually recovered, and reports the before/after

### Positioning (the "AI fixing AI" question, answered head-on)

We are not claiming to solve model collapse from scratch — the underlying mitigation (real-data grounding) is already published research. Our contribution is **automating a known manual research technique into a closed-loop autonomous agent system**. The detection/repair agents act as auditors and critics, not generators — the same way a spam filter (ML) can catch spam (often ML-generated) without becoming a spammer. That distinction is the thesis of the project, not a contradiction to hide from.

### Why this fits Taskmaster specifically

The entire value of the demo is watching the system take independent, sequential, consequential action — detect a real problem, decide on a fix, execute it, and prove the fix worked — with no human clicking "approve" at each step. That is the operational-utility judges are scoring for at 40% weight.
