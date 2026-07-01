-- seed_life_event_pages.sql
--
-- Life-event SELLER guide pages for Anthony Stolp (Wisconsin). High-intent,
-- low-competition SEO that converts to listings: probate/inherited, divorce,
-- pre-foreclosure, downsizing.
--
-- Requires migration 0010_niche_pages_guide.sql (adds body + faqs columns).
--
-- IDEMPOTENT: this file uses ON CONFLICT DO UPDATE, so re-running it SYNCS the 4
-- managed pages to the content here. These 4 are code-managed content, so edit
-- them in this file (not the admin UI); admin edits to these slugs are overwritten
-- on the next run. Run via the Supabase SQL editor, or:
--   bunx supabase db execute --file supabase/seed_life_event_pages.sql
--
-- Legal posture: these pages EDUCATE on the real estate process only. Legal/tax
-- specifics are kept general and routed to a qualified attorney / CPA / HUD-
-- approved counselor. The "team" is Anthony''s ExSell Experts / Epique Realty
-- real estate team (coordination + support), NOT in-house legal/tax advice. A
-- standing disclaimer also renders on every guide page from the template.

insert into public.niche_pages
  (slug, title, h1, intent, geo, filters, hero_copy, body, faqs, meta_desc, active, agent_id)
values
  -- ── 1. PROBATE / INHERITED ────────────────────────────────────────────
  (
    'selling-an-inherited-house-wisconsin',
    'Selling an Inherited House in Wisconsin: A Step-by-Step Guide',
    'Selling an inherited house in Wisconsin',
    'sell',
    'Wisconsin',
    null,
    'Inherited a house and not sure where to start? Here is how the process generally works in Wisconsin, and how my team and I help you sell without doing it all alone.',
    'Inheriting a house is rarely simple. You are often handling it during grief, sometimes with siblings, and the process is unfamiliar. This guide walks through how selling an inherited house in Wisconsin generally works, so you know what to expect. You do not have to figure it out alone.

## Do you have to go through probate?
Often yes, but not always. Wisconsin generally lets smaller estates transfer more simply, and a home held in a living trust, in joint tenancy, or with a transfer on death deed may pass outside probate. Which path fits your situation is a legal question, so a probate attorney is the right person to confirm it. My team and I can help keep you organized and pointed in the right direction.

## How long does it take?
Wisconsin offers an informal probate track for most uncontested estates, and the process takes time. In general, you cannot close a sale until the court gives the personal representative authority to sign. The good news is you can do a lot of the prep work, pricing, cleanout, and choosing an agent, while the paperwork is in motion.

## What about taxes?
In general, Wisconsin does not have a state inheritance or estate tax, and inherited property usually receives a stepped up cost basis to its value around the date of death, which often keeps capital gains low if you sell soon after. Everyone''s situation is different, so a CPA should confirm your actual numbers before you rely on them.

## When there are multiple heirs
If several people inherit the home, decisions generally run through the personal representative, who has authority to list and sell. Disagreements happen, and they are easier to resolve when everyone sees the same numbers. I keep all parties informed with one clear set of facts, so the sale does not become another source of conflict.

## Sell as is, or fix it up first?
Inherited homes often need updates or a full cleanout. You do not have to renovate. Many estates sell as is, and I can give you an honest read on whether specific repairs would return more than they cost. If a cleanout is needed, I can connect you with estate sale and cleanout vendors who handle it respectfully.

## How my team and I help
You should not have to manage this alone. My team at ExSell Experts, Epique Realty and I handle the real estate side, pricing, prep, vendors, and timing, and we keep you organized and pointed to the right attorney or CPA for the legal and tax pieces. No pressure and no scripts, just steady guidance during a hard time.',
    '[
      {"q":"Do I have to go through probate to sell an inherited house in Wisconsin?","a":"Often, but not always. Some homes pass outside probate depending on how title was held or whether there is a trust or a transfer on death deed. Because it is a legal question, a probate attorney should confirm your path. My team can help point you there."},
      {"q":"Will I owe taxes when I sell?","a":"In general, Wisconsin has no inheritance or estate tax, and inherited property usually gets a stepped up basis that keeps capital gains low if you sell soon after. Your situation is unique, so confirm the numbers with a CPA."},
      {"q":"Can I sell the house before probate is finished?","a":"Usually the court needs to give you authority to sign first. You can still prepare the home and choose an agent while that process is underway."},
      {"q":"What if my siblings and I disagree about selling?","a":"Decisions generally run through the personal representative. Clear, shared information helps. I keep everyone working from the same facts and numbers so the sale stays civil."},
      {"q":"Can I sell the house as is?","a":"Yes. Many inherited homes sell as is. I will tell you honestly which repairs, if any, would return more than they cost."}
    ]'::jsonb,
    'Inherited a house in Wisconsin? How the process generally works, and how Anthony Stolp and his team help you sell without doing it alone. General info, not legal advice.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),

  -- ── 2. DIVORCE ────────────────────────────────────────────────────────
  (
    'selling-a-house-during-divorce-wisconsin',
    'Selling a House During Divorce in Wisconsin: Your Options',
    'Selling a house during a divorce in Wisconsin',
    'sell',
    'Wisconsin',
    null,
    'Divorcing and need to handle the house? Here are your options in general, and how my team and I sell it smoothly and neutrally while your attorneys handle the legal side.',
    'Selling a home during a divorce is part financial decision and part emotional one. The clearer the process, the easier it is on everyone. This guide covers your options in general terms, so you can make a calm, informed choice. The legal specifics belong with your attorney, and the real estate side is where my team and I help.

## How the home is generally treated
Wisconsin is generally a marital property state, which affects how the home is divided. The specifics depend on your circumstances, so your family law attorney is the right person to confirm how it applies to you. Our job is to handle the sale itself cleanly and fairly.

## Your three main options
Most couples choose one of three paths. You can sell the home and divide the proceeds, which gives both people a clean break. One spouse can buy out the other and keep the home, which requires refinancing and enough equity. Or you can defer the sale and co own for a set time, for example until children finish a school year, then sell later. Each has tradeoffs in cost, timing, and stress.

## Timing the sale around your divorce
You can sell before, during, or after the divorce is final. Selling before or during often simplifies the financial settlement, because the proceeds become a known number instead of an estimate. How and when proceeds are divided is set by your agreement and your attorneys. Coordinating with both keeps the timeline clean.

## Working with a neutral agent
When both spouses share an agent, trust matters. I stay neutral, communicate the same information to both sides, and work with both attorneys. My job is to get the best result for the property and keep the process factual, not to take a side.

## Keeping it objective when emotions run high
A pre list net sheet that shows both people the likely proceeds, costs, and bottom line removes a lot of friction. When everyone sees the same numbers up front, decisions get easier and the sale stays on track.

## How my team and I help
Divorce is stressful enough. My team at ExSell Experts, Epique Realty and I bring a calm, neutral hand to the real estate side, honest pricing, clear communication with both spouses and both attorneys, and a process built to keep things moving. The legal questions stay with your family law attorney, where they belong.',
    '[
      {"q":"How is the house divided in a Wisconsin divorce?","a":"Wisconsin is generally a marital property state, so the home is usually treated as marital property, but the specifics depend on your circumstances. Your family law attorney can confirm how it applies to you."},
      {"q":"Should we sell the house before or after the divorce is final?","a":"Both work. Selling before or during often simplifies the settlement because the proceeds become a known figure. The right timing depends on your finances and your agreement."},
      {"q":"Can one of us keep the house?","a":"Yes, through a buyout. The spouse keeping the home typically refinances to remove the other from the loan and pays their share of the equity."},
      {"q":"How are the sale proceeds handled?","a":"Proceeds are handled according to your divorce agreement and your attorneys. On the real estate side, I make sure the closing runs cleanly."},
      {"q":"Can you work with both of us fairly?","a":"Yes. I stay neutral, share the same information with both spouses and both attorneys, and focus on the best outcome for the property."}
    ]'::jsonb,
    'Divorcing in Wisconsin and need to handle the house? Your options in general, and neutral help selling from Anthony Stolp and team. General info, not legal advice.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),

  -- ── 3. PRE-FORECLOSURE / DISTRESS ─────────────────────────────────────
  (
    'selling-before-foreclosure-wisconsin',
    'Selling Your House Before Foreclosure in Wisconsin',
    'Selling your house before foreclosure in Wisconsin',
    'sell',
    'Wisconsin',
    null,
    'Behind on your mortgage in Wisconsin? You likely have more options and more time than you think. Here is the general picture, and how my team and I help, without judgment.',
    'If you have fallen behind on your mortgage, you likely have more options and more time than you think. Selling before a foreclosure is final can protect your credit and any equity you have built. This guide explains the general picture in Wisconsin, plainly and without judgment. For your exact rights and timeline, an attorney or a HUD approved counselor is the right resource.

## How foreclosure generally works in Wisconsin
Wisconsin uses a court based foreclosure process, which takes time, and there is a period before a home is sold at a sheriff''s sale. In general, you keep the right to sell the home yourself up until that sale. The exact timeline depends on your case, so an attorney or a HUD approved housing counselor should confirm your specific dates and options.

## Selling before the sheriff''s sale
If your home is worth more than you owe, a normal sale can pay off the loan, put the remaining cash in your pocket, and keep a completed foreclosure off your record. This is usually the best outcome when you have equity, and there is often more time to do it than people expect.

## If you owe more than the home is worth
When the balance is higher than the value, a short sale may be an option. The lender agrees to accept less than the full payoff. It takes longer and needs lender approval, but it generally affects your credit less than a foreclosure and lets you move on.

## How it generally affects your credit
A sale, even a short sale, is generally less damaging to your credit than a completed foreclosure, and it gives you more control over the outcome. The sooner you act, the more options stay open.

## You have time, but use it
The timeline usually gives you room to make a good decision rather than a rushed one. The first step is simply knowing your numbers: what the home is worth, what you owe, and what each path would net you.

## How my team and I help
You do not have to face this alone. My team at ExSell Experts, Epique Realty and I move quickly and confidentially on the sale, and we make sure you are talking to a HUD approved counselor and an attorney about your options. No judgment, just a clear path forward.',
    '[
      {"q":"How much time do I have before I could lose my house in Wisconsin?","a":"Wisconsin foreclosure is a court based process that takes time, and you can generally sell up until the sheriff''s sale. The exact timeline depends on your case, so confirm your dates with an attorney or a HUD approved counselor."},
      {"q":"Can I sell my house if I am behind on payments?","a":"Generally yes. In most cases you keep the right to sell up until the sheriff''s sale, and if you have equity a sale can pay off the loan and leave you with cash."},
      {"q":"What if I owe more than the house is worth?","a":"A short sale may be an option. The lender agrees to accept less than the full balance. It takes longer and needs approval, but it usually affects your credit less than a foreclosure."},
      {"q":"Is selling better than letting it foreclose?","a":"Often yes. Selling protects any equity and is generally less damaging to your credit than a completed foreclosure. Your attorney or a HUD counselor can help you weigh it."},
      {"q":"Who else should I talk to?","a":"A HUD approved housing counselor, which is free, and an attorney. I am glad to point you to local resources alongside handling the sale."}
    ]'::jsonb,
    'Behind on your mortgage in Wisconsin? You may have more options and time than you think. The general picture, plus confidential help from Anthony Stolp and team.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  ),

  -- ── 4. DOWNSIZING / SENIORS ───────────────────────────────────────────
  (
    'downsizing-in-wisconsin',
    'Downsizing Your Home in Wisconsin: A Practical Guide',
    'Downsizing your home in Wisconsin',
    'sell',
    'Wisconsin',
    null,
    'Thinking about downsizing in Wisconsin? Here is how to think about timing and taxes in general, and how my team and I make the move easier at your pace.',
    'Downsizing is a chance to lower your costs and upkeep and free up equity, but the move itself can feel like a lot. This guide covers timing, a common tax question, and how to make the transition easier, at whatever pace suits you. You do not have to do it alone.

## Is it the right time to downsize?
Common signs are more space and maintenance than you want, significant equity built up, and a lifestyle that no longer needs the room. There is no rush. The goal is the right move at the right time, not the fastest one.

## The common tax question
Many people ask whether they will owe tax on the sale. In general, if the home has been your primary residence, federal rules often let you exclude much, sometimes all, of your gain if you meet the ownership and use requirements. For many longtime owners that means little or no tax. Because the details matter, a CPA should confirm what applies to you before you count on it.

## Should you buy or sell first?
Selling first gives you certainty about your budget and proceeds, but may mean a short term rental or a rent back while you find the next place. Buying first is smoother to move into but carries the risk of two payments for a time. Contingencies and rent back agreements can bridge the gap, and I will walk you through which fits your situation.

## Making the move easier
A lifetime of belongings is often the hardest part. Estate sales, donation pickups, and senior move managers can take most of the weight off you. Building a realistic timeline, room by room, keeps it from becoming overwhelming.

## A patient, respectful process
Right sizing often involves accessibility needs and family input, and it deserves a calm pace. I work patiently, coordinate the moving pieces, and help you find a next home that actually fits the life you want now.

## How my team and I help
My team at ExSell Experts, Epique Realty and I move at your pace, handle pricing, movers, and estate sale help, and help you find the right size next home, while making sure a CPA weighs in on any tax questions. No pressure at any step.',
    '[
      {"q":"Will I owe taxes when I sell my home to downsize?","a":"Often not. In general, if it has been your primary residence, federal rules usually let you exclude much or all of your gain if you meet the ownership and use requirements. Confirm the specifics with a CPA."},
      {"q":"Should I buy my next place before selling?","a":"It depends on your finances and your comfort with risk. Selling first gives budget certainty, buying first is easier to move into. Contingencies and rent backs can bridge the two."},
      {"q":"How do I handle a lifetime of belongings?","a":"Estate sales, donation pickups, and senior move managers handle most of it. A room by room timeline keeps it manageable, and my team can line up the help."},
      {"q":"I am not in a hurry. Is that okay?","a":"Completely. Downsizing deserves a calm pace. I work patiently and let you lead the timeline."}
    ]'::jsonb,
    'Thinking about downsizing in Wisconsin? How to think about timing and taxes in general, plus patient help from Anthony Stolp and team. General info, not tax advice.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  )
on conflict (slug) do update set
  title     = excluded.title,
  h1        = excluded.h1,
  hero_copy = excluded.hero_copy,
  body      = excluded.body,
  faqs      = excluded.faqs,
  meta_desc = excluded.meta_desc,
  updated_at = now();
