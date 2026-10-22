// Server-authoritative, optional cooperative quest data. The catalog contains
// only public clues; answer keys stay in the progression helper's private data.
const route = [
  ['meadow', "Wanderers' Meadow", 2, 1],
  ['japan', 'Sakura Hollow', 1, 1],
  ['korea', 'Hanok Village', 0, 1],
  ['aurora', 'Aurora Huts', 0, 0],
  ['norway', 'Fjordhavn', 1, 0],
  ['switzerland', 'Alpenrose', 2, 0],
  ['london', 'Old London', 3, 0],
  ['newyork', 'New Yonder', 4, 0],
  ['vintage', 'Maple Row', 4, 1],
  ['renaissance', 'Firenzia', 3, 1],
  ['islamic', 'Madinat an-Nur', 3, 2],
  ['middleeast', 'Souq al-Qamar', 4, 2],
  ['desert', 'Tents of Rimal', 4, 3],
  ['egypt', 'Nile Crossing', 3, 3],
  ['mughal', 'Bagh-e-Noor', 2, 3],
  ['indianorth', 'Gulabi Nagar', 1, 3],
  ['indiasouth', 'Kaveri Coast', 0, 3],
  ['china', 'Jade Terraces', 0, 2],
  ['indonesia', 'Nusa Rinjani', 1, 2],
  ['skyisles', 'The Sky Isles', 2, 2],
];

export const JOURNEY_TITLE = 'The Twenty Lights';
export const JOURNEY_PREMISE = 'At the palace observatory, a birthday crown waits with twenty empty constellation points. One small glimmer remains in each land. Gather each keepsake, solve its clue, and relight the beacon so the lights can guide the way back to the palace.';
export const JOURNEY_ACTS = Object.freeze([
  Object.freeze({ id: 'whispers', title: 'The First Whispers', start: 0, end: 4 }),
  Object.freeze({ id: 'rooftops', title: 'Light over the Rooftops', start: 5, end: 9 }),
  Object.freeze({ id: 'brass_rose_river', title: 'Brass, Rose and River', start: 10, end: 14 }),
  Object.freeze({ id: 'crown', title: 'The Constellation Crown', start: 15, end: 19 }),
]);

// Each row: title, keepsake, riddle, three choices, correct choice, success beat.
const beats = [
  ['The First Spark', 'a wildflower pin', 'A path grows brighter when it is…', ['shared', 'hidden', 'forgotten'], 0, 'The first lantern glows, and a new point appears above the palace.'],
  ['Tea for the Road', 'a tea leaf charm', 'What helps a warm cup travel safely?', ['a paper kite', 'a lidded pot', 'a snowball'], 1, 'A petal of light joins the growing crown.'],
  ['The Quiet Courtyard', 'a folded paper star', 'Which shape has three sides?', ['a circle', 'a square', 'a triangle'], 2, 'The courtyard lantern answers with a steady glow.'],
  ['The Dawn Watch', 'a frost glass bead', 'What does a clear morning sky reveal first?', ['the horizon', 'the ocean floor', 'a buried key'], 0, 'The northern light settles into the constellation.'],
  ['The Fjord Signal', 'a painted wooden bird', 'A signal seen across water should be…', ['dim and brief', 'clear and bright', 'covered in mist'], 1, 'A bright point shines over the fjord.'],
  ['The Alpine Bell', 'a tiny bell', 'Which sound carries farthest through a still valley?', ['a soft bell', 'a whispered secret', 'a silent step'], 0, 'The valley bell rings once for the new light.'],
  ['The Clockmaker’s Note', 'a brass gear', 'A clock hand moves around which shape?', ['a triangle', 'a circle', 'a spiral staircase'], 1, 'The old clock marks another place in the sky.'],
  ['The Window Light', 'a glass tile', 'What can a window do with sunlight?', ['bend it into colour', 'turn it into rain', 'keep it underground'], 0, 'The glass tile catches the sun and lights a tower.'],
  ['The Carousel Tune', 'a painted wooden horse', 'A carousel turns around its…', ['shadow', 'centre', 'weather vane'], 1, 'The painted horse spins once beneath the new star.'],
  ['The Painter’s Palette', 'a gold leaf', 'Which paints blend into green?', ['blue and yellow', 'red and blue', 'white and black'], 0, 'Gold leaf brightens the next point in the crown.'],
  ['The Courtyard Fountain', 'a blue mosaic piece', 'Where does a fountain’s water return?', ['to the sky forever', 'to its basin', 'inside a lantern'], 1, 'The fountain reflects the newly lit beacon.'],
  ['The Market Lantern', 'a little brass lantern', 'A lantern gives the clearest guide when it is…', ['covered', 'lit', 'left behind'], 1, 'The market lane gains a warm point of light.'],
  ['The Dune Compass', 'a compass rose', 'At night, which landmark can guide a traveller?', ['a familiar star', 'a shifting footprint', 'a closed tent'], 0, 'A steady star appears above the quiet dunes.'],
  ['The River Reed', 'a papyrus strip', 'A river flows downhill toward…', ['higher ground', 'lower ground', 'the nearest cloud'], 1, 'The river beacon glimmers along the water.'],
  ['The Garden Pattern', 'a marble petal', 'In a four-fold garden, paths meet at the…', ['centre', 'outer wall', 'highest roof'], 0, 'A garden point joins the lights above.'],
  ['The Pink Window', 'a rose-coloured pane', 'A stained pane changes the colour of…', ['the sunlight passing through', 'the stone behind it', 'the wind outside'], 0, 'The rose-coloured beacon shines across the roofs.'],
  ['The Coastline Song', 'a shell pendant', 'When the tide recedes, the shore is…', ['farther from the sea', 'under deeper water', 'above the clouds'], 0, 'The coastal light joins the constellation.'],
  ['The Jade Terrace', 'a jade bead', 'Terraces help a hillside become…', ['steeper', 'a series of level steps', 'a river tunnel'], 1, 'The terraces catch a green point of light.'],
  ['The Rice-Field Reflection', 'a woven reed ring', 'Still water can show…', ['a reflection', 'tomorrow’s weather exactly', 'the sound of a bell'], 0, 'A reflection of the beacon settles over the fields.'],
  ['The Great Lantern', 'a cloud-glass star', 'How many lights complete this journey’s crown?', ['twelve', 'twenty', 'one hundred'], 1, 'The twentieth light completes the crown and points toward the birthday palace.'],
];

