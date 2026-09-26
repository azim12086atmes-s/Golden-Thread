# Work, knowledge and a shared life — implementation specification

2026-09-25. Proposed values and mechanics, accepted owner requirements in REQUIREMENTS_EXPANSION.md. None of the new systems below should be described as playable until integrated and tested.

## Central loop

Arrive → provision/rest together → listen to residents → investigate a problem → consult people/library → propose an approach → learn/build/test → deliver and teach → receive earnings → maintain home/vehicle → remember the experience together → travel.

The thread stays the emotional centre. Money pays for a life; knowledge creates options; relationships make places worth returning to. Avoid converting every conversation, meal or act of care into a points transaction.

## 1. Region simulation

Represent a region as connected settlements rather than a bag of tasks. A settlement has terrain access, service sites, households, enterprises, community groups, stock flows and a library/knowledge steward. Offscreen settlements advance coarse economic ticks, not thousands of rendered NPCs.

World data contains no assumption that a nationality implies a job, personality or problem. Each household and enterprise gets individually authored goals and capacity. A modern technician can live in a rural area; a city resident can preserve traditional craft. Mobile communities have homes, institutions, skills and agency.

Suggested tick: one simulated hour for stock/enterprise updates, fixed-step player simulation, daily summary for distant regions. Bound catch-up at load; do not simulate real-world absence as hunger or bankruptcy. Use a seeded clock and event log for reproducible tests.

## 2. Business work and outsourcing

Add disciplines alongside the existing eight crafts: software/systems, communication/design, bookkeeping/operations, logistics, electronics/repair, research/documentation. They are skills used in fictional problems, not real external business services or network-connected code execution.

Contract state: offered → scoped → investigating → prototyping → trial → revision or accepted → paid → follow-up.
Record contract ID, client/site, need, baseline metric, constraints, chosen solution, tasks, materials, collaborators, trial evidence, agreed price and payment event ID.

| Work family | Meaningful player action | Acceptance evidence |
|---|---|---|
| Technology | Map a shop's ordering process; compose a validated inventory or booking workflow. | Trial correctly handles sample orders, stock shortages and cancellations. |
| Marketing | Interview maker; select truthful audience/message; produce a catalogue, storefront sign or local event plan. | Client-approved claims; readable sign/correct catalogue; attributable simulated customer response. |
| Operations | Compare supply and demand records; plan reorder days and storage. | Fewer missed orders/wasted goods during a bounded trial. |
| Logistics | Route deliveries around opening hours, road restrictions and capacity. | Supplies reach destinations without duplicating cargo. |
| Craft/repair | Inspect a broken mechanism, source parts and repair it with the owner. | Device passes a functional test and remains usable after reload. |
| Documentation | Catalogue a collection, interview a willing craftsperson, build a useful index. | Named provenance, correct cross-references, useful retrieval test. |

Three complete mission candidates:

**Kirana: The Missing Shelf.** A proprietor has surplus of one staple and repeated shortages of another. Inspect receipts and shelf counts; learn inventory basics at the library; compare a paper reorder board with a simple offline stock terminal; run a trial; teach the proprietor; pay once. Effects: shop reliability improves, an apprentice maintains it, and the travellers can buy provisions. Technology is one option, not automatically superior.

**Workshop: Orders Across the River.** A textile cooperative loses orders between makers, shop and ferry. Listen to each participant; credit makers in a catalogue; choose clearer labels, an order ledger, or booking board; test during a market day. Payment includes an agreed fee and optional locally made furnishing, not ownership of the cooperative's knowledge.

**Highland: Water Before Noon.** A garden group has uneven irrigation. Trace the route, compare notes from a local steward and library diagram; repair a blockage, improve scheduling, or prototype a float gauge. Trial on simulated flow. Report tradeoffs and maintenance needs. Do not reduce water sharing to a gadget alone.

Economy rules: finite client budgets; estimates shown before accepting; player may decline; revision has a clear cause and bounded cost; no arbitrary real-time deadline while offline. Rewards use idempotent event IDs. Gifts and bond do not substitute for agreed payment. Optional pro bono work is separately labelled.

## 3. Physical libraries and knowledge

A library is a location with shelves, reading tables, a steward, collections, opening rules and an accessible entrance. A small village may have a reading room or mobile collection; a city may have several specialised institutions.

Knowledge entry: ID, region, title, subject, credited creator/community, source/teacher, text or illustration, practical concept tags, prerequisite understanding, condition, access permission, discoveries and related records.

Interactions: browse shelf → read/observe → discuss with steward → take permitted notes → apply concept → add field evidence → return a copy of the result. The journal records discoveries but cannot unlock an unseen collection from anywhere.

Recover knowledge by drying/repairing a fictional damaged volume, ordering scattered pages, asking several residents for complementary recollections, or making a missing index. Do not portray knowledge as abandoned just because it is unfamiliar to the travellers. Some techniques are living practice; credit teachers and respect declined access.

Collections: seed calendars, navigation, textile techniques, local oral histories, architecture, water engineering, business ledgers, recipes, language aids, natural history and maintenance manuals. Label fictional magical research distinctly from source-grounded cultural information.

## 4. Invention and discovery

An invention is a solution to a named need. It requires concepts, parts/tools, a workshop or work surface, a prototype and a field trial. Avoid an unrestricted crafting menu where random pairings solve everything.

Example recipes:

