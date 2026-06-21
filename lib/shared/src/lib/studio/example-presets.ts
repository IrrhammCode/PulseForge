import type {
  CreateProjectInput,
  LyricsSections,
  MusicArrangement,
  SongCreativeBrief,
} from "@/types/studio";
import { primaryGenreLabel, primaryMoodLabel } from "@/types/studio";

/** One-shot studio demo — lyrics, brief, arrangement, metadata. */
export interface StudioExamplePreset {
  id: string;
  label: string;
  description: string;
  project: CreateProjectInput;
  lyrics: LyricsSections;
}

const LATE_SPRING_LYRICS: LyricsSections = {
  intro: `(oh)\nWindow half-open, city breathing slow\nPiano like the hour before we go`,
  verse1: `Calendar still says spring but the wind already knows\nPetals on the pavement where we walked in rows\nYou were laughing at a joke I can't recall\nNow the photograph is curling on the wall`,
  chorus: `Stay with me before the green turns gold\nBefore the gentle story we've been told\nFinds another ending, growing cold\nHold this spring — don't let it go`,
  verse2: `Coffee cooling on the table, half a ring of light\nYou hummed a melody that carried through the night\nI was dreaming of a clarity we'd never name\nNow I hear your footsteps fading down the lane`,
  bridge: `If every season has to leave\nLet me learn what to believe\nOne more quiet afternoon with you\nBefore the sky forgets this blue`,
  outro: `Hold this spring…\n(oh)\nLet it go`,
  raw: "",
};

const LATE_SPRING_BRIEF: SongCreativeBrief = {
  story:
    "Late afternoon in a small apartment — spring air drifting in, someone you love is about to leave town. Cherry petals on the windowsill, coffee gone cold, a calendar you don't want to turn.",
  emotionalArc:
    "Verse: tender nostalgia and small details → Chorus: bittersweet plea to freeze time → Bridge: quiet acceptance → Outro: gentle release",
  vocalCharacter:
    "Soft airy female vocal, bedroom-pop intimacy in verses, fragile but clear tone — not powerhouse belt, more like whispered honesty with jazz phrasing",
  listenerMoment:
    "A lump in the throat when the chorus lands — wanting one more ordinary day before everything changes",
  productionNotes:
    "Minimal jazz-pop bed: felt piano, brushed drums, upright bass, light string pad. No EDM drop, no trap hats. Warm vinyl room, ~80 BPM, late-spring melancholy",
};

const LATE_SPRING_ARRANGEMENT: MusicArrangement = {
  instruments: ["Piano", "Strings", "Acoustic guitar"],
  accompaniment: "felt piano chords with jazz voicings, brushed snare, soft upright bass",
  harmony: "close warm harmonies on chorus, barely-there string pad",
  musicalKey: "D major / B minor feel",
  stemEngine: "auto",
  vocal: {
    voiceType: "female",
    delivery: "airy",
    customCharacter: "ethereal bedroom-pop vocal, gentle jazz phrasing, intimate not robotic",
    adLibs: true,
    avoid: "robotic, EDM vocal chop, aggressive belt, trap",
  },
  sections: {
    intro: {
      instrumental: false,
      backing: "sparse piano motif, room ambience",
      inlineCues: "soft piano opening, distant city hum",
      melody: "delicate piano figure",
    },
    verse1: {
      backing: "minimal piano + light bass, lots of space for vocal",
      melody: "muted guitar texture optional",
      inlineCues: "intimate vocal, natural breath",
    },
    chorus: {
      backing: "full gentle jazz-pop lift — drums, bass, strings swell",
      melody: "piano doubles vocal hook",
      inlineCues: "emotional swell, layered soft harmonies",
    },
    verse2: {
      backing: "add subtle guitar, slightly fuller than verse one",
      inlineCues: "deeper nostalgia in delivery",
    },
    bridge: {
      backing: "strip to piano and strings only",
      inlineCues: "vulnerable pause, then resolve",
      avoid: "loud drums, EDM",
    },
    outro: {
      instrumental: false,
      backing: "piano fade, strings dissolve",
      inlineCues: "gentle vocal fade, final piano resolve",
    },
  },
};

export const LATE_SPRING_BALLAD_EXAMPLE: StudioExamplePreset = {
  id: "late-spring-ballad",
  label: "Late spring ballad",
  description:
    "Airy jazz-pop ballad — melancholic spring nostalgia, piano & strings, intimate female vocal.",
  project: {
    title: "Petals on the Calendar",
    artistName: "Sora Lin",
    genre: "",
    mood: "",
    genreTags: ["Indie Pop", "Other"],
    moodTags: ["Melancholic", "Romantic"],
    genreCustom: "bedroom jazz pop",
    bpmTarget: 82,
    creativeBrief: LATE_SPRING_BRIEF,
    musicArrangement: LATE_SPRING_ARRANGEMENT,
  },
  lyrics: LATE_SPRING_LYRICS,
};

