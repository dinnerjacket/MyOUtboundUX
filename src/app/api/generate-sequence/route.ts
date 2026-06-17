import { NextRequest, NextResponse } from "next/server";

interface Persona {
  firstName: string;
  lastName: string;
  title: string;
  company: string;
  industry: string;
  companySize: string;
  challenge: string;
}

interface KnowledgeBase {
  sections: Record<string, string>;
  urls: string[];
}

export async function POST(req: NextRequest) {
  try {
    const { persona, knowledge } = (await req.json()) as {
      persona: Persona;
      knowledge: KnowledgeBase;
    };

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      // Fallback: generate template sequences without API
      return NextResponse.json(generateFallbackSequence(persona, knowledge));
    }

    const systemPrompt = buildSystemPrompt(knowledge);
    const userPrompt = buildUserPrompt(persona);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Claude API error:", err);
      return NextResponse.json(generateFallbackSequence(persona, knowledge));
    }

    const data = await response.json();
    const text = data.content
      ?.map((block: { type: string; text?: string }) =>
        block.type === "text" ? block.text : ""
      )
      .join("");

    // Parse the JSON response
    const cleaned = text.replace(/```json|```/g, "").trim();
    const sequence = JSON.parse(cleaned);
    return NextResponse.json(sequence);
  } catch (error) {
    console.error("Sequence generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate sequence" },
      { status: 500 }
    );
  }
}

function buildSystemPrompt(knowledge: KnowledgeBase): string {
  return `You are an elite B2B outbound email copywriter specializing in healthcare technology sales. You write sequences that get replies from busy clinicians and healthcare administrators.

PRODUCT KNOWLEDGE:
${Object.entries(knowledge.sections)
  .map(([key, value]) => `## ${key.toUpperCase()}\n${value}`)
  .join("\n\n")}

REFERENCE URLS: ${knowledge.urls?.filter((u) => u.trim()).join(", ") || "None"}

RULES:
- Write like a thoughtful human, not a marketing bot
- Lead with the prospect's problems, not your features
- Each email should have a different angle — never repeat the same pitch
- Keep emails scannable: short paragraphs, no walls of text
- Subject lines should create curiosity or reference something specific to their role
- CTAs should feel low-commitment and natural
- Never use "I hope this email finds you well" or other dead phrases
- Use concrete numbers and proof points from the knowledge base
- Reference the prospect's specific title, company, and industry naturally

OUTPUT FORMAT: Respond with ONLY a JSON object (no markdown, no backticks, no preamble) with this exact structure:
{
  "emails": [
    {
      "step": 1,
      "name": "Short name for this step",
      "delay": "Day 0",
      "subject": "Subject line",
      "subjectB": "A/B test subject line variant",
      "body": "Email body with \\n for line breaks",
      "cta": "The specific call to action",
      "strategy": "One sentence explaining why this angle works for this step"
    }
  ]
}`;
}

function buildUserPrompt(persona: Persona): string {
  return `Write a 5-step outbound email sequence for this prospect:

Name: ${persona.firstName} ${persona.lastName}
Title: ${persona.title}
Company: ${persona.company}
Industry: ${persona.industry}
Company Size: ${persona.companySize}
Key Challenge/Context: ${persona.challenge || "Not specified — infer from their title and industry"}

The sequence should escalate naturally:
- Email 1 (Day 0): Pattern interrupt — something specific to their role that earns the open
- Email 2 (Day 3): Value-first — share an insight or proof point relevant to their situation
- Email 3 (Day 7): Social proof — reference a similar organization's results
- Email 4 (Day 12): The direct ask — clear and confident
- Email 5 (Day 18): Breakup email — light, human, gives them an easy out