const narratives = [
  'The observatory chart begins here: a wildflower pin has slipped from its first star, and its bright thread points toward Sakura Hollow.',
  'A tea leaf charm marks the petal-shaped gap in Sakura Hollow; its lantern trail bends toward Hanok Village.',
  'A folded paper star has fallen between the quiet roofs; its crease points north to the first frost-lit watch.',
  'A frost-smeared star chart needs its missing glass bead; the clean edge points east along the fjord.',
  'A painted wooden bird has lost its signal colour beside the water; its wing points toward Alpenrose.',
  'A small valley bell has gone silent; its note is caught in the high pass leading to Old London.',
  'A clockmaker’s brass gear slipped from the great clock; its teeth mark the next point above New Yonder.',
  'A coloured window tile is missing from a high facade; its shard catches the light toward Maple Row.',
  'A carousel horse has lost a painted piece of its tune; the turning path leads back toward Firenzia.',
  'A gold leaf has drifted from the painter’s palette; its green reflection reaches Madinat an-Nur.',
  'A blue mosaic piece is missing from the courtyard fountain; the water carries its glimmer toward Souq al-Qamar.',
  'A market lantern is missing its brass wick-holder; its empty glow points across the dunes.',
  'A compass rose has lost its north mark in the sand; the star line leads to the Nile crossing.',
  'A papyrus strip has slipped from the river keeper’s map; its waterline leads toward Bagh-e-Noor.',
  'A marble petal is missing from the garden’s four-fold pattern; its path turns toward Gulabi Nagar.',
  'A rose-coloured pane has lost one piece of its morning light; the bright edge points toward Kaveri Coast.',
  'A shell pendant has fallen beside the backwaters; its tide marks lead north to Jade Terraces.',
  'A jade bead has rolled from a terrace step; its green gleam follows the water toward Nusa Rinjani.',
  'A woven reed ring has slipped from the rice-field marker; its reflection points upward to the cloud islands.',
  'A cloud-glass star rests beneath the Great Lantern; set it in place and the completed crown will shine over the palace.',
];

const SKY_TOP = {
  x: Math.cos(15 * 0.9) * (70 - 15 * 3.2) + 6,
  z: Math.sin(15 * 0.9) * (70 - 15 * 3.2),
  y: 18 + 15 * 9 + 0.6,
};