const INDIE_ROCK_RETURN_LYRICS: LyricsSections = {
  intro: `(mmm)\nGuitar humming in an empty hall\nI said I'd wait — I didn't wait at all`,
  verse1: `Fluorescent corridor, room at the end\nThree days driving on a whim again\nThe porter clocked my boots — he knows the scene\nI'm not here to sleep, I'm here to mean it`,
  chorus: `I fall apart when you start to cry\nNo speech prepared, no reason why\nMiles of guilt in my coat, keys in hand\nI'm walking back — I'm walking back at dawn`,
  verse2: `Metal groaning on the overnight line\nEvery black field drags me back to your side\nYou wrote don't knock unless you're staying put\nMy knuckles already know the door`,
  bridge: `Call me foolish — I won't disagree\nLeave the light on in the room for me\nOne floor up where the carpet smells of rain\nAre you still mad or am I insane`,
  outro: `Walking back at dawn…\n(yeah)\nDoor unlocked`,
  raw: "",
};

const NORTHBOUND_BRIEF: SongCreativeBrief = {
  story:
    "Impulse journey back to someone waiting in a cheap hotel corridor — third floor, fluorescent hum, suitcase half-packed. You swore you wouldn't come unless you meant it. You're on the train anyway.",
  emotionalArc:
    "Intro/verse: hypnotic restraint, travel guilt, almost spoken delivery → Chorus: total collapse — voice cracks, band slams in → Bridge: stripped confession → Outro: unresolved guitar fade",
  vocalCharacter:
    "Male indie-rock vocal — detached, close-mic verses like confiding in the dark; when the chorus hits, raw cracked intensity, not polished pop belt. Late-2000s alternative ballad phrasing.",
  listenerMoment:
    "The shock when silent tremolo guitar suddenly becomes a wall of drums and distorted guitar on the chorus — matching the lyric's emotional break",
  productionNotes:
    "Sparse-to-huge indie rock ballad: clean tremolo guitar loop intro, no drums in verse one, bass enters verse two, full live kit and distorted guitars only on chorus. ~104 BPM, D minor. No piano, no strings, no synth pop. Room reverb, Humbug-era grit.",
};

const NORTHBOUND_ARRANGEMENT: MusicArrangement = {
  instruments: ["Electric guitar", "Live drums", "Bass"],
  accompaniment:
    "tremolo clean electric guitar arpeggios, melodic bass guitar, live drum kit — silent then explosive",
  harmony: "no glossy vocal stacks in verses; gritty guitar doubles hook on chorus only",
  musicalKey: "D minor",
  stemEngine: "auto",
  vocal: {
    voiceType: "male",
    delivery: "conversational",
    customCharacter:
      "British-influenced indie male vocal — near-spoken intimate verses, desperate raw break on chorus, imperfect human texture",
    adLibs: true,
    avoid:
      "robotic, musical theatre, pop polish, EDM vocal chop, autotune, female vocal, piano ballad, orchestral strings, jazz phrasing",
  },
  sections: {
    intro: {
      instrumental: true,
      backing: "lonely tremolo electric guitar figure, tape room reverb — no drums, no bass, no vocals yet",
      inlineCues: "hypnotic sparse guitar loop",
      melody: "repeating tremolo riff",
    },
    verse1: {
      backing: "guitar continues, faint bass pulses underneath — absolutely no drums",
      inlineCues: "close-mic intimate almost spoken vocal",
      avoid: "drums, cymbals, full band, anthemic lift, piano",
    },
    chorus: {
      backing: "full band detonation — crashing live drums, distorted rhythm guitar, heavy bass",
      inlineCues: "raw emotional vocal release, strained cracked intensity",
      melody: "lead guitar mirrors vocal hook line",
      avoid: "soft jazz, strings, synth pads, gentle pop swell",
    },
    verse2: {
      backing: "guitar + walking bass, snare ghost notes building tension — still no full kit",
      inlineCues: "deeper guilt in delivery, slightly louder than verse one",
      avoid: "chorus-level drums",
    },
    bridge: {
      backing: "strip to tremolo guitar and voice, then slow crescendo into final chorus feel",
      inlineCues: "vulnerable breakdown then rising desperation",
      avoid: "EDM drop, electronic percussion",
    },
    outro: {
      instrumental: false,
      backing: "guitars dissolve to tremolo figure, distant room ambience",
      inlineCues: "whispered fade, feedback tail",
    },
  },
};