- water-level observation + float mechanism + local irrigation schedule → repairable canal indicator;
- damp-storage observation + shaded airflow + carpentry → ventilated food cabinet;
- map reading + route constraints + client booking records → delivery planner;
- loom measurements + repeat-pattern notation + local artisan review → pattern guide;
- astronomy + optics + lantern signals → fictional night-route beacon.

Failure consumes a bounded material amount and yields an observation. A successful trial unlocks a blueprint with authors/contributors, limitations and maintenance. Sharing can create local adoption and future repair work. Never equate ancient/local practice with obsolete practice.

## 5. Food, necessities and amenity shops

Simulate pantry, rest, comfort and equipment condition, not punishment. Proposed initial values: two meal portions per shared meal; two or three meal opportunities per game day; no offline depletion; unmet needs reduce temporary readiness without stopping walking, reading, seeking help or basic work.

Kirana/grocery stock includes staples, pulses, vegetables, oil, salt, tea, reusable containers and regionally appropriate foods. Amenity shops carry soap, cloth, repair items, lamps, batteries where appropriate, basic stationery and weather gear. Food data needs shelf life/storage and local availability. Prices are bounded functions of stock, transport and demand, not exponential scarcity spirals.

Supply graph: producer → collection/wholesale → shop → household/travellers. Shops have opening hours, proprietors, actual stock and restock events. Transactions reject negative/fractional invalid quantities, insufficient funds and stale stock. Save after atomic transaction. Community meals, work exchange, local starter jobs and safe shelter prevent a zero-money deadlock.

Cooking, shopping and repairing should often be companion activities: one reads the list, the other checks supplies; both sit separately and share the occasion. Basic care remains available before wealth.

## 6. Bond through a life pursued together

Maintain persistent shared memories, preferences and cooperative abilities. Do not show an affection meter that drops when the player logs out or chooses a different quest.

Activity families: discover a vista, study a passage, solve a difficult problem, cook, organise the van, mend clothing, plan a route, rest, host friends and revisit an old place. Each activity has separate positions/sockets; objects are set down and picked up rather than handed across touching hands.

Memories record context, place, contributions and keepsake. Repeating the same action at the same place on the same day cannot farm progress. New cooperative options might include a shared notebook, better packing coordination, synchronised flight or extra observations during investigation. Rafiq offers relevant suggestions and has opinions without taking control away from the player.

Golden-thread response: warm pulse during a shared discovery, calm steady glow while resting, stronger illumination at major milestones. Normal distance, meals or work mistakes do not threaten the relationship. Relationship framing remains the owner's unresolved story decision; do not invent an engagement or wedding as settled canon.

## 7. Persistent vehicles: replacement contract

`OwnedVehicle`: immutable instance ID, model ID, owner, world transform, parked/depot/active status, condition, fuel/energy if adopted, cargo, furnishings, seats and last save revision. Ownership is separate from a render mesh and separate from available travel modes.

Acquire at a physical dealer or story handover. A vehicle is created once at its delivery location. Board by proximity and valid access; disembark into safe separated positions. Unloading a chunk removes the mesh only. Reload reconstructs the mesh at its stored transform. A map menu locates owned vehicles; it never summons them.

One active vehicle ID; a missing render chunk cannot trigger a second copy. Cars/vans/trucks remain where parked. Plane access uses a landing area. Unicorns are individually named persistent animals and have two mounting positions/instances. Walk/cape are abilities, not inventory vehicles.

Recovery is a diegetic tow/transport job from recorded location to recorded depot with a visible cost/time and no duplicate. Do not quietly teleport a vehicle to solve a pathfinding issue. Fast travel must explicitly transport a selected vehicle via a service or leave it behind. Existing `setMode()` spawning and `travelTo()` implied van travel both need replacement.

Migration: save schema v2 with explicit v1→v2 function. Seed old unlocked vehicles at labelled starting depots; show a one-time explanation and map markers. Preserve inventories, quests, land, outfits and messages. Test active mode and parked state reload, duplicates, abandoned vehicles, unknown model IDs and old corrupt saves.

## 8. First playable production slice

Build one linked route: Meadow home → Indian-inspired market neighbourhood → nearby farm village. Include one kirana, an amenity/repair shop, physical library, cooperative workshop, farm problem and vehicle depot. Current named regions remain accessible while this slice is developed.

Acceptance scenario: buy groceries → cook/rest separately together → visit library → investigate shop need → choose paper or technical solution → field test → get paid once → record a shared memory → drive owned van to village → park → reload → van remains there → help residents build a useful installation → return the learning to the library.

This proves the new design before multiplying it across thirty regional families. No placeholder button should claim to complete an invention, business project or cultural research.

## 9. Build sequence and gates

1. Intake and conflict resolutions; research atlas; pin-selection evidence; reference provenance.
2. Blender asset contract and original character/shop/library kit; export and browser acceptance.
3. Save v2 migration and persistent vehicles; remove all spawn-menu paths.
4. Physical services, groceries/comfort and library discovery.
5. Business contracts, trial evidence and inventions; integrate one complete mission.
6. Companion memories/cooperation and community project consequences.
7. Terrain/routes/districts and expanded regional content after measured performance.

Tests: deterministic economic ticks; zero-money escape path; no double payment/negative stocks; local first discovery; trial-before-invention; save migration; unload/reload vehicle identity; no-touch seated/working/flying poses; exported head/accessory gap; mobile budgets. Automated tests cannot replace checking whether work is enjoyable and cultures are represented thoughtfully.
