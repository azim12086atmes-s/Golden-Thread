# ANTIGRAVITY_001: the world keyword corpus

Assigned by Opus 5.5 (the team lead since 2026-09-26; see `LEAD_OPUS.md`). Antigravity, thank you for joining.

We saw that you already built `art/fetch_pinterest.py`, `pinterest_corpus.db` and the category tree in your `PINTEREST_CORPUS_ROUTING.md`. That is good work, and this assignment builds on it.

## The owner's request (verbatim)

> "You can generate keywords yourself by prompting yourself to gemin flash 3.8 with questions mention in this format, all cultures, regions, countries, cities, in the world and keep prompting on it. then prompt on types of themes until it gives fantasy, sci fi ... other than these and you get words for that. Prompt until you get 50 to 100 in each, then use these words in artifacts, architectures, clothing, vehicles, geography, landscapes sceneries, buildings, houses, trees/nature, habitat, environment, people, cities, towns, animals, etc"

## What to produce

Put all of this under `docs/research/keywords/` in this repo (`Golden_Thread_Codex`). Opus reads these files and turns them into game content, so please keep exactly the format below.

### 1. `seeds.json`, with 50 to 100 entries in each list

```json
{
  "cultures":  ["Malayali", "Sámi", "Yoruba", "..."],
  "regions":   ["Deccan Plateau", "Anatolia", "..."],
  "countries": ["India", "Peru", "..."],
  "cities":    ["Mysuru", "Kyoto", "Fez", "..."],
  "themes":    ["fantasy", "sci-fi", "solarpunk", "dieselpunk", "mythic", "pastoral", "art nouveau", "..."]
}
```

- **Themes:** keep prompting past "fantasy" and "sci-fi" until you reach at least 50 distinct themes.
- **De-duplication:** no duplicates. For example, "sci-fi" and "science fiction" count as one.

### 2. `corpus.json`, with one block per seed

Use this shape:

```json
{
  "Mysuru": {
    "kind": "city",
    "architecture": ["Indo-Saracenic palace", "..."],
    "houses":       ["tiled-roof courtyard house", "..."],
    "artifacts":    ["sandalwood carving", "rosewood inlay", "..."],
    "clothing":     ["silk saree with full-sleeve blouse", "..."],
    "vehicles":     ["tonga", "..."],
    "landscape":    ["Chamundi Hill", "..."],
    "nature":       ["banyan", "jasmine", "..."],
    "animals":      ["Indian elephant", "..."],
    "people_roles": ["silk weaver", "incense roller", "..."],
    "sources":      ["https://... (a real page you checked)"]
  }
}
```

- **Coverage:** cover every seed in `cultures`, `regions`, `countries`, `cities` and `themes`. For themes, clothing means the style, for example "solarpunk: layered linen with solar-thread embroidery".
- **Depth:** aim for 5 to 15 words per category per seed.
- **Sources:** a model's answer is a lead, not a fact. For real places and cultures, check at least one real source per seed and list it in `sources`. Mark anything unchecked `"unverified": true`.

### 3. `blends.json`, the owner's "permutation" idea

Combine seeds with each other and with themes, for example "Kyoto × solarpunk" or "Sámi × Moroccan riad × art nouveau". Give each blend 3 to 8 words per category, like this:

```json
[
  {
    "id": "kyoto-x-solarpunk",
    "parts": ["Kyoto", "solarpunk"],
    "architecture": ["..."],
    "clothing": ["..."],
    "vehicles": ["..."],
    "artifacts": ["..."]
  }
]
```

Start with at least 100 blends, weighted towards combinations that look good together.

## Rules the words must follow

The game rules are absolute, so drop or rewrite any word that breaks them:
- **Clothing:** every clothing term must describe a modest, fully covering look, with long sleeves and full-length legs. A headscarf appears where it fits. If a traditional garment is revealing, write the covering adaptation, for example "choli → full-sleeve blouse under a draped dupatta". No swimwear and no "bare", "cropped" or "sheer" looks.
- **Faces:** the game has no eyes on anyone, so leave out masks with eye holes, "eye makeup" and similar.
- **Faith and sacred objects:** only the two travellers are Muslim. Every other culture's faith appears respectfully and as its own people's practice, for example "Diwali diya lamps lit by residents". Never list sacred objects as fashion or costume, such as a Sikh turban for non-Sikhs or monastic robes as outfits.
- **Tone:** peaceful. No weapons, war machines or violence. Use "knight armor" only as a historical exhibit, not gear.
- **People:** no real living persons. Use roles, not names.

## Report

When done, write `docs/team/handoffs/ANTIGRAVITY_001_RESULT.md`. Include:
- the counts per file;
- how you prompted, with the prompt templates;
- which entries are verified;
- anything you were unsure about.

Opus reviews it and wires the words into the game: the fusion wardrobe, building styles, props, vehicles, animal and nature placement, and settlement names.

## Please don't

- Edit `src/`, `tests/` or other members' files. Opus integrates.
- Commit, push or change branches. Opus handles git.
- Touch the original `Desktop/Golden_Thread` folder.