/** Indie rock return ballad — 505-style sparse build, hotel-corridor obsession, male vocal. */
export const NORTHBOUND_LONGING_EXAMPLE: StudioExamplePreset = {
  id: "northbound-longing",
  label: "Indie rock return",
  description:
    "505-style ballad — tremolo guitar, silent verses, explosive chorus, hotel corridor obsession, male vocal.",
  project: {
    title: "Corridor at Closing",
    artistName: "Jude Marr",
    genre: "",
    mood: "",
    genreTags: ["Rock", "Other"],
    moodTags: ["Melancholic", "Dark", "Romantic"],
    genreCustom: "indie alternative rock ballad",
    moodCustom: "obsessive longing",
    bpmTarget: 104,
    creativeBrief: NORTHBOUND_BRIEF,
    musicArrangement: NORTHBOUND_ARRANGEMENT,
  },
  lyrics: INDIE_ROCK_RETURN_LYRICS,
};

const SOFT_ROCK_HOLLOW_LYRICS: LyricsSections = {
  intro: `Wind through the pickup, radio low\nSomewhere between the places I won't go`,
  verse1: `Dust on the dashboard, maps that won't fold\nI learned to smile without meaning a soul\nMiles make it easier not to begin\nI'm comfortable hollow — thin as tin`,
  chorus: `Give me something real I can bend or break\nNot this quiet that settles for nobody's sake\nIf love's a weight, I used to carry it well\nNow I'm just rust in a roadside motel`,
  verse2: `Old friends call but I let it go to tape\nSay I'm fine in a voice they can't place\nSunset paints the same on every town\nI keep driving just to not look down`,
  bridge: `Maybe one day the numbness will crack\nMaybe I'll want a little of me back\nTill then the highway hums what I can't say\nAnother golden hour fading gray`,
  outro: `Rust and roadmaps…\n(oh)\nDrive away`,
  raw: "",
};

const SOFT_ROCK_HOLLOW_BRIEF: SongCreativeBrief = {
  story:
    "Southwest highway dusk — pickup truck, diner coffee cooling, maps on the dash. Someone who went emotionally numb after losing a love and now drives town to town so the feeling can't catch up.",
  emotionalArc:
    "Verse: wistful road diary, gentle resignation → Chorus: quiet ache to feel human again → Bridge: fragile flicker of hope → Outro: fade into the highway hum",
  vocalCharacter:
    "Soft male folk-rock vocal — warm and slightly weathered, close harmonies on the hook, never shouty. 1970s California soft-rock intimacy, natural vibrato, unhurried phrasing",
  listenerMoment:
    "Goosebumps when the acoustic opens into stacked harmonies on the chorus — lonely but beautiful, like sunlight through dust",
  productionNotes:
    "1970s soft rock folk: fingerpicked acoustic guitar, warm electric fills, light live drums with brushed/snare, melodic bass. ~86 BPM, G major feel. Optional subtle harmonica pad. No synth pop, no trap, no heavy distortion.",
};

const SOFT_ROCK_HOLLOW_ARRANGEMENT: MusicArrangement = {
  instruments: ["Acoustic guitar", "Live drums", "Bass"],
  accompaniment:
    "fingerpicked acoustic guitar, warm bass, brushed live drums, soft electric guitar fills",
  harmony: "two-part male harmonies on chorus hook, gentle doublings not glossy pop stacks",
  musicalKey: "G major feel",
  stemEngine: "auto",
  vocal: {
    voiceType: "male",
    delivery: "soulful",
    customCharacter:
      "1970s soft-rock male vocal, warm and weathered, unhurried folk phrasing, close harmony stacks on chorus",
    adLibs: true,
    avoid:
      "robotic, EDM, trap hats, heavy metal, screamo, autotune shine, female lead, orchestral swell, modern pop belt",
  },
  sections: {
    intro: {
      instrumental: true,
      backing: "solo fingerpicked acoustic guitar, light room reverb, open road ambience",
      inlineCues: "gentle picking pattern, unhurried tempo",
      melody: "acoustic guitar motif",
    },
    verse1: {
      backing: "acoustic guitar + soft bass enters, minimal percussion",
      inlineCues: "intimate storytelling vocal, relaxed groove",
      avoid: "full drums, electric distortion, anthemic lift",
    },
    chorus: {
      backing: "full soft-rock band — drums, bass, acoustic rhythm, harmony stacks",
      inlineCues: "warm layered harmonies, emotional lift without aggression",
      melody: "electric guitar fills between vocal lines",
      avoid: "hard rock crunch, EDM, synth pads",
    },
    verse2: {
      backing: "slightly fuller than verse one, shaker or tambourine texture",
      inlineCues: "deeper weariness in vocal tone",
    },
    bridge: {
      backing: "strip to acoustic and voice, then gentle build back",
      inlineCues: "vulnerable pause, harmonica or guitar answer optional",
      avoid: "drop section, electronic bass",
    },
    outro: {
      instrumental: false,
      backing: "acoustic fade, distant highway ambience",
      inlineCues: "soft vocal trail-off, guitar resolve",
    },
  },
};

