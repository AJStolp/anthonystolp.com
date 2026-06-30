-- seed_life_event_pages.sql
--
-- Life-event SELLER guide pages for Anthony Stolp (Wisconsin). High-intent,
-- low-competition SEO that converts to listings: probate/inherited, divorce,
-- pre-foreclosure, downsizing.
--
-- Requires migration 0010_niche_pages_guide.sql (adds body + faqs columns).
-- Pages are independently editable via /admin/pages/[slug]; treat this file as
-- initial state only (ON CONFLICT DO NOTHING). Run once via the Supabase SQL
-- editor, or:  bunx supabase db execute --file supabase/seed_life_event_pages.sql
--
-- Accuracy note: legal/tax lines are written as general WI process and point the
-- reader to an attorney / CPA / HUD-approved counselor. Have an attorney skim
-- before treating any line as advice.

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
    'Inherited a house and not sure where to start? Here is how probate, taxes, and the sale actually work in Wisconsin, so you can make calm decisions during a hard time.',
    'Inheriting a house is rarely simple. You are often handling it during grief, sometimes with siblings, and the legal and tax pieces are unfamiliar. This guide walks through how selling an inherited house in Wisconsin actually works, so you know what to expect before you make any decisions.

## Do you have to go through probate?
Often yes, but not always. If the home was held in joint tenancy, in a living trust, or with a transfer on death deed, it may pass outside probate. Wisconsin also lets smaller estates transfer by affidavit when the probate estate is under the state threshold. For a home held only in the deceased person''s name, some form of probate is usually required before the property can be sold. A probate attorney can confirm which path applies to you.

## How long does it take?
Wisconsin offers informal probate for most uncontested estates, which commonly runs a few months up to about a year. You usually cannot close a sale until the court appoints a personal representative and issues the documents that give that person authority to sign. The good news is you can do a lot of the prep work, pricing, cleanout, and choosing an agent, while the paperwork is in motion.

## Taxes on an inherited home
Wisconsin has no state inheritance tax and no state estate tax. Federal estate tax only affects very large estates, so it rarely applies. The piece that matters most for selling is the stepped up basis: the cost basis of the home resets to its fair market value on the date of death. That means if you sell near that date, your taxable gain is usually small or zero. Confirm the details with a CPA, because your timeline and any rental use can change the math.

## When there are multiple heirs
If several people inherit the home, decisions generally run through the personal representative, who has authority to list and sell. Disagreements happen, and they are easier to resolve when everyone sees the same numbers. I keep all parties informed with one clear set of facts, so the sale does not become another source of conflict.

## Sell as is, or fix it up first?
Inherited homes often need updates or a full cleanout. You do not have to renovate. Many estates sell as is, and I can give you an honest read on whether specific repairs would return more than they cost. If a cleanout is needed, I can connect you with estate sale and cleanout vendors who handle it respectfully.

## How I help
I price the home to the current local market, coordinate with your probate attorney on timing, and line up the vendors you need so you are not managing it alone. No pressure and no scripts, just straight guidance.',
    '[
      {"q":"Do I have to go through probate to sell an inherited house in Wisconsin?","a":"Often, but not always. Homes held in joint tenancy, a living trust, or with a transfer on death deed can pass outside probate, and small estates may transfer by affidavit. For a home held only in the deceased person''s name, probate is usually required first. A probate attorney can confirm your path."},
      {"q":"Will I owe taxes when I sell?","a":"Wisconsin has no inheritance or estate tax. Because the cost basis steps up to the value on the date of death, your taxable gain is usually small if you sell soon after. Confirm with a CPA."},
      {"q":"Can I sell the house before probate is finished?","a":"Usually you need to be appointed personal representative first, since that is what gives you authority to sign. You can still prepare the home and choose an agent while the court process is underway."},
      {"q":"What if my siblings and I disagree about selling?","a":"Decisions generally run through the personal representative. Clear, shared information helps. I keep everyone working from the same facts and numbers so the sale stays civil."},
      {"q":"Can I sell the house as is?","a":"Yes. Many inherited homes sell as is. I will tell you honestly which repairs, if any, would return more than they cost."}
    ]'::jsonb,
    'Inherited a house in Wisconsin? Here is how probate, taxes, and selling actually work, plus how to sell with less stress. Local guidance from Anthony Stolp.',
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
    'Divorcing and need to handle the house? Here are your options, how Wisconsin marital property works, and how to sell smoothly with a neutral agent.',
    'Selling a home during a divorce is part financial decision and part emotional one. The clearer the process, the easier it is on everyone. This guide covers how the house is treated under Wisconsin law and the options you have, so you can make a calm, informed choice.

