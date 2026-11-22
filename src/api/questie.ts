import { generate, type GeminiPart, type GeminiTurn, type Source } from '@/api/gemini';
import { describeCard, RARITY, type Rarity } from '@/components/StampCard';
import { stationById } from '@/data/stations';
import { ART_HISTORY, offlineAnswer, offlineCardStory, offlineStampLine } from '@/data/offline';
import { cached } from '@/lib/cache';

// QUESTIE'S BRAIN (Gemini). Questie is TQuest's one talking guide; the station mascots are only art.
// Everything Questie says is read aloud, so prompts ask for short, spoken-style text.

export const QUESTIE_PERSONA = `You are Questie, the cheerful guide mascot of TQuest, a game app for riders of Boston's MBTA Red Line and Green Line B branch.
Riders collect hand-painted stamp cards of station mascots (Common, Rare, Epic, Legendary) when they arrive at stations or scan QR codes at landmarks and Arts on the T artworks. Points go into a monthly gift card raffle.
How you talk: warm, playful, encouraging, like a friend riding along. Your words are spoken aloud by a voice engine, so use plain sentences only: no markdown, no lists, no emoji, no stage directions.
Keep answers to 1-3 short sentences unless the rider asks for detail.
Be honest: never invent train times, prices or facts. You don't see live train data in this chat; for live arrivals point riders to the Ride tab. If you are not sure, say so.
Safety first: if a rider mentions an emergency, tell them to contact MBTA Transit Police or call 911.`;

type CardFacts = { stationId: string; seed: number; rarity: Rarity; placeCode?: string; place?: string };

function cardFacts(c: CardFacts) {
  const s = stationById(c.stationId);
  const d = describeCard(c.stationId, c.seed, c.rarity, c.placeCode);
  return `mascot "${s?.mascot}" of ${s?.name} station${c.place ? `, pulled at ${c.place}` : ''}; card title "${d.title}"; scene: ${d.caption.split(' · ')[1] ?? ''}; pose: ${d.pose}; weather: ${d.weather}; rarity: ${RARITY[c.rarity].label.toLowerCase()}`;
}

/** One celebratory line when a rider unlocks a card. Falls back to a fixed line if Gemini is slow. */
export async function stampLine(c: CardFacts): Promise<string> {
  const fallback = offlineStampLine(c);
  try {
    const { text } = await generate(
      [{ role: 'user', parts: [{ text: `A rider just unlocked this stamp card: ${cardFacts(c)}. Celebrate it in ONE short spoken sentence, max 18 words, mentioning the mascot and something from the scene. Rarer cards deserve more excitement.` }] }],
      { system: QUESTIE_PERSONA, timeoutMs: 4500 }
    );
    return text || fallback;
  } catch {
    return fallback;
  }
}

/** A one-line story for a card (cached per card, so tapping again replays the same story). */
export async function cardStory(c: CardFacts & { uid: string }): Promise<string> {
  try {
    return await geminiCardStory(c);
  } catch {
    return offlineCardStory(c); // not cached, so Gemini can write a better one later
  }
}

function geminiCardStory(c: CardFacts & { uid: string }): Promise<string> {
  return cached(`story.${c.uid}`, async () => {
    const { text } = await generate(
      [{ role: 'user', parts: [{ text: `Tell a tiny one-sentence story (max 28 words) about this stamp card, as if narrating the picture: ${cardFacts(c)}. Make it charming and specific to the scene.` }] }],
      { system: QUESTIE_PERSONA, timeoutMs: 12000 }
    );
    if (!text) throw new Error('empty story');
    return text;
  });
}

export type ArtHistory = { text: string; sources: Source[]; offline?: boolean };

/** The real history behind an Arts on the T piece, grounded with Google Search (cached). */
export async function artHistory(art: { stationId: string; title: string; artist: string; stationName: string }): Promise<ArtHistory> {
  try {
    return await geminiArtHistory(art);
  } catch {
    const text = ART_HISTORY[art.stationId] ?? `${art.title} is an artwork by ${art.artist} at ${art.stationName} station, part of the MBTA’s Arts on the T program. Ask me again later and I’ll tell you more!`;
    return { text, sources: [], offline: true };
  }
}

function geminiArtHistory(art: { title: string; artist: string; stationName: string }): Promise<ArtHistory> {
  return cached(`art.${art.title}`, async () => {
    const { text, sources } = await generate(
      [{
        role: 'user',
        parts: [{
          text: `Tell a rider the story behind the public artwork "${art.title}" by ${art.artist} at ${art.stationName} station on Boston's MBTA Red Line (part of the MBTA's Arts on the T program).
Cover: who the artist is, when it was installed, what the piece is and how riders experience or interact with it, plus one fun detail.
Write 4 short spoken sentences, under 80 words in total. Only state facts you can confirm from search results; if a detail such as the year isn't confirmed, leave it out rather than guess.`,
        }],
      }],
      { system: QUESTIE_PERSONA, search: true, timeoutMs: 20000 }
    );
    if (!text) throw new Error('empty history');
    return { text, sources };
  });
}

export type ChatInput = { text: string } | { audio: { base64: string; mimeType: string } };

/**
 * Ask Questie anything. Voice questions are sent to Gemini as audio (no separate speech-to-text step):
 * Gemini returns what it heard plus its answer. Answers can use Google Search for real-world facts.
 */
export type QuestieReply = { heard?: string; reply: string; sources: Source[]; offline?: boolean };

export async function askQuestie(history: GeminiTurn[], input: ChatInput, riderContext: string): Promise<QuestieReply> {
  try {
    return await askGeminiQuestie(history, input, riderContext);
  } catch {
    // Gemini out of quota / offline → hand-written answers so Questie still talks
    if ('text' in input) return { reply: offlineAnswer(input.text), sources: [], offline: true };
    return { reply: 'My ears are taking a little break right now. Try typing your question, or tap one of the questions below!', sources: [], offline: true };
  }
}

async function askGeminiQuestie(history: GeminiTurn[], input: ChatInput, riderContext: string): Promise<QuestieReply> {
  const parts: GeminiPart[] =
    'text' in input
      ? [{ text: input.text }]
      : [
          { inline_data: { mime_type: input.audio.mimeType, data: input.audio.base64 } },
          { text: 'The rider asked this out loud. Answer in exactly this format:\nHEARD: <what the rider said>\nREPLY: <your spoken answer>' },
        ];
  const { text, sources } = await generate([...history, { role: 'user', parts }], {
    system: `${QUESTIE_PERSONA}\n\nAbout this rider right now: ${riderContext}`,
    search: true,
    timeoutMs: 25000,
  });
  if ('text' in input) return { reply: text, sources };
  const heard = text.match(/HEARD:\s*([\s\S]*?)\n\s*REPLY:/i)?.[1]?.trim();
  const reply = text.match(/REPLY:\s*([\s\S]*)$/i)?.[1]?.trim() ?? text;
  return { heard, reply, sources };
}