/** 70s soft-rock folk — highway loneliness, acoustic warmth, male harmonies. */
export const SOFT_ROCK_HOLLOW_EXAMPLE: StudioExamplePreset = {
  id: "soft-rock-hollow",
  label: "Soft rock hollow",
  description:
    "Tin Man-style 70s folk-rock — fingerpicked acoustic, dusty highway, warm male vocal & harmonies.",
  project: {
    title: "Rust and Roadmaps",
    artistName: "Clay West",
    genre: "",
    mood: "",
    genreTags: ["Rock", "Other"],
    moodTags: ["Melancholic", "Chill"],
    genreCustom: "70s soft rock folk",
    moodCustom: "wistful loneliness",
    bpmTarget: 86,
    creativeBrief: SOFT_ROCK_HOLLOW_BRIEF,
    musicArrangement: SOFT_ROCK_HOLLOW_ARRANGEMENT,
  },
  lyrics: SOFT_ROCK_HOLLOW_LYRICS,
};

const BRIGHT_NOSTALGIA_LYRICS: LyricsSections = {
  intro: `(oh-oh)\nSame front door, different key in the lock`,
  verse1: `Polaroid summer pressed behind the glass\nYour laugh in the kitchen — thought those days would last\nNeighbors still wave but they don't say my name\nNothing lands quite the way it used to, same`,
  chorus: `Hold the sun in my hands for a little while\nDance through the days with a crooked smile\nYou can tell by the air it's not like before\nI'm still here but I'm not who I was anymore`,
  verse2: `Two flights up where the wallpaper peels\nFriends got married, got jobs, got deals\nI spin in the hallway like I'm seventeen\nThen the phone lights up — different screen`,
  bridge: `If going back is a trap and forward's a blur\nLet me stay in this shimmer, let it hurt\nOne more chorus in the mirror, one more spin\nBefore the new life fully moves in`,
  outro: `Not like before…\n(oh)\nSpin again`,
  raw: "",
};

const BRIGHT_NOSTALGIA_BRIEF: SongCreativeBrief = {
  story:
    "Childhood flat — polaroids on the fridge, same stairwell but everyone's moved on. You're back for a weekend, spinning in the hallway like a teenager while your whole life reorders itself without you.",
  emotionalArc:
    "Verse: bright mundane detail with ache underneath → Chorus: euphoric dance over sadness — smile that almost cracks → Bridge: suspended between past and future → Outro: bittersweet fade on the hook",
  vocalCharacter:
    "Clean male indie-pop vocal — light and forward in the mix, slightly breathy on verses, lifted and open on the chorus. Not gritty rock, not folk — polished but human, 2020s synth-pop warmth",
  listenerMoment:
    "The contrast hits when the bouncy synth groove carries a heartbreaking line — you want to dance and cry at once",
  productionNotes:
    "Upbeat indie synthpop: punchy 80s drum machine, synth bass, jangly clean electric guitar arpeggios, bright room. ~174 BPM, A major feel. Groove is bright, lyric is melancholic. No trap, no heavy guitar, no slow piano ballad.",
};

const BRIGHT_NOSTALGIA_ARRANGEMENT: MusicArrangement = {
  instruments: ["Synth", "Electric guitar", "Live drums"],
  accompaniment:
    "80s-style drum machine, synth bass pulse, jangly clean electric guitar, bright synth pads",
  harmony: "subtle vocal doubles on chorus hook, airy not choir-heavy",
  musicalKey: "A major feel",
  stemEngine: "auto",
  vocal: {
    voiceType: "male",
    delivery: "airy",
    customCharacter:
      "clean male indie-pop vocal, breathy verses, bright open chorus, bittersweet smile in the delivery",
    adLibs: true,
    avoid:
      "robotic, gritty rock vocal, folk drawl, heavy autotune, screamo, slow ballad croon, trap vocal chop",
  },
  sections: {
    intro: {
      instrumental: true,
      backing: "iconic synth + jangly guitar hook, drum machine pattern — upbeat and immediate",
      inlineCues: "bright nostalgic open, instant groove",
      melody: "guitar+synth riff",
    },
    verse1: {
      backing: "drum machine + bass pulse, guitar arpeggios, light synth pad",
      inlineCues: "conversational vocal over moving beat",
      avoid: "slow tempo, sparse ballad, acoustic folk",
    },
    chorus: {
      backing: "full bright pop lift — stacked drums, synth bass, guitar, hook energy",
      inlineCues: "euphoric bittersweet release, singalong lift",
      melody: "guitar doubles vocal hook",
      avoid: "heavy distortion, rock wall, downtempo drop",
    },
    verse2: {
      backing: "same energy as verse one, subtle synth layers added",
      inlineCues: "deeper nostalgia, still driving beat",
    },
    bridge: {
      backing: "brief strip — bass and voice, then build back to final chorus feel",
      inlineCues: "suspended moment then spin back up",
      avoid: "EDM breakdown, metal riff",
    },
    outro: {
      instrumental: false,
      backing: "groove continues, elements peel away one by one",
      inlineCues: "hook fragment fade, drum machine tail",
    },
  },
};