## Wisconsin is a marital property state
Wisconsin is one of the few states that treats most property acquired during the marriage as marital property, generally divided equally. In most cases the home is marital property regardless of whose name is on the title. There are exceptions, so your family law attorney should confirm how it applies to you.

## Your three main options
Most couples choose one of three paths. You can sell the home and divide the proceeds, which gives both people a clean break. One spouse can buy out the other and keep the home, which requires refinancing and enough equity. Or you can defer the sale and co own for a set time, for example until children finish a school year, then sell later. Each has tradeoffs in cost, timing, and stress.

## Timing the sale around your divorce
You can sell before, during, or after the divorce is final. Selling before or during often simplifies the financial settlement, because the proceeds are a known number instead of an estimate. The sale proceeds are typically held in escrow and divided according to your agreement. Coordinating with both attorneys keeps the timeline clean.

## Working with a neutral agent
When both spouses share an agent, trust matters. I stay neutral, communicate the same information to both sides, and work with both attorneys. My job is to get the best result for the property and keep the process factual, not to take a side.

## Keeping it objective when emotions run high
A pre list net sheet that shows both people the likely proceeds, costs, and bottom line removes a lot of friction. When everyone sees the same numbers up front, decisions get easier and the sale stays on track.

## How I help
I bring a calm, neutral hand to a stressful moment: honest pricing, clear communication with both sides and both attorneys, and a process built to keep things moving without adding pressure.',
    '[
      {"q":"Who gets the house in a Wisconsin divorce?","a":"Wisconsin is a marital property state, so the home is usually marital property and its value is generally divided equally, regardless of whose name is on title. Your attorney can confirm any exceptions."},
      {"q":"Should we sell the house before or after the divorce is final?","a":"Both work. Selling before or during often simplifies the settlement because the proceeds become a known figure. The right timing depends on your finances and your agreement."},
      {"q":"Can one of us keep the house?","a":"Yes, through a buyout. The spouse keeping the home typically refinances to remove the other from the loan and pays their share of the equity."},
      {"q":"How are the sale proceeds handled?","a":"Proceeds are usually held in escrow at closing and divided according to your divorce agreement."},
      {"q":"Can you work with both of us fairly?","a":"Yes. I stay neutral, share the same information with both spouses and both attorneys, and focus on the best outcome for the property."}
    ]'::jsonb,
    'Divorcing in Wisconsin and need to handle the house? Your options, how marital property works, and how to sell smoothly. Neutral local help from Anthony Stolp.',
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
    'Behind on your mortgage in Wisconsin? You likely have more options and more time than you think. Here is how selling before foreclosure works, plainly and without judgment.',
    'If you have fallen behind on your mortgage, you likely have more options and more time than you think. Selling before a foreclosure is final can protect your credit and any equity you have built. This guide explains how it works in Wisconsin, plainly and without judgment.

## How foreclosure works in Wisconsin
Wisconsin uses a judicial foreclosure process, which means it goes through the courts and takes time. After a judgment, there is a redemption period before the home can be sold at a sheriff''s sale, and its length varies with the type of property and whether the lender waives a deficiency. In most cases you keep the right to sell the home yourself up until that sheriff''s sale. An attorney or a HUD approved housing counselor can confirm your exact timeline.

## Selling before the sheriff''s sale
If your home is worth more than you owe, a normal sale can pay off the loan, put the remaining cash in your pocket, and keep a completed foreclosure off your record. This is usually the best outcome when you have equity, and there is often more time to do it than people expect.

## If you owe more than the home is worth
When the balance is higher than the value, a short sale may be an option. The lender agrees to accept less than the full payoff. It takes longer and needs lender approval, but it generally affects your credit less than a foreclosure and lets you move on.

## How it affects your credit
A sale, even a short sale, is generally less damaging to your credit than a completed foreclosure, and it gives you more control over the outcome. The sooner you act, the more options stay open.

