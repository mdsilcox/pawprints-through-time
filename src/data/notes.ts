/**
 * Pip's History Notes: short, true, kid-friendly facts collected in each era. They fill the
 * Museum of Time's notice board and the History Notes page in the pause menu.
 */
export interface HistoryNote {
  id: string;
  era: 'pirate' | 'egypt' | 'fifties' | 'florence';
  title: string;
  text: string;
}

export const NOTES: HistoryNote[] = [
  // ---------------------------------------------------------------- 1950s America
  {
    id: 'fifties-rock',
    era: 'fifties',
    title: 'Rock and roll',
    text: 'Rock and roll music became hugely popular in the 1950s. Teenagers listened on the radio and on records — and danced to it everywhere.',
  },
  {
    id: 'fifties-pinsetter',
    era: 'fifties',
    title: 'Machines that set up the pins',
    text: 'In the 1950s, bowling alleys began using machines to set up the pins. Before that, workers called “pinboys” reset every pin by hand!',
  },
  {
    id: 'fifties-diner',
    era: 'fifties',
    title: 'Shiny diners',
    text: 'Many American diners were built long and shiny, to look like the dining cars on trains. They were famous for burgers, pie and milkshakes.',
  },
  {
    id: 'fifties-records',
    era: 'fifties',
    title: 'Jukeboxes and 45s',
    text: 'Jukeboxes played small records called “45s”, because they spun around 45 times a minute. Each side held just one song.',
  },
  {
    id: 'fifties-sockhop',
    era: 'fifties',
    title: 'Sock hops',
    text: 'Sock hops were school dances where kids danced in their socks — so their hard shoes wouldn’t scratch the gym floor!',
  },
  // ---------------------------------------------------------------- the Golden Age of Piracy (~1715)
  {
    id: 'pirate-golden-age',
    era: 'pirate',
    title: 'The Golden Age of Piracy',
    text: 'Historians call the years from about the 1650s to the 1730s the “Golden Age of Piracy”. Many pirate ships sailed the warm Caribbean Sea.',
  },
  {
    id: 'pirate-articles',
    era: 'pirate',
    title: 'Pirate rules',
    text: 'Many pirate crews wrote their own rules, called “articles”. Crews often voted to choose their captain — and could vote a new one in!',
  },
  {
    id: 'pirate-eight',
    era: 'pirate',
    title: 'Pieces of eight',
    text: '“Pieces of eight” were silver coins from Spain. Each one was worth eight smaller coins called reales.',
  },
  {
    id: 'pirate-hornpipe',
    era: 'pirate',
    title: 'The sailor’s hornpipe',
    text: 'Sailors danced hornpipes on deck — a lively dance that needs very little room. Some steps copy sailors’ jobs, like hauling ropes and climbing the rigging.',
  },
  {
    id: 'pirate-hardtack',
    era: 'pirate',
    title: 'Ship’s biscuits',
    text: 'Sailors ate “hardtack”, a hard, dry biscuit that lasted for months at sea. It was so hard that people dunked it in soup or tea to soften it.',
  },
  {
    id: 'pirate-treasure',
    era: 'pirate',
    title: 'Buried treasure?',
    text: 'Real pirates hardly ever buried their treasure — they usually shared it out and spent it! Treasure maps with an X are mostly from storybooks.',
  },
];

export const NOTE_BY_ID = new Map(NOTES.map((n) => [n.id, n]));
export const ERA_TITLE: Record<HistoryNote['era'], string> = {
  pirate: '🏴 The Golden Age of Piracy',
  egypt: '🔺 Ancient Egypt',
  fifties: '🎳 1950s America',
  florence: '🎨 Renaissance Florence',
};