/** Indie synthpop nostalgia — upbeat groove, bittersweet lyrics, 80s-inspired brightness. */
export const BRIGHT_NOSTALGIA_EXAMPLE: StudioExamplePreset = {
  id: "bright-nostalgia",
  label: "Bright nostalgia",
  description:
    "Upbeat indie synthpop — 174 BPM groove, jangly guitar, bittersweet change & memory.",
  project: {
    title: "Polaroid Summer",
    artistName: "Noah Vale",
    genre: "",
    mood: "",
    genreTags: ["Indie Pop", "Electronic"],
    moodTags: ["Melancholic", "Uplifting"],
    genreCustom: "80s-inspired indie synthpop",
    moodCustom: "bittersweet nostalgia",
    bpmTarget: 174,
    creativeBrief: BRIGHT_NOSTALGIA_BRIEF,
    musicArrangement: BRIGHT_NOSTALGIA_ARRANGEMENT,
  },
  lyrics: BRIGHT_NOSTALGIA_LYRICS,
};

const DREAM_POP_INTIMACY_LYRICS: LyricsSections = {
  intro: `(hmm)\nStreetlight on your shoulder, smoke in the air`,
  verse1: `We don't need the words that morning people use\nJust the hum of the fan and your breath in the room\nCity dying quiet outside the blinds\nI memorize the shape of your mind`,
  chorus: `Stay until the blue turns into grey\nDon't say forever — just stay today\nEvery slow second pulls me under your name\nI don't want heaven if it doesn't feel the same`,
  verse2: `Your lipstick on a paper cup by the bed\nEveryday forever is what you never said\nI'll hold this moment like a flickering frame\nSlow cinema lovers who forget to leave`,
  bridge: `If the world burns out before we dress\nLet this be the night we loved with less\nNo bright future, no polished speech\nJust your heartbeat close enough to reach`,
  outro: `Stay today…\n(hmm)\nBlue to grey`,
  raw: "",
};

const DREAM_POP_INTIMACY_BRIEF: SongCreativeBrief = {
  story:
    "2am in a small apartment — blinds down, city barely audible, two people making time stand still. No grand promises, just the unbearable tenderness of not wanting morning to arrive.",
  emotionalArc:
    "Verse: whispered intimacy and stillness → Chorus: slow emotional swell, devotional but fragile → Bridge: naked vulnerability → Outro: dissolve into reverb and silence",
  vocalCharacter:
    "Soft male dream-pop vocal — close-mic, breathy, almost spoken on verses; gentle melodic lift on chorus. Heavy reverb tail, intimate not theatrical. Slowcore romance, never shouted",
  listenerMoment:
    "Time seems to stop when the washed-out guitar blooms and the vocal floats in — heartbreak and desire in the same breath",
  productionNotes:
    "Dream pop slowcore: heavily reverbed clean electric guitar, sub-soft bass, minimal brushed drums or drum machine at very low volume. ~68 BPM, C major / A minor feel. Vast reverb, stereo width, no bright pop groove, no rock distortion, no trap.",
};

const DREAM_POP_INTIMACY_ARRANGEMENT: MusicArrangement = {
  instruments: ["Electric guitar", "Bass", "Synth"],
  accompaniment:
    "reverb-drenched clean electric guitar, soft sub-bass, minimal slow drums, ethereal synth wash",
  harmony: "barely-there vocal doubles drowned in reverb, no big pop stacks",
  musicalKey: "C major / A minor feel",
  stemEngine: "auto",
  vocal: {
    voiceType: "male",
    delivery: "intimate",
    customCharacter:
      "breathy male dream-pop vocal, close whisper, heavy reverb, slowcore intimacy, sensual melancholy",
    adLibs: true,
    avoid:
      "robotic, upbeat pop belt, rock shout, trap, bright synthpop groove, fast tempo, aggressive drums, autotune shine",
  },
  sections: {
    intro: {
      instrumental: true,
      backing: "lonely reverb guitar swell, no drums, wide stereo wash",
      inlineCues: "slow cinematic open, vast space",
      melody: "repeated guitar figure with delay",
    },
    verse1: {
      backing: "guitar + soft bass pulse, drums absent or barely audible",
      inlineCues: "whispered intimate vocal, lots of room",
      avoid: "driving beat, bright energy, full kit",
    },
    chorus: {
      backing: "gentle slow swell — bass, soft drums enter, guitar blooms wider",
      inlineCues: "emotional lift still slow, devotional tone",
      melody: "guitar echoes vocal phrases",
      avoid: "anthemic pop, EDM, rock wall, fast tempo",
    },
    verse2: {
      backing: "same sparse bed, slightly more bass warmth",
      inlineCues: "deeper tenderness, lower vocal register",
    },
    bridge: {
      backing: "strip to guitar and voice in mono intimacy, then slow return",
      inlineCues: "fragile pause, reverb tail grows",
      avoid: "drop section, build-up to dance",
    },
    outro: {
      instrumental: false,
      backing: "elements dissolve into reverb and guitar feedback tail",
      inlineCues: "whisper fade, infinite reverb decay",
    },
  },
};