const answerKeys = [];
const chapters = route.map(([id, name, col, row], i) => {
  const [title, item, prompt, options, answer, success] = beats[i];
  const act = JOURNEY_ACTS.findIndex((a) => i >= a.start && i <= a.end);
  answerKeys.push(answer);
  const center = { x: (col - 2) * 700, z: (row - 1) * 700 };
  const collect = id === 'skyisles'
    ? { x: center.x + SKY_TOP.x + 5, y: SKY_TOP.y, z: center.z + SKY_TOP.z + 4 }
    : { x: center.x + 5, y: 0, z: center.z + 72 };
  const beacon = id === 'skyisles'
    ? { x: center.x + SKY_TOP.x - 5, y: SKY_TOP.y, z: center.z + SKY_TOP.z + 8 }
    : { x: center.x - 5, y: 0, z: center.z + 104 };
  return Object.freeze({
    id, region: id, name, title, act,
    intro: narratives[i],
    collectText: `Recover ${item} at the collector station.`,
    item, collect: Object.freeze(collect), beacon: Object.freeze(beacon),
    puzzle: Object.freeze({ prompt, options: Object.freeze([...options]) }),
    success,
  });
});

export const JOURNEY_CHAPTERS = Object.freeze(chapters);
const publicChapter = (chapter) => ({
  id: chapter.id, region: chapter.region, name: chapter.name, title: chapter.title, act: chapter.act,
  intro: chapter.intro, collectText: chapter.collectText, item: chapter.item,
  collect: { ...chapter.collect }, beacon: { ...chapter.beacon },
  puzzle: { prompt: chapter.puzzle.prompt, options: [...chapter.puzzle.options] },
  success: chapter.success,
});

/** Public journal catalog; answer keys are never included. */
export function journeyCatalog() {
  return JOURNEY_CHAPTERS.map(publicChapter);
}

export function newJourney() {
  return { chapter: 0, stage: 'collect', completed: [], stars: 0, version: 0 };
}

function bad(message) {
  throw Object.assign(new Error(message), { status: 400 });
}

function checkProgress(progress) {
  if (!progress || !Number.isInteger(progress.chapter) || progress.chapter < 0 || progress.chapter > JOURNEY_CHAPTERS.length ||
      !Array.isArray(progress.completed) || !Number.isInteger(progress.stars) || !Number.isInteger(progress.version) || progress.version < 0) {
    bad('Invalid journey progress.');
  }
  const complete = progress.chapter === JOURNEY_CHAPTERS.length;
  const prefix = JOURNEY_CHAPTERS.slice(0, progress.chapter).map((chapter) => chapter.id);
  if ((complete && progress.stage !== 'complete') ||
      (!complete && progress.stage !== 'collect' && progress.stage !== 'beacon') ||
      progress.stars !== progress.chapter || progress.completed.length !== prefix.length ||
      progress.completed.some((id, i) => id !== prefix[i])) {
    bad('Inconsistent journey progress.');
  }
  return complete;
}

function near(position, target) {
  return position && Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z) &&
    Math.hypot(position.x - target.x, position.z - target.z) <= 8 && Math.abs(position.y - target.y) <= 8;
}

export function journeyView(progress) {
  const complete = checkProgress(progress);
  const view = {
    chapter: progress.chapter, stage: progress.stage,
    completed: [...progress.completed], stars: progress.stars,
    version: progress.version, complete,
  };
  if (!complete) view.current = publicChapter(JOURNEY_CHAPTERS[progress.chapter]);
  return view;
}

/**
 * Apply one authenticated server action. Position is the actor's server-held
 * world position; callers must never substitute a client-provided position.
 */
export function advanceJourney(progress, action, position) {
  const complete = checkProgress(progress);
  if (complete) bad('The journey is already complete.');
  if (!action || typeof action !== 'object') bad('Invalid journey action.');
  const chapter = JOURNEY_CHAPTERS[progress.chapter];
  if (action.type === 'journey-collect') {
    if (progress.stage !== 'collect') bad('There is nothing to collect at this stage.');
    if (!near(position, chapter.collect)) bad('Collector station is too far away.');
    return { ...progress, stage: 'beacon', completed: [...progress.completed], version: progress.version + 1 };
  }
  if (action.type === 'journey-light') {
    if (progress.stage !== 'beacon') bad('The beacon is not ready to light.');
    if (!near(position, chapter.beacon)) bad('Beacon station is too far away.');
    if (!Number.isInteger(action.answer) || action.answer !== answerKeys[progress.chapter]) bad('That answer does not relight the beacon.');
    const completed = [...progress.completed, chapter.id];
    const nextChapter = progress.chapter + 1;
    return {
      chapter: nextChapter, stage: nextChapter === JOURNEY_CHAPTERS.length ? 'complete' : 'collect',
      completed, stars: progress.stars + 1, version: progress.version + 1,
    };
  }
  return bad('Unknown journey action.');
}
