// OFFLINE QUESTIE — hand-written content used when Gemini is unavailable
// (out of quota, no internet, or EXPO_PUBLIC_QUESTIE_OFFLINE=1 for a guaranteed-safe demo).
// Everything here is spoken by Questie's voice (ElevenLabs or the phone voice) like normal answers.
//
// ⚠️ Facts here were written by hand — double-check them before the demo, and keep them general.

import { describeCard, type Rarity } from '@/components/StampCard';
import { stationById, STATIONS } from '@/data/stations';
import { hashString } from '@/lib/random';

/* ------------------------------------------------------------ nearby facts */

export const NEARBY: Record<string, string> = {
  ALE: 'Alewife is the end of the line, right by the Alewife Brook Reservation trails and the start of the Minuteman bike path.',
  DAV: 'Davis Square is packed with cafes and restaurants, plus the Somerville Theatre.',
  POR: 'Porter is one of the deepest stations on the Red Line. Look for the bronze gloves of Glove Cycle on your way up and down.',
  HAR: 'Harvard Square has Harvard Yard, lots of bookstores and street performers on sunny days.',
  CEN: 'Central Square is known for live music, colorful murals and food from all over the world.',
  KEN: 'Kendall Square is MIT’s neighborhood. The MIT Museum is nearby, and Kendall Band plays right on the platform.',
  CHA: 'Charles/MGH sits by the Longfellow Bridge. Walk to the Charles River Esplanade or up the brick streets of Beacon Hill.',
  PRK: 'Park Street opens right onto Boston Common, the start of the Freedom Trail, with the gold-domed State House up the hill.',
  DTX: 'Downtown Crossing is Boston’s shopping hub, a short walk from Boston Common and Faneuil Hall.',
  SST: 'South Station is a big train and bus hub. Chinatown and the Seaport are both a short walk away.',
  JFK: 'JFK/UMass is the stop for UMass Boston and the JFK Presidential Library and Museum out on Columbia Point.',
};

export function nearbyLine(stationId: string): string {
  const s = stationById(stationId);
  const base = NEARBY[stationId] ?? `${s?.name ?? 'This stop'} is a friendly neighborhood station worth a look around.`;
  return `${base} And ${s?.mascot ?? 'a mascot'}'s stamp is waiting for you there!`;
}

/* ------------------------------------------------------------ artwork histories */

export const ART_HISTORY: Record<string, string> = {
  KEN:
    'Kendall Band is a set of three musical sculptures by artist Paul Matisse, installed at Kendall/MIT in the 1980s as part of the MBTA’s Arts on the T program. ' +
    'Riders play them with handles on the platform: one rings a row of chimes, one strikes a big metal ring that hums for a long time, and one shakes a metal sheet. ' +
    'The three parts are named after the scientists Pythagoras, Kepler and Galileo. Give a handle a pull while you wait and the platform turns into a concert hall!',
  POR:
    'Glove Cycle is a sculpture by artist Mags Harries at Porter station, made for the MBTA’s Arts on the T program in the 1980s. ' +
    'Bronze gloves are scattered along the long escalators and the platform, as if riders dropped them while rushing for the train. ' +
    'Porter is one of the deepest stations on the Red Line, so there is plenty of ride to spot them. Next time you pass through, see how many gloves you can count!',
};

/* ------------------------------------------------------------ cards */

const POSE: Record<string, string> = {
  wave: 'waves hello to the next train', cheer: 'cheers for every rider who passes', jump: 'hops over the platform gap', hold: 'takes a cozy little break',
  sleep: 'naps through three whole trains', dance: 'shows off a platform dance', point: 'spots the train before anyone else', lean: 'leans back and waits like a pro',
  umbrella: 'twirls an umbrella and splashes through puddles',
};
const PROP: Record<string, string> = { cup: 'with a warm cocoa', book: 'with a good book', pie: 'with a slice of pie', camera: 'snapping photos', lantern: 'holding a glowing lantern' };
const WEATHER: Record<string, string> = {
  leaves: 'as autumn leaves drift by', snow: 'while the first snowflakes fall', rain: 'in the drizzle', stars: 'under a sky full of stars', petals: 'as pink petals swirl around', none: '',
};