/** Dream pop slowcore — reverb romance, whispered male vocal, cinematic 2am intimacy. */
export const DREAM_POP_INTIMACY_EXAMPLE: StudioExamplePreset = {
  id: "dream-pop-intimacy",
  label: "Dream pop intimacy",
  description:
    "Slow reverb romance — 68 BPM dream pop, breathy vocal, late-night stillness & longing.",
  project: {
    title: "Slow Cinema",
    artistName: "Eli Noor",
    genre: "",
    mood: "",
    genreTags: ["Indie Pop", "Electronic"],
    moodTags: ["Melancholic", "Romantic", "Chill"],
    genreCustom: "dream pop slowcore",
    moodCustom: "ethereal intimacy",
    bpmTarget: 68,
    creativeBrief: DREAM_POP_INTIMACY_BRIEF,
    musicArrangement: DREAM_POP_INTIMACY_ARRANGEMENT,
  },
  lyrics: DREAM_POP_INTIMACY_LYRICS,
};

const ALT_RNB_COOL_LYRICS: LyricsSections = {
  intro: `(mmm)\nBass line talking before I say a word`,
  verse1: `You show up heavy with a heart too loud\nI like the view but I don't like the crowd\nDon't pin your halo on my messy room\nI'm not the saint you wanna assume`,
  chorus: `Don't hold me like you own the key\nI want the vibe, not the recipe\nIf it's too much, let it be enough\nI like you fine but I don't need that love`,
  verse2: `Texts at midnight, paragraphs of need\nI read the first line then I let it bleed\nYou call it passion — I call it a trap\nI'd rather groove slow than collapse`,
  bridge: `I'm not cold, I'm just clear\nDon't mistake my smile for "stay right here"\nGive me rhythm, give me air\nLove me light or love me rare`,
  outro: `Don't need that love…\n(mmm)\nOn my terms`,
  raw: "",
};

const ALT_RNB_COOL_BRIEF: SongCreativeBrief = {
  story:
    "Late-night kitchen — someone keeps falling too hard too fast. You like the chemistry but not the cling. Cool, clear, still kind: you want the groove without the gravity.",
  emotionalArc:
    "Verse: cool observation with a smirk → Chorus: catchy hook drawing the line → Verse two: firmer boundary → Bridge: soft truth without cruelty → Outro: effortless fade on the bass",
  vocalCharacter:
    "Silky female alt-R&B vocal — relaxed and in-the-pocket, subtle melismatic runs, falsetto flickers on the hook. Confident not cold, breathy not belted. Neo-soul cool girl delivery",
  listenerMoment:
    "Head nod locks when the bass and drums land — hook feels effortless but sticks; you feel the attitude before the second verse",
  productionNotes:
    "Alternative neo-soul R&B: melodic funk bass front and center, rhodes / warm electric piano chords, tight dry drums with subtle swing. ~94 BPM, D minor feel. Minimal layers, pocket groove. No trap 808 slides, no EDM drop, no rock guitars, no dream-pop wash.",
};

const ALT_RNB_COOL_ARRANGEMENT: MusicArrangement = {
  instruments: ["Bass", "Piano", "Live drums"],
  accompaniment:
    "melodic funk bass line, rhodes electric piano voicings, tight live drums with swing",
  harmony: "subtle stacked vocals on hook only, jazz-influenced chord movement",
  musicalKey: "D minor feel",
  stemEngine: "auto",
  vocal: {
    voiceType: "female",
    delivery: "soulful",
    customCharacter:
      "silky female alt-R&B vocal, cool confident tone, neo-soul phrasing, light falsetto on hook, never shouty",
    adLibs: true,
    avoid:
      "robotic, rock belt, folk vocal, dream-pop reverb wash, trap vocal chop, musical theatre, aggressive pop belt",
  },
  sections: {
    intro: {
      instrumental: true,
      backing: "bass riff + rhodes chords, drums enter on the backbeat — instant groove",
      inlineCues: "funky pocket open, hypnotic bass",
      melody: "bass-led hook figure",
    },
    verse1: {
      backing: "bass + keys + light drums, lots of space for vocal",
      inlineCues: "cool conversational delivery, in the pocket",
      avoid: "ballad swell, rock distortion, sparse dream-pop",
    },
    chorus: {
      backing: "full groove — bass louder, drums tighter, rhodes stabs",
      inlineCues: "catchy hook lift, silky vocal stacks",
      melody: "bass mirrors hook rhythm",
      avoid: "EDM drop, anthemic rock, slow ballad",
    },
    verse2: {
      backing: "same pocket, subtle percussion layers",
      inlineCues: "firmer attitude, playful edge",
    },
    bridge: {
      backing: "strip to bass and keys, drums drop out briefly then return",
      inlineCues: "honest moment, then groove returns",
      avoid: "orchestral swell, guitar solo",
    },
    outro: {
      instrumental: false,
      backing: "bass riff fades, drums simplify",
      inlineCues: "hook fragment, casual ad-lib out",
    },
  },
};