## You have time, but use it
The timeline gives you room to make a good decision rather than a rushed one. The first step is simply knowing your numbers: what the home is worth, what you owe, and what each path would net you.

## How I help
I provide a fast, confidential valuation, coordinate with your lender when a short sale is involved, and move quickly when timing matters. No judgment, just a clear path forward.',
    '[
      {"q":"How long do I have before I lose my house in Wisconsin?","a":"Wisconsin foreclosure is a judicial process with a redemption period after judgment, and the length varies by property type and whether the lender waives a deficiency. You can usually sell up until the sheriff''s sale. Confirm your exact dates with an attorney."},
      {"q":"Can I sell my house if I am behind on payments?","a":"Yes. In most cases you keep the right to sell up until the sheriff''s sale, and if you have equity a sale can pay off the loan and leave you with cash."},
      {"q":"What if I owe more than the house is worth?","a":"A short sale may be an option. The lender agrees to accept less than the full balance. It takes longer and needs approval, but it usually hurts your credit less than a foreclosure."},
      {"q":"Is selling better than letting it foreclose?","a":"Usually yes. Selling protects any equity and is generally less damaging to your credit than a completed foreclosure."},
      {"q":"Who else should I talk to?","a":"A HUD approved housing counselor, which is free, and an attorney. I am glad to point you to local resources alongside handling the sale."}
    ]'::jsonb,
    'Behind on your mortgage in Wisconsin? You may have more options and time than you think. How selling before foreclosure works. Confidential help from Anthony Stolp.',
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
    'Thinking about downsizing in Wisconsin? Here is how to time the sale, handle capital gains, and make the move easier, at whatever pace suits you.',
    'Downsizing is a chance to lower your costs and upkeep and free up equity, but the move itself can feel like a lot. This guide covers the timing, the tax break most sellers qualify for, and how to make the transition easier, at whatever pace suits you.

## Is it the right time to downsize?
Common signs are more space and maintenance than you want, significant equity built up, and a lifestyle that no longer needs the room. There is no rush. The goal is the right move at the right time, not the fastest one.

## The capital gains exclusion most sellers qualify for
If the home has been your primary residence, federal rules let you exclude up to 250,000 dollars of gain, or up to 500,000 dollars for a married couple filing jointly, as long as you meet the ownership and use test of living there at least two of the last five years. For many longtime owners, that means little or no tax on the sale. Confirm the specifics with a CPA.

## Should you buy or sell first?
Selling first gives you certainty about your budget and proceeds, but may mean a short term rental or a rent back while you find the next place. Buying first is smoother to move into but carries the risk of two payments for a time. Contingencies and rent back agreements can bridge the gap, and I will walk you through which fits your situation.

## Making the move easier
A lifetime of belongings is often the hardest part. Estate sales, donation pickups, and senior move managers can take most of the weight off you. Building a realistic timeline, room by room, keeps it from becoming overwhelming.

## A patient, respectful process
Right sizing often involves accessibility needs and family input, and it deserves a calm pace. I work patiently, coordinate the moving pieces, and help you find a next home that actually fits the life you want now.

## How I help
I move at your pace, line up movers and estate sale help, price your current home to the local market, and help you find the right size next place. No pressure at any step.',
    '[
      {"q":"Will I pay taxes when I sell my home to downsize?","a":"Often not. If it has been your primary residence, you can usually exclude up to 250,000 dollars of gain, or 500,000 for a married couple filing jointly, if you meet the two of five year test. Confirm with a CPA."},
      {"q":"Should I buy my next place before selling?","a":"It depends on your finances and your comfort with risk. Selling first gives budget certainty, buying first is easier to move into. Contingencies and rent backs can bridge the two."},
      {"q":"How do I handle a lifetime of belongings?","a":"Estate sales, donation pickups, and senior move managers handle most of it. A room by room timeline keeps it manageable."},
      {"q":"I am not in a hurry. Is that okay?","a":"Completely. Downsizing deserves a calm pace. I work patiently and let you lead the timeline."}
    ]'::jsonb,
    'Thinking about downsizing in Wisconsin? How to time the sale, handle capital gains, and make the move easier. Patient, local help from Anthony Stolp.',
    true,
    '5e259344-5cf2-4179-a56b-15e2f69fe1fb'
  )
on conflict (slug) do nothing;