/** A one-line story built from what's painted on the card. */
export function offlineCardStory(c: { stationId: string; seed: number; rarity: Rarity; placeCode?: string; place?: string }): string {
  const s = stationById(c.stationId);
  const d = describeCard(c.stationId, c.seed, c.rarity, c.placeCode);
  const where = d.caption.split(' · ')[1] ?? '';
  const pose = d.pose === 'hold' && d.prop !== 'none' ? `takes a cozy break ${PROP[d.prop] ?? ''}` : POSE[d.pose];
  const sky = d.fx === 'fireworks' ? 'as fireworks pop overhead' : d.fx === 'rainbow' ? 'under a bright rainbow' : WEATHER[d.weather] ?? '';
  const glow = c.rarity === 'L' ? ', glowing gold from head to toe' : c.rarity === 'E' ? ', surrounded by a sparkly glow' : '';
  return `${where.charAt(0).toUpperCase() + where.slice(1)}, ${s?.mascot} ${pose}${sky ? ' ' + sky : ''}${glow}.`;
}

const STAMP_LINES: Record<Rarity, string[]> = {
  C: ['Nice! {m} from {p} just joined your album.', 'Ding! A fresh {m} card from {p}.', 'Another stamp for the collection: {m} at {p}!'],
  R: ['Ooh, a Rare {m}! "{t}" at {p}. Lucky you!', 'A Rare card! {m} is looking extra sharp today.'],
  E: ['Whoa, an Epic {m}! Look at that glow!', 'Epic pull! {m} at {p} is a seriously special one.'],
  L: ['Legendary! A golden {m} at {p}. That is one in a hundred!', 'No way, a Legendary {m}! Star eyes and everything!'],
};

export function offlineStampLine(c: { stationId: string; seed: number; rarity: Rarity; placeCode?: string; place?: string }): string {
  const s = stationById(c.stationId);
  const d = describeCard(c.stationId, c.seed, c.rarity, c.placeCode);
  const options = STAMP_LINES[c.rarity];
  return options[hashString(String(c.seed)) % options.length]
    .replace('{m}', s?.mascot ?? 'a mascot')
    .replace('{p}', c.place ?? s?.name ?? 'the station')
    .replace('{t}', d.title);
}

/* ------------------------------------------------------------ Q&A */

type Faq = { keywords: string[]; answer: string };