/** Alt neo-soul R&B — funky bass groove, silky female vocal, cool romantic boundaries. */
export const ALT_RNB_COOL_EXAMPLE: StudioExamplePreset = {
  id: "alt-rnb-cool",
  label: "Alt R&B cool",
  description:
    "Neo-soul groove — 94 BPM bass pocket, rhodes chords, silky female vocal, love on your terms.",
  project: {
    title: "On My Terms",
    artistName: "Zuri Lane",
    genre: "",
    mood: "",
    genreTags: ["R&B", "Indie Pop"],
    moodTags: ["Chill", "Romantic"],
    genreCustom: "alternative neo-soul R&B",
    moodCustom: "cool detachment",
    bpmTarget: 94,
    creativeBrief: ALT_RNB_COOL_BRIEF,
    musicArrangement: ALT_RNB_COOL_ARRANGEMENT,
  },
  lyrics: ALT_RNB_COOL_LYRICS,
};

const ART_ROCK_OBSERVER_LYRICS: LyricsSections = {
  intro: `(synth hum)\nSomething in the corner of the ceiling knows`,
  verse1: `You rehearse the truth like a practiced line\nI counted every tell before you crossed the line\nDon't turn the story — I already read the end\nI'm not your jury but I won't pretend`,
  chorus: `I see the pattern underneath your skin\nI know the lie before you let it in\nDon't ask for mercy you won't receive\nI've already watched you as you leave`,
  verse2: `Sorry doesn't open every door\nI've heard that sorry twenty times before\nThe fire in your eyes can't change the tape\nI kept the record — it's too late`,
  bridge: `Somebody's always counting what we do\nMaybe once it was me — now it's you\nThe room stays quiet when the camera's on\nAnd I am gone before the dawn`,
  outro: `Already watched…\n(oh)\nAs you leave`,
  raw: "",
};

const ART_ROCK_OBSERVER_BRIEF: SongCreativeBrief = {
  story:
    "A relationship autopsy in a monitored world — casino cameras, credit-card trails, the feeling that nothing stays private. One person already knows every move; the breakup is calm, final, and watched from above.",
  emotionalArc:
    "Verse: cool accumulation of evidence, restrained delivery → Chorus: omniscient hook — detached not cruel → Verse two: doors closing → Bridge: role reversal, surveillance as metaphor → Outro: fade on the synth figure",
  vocalCharacter:
    "Smooth male soft-rock vocal — polished, melodic, slightly detached. Clear head-voice lead without theatrics. Knows too much, shows little outwardly. 1980s studio-pop restraint",
  listenerMoment:
    "The iconic synth arpeggio and metronomic bass lock in — suddenly you're inside a glass room where every word is already predicted",
  productionNotes:
    "1982 art-rock soft rock: Fairlight-style synth arpeggio hook, metronomic bass pedal, steady backbeat, Wurlitzer electric piano, clean guitar in upper register, subtle orchestral pad. ~112 BPM, D major. Polished analog studio sheen. No trap, no modern EDM, no grunge distortion, no dream-pop wash.",
};

const ART_ROCK_OBSERVER_ARRANGEMENT: MusicArrangement = {
  instruments: ["Synth", "Electric guitar", "Bass", "Piano"],
  accompaniment:
    "sampled synth clavinet arpeggio, metronomic bass line, steady drums, Wurlitzer chords, clean guitar fills",
  harmony: "tight two-part vocal harmony on chorus hook, restrained not choir-big",
  musicalKey: "D major",
  stemEngine: "auto",
  vocal: {
    voiceType: "male",
    delivery: "conversational",
    customCharacter:
      "smooth 80s soft-rock male vocal, polished melodic tone, cool detached delivery, knowing not angry",
    adLibs: false,
    avoid:
      "robotic, rock scream, folk drawl, trap, EDM drop, heavy metal, breathy dream-pop, gospel belt, autotune shine",
  },
  sections: {
    intro: {
      instrumental: true,
      backing: "synth arpeggio emerges from silence, metronomic bass enters, layers build sequentially",
      inlineCues: "hypnotic 80s riff open, steady pulse",
      melody: "iconic repeating synth figure",
    },
    verse1: {
      backing: "bass pedal + drums + synth bed, guitar in upper register",
      inlineCues: "restrained vocal, measured groove",
      avoid: "ballad rubato, sparse acoustic, trap beat",
    },
    chorus: {
      backing: "full polished soft-rock lift — synth hook, bass, drums, Wurlitzer, harmony stacks",
      inlineCues: "catchy omniscient hook, smooth vocal doubles",
      melody: "guitar answers synth riff",
      avoid: "distorted rock wall, EDM build, funk slap bass",
    },
    verse2: {
      backing: "same steady groove, subtle orchestral pad underneath",
      inlineCues: "cooler tone, finality in phrasing",
    },
    bridge: {
      backing: "texture thins then rebuilds — synth and bass hold the pulse",
      inlineCues: "perspective shift, tension without shouting",
      avoid: "metal breakdown, dubstep drop",
    },
    outro: {
      instrumental: false,
      backing: "elements peel away to synth arpeggio and bass pedal fade",
      inlineCues: "hook fragment dissolve, mechanical fade",
    },
  },
};

