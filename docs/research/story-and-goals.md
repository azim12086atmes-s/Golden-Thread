# Story and Goals — research, story bible, goal list, game-logic spec

*Research date 2026-09-25. Scope: an immersive story for **The Golden Thread** and the complete
goal / game-logic structure behind it. Written against the code as it stands in v0.1
(`src/quests/quests.ts`, `src/npc/people.ts`, `src/economy/items.ts`, `src/housing/housing.ts`,
`src/social/Messages.ts`, `src/core/state.ts`, `src/quests/QuestSystem.ts`). Nothing in `src/`
was edited; everything here is a proposal.*

**How to read this.** §1 is what the research says, distilled into rules we can hold ourselves to.
§2 is the story bible: the travellers, the mystery, the act structure, and one chapter per land,
each with its interlude and its folk-tale side stories (the side stories carry their own
trigger → completion → reward, so they are also goals). §3 is the full goal list. §4 is the
implementation spec: state, gates, numbers, formulas, rules, and the files and types to extend.
§5 is sources and §6 is the keyword log.

**Things the owner has to decide** are marked **DECISION**. There are four of them. The most
important is in §2.2: whether the travellers are *promised* or *married*.

---

## 0. What exists today (the baseline this document builds on)

| Fact in code | Where | Consequence for the design |
|---|---|---|
| 20 lands on a 5×4 grid; Meadow at (2,1); Sky Isles at (2,2) directly south of it | `world/regions.ts` | The Sky Isles are close to home from the start: the finale is always *visible* but not *reachable*. That is good; we lean on it. |
| 19 land chapters + `main-skyisles`; every chapter only needs `main-meadow` | `quests/quests.ts` | The world is open after the prologue. Acts therefore have to trigger on **lantern count**, not on specific lands (§2.4). |
| Finale needs 8 lanterns (`lanternsNeeded: 8`) | `quests.ts` | Too early for a finale. Split into an **ascent** at 8 and the **Great Lantern** at 19 (§4.3). |
| Keeper's first talk teaches the land's skill to level 1 | `Game.talk()` → `teach()` | Keeps every chapter solvable locally. Keep this. |
| Hearts 0..5, integer; 2 hearts = friend who writes; first talk sets 1 | `QuestSystem.addHearts`, `Game.talk` | Too coarse for per-day effort. Add **points** under the hearts (§4.5). |
| Messages every 6–16 game-hours per friend; 28 % requests | `social/Messages.ts` | At 90 game-minutes per real minute this is one letter per friend every 4–11 real minutes. With 58 friends it floods. Needs a global pace (§4.6). |
| `light` starts 1; +1 per chapter; +0.2 per animal friend; flight ceiling = ground + 40 + light × 24; gathering doubles at light > 4 | `state.ts`, `Travellers.ts`, `Game.ts` | Light is already *the* progression currency. The story should make it mean something (the thread), and the gates should be read off it (§4.3). |
| A day is 16 real minutes; resources regrow after 180 game-minutes (2 real minutes) | `Game.ts` | Sets the economy clock (§4.4). |
| Saves are version 1 and a load fills missing fields from `newGame()` | `core/save.ts` | New state fields can be added **without** bumping the version, as long as each has a default in `newGame()`. `deserialize()` refuses `version !== 1`, so **do not bump it** without adding a migration. |

---

## 1. Design lessons distilled

Each lesson names where it came from and what it means for this game specifically.

### 1.1 Structure

1. **Open world, soft gates** (*A Short Hike*). The whole park is open from minute one; the only
   thing between you and the summit is stamina, and stamina comes from helping people and
   exploring. Our `light` is exactly that: it raises the cape's ceiling and it is earned by
   kindness. So we gate **height**, not **map**. Every land stays reachable by road; the sky is
   what you earn.
2. **Hub and spokes** (*Spiritfarer*'s boat, *Stardew*'s town). A home you return to between
   ventures gives the story a place to be *absorbed*. We have two hubs: the **Meadow** (where
   Noor is, where the story begins and ends) and the **van**, which is a hub that travels. Story
   beats that need reflection happen in the van at night.
3. **Count-based acts in an open world.** Because chapters can be played in any order, act
   transitions fire on *how many* lanterns are lit, and act text never names the land you just
   finished. This is how *Road 96* handled order-independence: fixed beats, variable order and
   context.
4. **The meta goal restores the place** (*Stardew*'s Community Center, *Cozy Grove*'s colour).
   Lighting a lantern must *visibly* change the land: lit windows, people outside, music. The
   player should be able to see the whole world getting brighter on the map.
5. **Build the story on the people you meet, not on the protagonist** (*Road 96*'s creative
   director). Our two travellers are deliberately quiet; the story is carried by the Keepers,
   the residents and six recurring characters of the road.

### 1.2 Narrative

6. **Tasks and story should be the same thing** (*Spiritfarer*, per the GDC 2022 narrative review).
   A spirit who needs help walking to the dock *is* the story of her age. So: a chapter's craft
   *is* its emotional beat. The Korean chapter is about people who stopped writing, so the task is
   paper and letters. Never "fetch 3 X" without a reason that is the story.
7. **Crisis is not required** (*Eastshade*). A painter with no combat can carry a whole game on
   small, familiar NPC problems, commissions and letters of introduction. Our "villain" is
   distance and forgetting, never a person.
8. **Objects can tell a relationship** (*Unpacking*). The van interior and the keepsakes friends
   give are the couple's biography. We never narrate their love; we let the player see a van that
   fills up with a rug from the desert, a lantern from the souq, a verse from the courtyard.
9. **Wordless companionship** (*Journey*). Two strangers bonded without language, through a
   chirp that recharged each other's scarves. Our pair are joined by a thread whose light
   recharges the cape when they are close; that is the same mechanic, and it proves that
   closeness can be *mechanical* without being *physical*.
10. **Work, burnout, and getting your magic back** (*Kiki's Delivery Service*). Kiki loses her
    flight when her craft becomes only a job, and gets it back through friendship, not a spell.
    Act III uses this: a scripted, non-punishing night where the thread flickers because they
    have only been working, and it comes back when they rest and are cared for (§2.4).
11. **Saying goodbye is the player's choice** (*Spiritfarer*'s Everdoor). Nothing in our story is
    taken from the player on a timer. Characters leave only when the player walks them to the
    door.

### 1.3 Friendship, goals, rewards

12. **Friendship trees with visible next steps** (*Sky: Children of the Light*). Each spirit has a
    tree of rewards and a bar that fills; the next node is always visible. Our friends get a
    five-heart track with a named reward at each heart (§3.4), shown in the journal.
13. **Friendship arithmetic from Stardew is a good skeleton, but drop the decay.** Stardew: 250
    points a heart, +20 for a daily chat, +80 for a loved gift, one gift a day, two a week, and
    −2 a day for neglect. Decay makes players anxious and punishes travelling, which is our whole
    premise. We keep the shape (points under hearts, daily chat, loved gifts) and replace decay
    with **warmth**: a friend you have not seen in a week writes to say they miss you (§4.5).
