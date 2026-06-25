# Market-Curious Nurture Sequence — Draft Copy

**Cadence:** 5 touches, 5-7 days apart (~28 days total)
**Audience:** members with `intent_tier='curious'` or `'prospect'`, `nurture_status='active'`, `status != 'enrolled'`
**Branching:** single template, two CTA blocks at the bottom (curious vs prospect)
**Footer:** standard MailerLite unsubscribe; on click, our webhook flips `nurture_status='opted_out'`
**Signature on every email:**

> Henry
> *Perfection is not required. Progress is.*

---

## Email 1 — Day 0 — Welcome + the quiz

**Subject:** You raised your hand. Here's where to start.
**Preview:** A 60-second quiz to figure out exactly where you are.

Hey {{name|default:"there"}},

You told me you're at least a little curious about turning sourdough into something that pays. That puts you ahead of most people who've thought about it and never said it out loud.

Before I send you anything else, I want you to take 60 seconds and answer 8 questions. It tells me (and you) exactly where you are right now: hobby baker, side hustle curious, market-ready, or already selling and stuck.

No signup wall. No long form. Just clarity.

**Take the quiz:** https://bakinggreatbread.blog/bread-business-quiz/

I'll be in your inbox every few days with one useful thing at a time. Pricing, cottage food law, what actually sells at markets, the works. If any of it stops being useful, the unsubscribe link at the bottom works fine and I won't take it personally.

— *(branched CTA block, see footer variants below)*

---

## Email 2 — Day 5-7 — Pricing: the math most home bakers never do

**Subject:** What your loaf actually costs you
**Preview:** Flour, time, gas, packaging. The full number.

Hey {{name|default:"there"}},

Most home bakers price by feel. They look at the grocery store, knock a couple dollars off, and call it a day. Then they wonder why selling 20 loaves a week left them more tired and not much richer.

The real number includes flour, salt, yeast or starter feed, water, electricity or gas, packaging, labels, mileage to the market, the booth fee, and your time. Your time is the one people skip. Don't skip it.

I built a calculator that walks the whole thing. Put in your ingredients, your batch size, what you pay yourself per hour. It spits out a price you can defend at a market table without flinching.

**Price Your Loaf:** https://fromoventomarket.com/price-your-loaf

Run one batch through it tonight. The number might sting. That sting is the first honest signal you've gotten about whether this is a hobby or a business.

---

## Email 3 — Day 12-14 — Cottage food law: you're probably allowed

**Subject:** You're probably already legal. Here's the real picture.
**Preview:** Cottage food law in plain English, no scare tactics.

Hey {{name|default:"there"}},

The single biggest thing that stops home bakers from selling isn't skill. It's the assumption that they'd need a commercial kitchen, an LLC, an inspector, and a lawyer just to sell a loaf to their neighbor.

In almost every U.S. state, that assumption is wrong.

Cottage food laws exist specifically so you can bake at home and sell direct. Bread, cookies, cakes, jams — most baked goods qualify because they're shelf-stable. The rules vary: some states cap your annual sales, some require a label with your address, some let you sell at farmers markets but not online. None of them require you to gut your kitchen.

Look up your state's cottage food law tonight. Search "(your state) cottage food law." Read the actual statute, not somebody's blog summary. Ten minutes will tell you what you can sell, where, and up to how much. Most people are pleasantly surprised.

If you want me to walk you through the framework I use to read these laws, this video does it: https://youtu.be/y759LCNDE1k

---

## Email 4 — Day 19-21 — Markets & booths: what people see in 3 seconds

**Subject:** Your booth has 3 seconds. Make them count.
**Preview:** The 3-second test that decides if someone walks up.

Hey {{name|default:"there"}},

At a farmers market, your booth gets about 3 seconds. That's how long someone walking past decides whether to slow down or keep moving toward the kettle corn.

Three seconds isn't enough time to read a sign. It isn't enough time to notice your story. It's barely enough time to see one thing clearly. So your booth has to answer one question in one glance: **what is this and why should I want it?**

The bakers who win this game do three things. They stack loaves high so the bread itself is the sign. They put one beautiful cross-section on display so people can see crumb and crust. They write prices large enough to read from six feet away so nobody has to ask and feel awkward.

That's it. No frills, no chalkboard quotes about flour. Bread, crumb, price, eye contact.

Walk a market this weekend, not as a baker, as a shopper. Notice which booths you slow down for and why. That's your homework.

---

## Email 5 — Day 26-28 — The whole road + community open

**Subject:** If you want the whole road, not just the next step
**Preview:** From Oven to Market + Sell Your Sourdough.

Hey {{name|default:"there"}},

You've gotten five emails from me now. The quiz, the pricing math, the cottage food framework, the booth read. That's enough to start. Plenty of people will take those four things and build a Saturday market table out of them, and that'll be the right move for them.

If you want the rest of the road in one place — pricing systems, label compliance per state, market setup, scaling past your kitchen oven, when to register an LLC, how to handle a wholesale account, the actual numbers from real bakeries — that's what **From Oven to Market** is. It's the course I built because I got tired of answering the same twelve questions twelve different times.

And here's the other thing. I'm opening a community called **Sell Your Sourdough** specifically for people working through this. Not a content firehose, not a free-for-all chat. A working room with the people actually doing the thing, weekly office hours, and a tight library of what's been proven to work.

If you've made it this far in the emails, you're the kind of person I want in there.

---

## Branched CTA footer (append to every email)

### Curious variant

> *If you want to take a look:*
> — Course preview: https://fromoventomarket.com
> — Community: https://skool.com/sell-your-sourdough
>
> Henry
> *Perfection is not required. Progress is.*

### Prospect variant

> *Your next step:*
> — Join From Oven to Market: https://fromoventomarket.com
> — Join the Sell Your Sourdough community: https://skool.com/sell-your-sourdough
>
> Henry
> *Perfection is not required. Progress is.*

---

## Notes for Henry before loading into MailerLite

- Email 3 currently uses the YouTube link `y759LCNDE1k` as the cottage food walkthrough. Swap to a blog post if you've got a stronger one.
- Email 4 has no link by design. Hand-built lesson, no link beats a weak link. If you want one, slot in the storefront builder teaser or a market post.
- The `{{name|default:"there"}}` token assumes MailerLite's default merge syntax — confirm it matches the field you sync from `members.first_name`.
- Every email is plain-text-safe HTML. No images required; if you want a header banner, it goes above the greeting and the rest still works text-only.