/** 80s art-rock soft rock — synth surveillance groove, smooth male vocal, detached knowing hook. */
export const ART_ROCK_OBSERVER_EXAMPLE: StudioExamplePreset = {
  id: "art-rock-observer",
  label: "Art rock observer",
  description:
    "80s soft rock art-pop — 112 BPM synth arpeggio, metronomic bass, smooth male vocal, watched & knowing.",
  project: {
    title: "Ceiling Knows",
    artistName: "Marc Hale",
    genre: "",
    mood: "",
    genreTags: ["Rock", "Electronic"],
    moodTags: ["Melancholic", "Dark", "Chill"],
    genreCustom: "80s art rock soft rock",
    moodCustom: "detached surveillance",
    bpmTarget: 112,
    creativeBrief: ART_ROCK_OBSERVER_BRIEF,
    musicArrangement: ART_ROCK_OBSERVER_ARRANGEMENT,
  },
  lyrics: ART_ROCK_OBSERVER_LYRICS,
};

export function getStudioExamplePreset(presetId: string): StudioExamplePreset | undefined {
  return STUDIO_EXAMPLE_PRESETS.find((preset) => preset.id === presetId);
}

export function cloneExampleLyrics(preset: StudioExamplePreset): LyricsSections {
  return { ...preset.lyrics };
}

export const STUDIO_EXAMPLE_PRESETS: StudioExamplePreset[] = [
  LATE_SPRING_BALLAD_EXAMPLE,
  NORTHBOUND_LONGING_EXAMPLE,
  SOFT_ROCK_HOLLOW_EXAMPLE,
  BRIGHT_NOSTALGIA_EXAMPLE,
  DREAM_POP_INTIMACY_EXAMPLE,
  ALT_RNB_COOL_EXAMPLE,
  ART_ROCK_OBSERVER_EXAMPLE,
];

export function resolveExampleProjectSeed(
  preset: StudioExamplePreset
): CreateProjectInput & { genre: string; mood: string } {
  const seed = preset.project;
  return {
    ...seed,
    genre: primaryGenreLabel(seed),
    mood: primaryMoodLabel(seed),
  };
}

export type StudioExampleApplyPatch = {
  title: string;
  artistName: string;
  genre: string;
  mood: string;
  genreTags: string[];
  moodTags: string[];
  genreCustom?: string;
  moodCustom?: string;
  bpmTarget?: number;
  creativeBrief: SongCreativeBrief;
  musicArrangement: MusicArrangement;
};

export function buildExampleCreateInput(preset: StudioExamplePreset): CreateProjectInput {
  const seed = resolveExampleProjectSeed(preset);
  return {
    title: seed.title,
    artistName: seed.artistName,
    genre: seed.genre,
    mood: seed.mood,
    genreTags: seed.genreTags,
    moodTags: seed.moodTags,
    genreCustom: seed.genreCustom,
    moodCustom: seed.moodCustom,
    bpmTarget: seed.bpmTarget,
    creativeBrief: seed.creativeBrief,
    musicArrangement: seed.musicArrangement,
    initialLyrics: cloneExampleLyrics(preset),
  };
}

export function buildExampleApplyPatch(preset: StudioExamplePreset): StudioExampleApplyPatch {
  const seed = resolveExampleProjectSeed(preset);
  return {
    title: seed.title,
    artistName: seed.artistName,
    genre: seed.genre,
    mood: seed.mood,
    genreTags: seed.genreTags ?? [seed.genre],
    moodTags: seed.moodTags ?? [seed.mood],
    genreCustom: seed.genreCustom,
    moodCustom: seed.moodCustom,
    bpmTarget: seed.bpmTarget,
    creativeBrief: seed.creativeBrief ?? {},
    musicArrangement: seed.musicArrangement ?? {},
  };
}
