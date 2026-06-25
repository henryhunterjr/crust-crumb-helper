// Crust & Crumb Helper — Market-Curious Nurture Drip Copy
//
// THIS IS THE SOURCE OF TRUTH for the 6 nurture emails.
// Edit here, then redeploy `nurture-drip-send` (Lovable does this automatically
// on every push). The /targets admin view imports from this same file.
//
// Placeholders replaced at send time:
//   {{first_name}}   -> first token of member.skool_name (fallback "there")
//   {{unsubscribe}}  -> token-signed one-click opt-out URL
//
// HTML rules:
//   - dark text on light background (NOT the FOTM dark theme)
//   - inline styles only, no <style> tags
//   - keep an unsubscribe link using {{unsubscribe}}
//   - sign every email: "Henry" + "Perfection is not required. Progress is."

export interface NurtureEmail {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  /** Days from previous step (or from start for step 1). Used by UI only. */
  dayOffset: number;
  subject: string;
  /** Inline-styled HTML. Use {{first_name}} and {{unsubscribe}}. */
  html: string;
}

const SIGNOFF = `<p style="margin:24px 0 8px;color:#111;">Henry<br/><em style="color:#555;">Perfection is not required. Progress is.</em></p>
<p style="margin:32px 0 0;font-size:12px;color:#888;">Not useful anymore? <a href="{{unsubscribe}}" style="color:#888;">Unsubscribe</a>.</p>`;

const wrap = (inner: string) =>
  `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.6;color:#111;max-width:560px;margin:0 auto;padding:24px;">${inner}${SIGNOFF}</div>`;