14. **Daily and time-gated content: small, optional, never blocking** (*Animal Crossing*'s
    Nook Miles+, *Cozy Grove*'s daily colour). Five small daily tasks are pleasant; gating the
    *story* by real days is the most common complaint about Cozy Grove. We offer daily
    "kindnesses" but never gate a chapter behind them.
15. **Failed goals should free space, not end things** (*Dorfromantik*). A quest that can no
    longer be done simply disappears and makes room for another. We go further: nothing expires
    at all, and a missed festival returns next year.
16. **Letters as a friendship channel** (*Animal Crossing*). Villagers write; gifts attached to
    letters count; letters arrive in the morning. We copy the morning delivery and the gift
    attachment.
17. **Seasons and a real calendar** (*Animal Crossing*, *Sky*). Seasons change the world and bring
    returning events. We run our own game calendar and offer an **opt-in** real-calendar sync for
    Ramadan and the two Eids (§4.8).

### 1.4 Cozy and kind design

18. **Safety, abundance, softness** (Project Horseshoe 2017, Lostgarden). Coziness is the promise
    that nothing bad will happen, that needs are met, and that the senses are soothed. What breaks
    it: danger, extrinsic reward pressure, mandatory responsibilities, and too much stimulus.
    Every rule in §4.10 is one of these.
19. **Prosocial systems** (Lostgarden, *Kind Games*). Make win–win the default. Give people
    different things so they need each other. Make gifting rational, make generosity visible,
    and keep communication narrow and positive. For us: each land makes what another land
    wants; letters carry requests between lands; gifts are always worth more than selling.
20. **Unrewarded kindness sticks better.** Research on prosocial games found that helping in a
    game *without* a reward shifted players' self-concept more than rewarded helping. So some
    kindnesses in our game pay **nothing** except a line of thanks and a thread mote: carrying an
    old man's shopping, sitting with someone on a bench, returning a child's kite. §3.10 lists
    them. They are the heart of the game, and they should not show a coin toast.

### 1.5 Cultural and religious grounding

21. **Hospitality to the traveller is a real, deep tradition, so use it.** In Islam the wayfarer
    (*ibn al-sabil*) is owed care by name. Seljuk caravanserais along the trade routes gave
    travellers three days of free food and shelter as endowed charity, spaced about 30 km apart.
    The *futuwwa* and Akhi brotherhoods ran lodges whose members competed to host travellers; Ibn
    Battuta stayed with them across Anatolia and marvelled at them. This gives us a **lodge
    network** on the roads between lands (§2.6) and a central theme: the travellers begin as
    guests and end as hosts.
22. **Barakah: sharing makes enough.** The teaching that food eaten together is blessed, and
    that a little shared becomes sufficient for many, is a mechanic, not only a theme. Shared
    meals yield more (§4.4). It is never shown as a number to grind (§4.10, rule 11).
23. **Represent Ramadan and Eid as a community would, not as a costume.** Mainstream games rarely
    mark them, and when they do it is often orientalist decoration. Lanterns (the Cairene
    *fanous*, which children carry and sing with), the street *tables of mercy* that feed any
    passer-by at sunset, and sharing are community practices we can show with dignity. Worship
    itself is not gamified: no prayer counters, no fasting meters.
24. **Folk tales: keep the moral, soften the violence, credit the culture.** Many classic tales
    end in death or punishment (the Panchatantra tortoise falls; Nolbu is ruined; Hatim kills his
    horse). We keep the *lesson* and rewrite the ending so nobody is harmed. We say where a story
    comes from in the journal, and we avoid stories whose centre is worship of a deity.
25. **A cross-cultural trickster is a gift to a road game.** Juha, Nasreddin Hodja, Goha (Egypt),
    Giufà (Sicily) and Afanti (Uyghur, China) are one family of wise fools, spread by centuries of
    travel, often shown riding a donkey backwards. One recurring character who turns up in many
    lands under his local name is both funny and true to history.
26. **The cowherd and the weaver** (Qixi / Chilseok / Tanabata). Two lovers who can meet only
    across a bridge that magpies and crows build once a year. It is the closest folk mirror of our
    premise: love kept at a distance and joined by something built out of other people's
    kindness. The Hanok Village side story builds that bridge with the village (§2.5, Korea).

---

## 2. Story bible

### 2.1 Premise

The lanterns at the heart of every land have dimmed. Nobody can say when it started. People have
drifted into their own houses; letters go unwritten; strangers do not share tables. In Wanderers'
Meadow, old **Grandmother Noor** gives two young travellers her van, *Safar* ("journey"), and says
only: *"A thread is strong because it is shared."*

The two are joined by a **golden thread of light** that nobody else can explain. It glows brighter
when they help someone. It lets them fly — a cape of light each — and it recharges when they stay
close. They set out to earn their living by being useful: weaving, cooking, fixing, writing,
carrying things from where they are plentiful to where they are needed. In each land they meet the
**Keeper** of its lantern, learn the land's craft, help its people, and relight its lantern with the
light of the thread.

The deeper they go, the clearer it becomes that someone has done this before.

**Tone:** a Ghibli road film told by a hakawati. Warm, funny, sometimes sad, never dark. Nobody is a
villain. The obstacle is always distance, forgetting, loneliness, pride or tiredness — never a
person to defeat.

### 2.2 The two travellers

**Default names:** **Amal** (girl, the player; "hope") and **Rafiq** (boy, her companion;
"companion, the one who walks beside you"). Both names are already the defaults in `newGame()`.
The names mean the premise; the journal can say so once, softly, in the prologue.

| | **Amal** (player) | **Rafiq** (companion) |
|---|---|---|
| Where from | Grew up in Wanderers' Meadow, the baker Lina's niece. Restless; always looking down the road. | Arrived in the Meadow three years ago with a travelling carpenter who moved on without him. Noor took him in. |
| What they are good at | Seeing what people need before they say it. | Fixing things. Noticing small animals. Cooking when nobody asked him to. |
| What they are afraid of | Being ordinary; never having left. | Being left again. |
| Why they travel | To see the world and to be of use in it. | Because she is going, and because he wants to belong somewhere he has chosen. |
| What they learn | That usefulness is not the same as worth, and that rest is part of the road (Act III). | That staying is a choice you can make anywhere, and that he has already been chosen (Act V). |
| Arc in one line | From *"I want to go everywhere"* to *"I want to bring everyone home."* | From *"Don't leave me behind"* to *"I'll wait for you by the road"* — and meaning it as a gift, not a fear. |

**DECISION 1 — promised or married.** The brief says they are lovers who never touch, following
Islamic principles. In Islamic practice a married couple may touch, and an unmarried couple should
not travel and sleep alone together (*khalwa*). The game must pick a framing that holds up:

- **Option A (recommended): promised.** In the prologue Noor, as the elder who took Rafiq in,
  blesses their *khitbah* (engagement). They travel as promised companions with a strict household
  of rules: Safar has a partition curtain and two bunks at opposite ends; on most nights Rafiq
  sleeps in the roof tent or at the lodge (§2.6), and they are hosted in homes wherever possible,
  which is also the story's theme. The **nikah** is the post-game's closing celebration in the
  Meadow, with every friend they have made. The no-touch invariant stays after it, as the game's
  visual language of modesty (*haya*) and because the player is watching.
- **Option B: married at the start.** Simplest to defend on travel and sleeping, but then the
  no-touch rule is a stylistic choice rather than a principle, and the brief's "lovers" becomes
  "spouses".

Everything below is written for Option A; it needs only small wording changes for B.

**How the bond is shown without touch.** Every item here is a mechanic or a staging rule, not a
cutscene:

1. **The thread.** Brightness = shared light. It sags when they are close and draws taut when he
   falls behind (already built in `Thread.ts`). Its motes run faster when they have just helped
   someone.
2. **Shared light in flight.** The cape recharges while they stay close. The mechanic *is* the
   relationship: they go further together.
3. **Sit together.** At about 40 marked viewpoints (benches, rocks, rooftops, dunes), `E` sits them
   down on *separate* seats a bench-width apart. The camera pulls back; the thread glows; after 10
   seconds a line appears from one of them, and a sighting may be revealed (§3.8). This is the
   game's "hand-holding".
4. **Setting down, not handing over.** When he gives her something, he sets it on a surface and
   steps back, and she picks it up. Animations are built around this; no hand-to-hand transfer
   ever exists in the animation set.
5. **Acts of service.** He cooks a dish in the van without being asked (a random evening event
   once a day: a free food item appears on the van table). She mends his scarf (his outfit trim
   changes colour after she crafts a scarf). Love is shown as doing things for the other.
6. **The thread tug.** When Rafiq notices something (an animal, a sighting, a lost item), the
   thread pulls taut in its direction and brightens at his end. This is the hint system, and it
   is his curiosity, not a UI arrow.
7. **Heads turning.** Characters have no faces. Attention is shown by the floating head turning:
   his head turns to her when she speaks to a Keeper; hers to him when he finds something.
8. **Two of everything.** Two unicorns, two capes, two seats with a divider, two mugs on the van
   table, two bunks. Pairs, never one shared object.
9. **What others see.** Residents comment on the thread. *"You two are always an arm's length
   apart and never further."* The world notices the bond so the travellers never have to
   declare it.
10. **Words.** Their lines to each other are short, warm and practical: *"Did you eat?"*,
    *"Wait — look."*, *"I'll get the kettle."* Never flirtation. Tenderness is in care, like
    Noor's letters.

### 2.3 The central mystery: why the lanterns dimmed

**What the player believes at first.** Something is wrong with the lanterns, and relighting them
will fix the world.

**What is true.** Nothing was ever wrong with the lanterns. A land's lantern burns on light that is
*carried to it from somewhere else* — a letter from a friend in another land, a guest at the table,
goods that came from far away, a traveller who stayed three days. Kenji already says it in
`people.ts`: *light carried from far away burns longest*. For forty years, two travellers carried
that light between the lands in a van called *Safar*: **Noor** and her husband **Yaqub**.

When Yaqub died, peacefully and old, Noor stopped travelling. Nobody took the road after them.
Slowly, without anyone noticing, the lands stopped visiting each other, and one by one the
lanterns dimmed — not from any darkness, only from *nobody coming*.

Noor knows all of this. She did not tell them, because she wanted them to find out whether they
would go for their own reasons.

**How the player finds out: the Letters in the Lanterns.** When Yaqub and Noor lit each lantern,
Yaqub left a short letter folded into its base, addressed *"to whoever carries the thread next"*.
Every time the travellers relight a lantern, they find that land's letter. There are 20. Read in any
order, they build the picture:

- early letters are cheerful travel notes signed only **Y.** (*"The tea here is too strong. N.
  pretends to like it."*);
- middle letters mention "N." more, and the van by name;
- two letters mention a thread (*"hers is gold, and I have never seen it tangle"*);
- the Sky Isles letter is to Noor herself, and is only readable after the finale.

Physical clues echo the letters: Amira's old scroll with two travellers drawn on it (already her
letter in `people.ts`); Mehrunissa's miniature of a van; Abu Salim saying "a caravan brought news
of you two" and then, at 5 hearts, "…and of the two before you". The **revelation** is Act IV's
beat, triggered by the 15th lantern, when enough letters are held to recognise the handwriting on
Noor's own old letters in the van.

**Why this ending works.** The finale is not *defeating* the dark. It is the travellers realising
that the work was never one lantern each; it was *keeping the road open*. So the post-game is not
empty: the road stays open because they keep travelling, and because they bring a new family onto
it.

### 2.4 Arc: prologue → five acts → finale → post-game

Act transitions fire on **lanterns lit** (`state.lanterns.length`), so they work in any order. The
land groupings are the *suggested* route the journal shows as "roads ahead", chosen by geography on
the grid. Text in act beats never names the land the player has just finished.

| Stage | Lanterns | Suggested lands | Theme | Beat that closes it (trigger) |
|---|---|---|---|---|
| **Prologue — The Meadow** | 0 → 1 | Wanderers' Meadow | Leaving home. The first thing you make is for someone else. | Noor hands over *Safar*'s keys. First night in the van at the meadow's edge. |
| **Act I — The Near Roads** | 1 → 4 | Sakura Hollow, Alpenrose, Firenzia | Being a guest. Learning that help is a kind of conversation. | **"The Logbook"** (4th lantern). Warda the post-rider brings a parcel from Noor: Safar's old logbook, all pages blank except a hand-drawn map with 20 small stars and the initials *N. & Y.* The first question mark. |
| **Act II — The Long Cold** | 4 → 8 | Fjordhavn, Aurora Huts, Old London, New Yonder | Loneliness in crowds and in the cold. Light that makes people come *out*. | **"The Ascent"** (8th lantern). The cape can now reach the high isles. They fly to the Sky Isles and meet the Lamplighter, who says the Great Lantern takes light from *every* land, and that she has been waiting a very long time — "longer than the last time". She gives them a star-lamp *frame*, empty. |
| **Act III — Threads of Silk and Paper** | 8 → 12 | Hanok Village, Jade Terraces, Nusa Rinjani, Kaveri Coast | Patience, tradition, work done over generations. | **"The Flicker"** (12th lantern). That night the thread flickers and nearly goes out. Rafiq has a fever; they have been working without rest for weeks. The player must *not* do any work: cook him broth, set it down, sit by the van, sleep. By morning the thread is brighter than ever. Noor writes that rest is part of the road too, and that Yaqub once forgot it for a whole summer. The *Kiki* lesson, non-punishing: it cannot be failed, only waited through. |
| **Act IV — The Warm South** | 12 → 15 | Gulabi Nagar, Bagh-e-Noor, Nile Crossing | Abundance, festivals, justice. | **"N. & Y."** (15th lantern). With the letters they hold, Amal recognises the handwriting on Noor's old letters. The mystery resolves: Noor and Yaqub were the travellers before them. A letter to Noor: *"We know."* She answers with one line: *"Then you know why I gave you the van."* |
| **Act V — The Guest and the Host** | 15 → 19 | Maple Row, Madinat an-Nur, Souq al-Qamar, Tents of Rimal | Hospitality. Becoming the ones who welcome. | **"Three Days"** (19th lantern). The travellers host a three-day gathering at their own land (any owned plot) for friends from every land who have reached 3 hearts. It is the first time guests come to *them*. Noor arrives last. |
| **Finale — The Great Lantern** | 19 + ascent | The Sky Isles | Everything carried comes home. | Crafting and delivering the Star Lamp; lighting the Great Lantern. Its light runs down every road they drove, and then — the reveal — **a thread of light appears between every pair of friends they introduced to each other**, crossing the world map. They were never carrying *light*; they were carrying *each other's news*. |
| **Post-game — The Long Road** | — | Everywhere | Keeping the road open. | Noor travels with them once more (rear bench). The Musafir family takes the road. Community builds in every land. The nikah in the Meadow (Option A). |

**The finale's last beat.** On the top isle, the Lamplighter hands Amal the last letter: Yaqub's,
to Noor. The player carries it home to the Meadow — by road, not teleport, the one enforced drive
in the game — and hands it to Noor. Noor reads it on the bench under the Great Oak. The travellers
sit on the next bench (the "sit together" mechanic). No words. Credits roll over the lit map.

### 2.5 The lands: one chapter each

Each land below has: **Keeper** (from `people.ts`), **problem**, **craft taught** (from
`regions.ts`), **what they make** (the chapter's delivery in `quests.ts`), **emotional beat**, the
**Letter in the Lantern** (one line of Yaqub's, in our words), the **interlude** that plays on the
road *out* after the lantern is lit, and **3–5 folk-tale side stories**.

Side-story format: `ID · Title` — *inspired by* — premise — **Trigger → Completion → Reward**.
Step kinds use the existing `Step` union plus the new kinds proposed in §4.2 (`sight`, `sit`,
`build`, `project`, `time`, `hearts`, `host`, `sell`). New items are marked *(new)* and are listed
in §4.9.

---

#### Prologue — Wanderers' Meadow
- **Keeper:** Grandmother Noor. **Residents:** Yusuf (shepherd), Lina (baker).
- **Problem:** The Meadow's lantern under the Great Oak has dimmed; Noor is too old for the road.
- **Craft:** Weaving. **Makes:** 1 scarf for Noor (`main-meadow`).
- **Beat:** The first thing you make is for someone else. Noor wraps the scarf around her shoulders.
- **Letter:** Yaqub, years ago: the oak was a sapling when they left; he hopes whoever reads this
  sits under it when it is grown.
- **Interlude — "First Night":** They park at the meadow's edge. Two mugs on the van table. Rafiq
  makes tea badly. The thread lies between the bunks, along the partition curtain, glowing low.
  Tutorial for sleep and the van.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-meadow-turnip` · **The Enormous Turnip** | Russian cumulative tale (Afanasyev, 1863) | Yusuf grew a turnip too big to pull. He pulls; Lina pulls; the travellers pull; a sheep, a rabbit and a duck join; out it comes. | Talk to Yusuf after `main-meadow` → `befriend` sheep, rabbit, duck (any), then `talk` Yusuf at his field → 60 coins, 3 *turnip (new)*, recipe *turnip stew (new)*, hearts Yusuf +1, Lina +1. |
| `S-meadow-juha` · **The Man on the Backwards Donkey** | Juha / Nasreddin Hodja | On the road out, a man rides his donkey facing its tail. "So I can see where I have been." He becomes a recurring character (§2.6). | First time leaving the Meadow by road → `talk` Juha → collection *Juha's Tales 1/12*; unlocks Juha in other lands. |
| `S-meadow-oak` · **Under the Great Oak** | original | Noor asks them to plant an acorn from the Great Oak on land they own, anywhere in the world. | 5 hearts with Noor → `build` decor `tree` on any owned plot using *oak acorn (new)* → decor *Meadow Oak (new)*, Noor letter chain. |
| existing `side-lamb`, `side-olives`, `side-unicorns` | — | keep as is | keep as is |

---

#### Act I — The Near Roads

##### Sakura Hollow (Japan)
- **Keeper:** Haruka (tea house). **Residents:** Kenji (lantern maker), Aiko (gardener).
- **Problem:** Haruka's teacher left one winter; the tea house empties; people take tea alone.
- **Craft:** Cooking. **Makes:** 2 warm teas (`main-japan`).
- **Beat:** Two strangers, served by the travellers, sit at one table and begin to talk.
- **Letter:** "N. says the tea is too strong. She drinks three cups."
- **Interlude — "Petals on the Windscreen":** Driving out, petals stick to the glass. Rafiq wants to
  stop and pick every one off; Amal says leave them. They leave them. (Mood: first shared joke.)

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-japan-bloom` · **The Old Man Who Made the Trees Bloom** | *Hanasaka Jiisan* | Aiko's grandfather's old cherry has not bloomed in years. His dog keeps digging at its roots. Ash from the old mortar's wood, scattered on the wind, and the tree flowers. (No cruel neighbour in our version.) | Talk Aiko after `main-japan` → `befriend` dog, `craft` *wood ash (new)* (gardening 1, 2 wood), `time` spring morning, `talk` Aiko → decor *blossom tree (new)*, hearts Aiko +2, sighting `sight-japan-bloom`. |
| `S-japan-crane` · **The Crane's Gift** | *Tsuru no Ongaeshi* | A crane with a hurt wing by the pond; befriend it with rice. Days later, a bolt of silver cloth appears on the van step, and the loom in the lodge clicks at night. Aiko: "Do not look." If the player looks, the crane simply flies away, and returns every spring (no loss). If they do not, it leaves a second bolt. | `befriend` crane in Sakura Hollow → after 2 game days, *crane cloth (new)* appears → van curtains option *Crane silk*; if the player never enters the lodge at night for 3 nights, +1 more *crane cloth*. Achievement *Some doors stay closed*. |
| `S-japan-rice` · **The Rolling Rice Ball** | *Omusubi Kororin* | A rice ball rolls into a hole; singing comes up from below. Drop two more and the mice of the hill invite you to their tiny festival. | `time` night, `sit` at the hillside bench, `deliver` 2 *rice ball (new)* to the hole → *mouse lantern (new)* van lamp option. |
| `S-japan-tanabata` · **Wishes on Bamboo** | Tanabata | Summer festival: write wishes on paper strips and tie them to bamboo. Residents' wishes are readable; some are side-quest hints for other lands. | Summer day 7 (festival) → `craft` 3 *tanzaku (new)* (calligraphy 0, 1 hanji), tie at the bamboo → collection *Wishes*, 3 hints. Repeats yearly. |
| existing `side-kenji-letter`, `side-aiko` | — | keep | keep |

##### Alpenrose (Switzerland)
- **Keeper:** Anneli (cheesemaker). **Residents:** Matthias (clock mender), Clara (guide).
- **Problem:** The valley farms stopped sharing milk and cheese; each family keeps its own.
- **Craft:** Cooking. **Makes:** 1 alpine cheese (`main-switzerland`).
- **Beat:** Anneli cuts it into forty pieces. Everyone gets one.
- **Letter:** "Y. tried to yodel. The cows left."
- **Interlude — "The Pass":** A switchback road at dusk. The van's lights on the snow. Rafiq counts
  hairpin bends out loud and loses count at twelve; Amal finishes the count.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-swiss-bells` · **Chalandamarz** | Engadine spring custom (1 March) | Children ring cowbells from door to door to chase winter off; the girls make paper flowers for the bells. The travellers make the flowers. | Spring day 1 → `craft` 6 *paper flower (new)* (weaving 0, 1 hanji or 1 paint) → `deliver` to Clara → decor *cowbell arch (new)*, hearts Clara +1. Yearly. |
| `S-swiss-alpabzug` · **Bringing the Herd Down** | Alpabzug / Désalpe | Autumn: the cows come down from the high pasture decorated with flowers. Help lead them, flying above as herders. | Autumn day 3, `befriend` 3 cows → `craft` 3 *flower crown (new)* → walk the herd path (`visit` waypoints) → 5 cheese, hearts Anneli +1, sighting `sight-swiss-herd`. Yearly. |
| `S-swiss-alm` · **The Hermit on the Alm** | the gruff-grandfather-on-the-mountain archetype of Swiss literature | An old man lives alone above the treeline and sends everyone away. He is not unkind; he is grieving. Bring him cheese and company three times, and on the fourth he comes down for the herd festival. | `hearts` Clara 3 → `visit` the high hut 3 separate days with any food → he appears at `S-swiss-alpabzug` → decor *alpine bench (new)*. |
| `S-swiss-edelweiss` · **The Highest Flower** | Alpine lore of edelweiss as the flower out of reach | Clara wants an edelweiss from the highest ridge, only reachable by cape once light is high enough. Nothing to prove; she just wants to know it is still there. Leave it, and tell her. | light ≥ 6 → `sight` `sight-swiss-edelweiss` → `talk` Clara → hearts Clara +2, achievement *Left it growing*. No item: an unrewarded kindness. |
| existing `side-matthias` | — | keep | keep |

##### Firenzia (Renaissance Italy)
- **Keeper:** Maestro Lorenzo. **Residents:** Giulia (olives), Matteo (bell ringer).
- **Problem:** The cathedral floor has a hole where tiles went missing; nobody fills it because
  "it isn't mine to fix".
- **Craft:** Pottery. **Makes:** 1 marble mosaic (`main-renaissance`).
- **Beat:** Lorenzo sets the mosaic in the centre where the light falls.
- **Letter:** "We filled a gap in a floor. Nobody will ever know. That is the best kind."
- **Interlude — "The Wrong Turn":** They take a wrong turn into an olive grove. An old farmer waves
  them in for bread. The first time they are hosted by a stranger on the road.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-firenzia-puppet` · **The Carver's Puppet** | *Pinocchio* (Collodi, 1883) | An old woodcarver carves a puppet to have someone to talk to. The travellers bring the town's children to his workshop; he gives a puppet show; he is never alone again. (No living puppet; the magic is company.) | Talk Matteo → `craft` *puppet (new)* (carpentry 1, 2 wood, 1 paint) → `deliver` → `host` 3 children at the workshop (evening) → decor *puppet theatre (new)*. |
| `S-firenzia-giufa` · **"Eat, My Clothes!"** | Giufà (Sicilian Juha) | Giufà is ignored at a feast in rags, then welcomed in fine clothes, so he feeds the soup to his sleeve. Juha appears as Giufà and asks the travellers to help him make a point, kindly. | `S-meadow-juha` done → Juha in Firenzia → `wear` any fine outfit, `talk` at the feast → *Juha's Tales +1*, outfit tip. Moral: honour people, not clothes. |
| `S-firenzia-befana` · **The Sweeping Grandmother** | *La Befana* (Epiphany eve) | On the last night of winter an old woman sweeps every doorstep and leaves sweets for children, because once she was too busy to go with travellers and has regretted it ever since. She asks the travellers to take her along for one night. | Winter day 7, night → travel with her to 5 doorsteps (`visit`) delivering 5 *coconut sweets* or *date cake* → decor *broom & basket (new)*, hearts Giulia +1. Theme: go when you are asked. |
| `S-firenzia-wings` · **The Inventor's Sketches** | Leonardo's flying-machine notebooks | An inventor's apprentice has pages of wing sketches and no one to test them. The travellers' capes fly; could the sketches help the capes glide? Links to `S-nur-firnas`. | light ≥ 4 → `deliver` 1 *clockwork bird* → *glide sketch (new)* (collection); with `S-nur-firnas` → cape glide upgrade. |
| existing `side-giulia` | — | keep | keep |

---

#### Act II — The Long Cold

##### Fjordhavn (Norway)
- **Keeper:** Ingrid (boatwright). **Residents:** Olav (fisherman), Sigrid (knitter).
- **Problem:** The harbour is quiet. Boats are hauled up; nobody goes out together.
- **Craft:** Carpentry. **Makes:** 1 birdhouse (`main-norway`).
- **Beat:** Before they have even left, a bird moves in.
- **Letter:** "Ingrid's grandmother built us a shelf for the van. It still rattles."
- **Interlude — "Ferry":** A ferry crossing. They stand at the rail at opposite ends of a bench,
  the thread over the water. Gulls follow. First sight of the aurora on the horizon.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-norway-mill` · **The Mill at the Bottom of the Sea** | *Why the Sea Is Salt* (Asbjørnsen & Moe) | Olav hauls up an old hand-mill that grinds whatever you ask. The trouble in the tale is not knowing how to stop. The travellers ask it for just enough salt for the village's winter fish, then say the stopping word Olav's grandmother taught him — and give the mill back to the sea. | `hearts` Olav 3 → `talk` → choose "enough" → 5 *salt (new)*, achievement *Enough*, sighting `sight-norway-mill` (it glows under the water at night). A barakah lesson: sufficiency, not more. |
| `S-norway-northwind` · **The Lad and the North Wind** | *The Lad Who Went to the North Wind* | A boy's flour keeps blowing away on the quay. The travellers build a windbreak and weave a tablecloth; the lad's family and neighbours eat at the one table the wind cannot reach. (The tale's magic cloth that lays itself becomes a cloth everyone brings food to.) | `build` *windbreak (new)* on the quay (`project` 6 wood, 2 birch) → `craft` *tablecloth (new)* → `host` a quay supper → decor *picnic cloth (new)*. |
| `S-norway-bridge` · **The Troll Under the Bridge** | *Three Billy Goats Gruff* | Goats will not cross the old bridge because of the "troll". He is a lonely bridge-keeper whose bridge is rotting and who shouts because nobody stops. Bring him tea, mend the bridge together, and the goats cross. | `befriend` goat → `talk` the keeper 3 days → `project` bridge (8 wood, 2 gear) → hearts keeper (new NPC *Gruff*), bridge permanently mended. |
| existing `side-sigrid` | — | keep | keep |

##### Aurora Huts (the far North)
- **Keeper:** Aila (aurora watcher). **Residents:** Nils (sleds), Taavi (ice fisher).
- **Problem:** The sky dances, and everyone watches it alone from their own window.
- **Craft:** Lampcraft. **Makes:** 1 ice lantern (`main-aurora`).
- **Beat:** People come out of their huts to see it, then stay, and talk, under the aurora.
- **Letter:** "Coldest night of our lives. We have never talked so much."
- **Interlude — "Polar Night":** It stays dark all day on the road south. They drive by lantern light,
  and a line of the huts' people wave lanterns from the roadside.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-aurora-firefox` · **The Fox of Fire** | *Revontulet* (Finnish: "fox's fires") | Children say the northern lights are sparks thrown up by a fox's tail as it runs across the snow. A real arctic fox runs the ridge at night; befriend it and follow it on a clear night — the sky ignites behind it. | `time` winter night, `befriend` fox (dates) → `visit` its ridge at night → sighting `sight-aurora-firefox`, light +0.5. |
| `S-aurora-song` · **The Song of a Person** | Northern song-portrait traditions | In the North, some songs are not *about* a person but *of* them. At 5 hearts, Taavi makes a short song-portrait of the travellers; it plays whenever they arrive in the Huts. | `hearts` Taavi 5 → music cue *Your Song (new)*. **Care:** if this is framed as the Sámi *joik*, involve Sámi cultural advisers; otherwise keep it generic and unnamed, as written here. |
| `S-aurora-herd` · existing `side-reindeer` extended | — | After the herd returns, Nils asks for a sled harness for the old reindeer. | `side-reindeer` → `craft` *harness (new)* → sled rides (a new travel mode, §4.3). |
| `S-aurora-icefish` · **Patience on the Ice** | Arctic ice-fishing custom | Taavi sits over a hole in the ice and says the lake is still moving underneath. Sit with him for a whole evening; nothing is caught; it does not matter. | `sit` on the ice bench for 2 game hours → hearts Taavi +2. Unrewarded otherwise. |

##### Old London
- **Keeper:** Mr. Hartley (clockmaker). **Residents:** Eleanor (librarian), Arthur (bus driver).
- **Problem:** The great clock is wrong, and nobody looks up anymore.
- **Craft:** Mechanics. **Makes:** 1 repair kit (`main-london`).
- **Beat:** It chimes on time for the first time in years. People look up.
- **Letter:** "Hartley's father fixed the clock for us. It was wrong again by lunchtime."
- **Interlude — "Rain":** Rain on the van roof all the way out of the city. They play a word game.
  The thread is the only warm colour on the road.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-london-whittington` · **Turn Again** | *Dick Whittington and His Cat* | A runaway apprentice sits on a milestone at the foot of the hill, about to give up on the city. The bells ring; he thinks they are calling him back. They are the great clock's bells, which the travellers just fixed. Help him befriend a cat for company; he turns back. | `main-london` done → `befriend` cat → `talk` the apprentice at the stone → decor *milestone with cat (new)*, achievement *Turn again*. |
| `S-london-pearly` · **The Button Coat** | Pearly Kings and Queens (Henry Croft, a street sweeper who collected for orphans) | An orphan road-sweeper collects for a children's home; he wants a coat covered in pearl buttons so people notice him and give. The travellers sew it; the fair raises a fortune. | `talk` Arthur → `craft` *button coat (new)* (weaving 2, 3 spool, 2 *shell button (new)*) → `project` charity fair → outfit *Pearly coat* (girl and boy variants, modest), hearts Arthur +1. |
| `S-london-route9` · **Route 9** | original | Arthur waves to everyone on his route and nobody waves back. Ride his bus and wave at ten people. | `visit` 5 stops on the bus, `talk` 10 residents → hearts Arthur +2. Unrewarded otherwise. |
| existing `side-eleanor` | — | keep | keep |

##### New Yonder (New York)
- **Keeper:** Rosa (diner). **Residents:** Marcus (mechanic), Jamal (rooftop gardener).
- **Problem:** A thousand windows, and nobody knows their neighbour.
- **Craft:** Carpentry. **Makes:** 1 painted sign (`main-newyork`).
- **Beat:** Strangers share tables. Rosa has to add chairs.
- **Letter:** "Rosa's grandmother fed us for a week and would not take a coin. We fixed her fridge."
- **Interlude — "The Bridge at Night":** Leaving over a lit bridge. Rafiq says the city looks like a
  thousand lanterns. Amal says it will, soon.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-ny-stonesoup` · **Stone Soup** (block party) | *Stone Soup* (European folk tale, variants *nail soup*, *button soup*) | The travellers put a pot and a smooth stone on the stoop and say they are making stone soup. One by one, the building brings a carrot, a spoon of spice, an onion. Everyone eats. | `talk` Rosa → `build` *soup pot (new)* on the block → `project` 6 neighbours each add one item (auto) → `host` → food ×10 to give away, hearts +1 with 6 NY residents, achievement *Stone soup*. |
| `S-ny-sleeper` · **The Man Who Slept Twenty Summers** | *Rip Van Winkle* (Irving, 1819) | An old man woke from a long illness and finds the neighbourhood changed and full of strangers. Introduce him to five neighbours, and help him find the café that replaced his old barber's. | `talk` him → `talk` 5 residents with him in tow → he opens a chess table in the park: decor *chess table (new)*. |
| `S-ny-rooftops` · **Tomatoes in the Sky** | original, rooftop-garden movement | Jamal wants a garden on every roof. Plant 3 rooftop beds; bees come. | `build` 3 `farmbed` on Jamal's roofs (loaned plots) → *honey (new)* recipe unlock, sighting `sight-ny-bees`. |
| existing `side-marcus` | — | keep | keep |

---

#### Act III — Threads of Silk and Paper

##### Hanok Village (Korea)
- **Keeper:** Seo-yeon (scholar). **Residents:** Min-jun (potter), Ji-woo (herbalist).
- **Problem:** Neighbours stopped writing to each other.
- **Craft:** Calligraphy. **Makes:** 2 letters (`main-korea`).
- **Beat:** Two neighbours read their letters and laugh at the same memory.
- **Letter:** "Seo-yeon's teacher's teacher taught N. to write her name. N. writes it better than me."
- **Interlude — "Mist":** Mountain mist on the road; they slow to walking pace and hear a temple bell
  far off. Rafiq hums. Amal pretends not to hear, then hums the second line.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-korea-magpie` · **The Magpie Bridge** | Chilseok / the Cowherd and the Weaver; *Ojakgyo* | An old couple live on opposite banks of the stream since the footbridge washed out, and can only wave. On the seventh day of the seventh month, the magpies and crows gather; the village (and the travellers) build the bridge beneath them. The couple meet in the middle for tea. | Summer day 7 → `befriend` 2 magpies/crows *(new species or reuse dove)* → `project` bridge (10 wood, 4 hanji for lanterns) with 6 villagers → sighting `sight-korea-magpie`, decor *magpie bridge (new)*. The game's mirror scene: two people kept apart, joined by what others build. |
| `S-korea-swallow` · **The Swallow's Gourd Seed** | *Heungbu and Nolbu* | A swallow with a broken wing falls from the eaves. Heal it with a balm. In spring it returns with a seed; the gourd that grows is full of — seeds, enough to give every garden in the village one. (No greedy brother punished; the lesson is kindness to small things.) | `craft` balm → `deliver` to the swallow nest → next spring *gourd seed (new)* → `build` farmbed, harvest *gourd (new)* → gourd planter decor, 10 seeds to give away (+1 heart each). |
| `S-korea-crackedpot` · **Still Holds Water** | Min-jun's letter; common folk parable | Min-jun's cracked kiln pot leaks. Carry water with it along the path anyway; where it drips, flowers come up. | `deliver` his cracked pot along the path (`visit` 4 points) → sighting `sight-korea-flowers` next day, hearts Min-jun +2. |
| `S-korea-hangeul` · **Writing Your Name** | Hangeul Day (9 Oct) | Seo-yeon teaches the village children to write their names beautifully. The travellers learn too; the journal's title page shows their names in the new hand. | Autumn day 2 → `craft` 3 letters → journal cosmetic, hearts Seo-yeon +1. Yearly. |
| existing `side-minjun` | — | keep | keep |

##### Jade Terraces (China)
- **Keeper:** Master Lin (silk weaver). **Residents:** Mei (tea merchant), Wei (panda keeper).
- **Problem:** Lin has not woven since his mother died; the loom house is silent.
- **Craft:** Weaving. **Makes:** 1 silk fan (`main-china`).
- **Beat:** Lin opens the fan and is quiet for a long time. Then he laughs.
- **Letter:** "Lin's mother gave N. a fan. N. gave it to a crying child in the next land. Lin's
  mother said that was the correct use of a fan."
- **Interlude — "Terraces at Dawn":** Driving along a ridge at sunrise; the terraces fill with light
  one step at a time.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-china-brush` · **The Magic Brush** | *Ma Liang and the Magic Paintbrush* | A poor boy who draws in the dirt with a stick. The travellers give him a real brush and paint. What he paints does not come alive — but the village sees what it needs (a well, a bench, a bridge), and builds it. (The greedy official becomes an official who learns to ask the boy what the village needs.) | `deliver` 2 paint + 1 bamboo → `project` build 3 things he painted → decor *painted mural (new)*, hearts Mei +1, Wei +1. |
| `S-china-riddles` · **Lantern Riddles** | Lantern Festival riddles (*cai dengmi*, since the Song dynasty) | On the fifteenth night, riddles hang on lanterns. Solve them for small gifts. Riddles are original and translated-friendly (answer choices, not typing). | Winter day 7, night → answer 5 riddles (multiple choice) → 5 small gifts, collection *Riddles*. Yearly, new set each year from a pool of 30. |
| `S-china-afanti` · **Afanti and the Shadow** | Afanti (Uyghur Nasreddin) | A rich man sells Afanti the tree's shade but not the tree; Afanti follows the shade wherever it falls, including into the rich man's house, until the man learns to share shade freely. Played for laughs; the rich man is fine and ends up hosting tea. | `S-meadow-juha` done → Juha appears as Afanti → `sit` in the shade 3 times through the day (`time` 9h, 13h, 17h) → *Juha's Tales +1*. |
| `S-china-mooncake` · **Round Cakes, Round Moon** | Mid-Autumn reunion customs | Mid-autumn: families gather and share round cakes under the full moon. Make mooncakes and bring them to people who are far from family — including, by letter, to Noor. | Autumn day 4 → `craft` 4 *mooncake (new)* → `deliver` 3 + `gift` 1 by letter → hearts +1 each, festival decor *moon lanterns (new)*. Yearly. |
| existing `side-mei`, `side-panda` | — | keep | keep |

##### Nusa Rinjani (Indonesia)
- **Keeper:** Ibu Sari (rice farmer). **Residents:** Budi (rattan), Dewi (batik).
- **Problem:** The high terraces have gone unplanted; young people moved down the mountain.
- **Craft:** Gardening. **Makes:** 2 rice seedlings (`main-indonesia`).
- **Beat:** Sari plants them on the highest terrace, closest to the sky.
- **Letter:** "We planted here. We will never see it grown. That is how the terraces were built."
- **Interlude — "Monsoon":** Warm rain; they wait it out under a roadside shelter with a family.
  Kites shaped like threads over the road afterwards (Sari's letter already mentions them).

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-indo-kancil` · **Kancil Counts the Crocodiles** | *Sang Kancil* (mouse-deer tales) | Kancil the mouse-deer wants the fruit across the river. In the tale he tricks the crocodiles into lining up to be counted. Here the river festival really does need the crocodiles counted, and they agree to line up if everyone brings fruit. Kancil counts, hops over, and everybody eats. | `befriend` a mouse-deer *(new species or reuse deer, small)* → `gather` 6 coconut → `sight` `sight-indo-crocs` (river bridge of backs) → *Juha-like trickster tale +1* (collection *Road Tales*). |
| `S-indo-subak` · **Water in Turns** | *Subak* (Balinese cooperative irrigation) | The water stops reaching the highest terraces because channels upstream are clogged and turns are not kept. Clear the channels and set the sluice turns so every terrace gets water in order. A light puzzle: open channels in sequence. | `talk` Sari → water-channel mini puzzle (4 sluices) → terraces turn green permanently, sighting `sight-indo-terraces`. |
| `S-indo-gotong` · **Many Hands** | *Gotong royong* (mutual cooperation) | A family's new house needs its roof lifted. The whole village comes. Bring rattan and hands. | `project` roof (10 rattan, 4 wood) with 8 villagers at `time` morning → decor *rattan pavilion (new)*, hearts +1 with 3 residents. |
| `S-indo-wayang` · **Shadows on a Screen** | Wayang shadow theatre | A puppeteer's lamp has cracked; without light there is no shadow play. Make a lamp; watch the night show, which is the story of two travellers joined by a thread. | `deliver` 1 lantern → `time` night, `sit` at the screen → story night, collection *Shadow Plays*. |
| existing `side-dewi` | — | keep | keep |

##### Kaveri Coast (South India)
- **Keeper:** Lakshmi Amma (cook). **Residents:** Karthik (boatman), Meena (dancer).
- **Problem:** The temple children go home hungry after lessons; the festival sweets stopped.
- **Craft:** Cooking. **Makes:** 2 coconut sweets (`main-indiasouth`).
- **Beat:** Not one child leaves without two.
- **Letter:** "Lakshmi's grandmother made Y. eat three helpings. Y. says he was not hungry. He was."
- **Interlude — "Backwaters":** Karthik rows them part of the way. The van waits on the far bank.
  First time they travel without it; Rafiq keeps looking back to check it is there.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-kaveri-kolam` · **Kolam at Dawn** | *Kolam* (rice-flour threshold drawings that also feed ants and birds) | Every dawn, women draw kolam at their thresholds in rice flour; the ants and sparrows eat it through the day. Lakshmi teaches Amal. Draw one at the van door every morning for a week. | `time` dawn → draw minigame (trace dots) → 7 days → sighting `sight-kaveri-sparrows`, decor *kolam threshold (new)*. Daily kindness pool entry thereafter. |
| `S-kaveri-pongal` · **Let It Boil Over** | *Pongal* (harvest festival; the pot is allowed to boil over as a sign of abundance) | Cook sweet rice with the neighbours in new clay pots; everyone cheers when it boils over. | Winter day 2 → `craft` *pongal (new)* in a *pot* → `host` → 10 food to share, hearts +1 with residents. Yearly. |
| `S-kaveri-boats` · **Hundred Oars** | Snake-boat rowing (Kerala) | A long boat needs a hundred rowers in time with a song. No race: the crew's goal is to row in perfect time. A rhythm minigame; the travellers row on opposite sides of the boat. | `hearts` Karthik 3 → rhythm minigame → decor *model boat (new)*. |
| `S-kaveri-tenali` · **The Thieves Who Watered the Garden** | Tenali Rama tales | Two would-be thieves hear there is treasure buried in the garden and dig all night. There is none, but the garden is dug and watered, and the owner invites them to breakfast and gives them work. | Juha appears as a Tenali-style storyteller → `time` night, `sit` → *Road Tales +1*, hearts Meena +1. |
| existing `side-karthik` | — | keep | keep |

---

#### Act IV — The Warm South

##### Gulabi Nagar (North India)
- **Keeper:** Rani Didi (potter). **Residents:** Arjun (spices), Priya (garlands).
- **Problem:** The festival lamps are cracked and the festival is near.
- **Craft:** Pottery. **Makes:** 1 clay pot (`main-indianorth`).
- **Beat:** Rani Didi fills the pot with oil and wick; the first lamp of the festival is theirs.
- **Letter:** "Rani's mother put a garland on Safar's bonnet. Y. did not take it off for a month."
- **Interlude — "Kites Over the Road":** The sky full of kites. A string tangles on the van's
  aerial; they untangle it and hand it back to a small boy on a rooftop — setting it down on the
  parapet.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-gulabi-kites` · **Kite Day** | Makar Sankranti kite festival (Jaipur, mid-January) | The whole city flies kites from the roofs. In our version nobody cuts strings; the travellers fly up by cape and rescue tangled kites and return them. | Winter day 3 → return 8 kites (`visit` rooftops by cape) → *kite (new)* decor, recipe *til sweets (new)*. Yearly. |
| `S-gulabi-puppets` · **The String Puppeteers** | *Kathputli* (Rajasthani string puppetry) | A puppeteer family has lost their puppets' strings in a move. Make new strings and a new puppet; they perform the tale of a local hero at the fair. | `craft` 2 ribbon + 1 *puppet (new)* → `time` evening, `sit` at the fair → hearts Priya +1, collection *Shadow Plays* (puppet show). |
| `S-gulabi-tortoise` · **The Talkative Tortoise** | Panchatantra, *The Tortoise and the Geese* | The children's pond is drying up; a tortoise must move to the lake. In the fable, geese carry it on a stick and it falls when it speaks. Here the travellers carry it in a basket in the van, and it will not stop talking, and that is fine. The lesson (think before you speak) is told by the children at the lake. | `craft` *basket (new)* (weaving 0, 2 rattan) → carry tortoise to lake (`visit`) → hearts +1 with 2 children, *Road Tales +1*. |
| existing `side-priya` | — | keep | keep |

##### Bagh-e-Noor (Mughal garden city)
- **Keeper:** Mirza Sahib (royal gardener). **Residents:** Mehrunissa (miniature painter), Farhan (fountains).
- **Problem:** The roses bloom but nobody smells them; the garden has no visitors.
- **Craft:** Gardening. **Makes:** 1 rose attar (`main-mughal`).
- **Beat:** A drop on the marble; the whole garden smells of roses.
- **Letter:** "Mehrunissa's grandmother painted us. She made the van far too handsome."
- **Interlude — "Moon on Marble":** Driving past the tomb-garden by moonlight; they stop and sit on
  opposite ends of the long pool's edge.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-bagh-asmat` · **The Oil on the Rosewater** | Asmat Begum's discovery of rose attar (recorded in Jahangir's memoirs) | Mehrunissa tells how, long ago, a noblewoman making rosewater noticed a film of oil on the warm pots, and that one drop of it smelled of a whole garden. Recreate the discovery: rosewater, warm pots, skim. Unlocks a finer attar. | `hearts` Mehrunissa 3 → `craft` *rosewater (new)*, `time` noon (warm) → recipe *royal attar (new)* (gardening 3), hearts +2. |
| `S-bagh-khichdi` · **Birbal's Khichdi** | Akbar–Birbal tales | A poor man stood all night in the cold river for a prize; the lord refused it, saying a distant lamp warmed him. The wit hangs a pot of rice far above a fire until the lord understands. Played as a story night told by the hakawati, then *you* make sure the man gets his prize by cooking it with him. | hakawati story night → `craft` *khichdi (new)* (cooking 0, 2 rice, 1 spice) → `deliver` to the man → *Road Tales +1*, hearts Farhan +1. |
| `S-bagh-serai` · **The Princess's Serai** | Mughal women who endowed caravanserais for travellers (e.g., Jahanara) | An old serai for travellers on the road out is falling down. Restoring it restores the first **lodge** of the road network (§2.6) and unlocks lodge fast-travel. | `project` serai (12 marble, 8 wood, 4 clay) → lodge network unlocked; achievement *Ibn al-Sabil* (a home for the wayfarer). |
| `S-bagh-crows` · **How Many Crows?** | Akbar–Birbal: counting the crows | A census clerk must count every crow in the city. The wit's answer: some are visiting relatives, some are away. The travellers help the clerk count by sitting on rooftops at dusk. Comedy; ends with the clerk taking the evening off. | `sit` on 3 rooftops at dusk → *Road Tales +1*. |
| existing `side-farhan` | — | keep | keep |

##### Nile Crossing (Egypt)
- **Keeper:** Amira (scribe). **Residents:** Hassan (felucca), Karim (cotton).
- **Problem:** The river's stories are forgotten; the children do not know them.
- **Craft:** Calligraphy. **Makes:** 2 papyrus scrolls (`main-egypt`).
- **Beat:** Amira reads them at the water's edge; children gather.
- **Letter:** "Amira's grandfather drew us on a scroll. He made my nose very large. It is accurate."
- **Interlude — "North Wind":** Hassan's felucca carries them upriver on the north wind at sunset,
  the van on a barge behind.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-nile-peasant` · **The Eloquent Farmer** | *The Eloquent Peasant* (Middle Kingdom, c. 1850 BCE) | A farmer's donkey-load was taken by a greedy overseer. He goes to the steward again and again, each time with a better-spoken petition, until he is heard. The travellers help him write his petitions (nine calligraphy scrolls, one a day). Justice through patience and eloquence. | `craft` 1 scroll a day for 9 days (not consecutive required) → `deliver` each → justice scene; decor *petition scroll (new)*, achievement *Nine petitions*. |
| `S-nile-goha` · **Goha and the Donkey** | Goha (Egyptian Juha) | Goha and his son walk the donkey, ride it, both ride it, carry it — and every village criticises them differently. The travellers walk with him; the lesson: you cannot please everyone; do what is kind. | Juha appears as Goha → `visit` 4 villages with him → *Juha's Tales +1*. |
| `S-nile-picnic` · **The Spring Breeze** | *Sham el-Nessim* (spring picnic shared by Egyptians of every faith) | At dawn families bring blankets to the riverbank; coloured eggs, onions, fish, and palm-leaf weaving. Join a picnic and weave palm leaves with the children. | Spring day 2 → `craft` 3 *palm weave (new)* → `sit` at the riverbank → hearts +1 with Nile residents, decor *palm-leaf basket (new)*. Yearly. |
| `S-nile-fanous` · **The Lantern Children** | Cairene *fanous* tradition (children carrying lanterns and singing, since the Fatimid era) | In Lantern Week (§4.8) children walk the lanes with lanterns and songs. Make five *fanous* and give them to children who do not have one. | Lantern Week → `craft` 5 *fanous (new)* (lampcraft 1, 2 sand, 1 scrap) → `deliver` 5 children → decor *fanous string (new)*. Yearly. |
| existing `side-hassan` | — | keep | keep |

---

#### Act V — The Guest and the Host

##### Maple Row (vintage town)
- **Keeper:** Mabel (seamstress). **Residents:** Otis (records), June (florist).
- **Problem:** The carousel is silent; its music box lost its tune.
- **Craft:** Weaving. **Makes:** 2 ribbon bows (`main-vintage`).
- **Beat:** The carousel turns; the music box finds its tune.
- **Letter:** "Mabel's mother mended N.'s coat. It is the only coat N. owns."
- **Interlude — "Radio":** The van's radio picks up Otis playing a record *for the travellers*,
  dedicating it by name.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-maple-appleseed` · **The Apple Walker** | Johnny Appleseed legend (nurseries planted ahead of settlers; famously kind to animals) | An old wanderer who plants apple nurseries where he guesses people will one day live. He is too old for the long roads now; he gives the travellers saplings to plant on owned land in 5 lands. | `talk` him → `build` *apple sapling (new)* on plots in 5 different lands → decor *apple tree (new)*, recipe *apple cake (new)*, achievement *Planted ahead*. |
| `S-maple-mending` · **Mend and Make Do** | original (mending as care) | Mabel's customers bring clothes they love too much to throw away. Mend 5; each comes with a story. | `craft` 5 *patch (new)* (weaving 0, 1 spool) → `deliver` → 5 short stories, hearts Mabel +2. |
| `S-maple-record` · **The Record With No Label** | original | Otis has a record nobody can identify; a song he remembers his father whistling. Carry it to Arthur in London and Matteo in Firenzia; the melody is the bell tune Matteo rings. | `deliver` the record to 2 NPCs in 2 lands → Otis letter chain, music cue. |
| existing `side-june` | — | keep | keep |

##### Madinat an-Nur (Andalusi-Maghrebi city)
- **Keeper:** Ustadha Maryam (calligrapher). **Residents:** Idris (tiles), Zainab (garden).
- **Problem:** The courtyard fountain runs, but nobody sits by it; the school's door is closed.
- **Craft:** Calligraphy. **Makes:** 2 calligraphy tiles (`main-islamic`).
- **Beat:** Maryam sets the tiles where the water will read them all day.
- **Letter:** "Maryam's teacher wrote our names in gold for the lantern. Look up." *(And the names
  are there, in the lantern, in gold: N. and Y.)*
- **Interlude — "The Call at Dusk":** On the road out, the call to prayer carries across the valley
  from the city behind them; they stop the van by the road. (Staging only; nothing is scored.)

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-nur-fatima` · **The House of Learning** | Fatima al-Fihri, who spent her inheritance founding al-Qarawiyyin in Fez (859) | A woman in the city has inherited a fortune and wants to build a school and library that anyone can enter. The travellers help her build it with the whole city. | `project` school (20 clay, 10 wood, 6 papyrus, 4 caltile) with 10 residents → building appears permanently; library unlocks *Road Tales* reading; achievement *A door for everyone*. |
| `S-nur-firnas` · **The Flight of the Old Inventor** | Abbas ibn Firnas (Córdoba, c. 875), glider of silk and feathers; he landed badly and said he had forgotten the tail | An old inventor builds silk-and-feather wings. The travellers fly beside him on their capes; he lands hard, laughing — "the tail! I forgot the tail". With `S-firenzia-wings`, the capes gain a **glide** (slower fall when out of light). | light ≥ 5 → `deliver` 2 silk + 1 *feather (new)* → `time` noon, fly with him → cape glide upgrade, achievement *Remember the tail*. |
| `S-nur-star` · **Twelve Points** | Islamic geometric star patterns | Idris is one tile short of his twelve-pointed star. Complete the pattern (placement puzzle). | `hearts` Idris 3 → puzzle → decor *star tile (new)*. |
| existing `side-zainab` | — | keep | keep |

##### Souq al-Qamar (Arabian souq)
- **Keeper:** Abu Salim (lamp seller). **Residents:** Layla (perfumer), Faris (camels).
- **Problem:** The market lanes are dark at night; people stay home.
- **Craft:** Lampcraft. **Makes:** 1 glass lantern (`main-middleeast`).
- **Beat:** He hangs it at the gate; the lanes fill with people again.
- **Letter:** "Abu Salim's father made us coffee, three cups. We did not know to shake the cup to say
  *enough*. We drank eleven."
- **Interlude — "Caravan":** A camel caravan passes the van at night on the desert road; the camels'
  bells; Faris's old camel Qamar sits down in the road. They wait.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-souq-hatim` · **More Generous Than Hatim** | Hatim al-Tai, the proverbial host (in legend he fed guests with his own horse) | A poor man has guests coming and nothing but his beloved mare, which he means to sell to feed them. The travellers and the souq gather the food so he need not; he names the mare's foal after the van. The proverb survives; the horse does too. | `talk` Faris → `gather` 4 dates + `craft` 2 *coffee (new)* + 1 bread → `host` at his tent → foal befriendable (horse), hearts Faris +2. |
| `S-souq-coffee` · **Three Cups** | Arabic coffee and *majlis* hospitality (UNESCO-listed) | Learn to serve coffee properly: the host pours, the guest takes three, and shakes the cup to say enough. Serve ten guests at a gathering. | `craft` *coffee (new)* (cooking 1, 1 dates + *coffee beans (new)*) → serve 10 → van item *dallah pot (new)*. |
| `S-souq-nail` · **Juha's Nail** | Juha tale | Juha sold his house but kept the right to one nail in the wall, and keeps visiting to hang things on it. The new owner learns to enjoy the visits. | Juha in the souq → `visit` 3 times → *Juha's Tales +1*. |
| `S-souq-horse` · **The Ebony Horse** | *The Ebony Horse* (Thousand and One Nights) | A toymaker wants to make the flying horse from the old tale as a clockwork toy for the children. Build it together. | `craft` clockwork (mechanics 3) → `deliver` → decor *ebony horse toy (new)*, story night. |
| existing `side-layla` | — | keep | keep |

##### Tents of Rimal (Bedouin desert)
- **Keeper:** Amm Rashid (tent elder). **Residents:** Nadia (weaver), Sami (stargazer).
- **Problem:** A family's tent is cold; the fire burns low; guests do not come any more.
- **Craft:** Weaving. **Makes:** 1 camel-wool blanket (`main-desert`).
- **Beat:** A family sleeps warm, and the fire burns brighter.
- **Letter:** "Rashid's grandfather kept us three days. On the fourth he said: now you are not guests.
  Now you are family. Fetch water."
- **Interlude — "Stars":** They sleep at the dunes' edge (Rafiq on the van roof, Amal inside). Sami's
  star names appear over the map.

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-rimal-sadu` · **The Story in the Stripes** | *Al Sadu* weaving (UNESCO; patterns carry family and place) | Nadia teaches that every stripe of a tent tells the family inside. Weave a Sadu band whose motifs are chosen from the lands the player has lit. | `hearts` Nadia 3 → `craft` *sadu band (new)* (weaving 3, 3 camelwool, 1 *dye (new)*) → van rug option *Sadu*, tent decor. |
| `S-rimal-suhail` · **When Suhail Rises** | Bedouin star lore: Suhail (Canopus) rising marks the end of summer's heat; ath-Thurayya (Pleiades) marks seasons | Sami is learning his thirteenth star. Sit with him on 13 clear nights across the year and learn one star each night. Ends when Suhail rises. | `sit` with Sami at night × 13 (any days) → collection *Star Names*, sighting `sight-rimal-suhail`, light +1. (Extends existing `side-sami`.) |
| `S-rimal-three` · **Three Days** | The guest-right of three days (caravanserai and Bedouin hospitality) | They are Rashid's guests for three days: they are not allowed to work. On the fourth morning they are family and must fetch water. Then, at their own land, they host a stranger for three days. | Stay 3 nights in Rimal (`time`) without crafting → day 4 `gather` water → later `host` a stranger (spawned traveller NPC) at an owned plot for 3 days → achievement *Guest, then host*. The theme of Act V in one quest. |
| existing `side-nadia` | — | keep | keep |

---

#### Finale — The Sky Isles
- **Keeper:** The Lamplighter. **Other life:** light birds, two sky unicorns.
- **Problem:** The Great Lantern takes light from every land, and there has been none to take.
- **Craft:** Lampcraft. **Makes:** the Star Lamp (lampcraft 3) from the empty frame she gave them at
  the Ascent + star dust.
- **Beat:** The Great Lantern wakes; light runs down every road; threads appear between friends.
- **Letter:** Yaqub's letter to Noor (carried home, §2.4).

| ID · Title | Inspired by | Premise | Trigger → Completion → Reward |
|---|---|---|---|
| `S-sky-nests` · **Nests of Light** | original | Light birds nest only where a lantern burns. Build 5 lantern-nests on the isles. | `deliver` 5 lanterns → befriend light birds; sighting `sight-sky-birds`. |
| `S-sky-cloudgarden` · **The Cloud Garden** | original | Grow cloud wisps into a garden on the lowest isle. | `build` 3 farmbeds on a sky plot → *cloud flower (new)*. |
| `S-sky-logbook` · **The Lamplighter's Logbook** | original | The Lamplighter's log lists every traveller who ever came. Two names repeat for forty years; then nothing; then theirs. | post-finale `talk` → journal page. |

### 2.6 The recurring road: characters and lodges

| Character | Who | Appears | Role in systems |
|---|---|---|---|
| **Juha** (and his donkey *Barq*) | The wise fool of a dozen cultures, riding backwards. Goes by Juha in the Souq, Nasreddin on the Meadow road, Goha by the Nile, Giufà in Firenzia, Afanti in the Jade Terraces, a Tenali-style teller on the Kaveri Coast. Always the same donkey. | After `S-meadow-juha`; one land at a time, moving to a random discovered land each game week. | Collection *Juha's Tales* (12). Each tale is a two-minute comic side story with a small moral (§2.5). He never gives coins; he gives riddles, and occasionally a single rare material "that fell off the donkey". |
| **Warda the post-rider** | A young woman on a bicycle with panniers who carries the letters between lands. Cheerful, chronically late, loves gossip. | Whenever a physical item arrives by letter (gifts, parcels, the Logbook). Meets them on the road at interludes. | Diegetic face of `Messages.ts`. Morning mail batch is "Warda's round" (§4.6). At 5 hearts she gives the *post satchel* (inventory +20 slots if slots ever exist; otherwise a van decor). |
| **Shaykh Rahhal** | An old travel-writer compiling a book of every road and wonder, "like Ibn Battuta, but slower". | At lodges; once per act. | Owner of the **Atlas**: the exploration goals (§3.8). Reports sightings as a travel-writer's entries. |
| **Hakawati Anis** | A storyteller with a stick and a fez who tells tales in cafés and lodges at night. | Lodges and tea houses at night. | Story nights: the frame for folk tales told rather than played (Birbal, Wayang, Ebony Horse). Collection *Road Tales*. |
| **The Musafir family** | A young couple with a small son, Zayd, in a battered van, starting out on the road. | From Act II, one sighting per act; post-game central. | Mentorship thread: the travellers teach them one craft per act. Post-game: they take the road, so the light keeps moving. Zayd writes the funniest letters in the game. |
| **Uncle Tajir** | A trader with a covered cart who knows what every market wants. | Any land's market, once per game week. | Economy tutor. Posts **trade orders** (bulk deliveries from one land to another, 2–3× value) — the truck's purpose. |

**Lodges (the wayfarers' network).** Inspired by caravanserais and Akhi lodges. One lodge on the
road between each pair of neighbouring lands that the suggested route crosses (12 lodges). A lodge
is a safe, lit place with a lodge-keeper, a hearth, a bench for "sit together", and a guest room for
Rafiq. First visit: a free meal and a line of the lodge-keeper's news. After `S-bagh-serai` the lodges
become fast-travel points (the van "drives" between them). Lodges host the hakawati's story nights
and Uncle Tajir's orders.

### 2.7 Characters' own threads (the NPC-to-NPC web)

The finale's reveal only works if the player has visibly *connected people*. Every delivery or
letter that carries something from an NPC in one land to an NPC in another creates an **introduction**
(`introductions: [npcA, npcB][]`, §4.1). Existing side quests already do this (Kenji → Seo-yeon,
Matthias ← London gears, Eleanor ← Egyptian scrolls). After an introduction, the two NPCs write to
*each other*, and occasionally mention it to the player ("Seo-yeon sent me a poem!"). At the finale,
each introduction is drawn on the world map as a thread of light.

---

## 3. Complete goal list

Every goal has an **ID**, a **trigger** (what makes it appear in the journal), a **completion
condition** (checkable against `GameState` or an event) and a **reward**. Goals are not all quests:
many are `GoalDef`s evaluated by the new `GoalSystem` (§4.2) and never need a giver. Existing quest IDs
are kept exactly.

Legend: ♥ = hearts; `L` = `state.light`; "lanterns" = `state.lanterns.length`; *(new)* = content to add.

### 3.1 Main story

| ID | Title | Trigger | Completion | Reward |
|---|---|---|---|---|
| `main-meadow` | Two Wanderers | New game | Scarf delivered to Noor; Meadow lantern lit | 40 coins, L +1, Noor ♥2 (existing) · Letter 1 · flag `van-keys` · Interlude *First Night* |
| `main-<region>` × 18 | (existing titles) | `main-meadow` done | Keeper met, item delivered, lantern lit | Existing reward, **with coins scaled by act** (§4.4) · that land's Letter · `house-<region>` decor (existing rule) · Interlude on leaving |
| `beat-logbook` | The Logbook | lanterns ≥ 4 | Auto: Warda meets them at the next lodge or road stop; `talk` Warda | Item *Safar's logbook (new)* (journal map of 20 stars); journal tab *Letters* |
| `sky-ascent` *(new, split from `main-skyisles`)* | The Ascent | lanterns ≥ 8 | `visit` skyisles; reach the top isle; `talk` Lamplighter | *star-lamp frame (new)*; L +1; cloud veil lifts (§4.3) |
| `beat-flicker` | The Flicker | lanterns ≥ 12, next time the van is entered at night | Cook any food and set it down (`deliver` to Rafiq), then sleep | L +1; thread cosmetic *steady glow*; Noor letter |
| `beat-revelation` | N. & Y. | lanterns ≥ 15 and letters held ≥ 10 (else waits until 10) | `talk` Noor (by letter or in the Meadow) | Journal page *The Travellers Before*; Noor ♥ to 5; unlocks Noor's post-game letters |
| `beat-threedays` | Three Days | lanterns ≥ 19 | `host` guests for 3 game days at any owned plot (if none, Noor lends her garden, free) | Every friend ≥ 3♥ visits; Noor arrives last and gives 3 *star dust* |
| `main-skyisles` | The Great Lantern | `sky-ascent` + `beat-threedays` done; **lanternsNeeded 19** (was 8) | Star Lamp crafted and delivered; Great Lantern lit | 500 coins, L +3, flag `finale`, decor `star-arch` (existing) · **thread web** revealed (§2.7) |
| `beat-homeward` | The Last Letter | `main-skyisles` done | Drive to the Meadow (map travel disabled for this one trip) and give Noor Yaqub's letter | Credits; flag `homeward`; post-game opens |
| `post-noor` | One More Road | `beat-homeward` done | Noor rides the rear bench to 3 lands of the player's choice | Decor *Noor's bench (new)* |
| `post-musafir` | Passing the Thread | `beat-homeward` done, Musafir family met in all 5 acts | Teach Zayd's parents one craft in each of 3 lands; see them off | The Musafirs keep writing forever; achievement *The road stays open* |
| `post-nikah` (Option A) | The Walima | `beat-homeward` done | `host` a feast in the Meadow with ≥ 20 friends at 5♥ | Modest wedding outfits, decor *wedding arch (new)*; closing scene |

### 3.2 Per-land goals (template, × 20 lands)

Applied to each `RegionId`. The land's journal page shows these as a ring of eight marks.

| ID | Goal | Trigger | Completion | Reward |
|---|---|---|---|---|
| `L-<r>-arrive` | Arrive | Land visible on map | `region:entered` first time | Map reveal; Shaykh Rahhal note |
| `L-<r>-keeper` | Meet the Keeper | Arrive | `talk` Keeper | Skill level 1 (existing `teach`) |
| `L-<r>-lantern` | Light the lantern | Keeper met | Chapter done | Letter; house style |
| `L-<r>-friends` | Everyone here knows your names | Arrive | All residents of the land ≥ 2♥ | 30 coins; one local decor item |
| `L-<r>-market` | Bring what they need | Market opened | Sell 3 of the land's `wanted` goods here | Keeper sells materials at 1.2× instead of 1.5× |
| `L-<r>-sights` | Seen it all | Arrive | All sightings of the land (§3.8) | Postcard-frame decor of the land |
| `L-<r>-plot` | A place here | Keeper met | Own either plot of the land | Plot-marker lantern |
| `L-<r>-beloved` | Beloved | All residents ≥ 2♥ | All residents 5♥ | The land's festival adds your names (cosmetic); L +1 |

### 3.3 Side goals

- **All folk-tale side stories** in §2.5 (IDs `S-<land>-<name>`, 71 of them) with their own trigger →
  completion → reward.
- **The 24 existing side quests** (`side-*`) stay as they are, attached to their lands in §2.5.
- **Juha's Tales** (`S-juha-1..12`): one per land Juha visits. Trigger: Juha is in the current land.
  Completion: that tale's steps. Reward: collection entry, occasionally 1 rare material.
- **Trade orders** (`O-<n>`, repeatable, from Uncle Tajir). Trigger: truck owned. Completion: deliver
  5–10 of a material from land A to the market in land B (grid distance ≥ 3). Reward: 2.5 × value × qty.
- **Introductions** (`I-<a>-<b>`). Trigger: an NPC mentions someone far away. Completion: carry a
  letter or item between them. Reward: both +30 friendship points; a thread on the finale map.
- **Community projects** (`P-<land>-<name>`, §4.4): the big builds inside side stories (magpie bridge,
  house of learning, serai…). Trigger: the side story. Completion: materials contributed + the build
  day. Reward: a permanent structure in the town.

### 3.4 Friendship milestones (every resident)

**Template, per NPC** (points system in §4.5):

| Heart | Name | Trigger → completion | Reward |
|---|---|---|---|
| 1♥ | Acquaintance | First talk | Journal card with name and role |
| 2♥ | Friend | 200 points | They write letters (existing `FRIEND_AT = 2`); their loved gifts are revealed one at a time as you give gifts |
| 3♥ | Confidant | 300 points | Their personal story (short quest or story night; "3♥ story" column below) |
| 4♥ | Invited | 400 points | An invitation letter; visit their home at night for a meal (a family recipe for cooks) |
| 5♥ | Kindred | 500 points | **Keepsake** (decor or van item *(new)*); joins community projects automatically; may visit your plots; appears in the finale web |

**Per NPC.** "Loves" are item IDs that exist today; every NPC also *likes* anything on their land's
`wanted` list.

| NPC | Loves | 3♥ story | 5♥ keepsake *(new)* |
|---|---|---|---|
| noor | minttea, scarf, datecake | Tells of "a road she once drove" without naming it | Noor's kettle (van) |
| yusuf | feed, wildflower, bread | A lamb is born; he asks the travellers to name her | Lamb's bell |
| lina | olive, bread, datecake | Her famous burnt-bread recipe | Lina's bread tin + recipe *honey loaf* |
| haruka | tea, minttea, vase | Reads her old teacher's letter aloud | Tea bowl |
| kenji | hanji, lantern, cedar | River lanterns on the new moon | Van-shaped paper lantern |
| aiko | seed_flower, birdhouse, pot | Her little pine grows a branch | Bonsai pine |
| seoyeon | letter, hanji, verse | Shows the letters pinned above her desk | Brush and inkstone |
| minjun | clay, pot, vase | `S-korea-crackedpot` | Moon jar |
| jiwoo | ginseng, herbs, balm | A walk in the mountain mist | Herb bundle |
| lin | silk, fan, shawl | His mother's loom, working again | Silk wall hanging |
| mei | tea, datecake, minttea | A haggling lesson, lost on purpose | Tea tin |
| wei | bamboo, feed, ricepudding | The panda who rolls on purpose | Bamboo panda toy |
| ingrid | birch, wood, toyboat | Her little boat floats (mostly) | Model boat |
| olav | scarf, minttea, bread | `S-norway-mill` | Glass float |
| sigrid | fleece, wool, scarf | The gold scarf "like your thread" | Gold-knit scarf (outfit accessory) |
| anneli | milk, cheese, bread | The high meadow at dawn | Cowbell |
| matthias | gear, gearkit, clockwork | The tower clock is only one minute wrong | Cuckoo clock |
| clara | edelweiss, cheese, minttea | `S-swiss-edelweiss` | Pressed-edelweiss frame |
| hartley | gear, clockwork, minttea | Tea at four | Pocket watch |
| eleanor | scroll, verse, letter | The book returned forty years late | Bookshelf |
| arthur | bread, minttea, sign | `S-london-route9` | Bus-stop sign |
| rosa | sign, curry, datecake | Pie with your names on the slice | Diner booth |
| marcus | scrap, gearkit, curry | The kid's bike lap of honour | Toolbox |
| jamal | seed_herb, herbs, paint | First strawberry | Rooftop planter |
| lorenzo | marble, mosaic, vase | The apprentice's crooked tile | Mosaic panel |
| giulia | olive, bread, cheese | Harvest supper | Olive-oil jar |
| matteo | gear, ribbon, bread | Rings the bell for you | Little bell |
| mabel | spool, ribbon, shawl | Mends Amal's scarf | Sewing box |
| otis | paint, sign, coconutsweet | `S-maple-record` | Record player |
| june | jasmine, seed_flower, wildflower | The sunflowers taller than her | Flower cart |
| maryam | caltile, verse, blossom | Writes their names in gold | Framed names in gold |
| idris | clay, caltile, mosaic | `S-nur-star` | Zellige table |
| zainab | blossom, seed_flower, pot | The fountain after rain | Orange-tree pot |
| abusalim | lantern, dates, incense | Remembers "the two before you" | The best lamp in the souq (van lamp) |
| layla | rose, incense, attar | Names a scent after the van | Perfume bottle |
| faris | dates, feed, blanket | `S-souq-hatim` | Camel bell |
| rashid | minttea, blanket, dates | The tent you helped raise | Brass coffee pot |
| nadia | camelwool, spool, rug | `S-rimal-sadu` | Sadu cushion |
| sami | stardust, lantern, datecake | `S-rimal-suhail` | Star jar "Thirteen" |
| amira | papyrus, scroll, ricepudding | The scroll with two travellers | Scribe's palette |
| hassan | cotton, bread, scarf | Sunset sail | Felucca model |
| karim | cotton, seed_herb, feed | Cotton like "snow in summer" | Cotton quilt (van quilt) |
| ranididi | pot, clay, minttea | The street of lamps | Clay lamp set |
| arjun | spice, saffron, curry | The saffron glow | Spice box |
| priya | marigold, garland, ribbon | The thousand-garland wedding | Garland door hanging |
| lakshmi | coconut, rice, coconutsweet | Her grandmother's kitchen | Brass cooking pot |
| karthik | curry, coconut, rattan | `S-kaveri-boats` | Oar |
| meena | jasmine, garland, ribbon | Dances the monsoon | Anklet-bell wind chime |
| mirza | rose, attar, seed_flower | Moonlight on the marble | Rose bush |
| mehrunissa | paint, verse, rose | `S-bagh-asmat` | Miniature of the van |
| farhan | gearkit, gear, marble | Counts all forty fountains | Little fountain |
| sari | seed_rice, rice, feed | Plants on the highest terrace | Woven sun hat |
| budi | rattan, wood, coconut | A chair a child can carry | Rattan chair |
| dewi | silk, cotton, paint | Waves and stars | Batik cloth (van art) |
| aila | icelantern, ice, minttea | The reindeer at her door | Star chart |
| nils | wood, pinecone, scarf | `S-aurora-herd` | Toy sled |
| taavi | minttea, scarf, bread | `S-aurora-icefish` | Ice-fishing stool |
| lamplighter | starlamp, stardust, verse | `S-sky-logbook` | Lamp of Every Land |

Recurring characters (Juha, Warda, Rahhal, Anis, the Musafirs, Tajir) and the new NPCs from side
stories (Gruff, the apprentice, the sweeping grandmother, the sleeper, the apple walker, the inventor,
the lodge-keepers) use the same template; their keepsakes are listed in §4.9.

### 3.5 Animal goals

Befriend with the species' `diet` (existing `SPECIES`), adopt onto an owned plot with a pen, keep happy.

| ID | Goal | Trigger | Completion | Reward |
|---|---|---|---|---|
| `A-first` | A friend with four legs (or two wings) | Game start | Befriend any animal | L +0.2 (existing); journal *Animals* tab |
| `A-<species>` × 21 | Friend of the <species> | Species seen | Befriend one | Collection entry; hint of its home land |
| `A-all` | Everyone's friend | — | Befriend all 21 species | Title *Friend of Every Creature*; decor *animal weathervane* |
| `A-adopt` | Home for a friend | Own a plot with a pen | Adopt any animal | Pen sign decor |
| `A-produce` | Given freely | Adopt a producer | Collect produce 10 times (wool, milk, camel wool, feed) | 10 of that produce |
| `A-happy7` | Content | Adopt | One animal ≥ 80 happiness on 7 consecutive **visits** (not days, so travel is never punished) | Name-tag decor |
| `A-herd` | A little farm | — | 5 adopted animals across any plots | *Feed trough (new)*: auto-feeds 1 a day from inventory |
| `A-unicorns` | Rainbow friends | `side-unicorns` | Existing | Existing (unicorns) |
| `A-lightbirds` | Birds of light | Sky Isles | `S-sky-nests` | Light birds follow the van at night |
| `A-van-pet` | A friend for the road | lanterns ≥ 2 | Befriend a cat or dog and choose "come with us" | Van pet on the dashboard (one; swappable) |

Species for `A-<species>`: sheep, rabbit, unicorn, duck, cat, crane, deer, panda, dog, horse, reindeer,
fox, goat, cow, camel, buffalo, elephant, peacock, dove, donkey, lightbird. Optional new species for
side stories, reusing models where possible: magpie (dove, recoloured), swallow (dove, smaller),
mouse-deer (deer at 0.4 scale), tortoise (new model, no face, per the anatomy invariant).

### 3.6 Home, land and farm

| ID | Goal | Trigger | Completion | Reward |
|---|---|---|---|---|
| `H-plot1` | Somewhere to come back to | 60 coins held | Buy any plot | 2 flower-bed decor |
| `H-plot5` | Five hearths | — | Plots in 5 different lands | *Signpost of your lands (new)* |
| `H-plot20` | A home in every land | — | A plot in all 20 lands | Title *Of Every Land*; L +1 |
| `H-plot40` | Every plot | — | All 40 plots | Achievement only |
| `H-cottage` | Four walls | Own a plot | Place a cottage | House interior unlocked (Roadmap item 1) |
| `H-house-style` | Built like the neighbours | Lantern lit in land X | Place `house-X` on a plot in land X | Housewarming visit from that land's Keeper |
| `H-houses10` | Ten roofs | — | 10 regional houses placed | Decor *roof lantern* |
| `F-plant` | First seed | Own a farm bed | Plant | — |
| `F-harvest10` | Harvest | — | 10 harvests | 5 of each seed |
| `F-allcrops` | Every crop | — | Harvest every crop in `CROPS` (incl. new ones) | *Scarecrow (new)*, modest and faceless |
| `F-season` | In season | Seasons live | Harvest each crop in its best season | Growth +10 % permanently on that plot |
| `F-share` | Harvest shared | — | Give 20 crops as gifts | Barakah +5 (§4.4) |
| `B-project1` | Many hands | First community project | Complete one | A permanent structure in that town |
| `B-project-all` | Built together | — | All 12 community projects | Title *Builder of Bridges* |

### 3.7 Van and house decoration

| ID | Goal | Trigger | Completion | Reward |
|---|---|---|---|---|
| `V-first` | Make it yours | Van entered | Change any van slot from its default | — |
| `V-all8` | Home on wheels | — | All 8 `VanSlot`s decorated | Van exterior option: gold stripe |
| `V-lands` | A van of many lands | — | Van items whose recipes come from ≥ 6 different lands at once | Van *road-map wall art* |
| `V-keepsakes5` | Gifts from friends | — | 5 keepsakes owned | New `VanSlot` `shelf` *(new)* holding 3 keepsakes |
| `V-night` | Cozy night | — | Lights + lamp + quilt set, then sleep in the van | Rafiq's evening dish guaranteed that night |
| `D-house1` | Furnished | Cottage or house owned | Fill every slot of one house interior | Housewarming letters from 3 friends |
| `D-style` | Styled | — | A house interior using only items of its own land's style | That style's rare rug |
| `D-all-styles` | Twenty rooms | — | One furnished interior in every regional house style | Title *Keeper of Rooms* |

### 3.8 Exploration: every settlement and natural sighting

A `sight` goal completes when the player is within range with the target in view, under its stated
condition (time, season, light). Rafiq's thread tug points at a sighting the first time it is in
range. Shaykh Rahhal writes each into the **Atlas**. Reward per sighting: a journal postcard and
L +0.1. Completing a land's set completes `L-<r>-sights`.

**Settlements (32):** the 20 land cores (`L-<r>-arrive`) and 12 lodges on the roads
(`X-lodge-<a>-<b>`; trigger: on the road between lands a and b; completion: rest at the hearth;
reward: a free meal; the lodge becomes a rest point; fast travel after `S-bagh-serai`).

**Natural and landmark sightings (ID `sight-<land>-<suffix>`):**

| Land | Sightings (suffix: condition) |
|---|---|
| Meadow | `oak` the Great Oak (any) · `rainbow` after rain (day) · `fireflies` (night) · `unicorns` grazing (day) |
| Sakura Hollow | `pagoda` (any) · `petalstorm` (spring, wind) · `cranes` dancing (dawn) · `bloom` the old tree in flower (`S-japan-bloom`) · `riverlanterns` (new-moon night) |
| Hanok Village | `roofs` in mist (dawn) · `maples` deer in red maples (autumn) · `magpie` the bridge (festival night) · `flowers` along the path (`S-korea-crackedpot`) |
| Jade Terraces | `pavilion` (any) · `panda` rolling downhill (day) · `terracefog` (dawn) · `riddles` lantern riddles (festival night) |
| Nusa Rinjani | `roofs` horned roofs (any) · `volcano` sunrise on the volcano (dawn, L ≥ 5) · `terraces` green (after `S-indo-subak`) · `crocs` the crocodile bridge (`S-indo-kancil`) · `fireflies` (night) |
| Kaveri Coast | `gopuram` temple tower (any) · `kingfisher` (day) · `monsoon` (summer) · `sparrows` at the kolam (`S-kaveri-kolam`) · `elephants` bathing (morning) |
| Gulabi Nagar | `windows` the pink windows (golden hour) · `kites` (festival) · `peacock` dancing (after rain) · `lamps` the street of lamps (festival night) |
| Bagh-e-Noor | `dome` under the full moon · `fountains` all forty (`side-farhan`) · `peacockwall` (day) · `roses` in bloom (spring) |
| Nile Crossing | `pyramids` turning gold (sunset) · `flood` green to the horizon (summer) · `sails` on the north wind (afternoon) · `cotton` bursting open (autumn) |
| Madinat an-Nur | `fountain` (any) · `blossom` orange blossom (spring) · `doves` at the minaret (dawn) · `startile` Idris's star (`S-nur-star`) |
| Souq al-Qamar | `gate` lanterns (night, after lantern) · `windtowers` (sunset) · `haze` sand haze (afternoon) · `caravan` bells (night) |
| Tents of Rimal | `dunes` (any) · `stars` "no dark between them" (clear night) · `suhail` Suhail rising (`S-rimal-suhail`) · `shootingstar` (night, random) |
| Fjordhavn | `harbour` (any) · `glass` still fjord (dawn) · `aurorafaint` (winter night) · `mill` glowing underwater (`S-norway-mill`, night) |
| Aurora Huts | `aurora` (night) · `firefox` fox fire (`S-aurora-firefox`) · `reindeer` at the observatory door (day) · `midnightsun` (summer) |
| Alpenrose | `chalets` (any) · `alpenglow` pink valley (dawn) · `edelweiss` highest flower (L ≥ 6) · `herd` coming down (`S-swiss-alpabzug`) |
| Old London | `clock` (any) · `fog` river fog (dawn) · `ducks` in the park (day) · `lookup` people looking up at the chime (after lantern, noon) |
| New Yonder | `towers` at night · `gridsunset` sunset down the avenue (dusk) · `bees` rooftop bees (`S-ny-rooftops`) · `bridge` lit (night) |
| Firenzia | `dome` at sunset · `cypress` road (any) · `mosaiclight` sun on the mosaic (noon, after lantern) · `bellbirds` birds lift at the bell (on the hour) |
| Maple Row | `carousel` lit (night, after lantern) · `sunflowers` (summer) · `maplefall` (autumn) · `drivein` stars over the drive-in (night) |
| Sky Isles | `temple` (any) · `cloudsea` (dawn) · `stardustfall` (night) · `skyunicorns` (day) · `allthelights` every lantern visible from the top (post-finale, night) |

Plus `sight-thread-web`: the finale's web of threads, seen from the top isle at night after the finale.

### 3.9 Crafting mastery

`LEVEL_XP = [0, 20, 60, 140, 280, 500, 800]` (existing). Titles show on the skill card.

| ID | Goal | Trigger | Completion | Reward |
|---|---|---|---|---|
| `C-<skill>-1` × 8 | Apprentice | Keeper teaches it | Level 1 | (existing `teach`) |
| `C-<skill>-3` × 8 | Journeyman | — | Level 3 | One new recipe in that skill (§4.9) |
| `C-<skill>-6` × 8 | Master | — | Level 6 | Master's tool (decor) and a master recipe |
| `C-first-gift` | Made for someone | — | Give a crafted good as a gift | Nothing (unrewarded; §1 lesson 20) |
| `C-all-recipes` | Every recipe | — | Craft every recipe once | Title *Of Many Hands* |
| `C-lands` | Made in every land | — | Craft at least once in each of the 20 lands | Van workbench decor |
| `C-all-master` | Master of all eight | — | All 8 skills at level 6 | L +2; outfit trim *gold thread* |
| `C-teach` | Passing it on | `post-musafir` | Teach 3 crafts to the Musafirs | See §3.1 |

### 3.10 Collections

| ID | Collection | Size | How entries are gained |
|---|---|---|---|
| `K-letters` | Letters in the Lanterns | 20 | Lighting each lantern (the Sky Isles letter after the finale) |
| `K-juha` | Juha's Tales | 12 | Juha side stories |
| `K-roadtales` | Road Tales (hakawati) | 16 | Story nights and tricksters of other traditions (Kancil, Birbal, Tenali, the tortoise) |
| `K-stars` | Star Names | 13 | `S-rimal-suhail` nights with Sami |
| `K-wishes` | Wishes | 30 | Tanabata strips (villagers' wishes, each a hint) |
| `K-riddles` | Lantern Riddles | 30 | Jade Terraces festival |
| `K-shadow` | Shadow Plays and Puppets | 4 | Wayang, kathputli, the carver's puppet, the ebony horse |
| `K-keepsakes` | Keepsakes | 58 + recurring | 5♥ with each NPC |
| `K-recipes` | Recipes | 38 existing + new | Crafting; friendship; festivals |
| `K-outfits` | Wardrobe | 42 existing + new | Existing wardrobe + quest outfits |
| `K-sights` | The Atlas | ~92 | §3.8 |
| `K-postcards` | Postcards | unlimited | Photo mode (Roadmap item 8) |

### 3.11 Unrewarded kindnesses (the daily pool)

Each game day, residents of the current land offer at most three. They pay **nothing but a line of
thanks and one thread mote** (a visible spark on the thread; barakah +1). This follows the finding
that unrewarded helping shifts self-concept more than paid helping.

Pool (about 40, tagged by land): carry someone's shopping to their door · return a dropped scarf ·
sit with someone on a bench (`sit` 1 game hour) · give directions · return a child's kite or ball
from a roof (cape) · water a neighbour's pot plant · walk an old dog · help a cat down · pick up
litter at a viewpoint · light a neighbour's lamp at dusk · draw a kolam (Kaveri) · feed the doves
(Madinat) · clear snow from a doorstep (Aurora, Alpenrose) · share tea with a street sweeper
(London) · hold the diner door (New Yonder) · wave from the bus (London) · untangle a fishing net
(Fjordhavn) · shade a sleeping camel (Rimal).

### 3.12 Seasonal and daily

| ID | Goal | Trigger | Completion | Reward |
|---|---|---|---|---|
| `D-kind` | Three kindnesses | Each game day | Any of the day's kindnesses | Thread motes only |
| `D-mail` | Morning mail | Each dawn with mail | Read all letters | — |
| `D-market` | Today's want | Uncle Tajir's daily rotating want per land | Sell that item in that land | ×2.5 price instead of ×2 |
| `D-vandish` | Rafiq's dish | Each evening in the van | Eat it (free) | Cape starts full next morning |
| `W-tajir` | Weekly order | Each game week, truck owned | One trade order | §3.3 |
| `E-<festival>` × ~26 | Festivals | Calendar (§4.8) | Be in the land during the festival window and do its activity | Festival decor; +30 friendship with residents; repeats yearly |
| `E-lantern-week` | Lantern Week | Game calendar, or real Ramadan if opted in (§4.8) | Craft and give 5 *fanous*; host one *table of mercy* at sunset | Decor *fanous string*; Warda's lantern letter |
| `E-eid-lanterns` | Eid of Lanterns | Day after Lantern Week | Wear a new outfit; visit 5 friends in person; give sweets to 5 children | Outfit gift from Noor; +50 friendship with each friend visited |
| `E-eid-sharing` | Feast of Sharing | 13 days after Lantern Week begins | Cook for and host 10 guests; send 3 food gifts by letter | Barakah +10; decor *long table* |
| `E-season-<s>` × 4 | The turning year | Each season start | See the season's 3 sightings anywhere | Seasonal van curtain |

### 3.13 Achievements

Shown with a title and a small drawing. None is required for anything.

| ID | Name | Condition |
|---|---|---|
| `ACH-first-scarf` | For someone else | Deliver the first scarf |
| `ACH-first-sit` | A bench-width apart | First "sit together" |
| `ACH-sit40` | Every good view | Sit together at all 40 viewpoints |
| `ACH-thread-bright` | Brightest thread | L ≥ 20 |
| `ACH-sky-direct` | Straight up | Fly from the ground to the temple without landing on an isle (after `sky-ascent`) |
| `ACH-closed-door` | Some doors stay closed | `S-japan-crane` without looking |
| `ACH-enough` | Enough | `S-norway-mill` |
| `ACH-left-growing` | Left it growing | `S-swiss-edelweiss` |
| `ACH-turn-again` | Turn again | `S-london-whittington` |
| `ACH-stone-soup` | Stone soup | `S-ny-stonesoup` |
| `ACH-nine` | Nine petitions | `S-nile-peasant` |
| `ACH-tail` | Remember the tail | `S-nur-firnas` |
| `ACH-guest-host` | Guest, then host | `S-rimal-three` |
| `ACH-sabil` | A home for the wayfarer | `S-bagh-serai` |
| `ACH-door` | A door for everyone | `S-nur-fatima` |
| `ACH-planted` | Planted ahead | `S-maple-appleseed` |
| `ACH-juha` | Wise fool's friend | All 12 Juha tales |
| `ACH-stars` | Thirteen stars | `K-stars` complete |
| `ACH-letters` | Letters in the lanterns | All 20 letters |
| `ACH-introductions10` | Maker of friendships | 10 introductions |
| `ACH-friends58` | Everyone's friend | All 58 residents ≥ 2♥ |
| `ACH-kindred20` | Twenty kindred | 20 residents at 5♥ |
| `ACH-gifts100` | Open hands | 100 gifts given |
| `ACH-kind100` | Nobody saw | 100 unrewarded kindnesses (counted silently, shown only when earned) |
| `ACH-lodges` | Every lodge | All 12 lodges |
| `ACH-plane` | Short flight | Buy the biplane |
| `ACH-balloon` | Slow and high | Ride the lantern balloon |
| `ACH-all-vehicles` | Every road | Own every vehicle |
| `ACH-market-far` | Carried far | Sell a material 7 grid steps from its origin |
| `ACH-rich-in-friends` | Rich in friends | More friends at 5♥ than hundreds of coins held |
| `ACH-flicker` | Rest is part of the road | `beat-flicker` |
| `ACH-home` | Homeward | `beat-homeward` |
| `ACH-year` | A year on the road | 28 game days played |
| `ACH-festivals` | Every festival | Attend every festival once |
| `ACH-atlas` | The whole Atlas | Every sighting |
| `ACH-farm` | Grown with care | `F-allcrops` |
| `ACH-houses` | Keeper of rooms | `D-all-styles` |
| `ACH-master` | Of many hands | `C-all-master` |
| `ACH-road-stays-open` | The road stays open | `post-musafir` |

---

## 4. Game logic spec

Written to be implemented against the existing modules. Every section names the file and the type
to extend. Pure rules stay pure (no three.js in rules modules), so every rule below is unit-testable
the way `tests/systems.test.ts` already tests economy, quests and messages.

### 4.1 State: `src/core/state.ts`

Add these fields to `GameState` **and** to `newGame()`. Keep `version: 1`: `deserialize()` in
`core/save.ts` fills any missing top-level field from `newGame()` and merges one level of plain
objects, so old saves load with the new defaults. Nested per-NPC fields are *not* merged, so every
reader of `FriendState` must default them (`f.points ?? f.hearts * 100`).

```ts
// FriendState (extend; all optional so old saves stay valid)
export interface FriendState {
  hearts: number;            // kept as a cache of floor(points / 100), 0..5
  befriended: boolean;
  lastMessageAt: number;
  points?: number;           // 0..500; source of truth once written
  lastTalkDay?: number;      // dayOf(minutes) of the last counted chat
  lastGiftDay?: number;      // one gift a day per NPC
  lastSeenDay?: number;      // last in-person talk, for "missing you" letters
  loveKnown?: string[];      // loved items revealed so far
  milestones?: number[];     // hearts whose reward has been granted (3, 4, 5)
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

// GameState additions
story: { beats: string[]; letters: string[]; interludes: string[] };  // ids seen, in order
sightings: string[];                         // 'sight-<land>-<suffix>'
collections: Record<string, string[]>;       // 'juha' | 'roadtales' | 'stars' | 'wishes' | 'riddles' | 'shadow' | 'keepsakes'
goals: Record<string, number>;               // goal id → game-minute completed
introductions: Array<[string, string]>;      // npc pairs, sorted, unique
projects: Record<string, { given: Record<string, number>; done: boolean }>;
houses: Record<string, Record<string, string>>;   // plotId → interior slot → option id
daily: { day: number; kindnesses: string[]; done: string[] };
barakah: number;                             // hidden; never shown as a number (§4.10 rule 11)
mailQueue: Array<Omit<Message, 'id'>>;       // letters composed at night, delivered at dawn
counters: Record<string, number>;            // gifts, kindnesses, sits, hosts… for achievements
settings: { realCalendar: boolean };         // opt-in real Hijri calendar for Lantern Week / Eids
questYears?: Record<string, number>;         // yearly festival quests: last game-year completed
```

Defaults in `newGame()`: empty arrays/objects, `barakah: 0`, `daily: { day: 0, kindnesses: [], done: [] }`,
`settings: { realCalendar: false }`.

Calendar helpers (pure, same file, next to `dayOf` / `hourOf`):

```ts
export const SEASON_DAYS = 7;
export const YEAR_DAYS = 4 * SEASON_DAYS;                    // 28 game days ≈ 7.5 real hours
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const yearOf   = (m: number) => Math.floor((dayOf(m) - 1) / YEAR_DAYS) + 1;
export const dayOfYear = (m: number) => ((dayOf(m) - 1) % YEAR_DAYS) + 1;      // 1..28
export const seasonOf = (m: number): Season => SEASONS[Math.floor((dayOfYear(m) - 1) / SEASON_DAYS)];
export const dayOfSeason = (m: number) => ((dayOfYear(m) - 1) % SEASON_DAYS) + 1; // 1..7
export type DayPart = 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night';
export function dayPart(m: number): DayPart {
  const h = hourOf(m);
  return h < 5 ? 'night' : h < 7 ? 'dawn' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 20 ? 'dusk' : 'night';
}
```

### 4.2 Quests, story and goals

**`src/quests/quests.ts`: extend `Step`, `Reward`, `QuestDef`.**

```ts
export type Step =
  | /* existing seven kinds */
  | { kind: 'sight'; sighting: string; text: string }
  | { kind: 'sit'; at?: string; region?: RegionId; minutes?: number; text: string }   // sit together (at a viewpoint id)
  | { kind: 'build'; decor: string; region?: RegionId; text: string }                // place decor on an owned plot
  | { kind: 'project'; project: string; text: string }                             // community build completed
  | { kind: 'time'; parts?: DayPart[]; seasons?: Season[]; region?: RegionId; text: string } // be there then
  | { kind: 'hearts'; npc: string; hearts: number; text: string }
  | { kind: 'host'; guests: number; days?: number; text: string }                  // host at an owned plot
  | { kind: 'sell'; item: string; qty: number; region?: RegionId; text: string }
  | { kind: 'wear'; outfit?: string; tag?: string; text: string }
  | { kind: 'choice'; options: Array<{ key: string; label: string }>; text: string }; // e.g. "enough"

export interface Reward {
  /* existing fields */
  recipes?: string[];                    // unlock recipes outside skill level (see RECIPE_UNLOCKS)
  collect?: Array<[collection: string, entry: string]>;
  keepsake?: string;                     // decor id added to unlockedDecor + collections.keepsakes
  introduce?: [string, string];
  upgrade?: 'glide' | 'sled' | 'lodges' | 'veil';
  letter?: string;                       // a story letter id (Letters in the Lanterns, Noor…)
  points?: Record<string, number>;       // friendship points (finer than hearts)
  barakah?: number;
}

export type QuestKind = 'main' | 'side' | 'folk' | 'beat' | 'festival' | 'order' | 'juha' | 'post';

export interface QuestDef {
  /* existing fields */
  kind?: QuestKind;                      // default: main ? 'main' : 'side'
  act?: 0 | 1 | 2 | 3 | 4 | 5 | 6;       // 0 prologue … 6 finale; for the journal only
  requires?: {
    hearts?: Record<string, number>;
    light?: number;
    flags?: string[];
    lanternsAtLeast?: number;            // generalises lanternsNeeded
    lettersAtLeast?: number;
    seasons?: Season[];
    days?: [from: number, to: number];   // dayOfYear window (festivals)
    parts?: DayPart[];
    vehicle?: VehicleId;
  };
  repeat?: 'yearly' | 'weekly';
  auto?: boolean;                        // starts itself when available (beats, festivals); giver may be 'road'
  credit?: string;                       // "Inspired by: Hanasaka Jiisan (Japan)" — shown in the journal
}
```

Keep `lanternsNeeded` as an alias of `requires.lanternsAtLeast` so `tests/quests.test.ts` and old data
stay valid. Change `main-skyisles` to `lanternsNeeded: 19` and `after: ['sky-ascent', 'beat-threedays']`,
and add the `sky-ascent` quest with `lanternsNeeded: 8`.

**Coins for chapters.** Replace the fixed `coins: 40` in `chapter()` with a value computed at grant
time, so it stays order-independent: `coins = 40 + 20 × actOf(lanternsBeforeThisOne)` where
`actOf(n) = n < 1 ? 0 : n < 4 ? 1 : n < 8 ? 2 : n < 12 ? 3 : n < 15 ? 4 : 5`. Implement as
`reward.coins = 'act'` (a sentinel) or a `coinsFn` evaluated in `QuestSystem.grant`.

**`src/quests/QuestSystem.ts`.**
- `isAvailable(q)`: add the `requires` checks. A yearly quest is available again when
  `questYears[q.id] < yearOf(minutes)` and its window is open; on start, reset its progress.
- `tick()` (new, called each frame or each game-minute): auto-start `auto` quests that are available;
  advance `time`, `hearts`, `sight` steps whose condition is now true.
- New event handlers: `sighting:seen` → `sight` steps; `travellers:sat` → `sit`; `plot:changed` →
  `build`; `project:done` → `project`; `host:done` → `host`; `item:sold` → `sell`;
  `outfit:changed` → `wear`.
- `grant()`: handle the new reward fields; introductions push a sorted pair into `introductions` and
  emit `npc:introduced`.
- `addHearts()` becomes a thin wrapper over `addPoints(st, bus, npc, n × 100)` (§4.5), so every
  existing caller keeps working.

**New `src/story/story.ts` + `src/story/StorySystem.ts`.**
- `LETTERS: Record<RegionId, { id; text; from: 'Y.' | 'N.' }>` — the Letters in the Lanterns.
- `BEATS: Array<{ id; lanterns: number; quest: string }>` — `beat-logbook` 4, `sky-ascent` 8,
  `beat-flicker` 12, `beat-revelation` 15, `beat-threedays` 19.
- `INTERLUDES: Record<RegionId, { id; lines: string[]; staging: 'drive' | 'ferry' | 'boat' | 'lodge' }>`.
- `StorySystem` listens to `lantern:lit` (adds the letter to `story.letters`, emits `letter:found`,
  checks beats) and to a new `region:left` event (plays the land's interlude once if its lantern is
  lit). Interludes are short, skippable, and never block input for more than their fade.

**New `src/goals/goals.ts` + `src/goals/GoalSystem.ts`.** Goals that are not quests (per-land ring,
collections, crafting mastery, achievements).

```ts
export interface GoalDef {
  id: string;
  group: 'land' | 'friend' | 'animal' | 'home' | 'decor' | 'craft' | 'explore' | 'collect' | 'daily' | 'season' | 'achievement';
  title: string;
  /** Events after which to re-check. Checking is cheap; keep it pure. */
  on: Array<keyof GameEvents>;
  visible: (st: GameState) => boolean;      // the trigger
  done: (st: GameState) => boolean;         // the completion condition
  reward?: Reward;
  hidden?: boolean;                         // e.g. ACH-kind100: not listed until earned
}
```

`GoalSystem` subscribes to the union of `on` events, re-checks only goals that listen to the event
that fired, writes `goals[id] = minutes` and grants the reward through the same `grant()` used by
quests (move `grant` into a shared `src/quests/rewards.ts`). The per-land and per-species goals are
**generated** from `REGIONS` and `SPECIES`, like `CHAPTERS.map(chapter)` today.

**`src/core/events.ts`: new events.**

```ts
'region:left': { regionId: string };
'sighting:seen': { id: string };
'travellers:sat': { at: string; minutes: number };
'item:sold': { id: string; qty: number; regionId: string; price: number };
'gift:given': { npcId: string; item: string; loved: boolean; byLetter: boolean };
'npc:points': { npcId: string; points: number; hearts: number };
'npc:milestone': { npcId: string; hearts: 3 | 4 | 5 };
'npc:introduced': { a: string; b: string };
'project:progress': { projectId: string };
'project:done': { projectId: string };
'host:done': { plotId: string; guests: string[] };
'kindness:done': { id: string };
'letter:found': { id: string };
'beat:started': { id: string };
'goal:completed': { id: string };
'day:changed': { day: number };
'season:changed': { season: Season; year: number };
'festival:started': { id: string; regionId: string };
```

### 4.3 Progression gates: what unlocks what

| Thing | Gate today | Proposed gate | Where |
|---|---|---|---|
| Walking, cape, van | Start | Start | `newGame().vehicles` |
| Unicorns | `side-unicorns` (flag) | Same | `vehicles.ts` `requires.flag` |
| Car | 120 coins | 120 coins, lanterns ≥ 1 | `VEHICLES.car.requires` |
| Truck | `side-marcus` | Same; unlocks trade orders | `quests.ts` |
| Biplane | 600 coins, 3 lanterns | Same (lands on Act I's close) | `VEHICLES.plane` |
| Sled *(new)* | — | `S-aurora-herd`; only on snow ground (Aurora, Fjordhavn, Alpenrose) | `vehicles.ts` new `VehicleId` `'sled'`, two separate sleds, like unicorns |
| Lantern balloon *(new)* | — | 400 coins, lanterns ≥ 12; slow, high, two basket halves with a divider (`SEAT_GAP` holds) | `vehicles.ts` `'balloon'`, kind `'air'` |
| Cape glide | — | `S-firenzia-wings` **and** `S-nur-firnas` → out of light, fall at −1.5 instead of −4 | `Travellers.moveFlying` (`vyWant` floor) |
| Flight ceiling | `ground + 40 + light × 24` | Keep the formula; add the **cloud veil** (below) | `Travellers.moveFlying` |
| Cape tier (cosmetic) | — | Ember L 1–3 · Dawn 4–7 · Noon 8–12 · Gold 13–19 · Star 20+ | `CharacterModel` cape colour; `Thread` thickness already scales |
| Double gathering | light > 4 | Same | `Game.gather` |
| Lands | All after `main-meadow` | Same (open world) | `quests.ts` `after` |
| Map fast travel | Discovered lands | Same | `Game.travelTo` |
| Lodge fast travel | — | `S-bagh-serai` | new `world/lodges.ts` |
| Sky Isles top | None (platform hopping reaches it) | **Cloud veil** above isle 12 (y > 18 + 12 × 9 = 126) until `sky-ascent` is available (lanterns ≥ 8): the player drifts down with the line "The clouds are thick here. Not yet." | `Travellers.moveFlying` |
| Finale | 8 lanterns | 19 lanterns + `sky-ascent` + `beat-threedays` | `quests.ts` |
| Regional houses | Lantern lit in that land | Same | `Housing.unlocked()` |
| Keepsakes | — | 5♥ with that NPC | `Reward.keepsake` |
| Festival decor | — | Attend that festival | festival quests |
| Recipes (base) | Skill level | Same | `RECIPES[].level` |
| Recipes (special) | — | Quest/friendship/festival reward; `RECIPE_UNLOCKS: Record<recipeId, source>`; `canCraft` requires `unlockedRecipes.includes(id)` for those | `economy.ts`, `items.ts` |
| House interiors | — | `H-cottage` / any house | Roadmap item 1 |
| Post-game | — | `beat-homeward` | flags |

**Light budget** (for tuning the ceiling). Start 1. Chapters +1 each (19). Ascent +1, Flicker +1,
finale +3. Side rewards with light today: 4 (+1 each). Animal friends +0.2 each (21 species ≈ +4).
Sightings +0.1 each (~92 ≈ +9). Land "beloved" +1 each (20). So: after Act I ≈ 5–6 (ceiling
≈ 170 m; direct flight to the temple becomes *physically* possible, which is why the veil exists);
after Act II ≈ 10–12; end of main story ≈ 25–30; completionist ≈ 60. Keep the ceiling formula but cap
the displayed tier at Star (20+).

### 4.4 Economy loop numbers

**Clock.** 1 real second = 1.5 game minutes; a day = 16 real minutes; `REGROW` = 180 game minutes =
2 real minutes; animals produce once per game day (16 real minutes).

**Targets** (measure with a dev counter `coinsEarnedPerRealHour` in `src/dev.ts`, and tune `REGROW`,
node density and prices until they hold):

| Play time | Coins earned (cumulative, before spending) | What the player can afford |
|---|---|---|
| 30 min | 150–250 | First plot (60–130) + a few decor |
| 1 h | 350–550 | Car (120) or a cottage (150) |
| 3 h | 1,500–2,200 | Biplane (600) |
| 6 h | 4,000–5,000 | 3–5 regional houses (220 each) |
| 12 h (main story) | 9,000–11,000 | Most plots in visited lands |
| 20 h (completion) | ~15,000 | Everything |

**Completion sink** (the number the economy must support): 40 plots ≈ 5,400 · 20 houses = 4,400 ·
vehicles (car 120 + plane 600 + balloon 400) = 1,120 · decor ≈ 3,000 · Keeper purchases and hosting
≈ 1,000 → **≈ 15,000 coins**.

**Price rules** (`src/economy/economy.ts` `sellPrice`):

```ts
// Replace the flat 1.3 "far away" multiplier with distance, so carrying goods further pays more.
const gridDist = (a: RegionId, b: RegionId) =>
  Math.abs(REGION_BY_ID[a].col - REGION_BY_ID[b].col) + Math.abs(REGION_BY_ID[a].row - REGION_BY_ID[b].row);
let mult = !def.origin ? 1 : def.origin === regionId ? 0.6 : Math.min(1.6, 1 + 0.1 * gridDist(def.origin, regionId));
if (wanted.includes(itemId)) mult *= todaysWant === itemId ? 2.5 : 2;
```

Give crafted goods an `origin` equal to the land of their signature material (fan → china, blanket →
desert, attar → mughal, mosaic → renaissance, icelantern → aurora, …) so goods also profit from
travel. Max grid distance is 7 → ×1.6.

**Other numbers.**
- Chapter coins: `40 + 20 × act` (40 → 140) (§4.2).
- Letter requests: keep `value × qty × 1.6`; add +60 friendship points.
- Trade orders (truck): 5–10 units, grid distance ≥ 3, pay `2.5 × value × qty`; one per game week.
- Keeper sells local materials at `ceil(value × 1.5)` (existing), 1.2× after `L-<r>-market`. This is
  the anti-soft-lock valve: every chapter's inputs can always be bought.
- Removing decor refunds half (existing). Selling a keepsake is impossible (not an item).
- **Hosting** (`host` step and free hosting at any owned plot): the player sets out cooked dishes;
  each dish feeds `1 + floor(guests / 2)` guests — *food shared becomes enough*. Each fed guest +50
  points. Hosting costs food, never coins.
- **Community projects** (`src/social/projects.ts`, new): `ProjectDef { id; region; title; needs:
  Record<item, number>; helpers: npcIds; builds: string; reward: Reward }`. The player contributes
  from inventory at the site; every helper at 5♥ contributes 10 % of each need automatically; when
  needs are met, the build happens on the next morning in view of the town, and every helper gets
  +40 points. Projects: magpie bridge, north-wind windbreak, troll bridge, pearly fair, stone soup,
  magic-brush builds, gotong-royong roof, serai, house of learning, Befana's round, Alpine hut,
  Rosa's block party — 12.
- **Barakah** (hidden). +1 per gift, fulfilled request, hosted guest, unrewarded kindness, shared
  harvest. Effect: when gathering or cooking, chance of +1 yield
  `= min(0.4, barakah / (barakah + 60))`. Shown only as more motes on the thread and a soft chime on
  a bonus yield. Never a number, never a bar (§4.10 rule 11).

### 4.5 Friendship math

| Source | Points | Limit |
|---|---|---|
| First talk | +100 (→ 1♥) | once |
| Daily chat | +10 | once per game day per NPC (`lastTalkDay`) |
| Gift, loved | +80 | one gift per NPC per game day (`lastGiftDay`) |
| Gift, liked (land's `wanted`) | +40 | same |
| Gift, anything else | +20, and they name one thing they love (adds to `loveKnown`) | same |
| Gift by letter | same as in person, delivered next dawn | same |
| Quest `hearts` reward *n* | +100 × n | — |
| Reply "How are you?" | +15 | once per their letter |
| Fulfil a letter request | +60 | — |
| Hosted as a guest and fed | +50 | once per hosting |
| Community project helper | +40 | per project |
| Festival attended in their land | +30 | per festival |
| Introduction made | +30 to both | per pair |
| Welcome back (in person after ≥ 7 days away) | +20 | once per absence |

- `hearts = min(5, floor(points / 100))`. `FRIEND_AT = 2` stays (letters start at 200).
- **No decay, no negative gifts.** A gift can never lower friendship. Absence produces a *missing you*
  letter (§4.6), never a loss.
- **Milestones** at 3, 4, 5 hearts fire `npc:milestone` once (tracked in `milestones`) and offer that
  NPC's 3♥ story, 4♥ invitation, 5♥ keepsake (§3.4).
- **Pacing check.** A Keeper reaches 5♥ with: first talk 100 + chapter 200 + ~10 daily chats 100 +
  two loved gifts 160 = 560. That is about a week of game days (≈ 2 real hours spread across play).
  A resident without a quest needs ~2 weeks of casual contact or a few loved gifts. Intended.
- **Migration.** On read: `points ??= hearts × 100`. `addHearts()` keeps its signature and calls
  `addPoints()`; `hearts` stays in sync as a cache so existing UI keeps working.

### 4.6 Message generation rules: `src/social/Messages.ts`

Today every befriended NPC writes on a 6–16 game-hour timer. With 58 friends at 90 game minutes per
real minute that is one letter every few real seconds by late game. The rules below keep letters
special.

**1. Distance rule.** An NPC does not write while the player is in their land. Letters are for
distance; in person you just talk. (Replies to your letters still come.)

**2. Per-friend gap.** `gap = max(6, 16 − 2 × hearts) × 60` game minutes, ±25 % from the existing
`hash()`. A 5♥ friend writes about every 6 game hours; a 2♥ friend every 12.

**3. Delivery windows.** Letters are composed any time but **delivered** only between 06:00 and
21:00. Anything composed at night goes into `mailQueue` and arrives in **Warda's morning round** at
06:00 (maximum 5 in one round; the rest wait for the next slot).

**4. Global pace.** At most one unsolicited letter per 60 game minutes (40 real seconds) across all
friends. **Unread cap:** at 12 unread, only priority 1–2 letters are delivered.

**5. Kinds and priority.** When a friend's gap has elapsed, pick the highest-priority kind whose
condition holds; within a priority level, pick by weight using the existing deterministic `hash`.

| Priority | Kind | Condition | Weight | Content |
|---|---|---|---|---|
| 1 | `news` | A pending event concerns them: their land's lantern was lit (within 1 day), a quest they gave was completed, a friend they were introduced to wrote back | — | Event template ("The whole street lit lamps tonight…") |
| 2 | `invite` | A festival in their land starts within 2 game days; or 4♥ reached (meal invitation) | — | Festival or meal invitation; opens a `time` goal |
| 3 | `missing` | `lastSeenDay` ≥ 7 days ago and hearts ≥ 2 | — | Warm, no guilt: "The kettle is always warm." |
| 4 | `request` | hearts ≥ 2, no open request from them | 0.20 | Item from their `loves` ∪ land `wanted`, **filtered to obtainable**: a material from a discovered land, or a recipe the player's skill level already allows |
| 4 | `tip` | Always | 0.15 | Points at a side story or sighting in another discovered land ("Aila says the fox runs on clear nights") — the hub-and-spoke engine that pulls the player across the map |
| 5 | `ask` | Always | 0.15 | Existing `ASK` pool |
| 5 | `letter` | Always | rest | Existing `letters[]` + a season-tagged pool per NPC (`lettersBySeason`) |

**6. Requests never expire.** An open request can also be fulfilled in person. A request whose item
has since become unobtainable is quietly replaced by a thank-you letter.

**7. Templates.** Fields: `{g}` `{b}` (names, existing), `{land}`, `{season}`, `{item}`,
`{friend}` (an introduced friend's name), `{keeper}`. Every template string is checked by a test that
it resolves with every NPC.

**8. Chains.** After an introduction, the two NPCs "write" to each other on their own schedule
(`introductions` pairs; no stored messages, only an occasional mention to the player:
"Seo-yeon sent me a poem!"). Story letters (Noor after each act, Letters in the Lanterns) bypass the
global pace but still respect the delivery window.

**9. Replies.** Keep the three `REPLY_OPTIONS`. "How are you?" gives +15 points deterministically
instead of the current 35 % chance of a heart. Add **"Send a gift"** (existing `gift`) and, with photo
mode, **"Send a postcard"** (+10, no item).

### 4.7 Day and night: `src/world/Sky.ts`, `Ambience.ts`, `npc/Npcs.ts`

| Part (hours) | World | NPCs | Systems |
|---|---|---|---|
| Dawn (5–7) | Mist, birds, kolam drawn | Keepers open up | Warda's mail round at 06:00; dawn sightings; daily kindnesses refresh at 05:00 (`day:changed`) |
| Morning (7–12) | Markets busy | At work spots | Best gathering light; herd and farm produce ready |
| Afternoon (12–17) | Heat haze in desert lands | At work | Noon sightings (sun on the mosaic, the clock chime) |
| Dusk (17–20) | Lanterns lit in every land whose lantern is lit; unlit lands stay dim | In squares and markets, talkative (+5 extra daily-chat points once) | Sunset sightings; tables of mercy in Lantern Week |
| Night (20–5) | Stars, aurora, fireflies; lit windows only in lit lands | At home; talk at their door; Keepers always reachable at the lantern | Star dust nodes appear on the Sky Isles; night sightings; story nights at lodges; van sleep available |

- **Sleep** (van, lodge, own house): skips to 06:00; cape light full; Rafiq's evening dish if the van
  has a lamp and a quilt. Never required, never penalised if skipped.
- **Keepers are always available** at their lantern, day and night. Nothing on the critical path is
  gated by hour.
- **Visible progress:** lit lands at night are the progress bar (lesson 4). The world map at night
  shows lit lanterns as points of light.

### 4.8 Seasons and the calendar

**Seasons** (`seasonOf`, 7 game days each; a game year is 28 days ≈ 7.5 real hours).

| Season | World-wide | Crop multiplier (growth speed) | Land-specific |
|---|---|---|---|
| Spring | Blossom, lambs | flowers ×1.25 | Sakura petals (Japan), orange blossom (Madinat), roses (Bagh-e-Noor), Chalandamarz (Alpenrose day 1) |
| Summer | Long days | rice ×1.25 | Monsoon (Kaveri), midnight sun (Aurora: no night), Nile flood green, Tanabata/Chilseok (day 7) |
| Autumn | Leaves, harvests | herbs ×1.25 | Red maples (Hanok, Maple Row), the herd comes down (Alpenrose), cotton bursts (Nile) |
| Winter | Snow in the north, cool nights south | all ×0.8 (never 0) | Polar night (Aurora: no day), aurora strongest, kites (Gulabi), Befana (Firenzia), lantern riddles (Jade) |

**Festival calendar** (`dayOfYear`; each is a yearly `festival` quest in its land, window = that day
± 1 unless stated):

| Day | Season/day | Land | Festival (quest) |
|---|---|---|---|
| 1 | Spring 1 | Alpenrose | Chalandamarz (`S-swiss-bells`) |
| 1 | Spring 1 | Bagh-e-Noor | New Year of the Garden (the spring equinox garden feast of the Persianate world) |
| 2 | Spring 2 | Nile Crossing | Spring Breeze picnic (`S-nile-picnic`) |
| 3–5 | Spring 3–5 | Sakura Hollow | Blossom viewing (sit under the trees) |
| 4 | Spring 4 | Nusa Rinjani | Planting day (terraces) |
| 5 | Spring 5 | Madinat an-Nur | Opening of the House of Learning (after `S-nur-fatima`) |
| 10 | Summer 3 | New Yonder | Block party (`S-ny-stonesoup`, repeatable) |
| 11 | Summer 4 | Aurora Huts | Midnight sun |
| 12 | Summer 5 | Maple Row | Carousel fair |
| 13 | Summer 6 | Tents of Rimal | Suhail rising (star night) |
| 14 | Summer 7 | Sakura Hollow, Hanok Village | Tanabata (`S-japan-tanabata`) · Magpie bridge (`S-korea-magpie`) |
| 16 | Autumn 2 | Hanok Village | Writing Day (`S-korea-hangeul`) |
| 17 | Autumn 3 | Alpenrose | The herd comes down (`S-swiss-alpabzug`) |
| 18 | Autumn 4 | Jade Terraces | Mid-Autumn (`S-china-mooncake`) |
| 19 | Autumn 5 | Old London | Pearly fair (`S-london-pearly`, repeatable) |
| 20 | Autumn 6 | Gulabi Nagar | Festival of lamps (`main-indianorth` staging repeats) |
| 21 | Autumn 7 | Meadow | Harvest fair (all friends ≥ 3♥ may visit) |
| 22 | Winter 1 | Aurora Huts | Polar-night lantern walk |
| 23 | Winter 2 | Kaveri Coast | Pongal (`S-kaveri-pongal`) |
| 24 | Winter 3 | Gulabi Nagar | Kite day (`S-gulabi-kites`) |
| 25 | Winter 4 | Fjordhavn | Winter lights on the harbour |
| 28 | Winter 7 | Jade Terraces · Firenzia | Lantern riddles (`S-china-riddles`) · the Sweeping Grandmother (`S-firenzia-befana`) |

**Lantern Week** (Ramadan-inspired) moves through the year the way the lunar calendar moves through
the solar one: about 11 days earlier each solar year, which is ~0.84 of a 28-day game year. So:

```ts
// Lantern Week starts on this dayOfYear in game-year y, drifting one day earlier per year.
export const lanternWeekStart = (y: number) => ((22 - (y - 1)) % YEAR_DAYS + YEAR_DAYS - 1) % YEAR_DAYS + 1;
// 7 days of Lantern Week; Eid of Lanterns on the day after; Feast of Sharing 13 days after the start.
```

During Lantern Week: *fanous* strings appear in Madinat an-Nur, Souq al-Qamar, Nile Crossing, Tents of
Rimal and the Meadow; tables of mercy are set at sunset (the player can host one at any owned plot:
dishes feed passing NPCs for +20 points each); children with lanterns walk the lanes at dusk
(`S-nile-fanous`); the hakawati tells a story every night.

**Real calendar (opt-in, `settings.realCalendar`).** Uses no library:

```ts
const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', day: 'numeric' })
  .formatToParts(new Date());
const month = Number(parts.find((p) => p.type === 'month')!.value);
const day = Number(parts.find((p) => p.type === 'day')!.value);
// month 9 → Lantern Week content for the whole real month; 10/1–3 → Eid of Lanterns; 12/10–13 → Feast of Sharing.
```

When on, the real dates override the game-calendar ones; when off (the default), the game calendar
runs them. Some engines return a Gregorian fallback for unsupported calendars; guard with a check that
`resolvedOptions().calendar` is `'islamic-umalqura'` and fall back to the game calendar otherwise.

**Religious-content rules.** Show community practice: lanterns, sharing food at sunset, visiting,
gifts to children, new clothes at Eid, the call to prayer as ambient sound in lands where it belongs.
**Do not** gamify worship: no prayer counters, no fasting meters, no "pray for a buff", no scoring
of religious acts. Barakah is expressed only through sharing (§4.4).

### 4.9 New content catalogue

**Items and recipes** (`src/economy/items.ts`). Values follow the existing scale; origin = land of the
story. Recipes marked † are unlocked by their story rather than by level alone (`RECIPE_UNLOCKS`).

| id | Name | Kind | Value | Origin | Recipe (skill, level, needs) | Source |
|---|---|---|---|---|---|---|
| turnip | Turnip | crop | 4 | meadow | crop `seed_turnip` | `S-meadow-turnip` |
| turnipstew | Turnip Stew | food | 12 | meadow | cooking 0: turnip 2, herbs 1 † | `S-meadow-turnip` |
| woodash | Wood Ash | material | 2 | japan | gardening 1: wood 2 | `S-japan-bloom` |
| cranecloth | Crane Silk | good | 60 | japan | — (gift) | `S-japan-crane` |
| riceball | Rice Ball | food | 5 | japan | cooking 0: rice 1 | `S-japan-rice` |
| tanzaku | Wish Strip | good | 3 | japan | calligraphy 0: hanji 1 → 3 | `S-japan-tanabata` |
| paperflower | Paper Flower | good | 4 | switzerland | weaving 0: hanji 1 or paint 1 → 2 | `S-swiss-bells` |
| flowercrown | Flower Crown | good | 10 | switzerland | gardening 0: edelweiss 1, wildflower 2 | `S-swiss-alpabzug` |
| puppet | Wooden Puppet | good | 28 | renaissance | carpentry 1: wood 2, paint 1, spool 1 | `S-firenzia-puppet` |
| salt | Sea Salt | material | 3 | norway | — (gift ×5) | `S-norway-mill` |
| tablecloth | Tablecloth | good | 18 | norway | weaving 1: fleece 2, spool 1 | `S-norway-northwind` |
| harness | Sled Harness | good | 20 | aurora | weaving 1: fleece 1, spool 1, wood 1 † | `S-aurora-herd` |
| shellbutton | Pearl Button | material | 4 | london | — (Tajir sells) | `S-london-pearly` |
| honey | Rooftop Honey | food | 14 | newyork | — (bees produce) | `S-ny-rooftops` |
| gourdseed / gourd | Gourd Seed / Gourd | seed / crop | 4 / 8 | korea | crop | `S-korea-swallow` |
| mooncake | Mooncake | food | 14 | china | cooking 1: rice 1, dates 1, milk 1 † | `S-china-mooncake` |
| pongal | Sweet Pongal | food | 12 | indiasouth | cooking 0: rice 2, milk 1 † (requires a `pot`) | `S-kaveri-pongal` |
| kite | Paper Kite | good | 10 | indianorth | carpentry 0: bamboo 1, hanji 1 | `S-gulabi-kites` |
| tilsweet | Sesame Sweets | food | 9 | indianorth | cooking 0: spice 1, dates 1 † | `S-gulabi-kites` |
| basket | Woven Basket | good | 9 | indianorth | weaving 0: rattan 2 | `S-gulabi-tortoise` |
| rosewater | Rosewater | good | 10 | mughal | gardening 1: rose 2 | `S-bagh-asmat` |
| royalattar | Royal Attar | good | 50 | mughal | gardening 3: rosewater 2, rose 2 † | `S-bagh-asmat` |
| khichdi | Khichdi | food | 10 | mughal | cooking 0: rice 2, spice 1 | `S-bagh-khichdi` |
| palmweave | Palm Weave | good | 6 | egypt | weaving 0: dates 1 (palm leaf) | `S-nile-picnic` |
| fanous | Fanous Lantern | good | 26 | egypt | lampcraft 1: sand 2, scrap 1 † | `S-nile-fanous` |
| appsapling / applecake | Apple Sapling / Apple Cake | decor / food | 20 / 14 | vintage | — / cooking 1: apple 2, milk 1 † | `S-maple-appleseed` |
| patch | Mending Patch | good | 5 | vintage | weaving 0: spool 1 | `S-maple-mending` |
| feather | Bright Feather | material | 6 | islamic | — (doves drop) | `S-nur-firnas` |
| coffeebeans / coffee | Coffee Beans / Coffee | material / food | 5 / 10 | middleeast | — / cooking 1: coffeebeans 1, dates 1 † | `S-souq-coffee` |
| sadu | Sadu Band | good | 45 | desert | weaving 3: camelwool 3, dye 1 † | `S-rimal-sadu` |
| dye | Madder Dye | material | 4 | desert | gardening 0: marigold 1 or rose 1 | `S-rimal-sadu` |
| lampframe | Star-lamp Frame | good | 0 | skyisles | — (quest) | `sky-ascent` |
| logbook | Safar's Logbook | good | 0 | meadow | — (quest) | `beat-logbook` |
| acorn | Oak Acorn | seed | 0 | meadow | — (gift) | Noor letter |
| cloudflower | Cloud Flower | crop | 14 | skyisles | crop `cloud` | `S-sky-cloudgarden` |

The Star Lamp recipe becomes `{ lampframe: 1, stardust: 2 }` (lampcraft 3), replacing `lantern: 1`,
so the Ascent is structurally required.

**Decor** (`src/housing/housing.ts` `DECOR`): keepsakes (58, one per NPC, §3.4), festival decor
(cowbell arch, moon lanterns, fanous string, kite, kolam threshold, long table, broom & basket), project
builds (placed in towns, not plots), and plot decor: blossom tree, meadow oak, apple tree, magpie bridge
(miniature), puppet theatre, picnic cloth, chess table, gourd planter, rattan pavilion, milestone with
cat, star tile, petition scroll, palm-leaf basket, ebony horse toy, Noor's bench, wedding arch,
scarecrow, feed trough, signpost of your lands. All must keep the anatomy invariant (anything
creature-shaped has no face).

**Van** (`src/housing/VanInterior.ts` `VAN_OPTIONS`): curtains *Crane silk*; lamp *mouse lantern*,
*souq lamp*; rug *Sadu*; quilt *cotton quilt*; art *batik*, *miniature of the van*, *road map*; new
slot `shelf` (3 keepsakes).

**NPCs** (`src/npc/people.ts` `PEOPLE`): recurring — `juha` (region changes weekly; add
`roaming?: true` to `NpcDef`), `warda`, `rahhal`, `anis`, `tajir`, `zayd` + `musafir-a`/`musafir-b`;
side-story NPCs — `gruff` (Fjordhavn), `apprentice` (London), `befana` (Firenzia, winter only),
`sleeper` (New Yonder), `applewalker` (Maple Row), `inventor` (Madinat), 12 lodge-keepers. Add to
`NpcDef`: `loves: string[]`, `keepsake: string`, `story3?: string` (quest id), `schedule?: 'keeper' |
'worker' | 'roaming'`, `lettersBySeason?: Partial<Record<Season, string[]>>`.

**Regions** (`src/world/regions.ts` `RegionSpec`): add `sightings: SightingDef[]` (id, position or
landmark ref, condition), `festivals: string[]` (quest ids), `seasonalAmbient?: Partial<Record<Season,
Ambient>>`, `viewpoints: Array<[x, z]>` (for "sit together").

### 4.10 Failure-free design rules (enforced, each with a test)

1. **Nothing expires.** No quest, request, festival reward or letter has a deadline. A festival missed
   this year returns next year (`repeat: 'yearly'`).
2. **Nothing decays.** Friendship never goes down. Animals' happiness can fall, but only pauses
   produce; animals never leave, sicken or die.
3. **No soft locks.** Every main chapter is completable from its own land's materials (the existing
   test) **and** from the Keeper's shop alone with coins earned in that land.
4. **No coin traps.** Coins cannot go negative; no purchase is irreversible without at least a half
   refund (existing decor rule); keepsakes cannot be sold or lost.
5. **Every gift is welcome.** No gift lowers friendship; a gift they do not love teaches you what they
   do.
6. **Choices never punish.** Where a story offers a choice (look into the crane's room; ask the mill
   for more), both outcomes are kind; the "wiser" one gives an achievement, not a loss.
7. **The critical path never needs an hour, a season or a real date.** Keepers are always at their
   lantern. Only side content is time-windowed.
8. **Travel is never punished.** Absence produces warmth ("missing you" letters, welcome-back
   points); streak mechanics count *visits*, not consecutive days.
9. **Daily content is optional and small.** At most three kindnesses a day; nothing important is
   behind them; nothing accumulates as a debt.
10. **Rest is allowed.** Sleeping skips the night at no cost; the one scripted rest (`beat-flicker`)
    cannot be failed, only completed by resting.
11. **No farmable virtue.** Barakah, kindness counts and light are never shown as grindable numbers;
    kindnesses are capped per day; religious practice is never scored.
12. **No hidden stress.** No timers on screen, no red UI, no alarms. Notifications are letters, and
    letters are paced (§4.6).
13. **The invariants hold in every new mechanic.** "Sit together" uses two seats with a gap ≥
    `SEAT_GAP`; hand-over animations are set-down/pick-up; new vehicles pass `tests/vehicles.test.ts`;
    new creatures pass `tests/anatomy.test.ts`; new outfits pass `modestify`.

### 4.11 Implementation order and tests

| Step | Files | Tests to add |
|---|---|---|
| 1. Calendar helpers and new state fields | `core/state.ts` | `seasonOf`, `dayPart`, `lanternWeekStart` drift; old save loads with defaults (`tests/save`) |
| 2. Friendship points | `quests/QuestSystem.ts` (`addPoints`), `social/Messages.ts`, `Game.talk` | daily-chat cap; gift never negative; `addHearts` compatibility; migration `points ??= hearts × 100` |
| 3. New step kinds and `requires` | `quests/quests.ts`, `quests/QuestSystem.ts` | every quest reachable (extend the existing "completable locally" test to folk quests); yearly quests reopen |
| 4. Story system (letters, beats, interludes) | `story/*`, `core/events.ts`, `Game.ts` (`region:left`) | beats fire by count in any order; `main-skyisles` needs 19 + ascent + three days |
| 5. Goal system | `goals/*`, shared `quests/rewards.ts` | every `GoalDef` has a reachable `done`; generated per-land and per-species goals exist for all 20 / 21 |
| 6. Message pacing | `social/Messages.ts` | distance rule; delivery window; global cap; request obtainability; templates resolve for all NPCs |
| 7. Economy changes | `economy/economy.ts`, `economy/items.ts` | distance pricing bounds (0.6 … 1.6 × 2.5); chapter coins by act; barakah cap 0.4 |
| 8. Projects and hosting | `social/projects.ts` (new), `housing/housing.ts` | projects complete from contributions; hosting yield `1 + floor(guests / 2)` |
| 9. Gates | `vehicles/vehicles.ts`, `player/Travellers.ts` | cloud veil below 8 lanterns; glide upgrade; sled and balloon seat gaps |
| 10. Content data | `npc/people.ts`, `world/regions.ts`, `housing/*` | every new item has a source; every keepsake id exists in `DECOR`; every festival day is within 1..28 |

**Open decisions** (for the owner): (1) promised vs married (§2.2); (2) whether to name the northern
song-portrait as Sámi *joik* and involve Sámi advisers, or keep it generic (§2.5 Aurora); (3) whether
Juha's local names should include Nasreddin *Hodja* (a religious title) or plain Nasreddin; (4) the
real-calendar option's default (off here).

---

## 5. Sources

Summarised in our own words; no source text is reproduced. Folk tales are traditional; where a
literary version is named (Collodi, Irving, Asbjørnsen & Moe, Afanasyev) it is public domain, and we
use only the premise.

**Game design and narrative**
- Sky: Children of the Light — friendship trees: https://sky-children-of-the-light.fandom.com/wiki/Seasonal_Spirits/Friendship_Trees ; https://sky-children-of-the-light.fandom.com/wiki/Regular_Spirits/Friendship_Trees
- Sky — winged light and cape levels: https://sky-children-of-the-light.fandom.com/wiki/Winged_Light ; https://sky-children-of-the-light.fandom.com/wiki/Wing_Buffs
- Sky — seasons and Jenova Chen interview: https://www.thegamer.com/sky-children-of-the-light-interview/ ; https://en.wikipedia.org/wiki/Sky:_Children_of_the_Light
- Spiritfarer — GDC 2022 narrative review (Xiaoying Meng): https://media.gdcvault.com/GDC+2022/Game+Narrative+Poster+Review/Meng+Paper.pdf ; https://en.wikipedia.org/wiki/Spiritfarer ; https://www.switchbladegaming.com/cozy-games/spiritfarer-guide/
- A Short Hike — feathers as soft gating: https://en.wikipedia.org/wiki/A_Short_Hike ; https://ashorthike.fandom.com/wiki/Golden_feather ; https://scientificgamer.com/thoughts-a-short-hike/
- Stardew Valley — friendship numbers: https://stardewvalleywiki.com/Friendship ; Community Center bundles: https://stardewvalleywiki.com/Bundles
- Eastshade — peaceful fantasy: https://heterogenoustasks.wordpress.com/2019/05/15/eastshade-fantasy-without-crisis/ ; https://en.wikipedia.org/wiki/Eastshade
- Journey — wordless companionship and scarf recharge: https://en.wikipedia.org/wiki/Journey_(2012_video_game) ; https://journey.fandom.com/wiki/Scarf ; https://www.gamedeveloper.com/design/the-end-of-the-journey
- Cozy Grove — daily colour and time-gating critique: https://en.wikipedia.org/wiki/Cozy_Grove ; https://www.thegamer.com/cozy-grove-guide-tips-beginners/
- Unpacking — environmental storytelling: https://www.gamedeveloper.com/marketing/unpacking-a-narrative-through-1-000-household-items
- Wylde Flowers — a year-long story with seasons: https://en.wikipedia.org/wiki/Wylde_Flowers
- Dorfromantik — failure that frees space: https://dorfromantik.fandom.com/wiki/Quests
- Road 96 — procedural road trip, recurring NPCs: https://80.lv/articles/road-96-developing-a-narrative-game-with-procedural-mechanics ; https://www.supanova.com.au/designing-a-procedural-narrative-we-talk-to-road-96s-creative-director/
- Ooblets — dance-offs instead of battles: https://en.wikipedia.org/wiki/Ooblets
- Animal Crossing — letters and mail timing: https://nookipedia.com/wiki/Letter ; seasons and events: https://nookipedia.com/wiki/Event/New_Horizons ; Nook Miles+: https://nookipedia.com/wiki/Nook_Miles
- Kiki's Delivery Service — independence, work and burnout: https://en.wikipedia.org/wiki/Kiki%27s_Delivery_Service ; https://www.deepfocusreview.com/reviews/kikis-delivery-service/
- Cozy design framework (Project Horseshoe 2017): https://www.projecthorseshoe.com/reports/ph17/ph17r3.htm ; https://lostgarden.com/2018/01/24/cozy-games/ ; https://www.gamedeveloper.com/design/designing-for-coziness
- Prosocial / kind games: https://lostgarden.com/2023/07/08/kind-games-designing-for-prosocial-multiplayer/ ; https://dl.acm.org/doi/10.1145/3582437.3582459 ; https://www.sciencedirect.com/science/article/abs/pii/S0747563218303534
- Hub-and-spoke structures: https://book.leveldesignbook.com/process/layout/typology ; https://heterogenoustasks.wordpress.com/2015/01/26/standard-patterns-in-choice-based-games/

**Islamic and Middle Eastern traditions**
- Futuwwa and Akhi lodges: https://en.wikipedia.org/wiki/Futuwwa ; https://en.wikipedia.org/wiki/Akhi_Brotherhoods
- Caravanserais and *ibn al-sabil*: https://muslimheritage.com/article/seljuk-caravanserai-khan ; https://www.sloughislamictrust.org.uk/dictionary/meaning/ibn-sabil-wayfarer/
- Barakah and shared food: https://en.wikipedia.org/wiki/Barakah ; https://www.thedawoodibohras.com/the-blessings-of-sharing-food/
- Ramadan and Eid in games: https://www.gamespot.com/articles/ramadan-brings-muslim-communities-together-and-it-deserves-a-place-in-games/1100-6502328/
- Fanous: https://www.newarab.com/features/fanoos-ramadan-history-holy-months-iconic-lanterns ; https://www.thenationalnews.com/mena/egypt/2022/04/01/the-history-of-the-fanous-cairos-traditional-ramadan-lantern/
- Tables of mercy: https://en.wikipedia.org/wiki/Ma%27idat_ar-Rahman
- Hatim al-Tai: https://ithraeyat.ithra.com/editions/legends/prince-of-generosity-hatim-al-tai-of-hail ; Arabic coffee and majlis: https://gulfnews.com/going-out/society/arab-traditions-a-step-closer-to-un-heritage-list-1.1631099
- Al Sadu weaving: https://ich.unesco.org/en/decisions/15.COM/8.B.4 ; https://www.aramcoworld.com/articles/2025/ja25/al-sadu-weaves-stories-of-culture-and-identity
- Bedouin star lore (Suhail, ath-Thurayya): https://en.wikipedia.org/wiki/Suhail_(star) ; https://www.skyatnightmagazine.com/advice/skills/introduction-arabian-astronomy
- Hakawati: https://www.britannica.com/topic/hakawati ; Ibn Battuta: https://orias.berkeley.edu/resources-teachers/travels-ibn-battuta
- Juha / Nasreddin / Goha / Giufà / Afanti: https://en.wikipedia.org/wiki/Nasreddin ; https://en.wikipedia.org/wiki/Giuf%C3%A0 ; https://www.middleeasteye.net/discover/nasreddin-hodja-wise-muslim-trickster-folklore
- Abbas ibn Firnas: https://en.wikipedia.org/wiki/Abbas_ibn_Firnas ; Fatima al-Fihri: https://www.worldhistory.org/article/2662/fatima-al-fihri-and-al-qarawiyyin-university/
- Tales of the Alhambra (Irving, 1832): https://www.juancole.com/2020/05/washington-arabian-astrologer.html

**East Asia**
- Qixi / Chilseok / Tanabata: https://en.wikipedia.org/wiki/Chilseok ; https://en.wikipedia.org/wiki/Qixi_Festival ; https://en.wikipedia.org/wiki/Tanabata
- Heungbu and Nolbu: https://en.wikipedia.org/wiki/Heungbu_and_Nolbu
- Hanasaka Jiisan: https://en.wikipedia.org/wiki/Hanasaka_Jiisan ; https://www.nippon.com/en/japan-topics/b09205/hanasaka-jisan-the-man-who-made-the-flowers-bloom.html
- Tsuru no Ongaeshi: https://en.wikipedia.org/wiki/Tsuru_no_Ongaeshi
- Ma Liang and the magic brush: https://en.wikipedia.org/wiki/Magic_Brush
- Lantern riddles: https://blog.skritter.com/2025/02/lantern-festival-riddles/

**Europe and the Americas**
- Why the Sea Is Salt; The Lad Who Went to the North Wind (Asbjørnsen & Moe): https://en.wikipedia.org/wiki/Why_the_Sea_is_Salt ; https://www.worldoftales.com/European_folktales/Norwegian_folktale_6.html
- Chalandamarz: https://en.wikipedia.org/wiki/Chalandamarz ; Alpabzug: https://www.myswitzerland.com/en-us/experiences/summer-autumn/autumn/cattle-descent-from-alpine-pastures/
- Dick Whittington: https://en.wikipedia.org/wiki/Dick_Whittington_and_His_Cat ; Pearly Kings and Queens: https://en.wikipedia.org/wiki/Pearly_Kings_and_Queens ; https://en.wikipedia.org/wiki/Henry_Croft_(pearly)
- Stone Soup: https://en.wikipedia.org/wiki/Stone_Soup ; The Gigantic Turnip: https://en.wikipedia.org/wiki/The_Gigantic_Turnip
- Befana: https://en.wikipedia.org/wiki/Befana ; Pinocchio / Geppetto: https://en.wikipedia.org/wiki/Geppetto
- Johnny Appleseed: https://en.wikipedia.org/wiki/Johnny_Appleseed ; Rip Van Winkle: https://www.britannica.com/topic/Rip-Van-Winkle-short-story-by-Irving

**South and Southeast Asia**
- Kolam: https://en.wikipedia.org/wiki/Kolam ; Pongal overflow: https://www.hindusforhumanrights.org/en/blog/pongal-abundance-is-something-you-share
- Akbar and Birbal: https://en.wikipedia.org/wiki/Birbal
- Asmat Begum and rose attar: https://en.wikipedia.org/wiki/Asmat_Begum ; https://ranasafvi.com/all-about-itr-attar/
- Jaipur kite festival: https://www.holidify.com/pages/international-kite-festival-3732.html ; Kathputli: https://en.wikipedia.org/wiki/Kathputli_(puppetry) ; Panchatantra tortoise: https://en.wikipedia.org/wiki/The_Tortoise_and_the_Birds
- Sang Kancil: https://en.wikipedia.org/wiki/Sang_Kancil ; Gotong royong: https://en.wikipedia.org/wiki/Communal_work ; Subak: https://en.wikipedia.org/wiki/Subak_(irrigation)

**The North**
- Revontulet (fox fires): https://en.wikipedia.org/wiki/Revontulet ; https://en.wikipedia.org/wiki/Firefox_(mythology)
- Joik: https://en.wikipedia.org/wiki/Joik ; https://www.visitnorway.com/typically-norwegian/sami-people/rebirth-of-the-joik/

**Egypt**
- The Eloquent Peasant: https://en.wikipedia.org/wiki/The_Eloquent_Peasant ; https://www.worldhistory.org/article/1127/the-eloquent-peasant--egyptian-justice/
- Sham el-Nessim: https://www.middleeasteye.net/discover/what-sham-el-nessim-egypt-spring-festival-explained

**Research limits.** The session's web-search quota ran out partway through round 4 (it is shared
across the session). Round 4's intended searches on chaste romance in games, cozy economy tuning and
Sky's daily-quest critique were not run; §4.4's economy targets are therefore design targets to be
confirmed by playtest telemetry, not numbers taken from another game. Claims that rest on one
source and should be checked before shipping: the New Year of the Garden festival in Bagh-e-Noor
(Persianate spring feast at the Mughal court); the exact drift used for Lantern Week (one game day per
game year, derived from the ~11-day lunar drift).

---

## 6. Keyword log

**Round 1 — the games named in the brief.** Sky Children of the Light seasons spirits candles
friendship tree · Spiritfarer narrative design Everdoor GDC · A Short Hike golden feathers height
gating · Stardew Valley friendship points decay · Eastshade painter no combat · Journey companion
wordless cooperation · Journey scarf recharge companion · Cozy Grove daily colour time-gated ·
Unpacking environmental storytelling · Wylde Flowers seasons narrative · Dorfromantik quests no
failure · Road 96 procedural road trip recurring characters · Kiki's Delivery Service independence
work.

**Round 2 — harvested design keywords.** prosocial game design · kindness mechanics · kind games
(Lostgarden) · Animal Crossing letters friendship · Ooblets dance-off non-violent · cozy games
safety abundance softness (Project Horseshoe) · Ramadan Eid in video games · futuwwa hospitality ·
barakah sharing food · caravanserai *ibn al-sabil* · Sky winged light cape levels · hub and spoke
narrative gating · Stardew community center bundles · Spiritfarer boat hub loop.

**Round 3 — folk tales and customs per land.** Nasreddin / Juha / Goha / Giufà / Afanti · Chilseok
magpie bridge / Qixi / Tanabata · Heungbu and Nolbu · Hanasaka Jiisan · Tsuru no Ongaeshi · Ma Liang
magic brush · lantern riddles *cai dengmi* · Why the Sea Is Salt · The Lad Who Went to the North Wind ·
Chalandamarz · Alpabzug · Dick Whittington Bow bells · Pearly Kings Henry Croft · Abbas ibn Firnas ·
Fatima al-Fihri · Al Sadu weaving · Suhail / ath-Thurayya star lore · Hatim al-Tai · Arabic coffee
majlis · Eloquent Peasant · Sham el-Nessim · kolam feeding ants · Pongal overflow · Birbal khichdi ·
counting crows · Asmat Begum rose attar · Jaipur kites Makar Sankranti · Panchatantra tortoise ·
kathputli · Sang Kancil · gotong royong · subak · revontulet fox fires · joik.

**Round 4 — gaps from round 3 and systems depth.** fanous Fatimid lantern · Stone Soup variants ·
The Enormous Turnip · Johnny Appleseed · Rip Van Winkle · La Befana · Giufà tales · Pinocchio
Geppetto · Tales of the Alhambra · hakawati Damascus · Ibn Battuta Akhi lodges · *mawa'id al-rahman*
tables of mercy · Animal Crossing seasonal events and daily goals · (fetched) Stardew friendship
numbers · Designing for Coziness · Kind Games patterns. *Not run (quota):* Sky daily-candle burnout
critique · chaste romance design / halal games · cozy economy balancing · A Short Hike design talk.

**Keywords for a future round.** chaste romance games · halal game design guidelines · *haya* in
media · *khitbah* customs · cozy economy sinks · Sky daily quests burnout · Dredge calm loop ·
Ghibli food scenes · Sámi cultural protocol for games · Mughal Nowruz · Hijri calendar `Intl`
engine support · photo-mode design in cozy games.