Personalize heavily to their title, company, and industry. Use specific language that shows you understand their daily work.`;
}

function generateFallbackSequence(persona: Persona, knowledge: KnowledgeBase) {
  const elevator = knowledge.sections?.elevator || "";
  const proof = knowledge.sections?.proof || "";
  const diff = knowledge.sections?.differentiators || "";
  const firstName = persona.firstName || "there";
  const title = persona.title || "your role";
  const company = persona.company || "your organization";

  return {
    emails: [
      {
        step: 1,
        name: "Pattern Interrupt",
        delay: "Day 0",
        subject: `${title} + device management — quick question`,
        subjectB: `How ${company} compares on care achievement`,
        body: `Hi ${firstName},\n\nI've been looking at how ${company} handles cardiac device management and had a thought.\n\nMost clinics we talk to are stuck processing device checks in 20+ minutes with 125 clicks per transmission. Their care achievement hovers around 35-40%.\n\nWe built something that cuts that to 2 clicks and 2 minutes — and clinics using it hit 80% care achievement.\n\nWould a 15-minute look be worth your time?\n\nBest,\n[Your Name]`,
        cta: "15-minute demo",
        strategy:
          "Opens with a specific, quantified pain point that any device clinic manager will recognize.",
      },
      {
        step: 2,
        name: "Value-First Insight",
        delay: "Day 3",
        subject: `The billing gap most ${persona.industry || "cardiology"} practices don't see`,
        subjectB: `${company}: are you capturing every remote monitoring dollar?`,
        body: `Hi ${firstName},\n\nFollowing up with something concrete.\n\nOne of our partner clinics discovered they were missing 75% of their remote transmission billing due to interval timing errors. Their denial rate was through the roof.\n\nAfter switching their workflow, denials dropped to essentially zero. That's real revenue recovered — not a rounding error.\n\nGiven ${company}'s patient volume, the gap could be significant.\n\nHappy to run a quick benchmark if that's useful.\n\n[Your Name]`,
        cta: "Billing benchmark analysis",
        strategy:
          "Leads with a financial proof point that gets attention from both clinical and administrative buyers.",
      },
      {
        step: 3,
        name: "Social Proof",
        delay: "Day 7",
        subject: `How Prisma Health manages 4,000+ device patients`,
        subjectB: `What ${persona.industry || "health systems"} like yours are doing differently`,
        body: `Hi ${firstName},\n\nQuick case study I thought you'd find relevant.\n\nPrisma Health's lead device technician was spending hours daily on manual device management across 4,000+ patients. After consolidating to a single platform, she got those hours back — and her nurse practitioners shifted from admin work to actual patient care.\n\nDr. Pirooz Mofrad at Washington Heart Rhythm Associates called it "the single best clinical decision in the last five years."\n\nClinics are reporting 700%+ ROI on average.\n\nWorth a conversation?\n\n[Your Name]`,
        cta: "Schedule a conversation",
        strategy:
          "Named logos and specific results from similar organizations build credibility.",
      },
      {
        step: 4,
        name: "Direct Ask",
        delay: "Day 12",
        subject: `15 minutes — ${company}'s device workflow`,
        subjectB: `Can I show you the 2-Click Clear difference?`,
        body: `Hi ${firstName},\n\nI'll be direct — I think Murj could make a meaningful difference for ${company}.\n\nHere's what 15 minutes would cover:\n\n• How 2-Click Clear™ processes non-event transmissions in seconds\n• What your billing recovery could look like based on your patient volume\n• How advisory management works without spreadsheets\n\nI have availability this week and next. Would any of these work?\n\n[Your Name]`,
        cta: "Book specific time slot",
        strategy:
          "After warming them up, the direct ask with a clear agenda reduces friction.",
      },
      {
        step: 5,
        name: "Breakup",
        delay: "Day 18",
        subject: `Closing the loop, ${firstName}`,
        subjectB: `Not the right time?`,
        body: `Hi ${firstName},\n\nI've reached out a few times and want to respect your inbox.\n\nIf device management isn't a priority for ${company} right now, totally understand — I'll step back.\n\nBut if the timing shifts, or if you're curious about how other ${persona.industry || "cardiology"} practices are hitting 80% care achievement, I'm easy to find.\n\nEither way, wishing you and the team well.\n\n[Your Name]`,
        cta: "Soft close — leave door open",
        strategy:
          "The breakup email often gets the highest reply rate by removing pressure and showing respect.",
      },
    ],
  };
}