const FAQ: Faq[] = [
  { keywords: ['who are you', 'your name', 'what are you', 'questie'], answer: 'I’m Questie, your Red Line buddy! I announce your stops, cheer when you unlock stamps, and tell you the stories behind cards and artworks.' },
  { keywords: ['what is tquest', 'what can i do', 'about', 'how does', 'how do i play', 'what is this app', 'tquest'], answer: 'TQuest turns your Red Line ride into a game. Follow your train on the Ride tab, hear stops your way, and open a painted stamp pack every time you arrive at a station.' },
  { keywords: ['legendary', 'rare', 'epic', 'rarity', 'odds', 'chance', 'percent'], answer: 'Every pack is a surprise: 70 percent Common, 22 percent Rare, 7 percent Epic and just 1 percent Legendary. Legendary cards glow gold and have star eyes, so keep riding!' },
  { keywords: ['scan', 'qr', 'code', 'sign', 'camera'], answer: 'Tap the big gold Scan button, point your camera at a TQuest sign, and a pack opens for that place. Artwork signs also unlock an artwork stamp worth 50 points.' },
  { keywords: ['stamp', 'card', 'collect', 'pack', 'album'], answer: 'You get a stamp pack every time you arrive at a station, and another when you scan a TQuest sign at a landmark. Your album lives in the Rewards tab. Tap any card and I’ll tell you its story.' },
  { keywords: ['raffle', 'gift', 'prize', 'points', 'ticket', 'win'], answer: 'Every 100 points this month earns a raffle ticket for gift cards. Arrival stamps give 10 points, artwork stamps 50, and weekly challenges 100.' },
  { keywords: ['kendall band', 'chimes', 'matisse'], answer: ART_HISTORY.KEN },
  { keywords: ['glove cycle', 'glove', 'gloves', 'mags harries'], answer: ART_HISTORY.POR },
  { keywords: ['art', 'artwork', 'arts on the t', 'sculpture', 'museum'], answer: 'The MBTA’s Arts on the T program put artworks in many stations. Scan a TQuest artwork sign to unlock its stamp, then tap the stamp and I’ll tell you its story.' },
  { keywords: ['voice', 'vibration', 'vibrate', 'buzz', 'announcement', 'hear', 'deaf', 'blind', 'screen reader', 'text'], answer: 'Open the You tab to choose how you hear your stop: big on-screen text, my voice, vibration patterns, or all three. Each kind of alert has its own buzz, so you don’t even need to look.' },
  { keywords: ['motion', 'sick', 'queasy', 'nausea', 'dizzy', 'comfort'], answer: 'Try Motion comfort mode in the You tab. The screen goes calm and simple, and I’ll talk and buzz you through the ride so you can keep your eyes up.' },
  { keywords: ['next train', 'when', 'arrive', 'how long', 'time', 'late', 'delay', 'schedule', 'minutes'], answer: 'I can’t see live train times in this chat, but the Ride tab shows your next stop and countdown. For delays, check the station signs or the MBTA website.' },
  { keywords: ['emergency', 'police', 'hurt', 'unsafe', 'danger', 'help me', 'scared'], answer: 'If you are in danger or there is an emergency, call 911 or contact MBTA Transit Police right away, and find station staff if you can.' },
  { keywords: ['elevator', 'wheelchair', 'accessible', 'accessibility', 'stairs'], answer: 'For elevator status and accessible routes, check the MBTA’s accessibility alerts or ask station staff. You can also turn on big on-screen text and vibration in the You tab.' },
  { keywords: ['thank', 'thanks', 'awesome', 'cool'], answer: 'Anytime! Enjoy the ride, and good luck on your next pack!' },
  { keywords: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'], answer: 'Hi there! Ask me about stamps, the raffle, artworks, or what’s fun near a station.' },
];

const FALLBACK = 'Hmm, I’m not sure about that one right now. Try asking me about stamps, the raffle, Kendall Band, or what’s fun near a station!';

/** Best hand-written answer for a question (keyword match), or a friendly fallback. */
export function offlineAnswer(question: string): string {
  const q = ' ' + question.toLowerCase().replace(/[^a-z0-9/ ]/g, ' ').replace(/\s+/g, ' ') + ' ';

  // "near Park Street", "what's at Harvard"… → station facts
  const station = STATIONS.find((s) => {
    const names = [s.name.toLowerCase(), s.name.toLowerCase().split('/')[0]];
    return names.some((n) => n.length > 3 && q.includes(n));
  });
  const asksPlace = /near|around|see|do at|visit|fun|eat|food|go to|what s at|whats at/.test(q);
  if (station && (asksPlace || !FAQ.some((f) => f.keywords.some((k) => q.includes(k))))) return nearbyLine(station.id);

  let best: Faq | null = null;
  let bestScore = 0;
  for (const f of FAQ) {
    const score = f.keywords.reduce((n, k) => n + (q.includes(' ' + k) || q.includes(k + ' ') ? k.split(' ').length : 0), 0);
    if (score > bestScore) { best = f; bestScore = score; }
  }
  return best ? best.answer : FALLBACK;
}

export const OFFLINE_SUGGESTIONS = ['What can I do in TQuest?', 'How do I get Legendary cards?', 'Tell me about Kendall Band', 'What’s fun near Park Street?', 'How does the raffle work?', 'I feel motion sick'];