export const NURTURE_EMAILS: NurtureEmail[] = [
  {
    step: 1,
    dayOffset: 0,
    subject: "You raised your hand. Here's where to start.",
    html: wrap(`
<p>Hi {{first_name}},</p>
<p>You told me you're at least a little curious about turning sourdough into something that pays. That puts you ahead of most people who've thought about it and never said it out loud.</p>
<p>Before I send you anything else, take 60 seconds and answer 8 questions. It tells me, and you, exactly where you are right now. Hobby baker, side-hustle curious, market-ready, or already selling and stuck.</p>
<p>No signup wall. No long form. Just clarity.</p>
<p><a href="https://bakinggreatbread.blog/bread-business-quiz/" style="color:#b45309;font-weight:bold;">Take the quiz</a></p>
<p>I'll be in your inbox every few days with one useful thing at a time. Pricing, cottage food law, what actually sells at markets, the works. If any of it stops being useful, the unsubscribe link works fine and I won't take it personally.</p>
`),
  },
  {
    step: 2,
    dayOffset: 5,
    subject: "The math most home bakers never do",
    html: wrap(`
<p>Hi {{first_name}},</p>
<p>Quick one today.</p>
<p>The fastest way to lose money selling bread is to price it the way the grocery store does. Look at the shelf, knock a dollar off, hope it works out. It doesn't. The grocery store is a factory. You are not.</p>
<p>What works is pricing from your own costs. Flour, your time, the booth fee, gas, packaging, and the loaves that didn't sell. That number is what your loaf actually costs you. Anything below it and you're paying customers to take your bread home.</p>
<p>I built a calculator that does this math for you. Enter your real numbers, it tells you your true cost per loaf and the price you should actually charge.</p>
<p><a href="https://fromoventomarket.com/price-your-loaf" style="color:#b45309;font-weight:bold;">Run the numbers on your loaf</a></p>
<p>Most bakers who do this for the first time are shocked. The good news is once you see the real number, you can't un-see it. And you stop quietly losing money every Saturday.</p>
`),
  },
  {
    step: 3,
    dayOffset: 5,
    subject: "Am I even allowed to sell this?",
    html: wrap(`
<p>Hi {{first_name}},</p>
<p>The biggest thing standing between most home bakers and their first sale isn't pricing or marketing. It's a quieter fear: am I even allowed?</p>
<p>The honest answer, in almost every state, is yes. Bread is one of the safest, simplest items under cottage food law. You don't need a commercial kitchen. You don't need someone's permission. In most places you don't even need a license. Just a basic registration and a label.</p>
<p>The rules people think they have to follow are mostly carried over from restaurant law, or from states they don't live in. The actual cottage food rules for bread are usually shorter than this email.</p>
<p>I'm not going to walk you through your state's specific rules in an email. That's what the full road map is for, and there's a module on it inside From Oven to Market. But for today, here's the short version. You're probably allowed. The question isn't permission. It's whether you're ready to step out.</p>
<p>More on that next time.</p>
`),
  },
  {
    step: 4,
    dayOffset: 5,
    subject: "Three feet decide the sale",
    html: wrap(`
<p>Hi {{first_name}},</p>
<p>I used to watch this every Saturday at the market. Two booths, same kind of bread, similar prices. One sold out before noon. The other packed up at two with most of their loaves still on the table.</p>
<p>The bread wasn't the difference. The booth was.</p>
<p>There's a concept I call the twenty-foot test. From twenty feet away, can someone tell what you sell, what it costs, and why they should come closer? That's what gets them walking toward you. Then the first three feet do the rest. Your stack, your sign, the single loaf turned to catch the light. Twenty feet earns the walk-up. Three feet earns the sale.</p>
<p>Most home bakers spend hours on the bread and ten minutes on the table. The table is what sells the bread. People decide whether to come over in about three seconds, and they decide from across the lot.</p>
<p>The quiz I sent at the start of this gets at where you are in that picture. If you haven't taken it yet, two minutes:</p>
<p><a href="https://bakinggreatbread.blog/bread-business-quiz/" style="color:#b45309;font-weight:bold;">See where you'd start</a></p>
`),
  },
  {
    step: 5,
    dayOffset: 5,
    subject: "I started with a folding table",
    html: wrap(`
<p>Hi {{first_name}},</p>
<p>Quick story, because I think you might need to hear it.</p>
<p>I didn't start with a storefront. I didn't start with a permit folder, a pricing system, a label printer, or a clue. I started with a folding table, a tent, and a guess about what to charge.</p>
<p>The guess was wrong, by the way. I underpriced for months. Gave away margin I'll never get back. People at my first markets bought bread out of pity as much as anything else. I was sure they could tell I had no idea what I was doing.</p>
<p>Then one Saturday, somebody drove past four supermarkets to buy two loaves from me. He didn't care that I was new. He cared that I was real. That was the day I stopped feeling like a fraud at the table.</p>
<p>You don't have to be ready. I wasn't. You don't have to know everything. I didn't. You just have to set up the table, and let the people who want what you make find you.</p>
`),
  },
  {
    step: 6,
    dayOffset: 5,
    subject: "The doors open Monday",
    html: wrap(`
<p>Hi {{first_name}},</p>
<p>Last note in this little series, then I'll let you go back to baking.</p>
<p>Over the past few weeks you've gotten the pricing math, the legal piece, a market-booth idea or two, and a story. That's the shape of what From Oven to Market actually is, just compressed. Nine modules, in order, covering the parts that took me years to learn the hard way. Cottage food law, pricing that protects your profit, insurance, packaging, the booth, customers, markets, your own storefront, and how to scale without burning out.</p>
<p>It opens Monday. There are two ways in. Self-Paced at $497, you go at your own speed, with everything included. Coached at $997, the same course plus direct access to me when you hit a wall. Both come with a 14-day guarantee, so the risk is on me.</p>
<p><a href="https://fromoventomarket.com" style="color:#b45309;font-weight:bold;">See what's inside the course</a></p>
<p>And if you want a softer step first, the doors to our community open the same day. Five dollars a month puts you in the room with the people doing this for real, the Monthly Market Kit, and a place to ask anything and get a real answer. Same Monday, same door.</p>
<p>Either way, glad you're here. Go bake something worth selling.</p>
`),
  },
];

export const MAX_NURTURE_STEP = 6;

export function getNurtureEmail(step: number): NurtureEmail | null {
  return NURTURE_EMAILS.find((e) => e.step === step) ?? null;
}

export function renderNurtureEmail(
  email: NurtureEmail,
  vars: { first_name: string; unsubscribe: string },
): { subject: string; html: string } {
  const replace = (s: string) =>
    s
      .split("{{first_name}}").join(vars.first_name || "there")
      .split("{{unsubscribe}}").join(vars.unsubscribe);
  return { subject: replace(email.subject), html: replace(email.html) };
}