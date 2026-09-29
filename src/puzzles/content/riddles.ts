import type { Riddle } from '../logic/riddle';

/**
 * Original riddles for the Riddle Stone in Tockwood's plaza (one new riddle a day).
 * Written for this game; answers are forgiving (see checkAnswer).
 */
export const TOCKWOOD_RIDDLES: Riddle[] = [
  {
    id: 'r-clocktower',
    q: 'I’m the tallest thing in Tockwood. I have a big round face, I chime every hour... and right now I’m ticking backwards! What am I?',
    answers: ['clocktower', 'clock tower', 'tower', 'clock'],
    decoys: ['Lighthouse', 'Windmill', 'Fountain', 'Old oak'],
    hints: ['Look up — way up — in the middle of the island.', 'It’s where Pip looks after the Great Hourglass.', 'It starts with CLOCK and ends with TOWER.'],
  },
  {
    id: 'r-biscuit',
    q: 'I have short legs and a fluffy bottom, I wear a red bandana, and my nose can find buried treasure. Who am I?',
    answers: ['biscuit', 'corgi', 'dog', 'puppy'],
    decoys: ['Clover', 'Pip', 'Rocco', 'Finnegan'],
    hints: ['He’s your best four-legged friend.', 'Woof! He loves digging.', 'His name is a yummy snack: B _ _ _ _ _ T.'],
  },
  {
    id: 'r-bubble',
    q: 'I’m made of soap and one little breath. I shine like a rainbow and float on the air — but one tiny poke and I’m not there! What am I?',
    answers: ['bubble', 'soap bubble'],
    decoys: ['Balloon', 'Cloud', 'Butterfly', 'Kite'],
    hints: ['You can make me at bath time.', 'Blow gently through a wand...', 'It rhymes with “double”: B U B B _ _.'],
  },
  {
    id: 'r-snail',
    q: 'I carry my house wherever I go, and I leave a shiny trail behind me — slowly, slowly. What am I?',
    answers: ['snail'],
    decoys: ['Turtle', 'Crab', 'Hedgehog', 'Caterpillar'],
    hints: ['I’m very small and very slow.', 'I live in gardens and I love lettuce.', 'S _ _ _ L.'],
  },
  {
    id: 'r-anchor',
    q: 'I’m heavy on purpose. Sailors drop me into the sea so their ship can stay still and take a nap. What am I?',
    answers: ['anchor'],
    decoys: ['Sail', 'Rope', 'Ship’s wheel', 'Treasure chest'],
    hints: ['You’ll find me on every ship.', 'I’m shaped a bit like a hook and I sink to the bottom.', 'A N _ H _ R.'],
  },
  {
    id: 'r-seed',
    q: 'I’m small enough to hide in your hand. Give me soil, water and sunshine, and one day I’ll be taller than you! What am I?',
    answers: ['seed', 'seeds'],
    decoys: ['Pebble', 'Egg', 'Button', 'Marble'],
    hints: ['Juniper sells lots of us.', 'You plant me in the garden.', 'S _ _ D.'],
  },
  {
    id: 'r-rainbow',
    q: 'After the rain I paint the sky in stripes of every colour, but nobody can ever touch my paint. What am I?',
    answers: ['rainbow'],
    decoys: ['Sunset', 'Kite', 'Butterfly', 'Paint box'],
    hints: ['Look for me when the sun comes out after a shower.', 'Red, orange, yellow, green, blue...', 'R A _ N B _ W.'],
  },
  {
    id: 'r-lighthouse',
    q: 'I stand by the sea all night with one bright eye. I wink and I blink so the boats get home safe. What am I?',
    answers: ['lighthouse', 'light house'],
    decoys: ['Moon', 'Star', 'Lantern', 'Clocktower'],
    hints: ['I’m tall and stripy and I live on the coast.', 'My light turns round and round.', 'LIGHT + a place where you live.'],
  },
  {
    id: 'r-honey',
    q: 'Busy bees make me, bears dream about me, and I’m the sticky gold in Juniper’s jars. What am I?',
    answers: ['honey'],
    decoys: ['Jam', 'Butter', 'Syrup', 'Cheese'],
    hints: ['I’m very, very sweet.', 'Bees keep me in a hive.', 'H _ N _ Y.'],
  },
  {
    id: 'r-kite',
    q: 'I’m a paper bird with no feathers. I can’t flap, so I climb the sky on the wind — and a string brings me home. What am I?',
    answers: ['kite'],
    decoys: ['Aeroplane', 'Balloon', 'Bird', 'Leaf'],
    hints: ['You fly me on a windy day.', 'Somebody on the ground holds my string.', 'K _ T E.'],
  },
  {
    id: 'r-compass',
    q: 'Spin me round and round, but my little arrow always turns back to the north. Explorers keep me in their pockets. What am I?',
    answers: ['compass'],
    decoys: ['Clock', 'Map', 'Telescope', 'Weather vane'],
    hints: ['Pirates and explorers use me to find their way.', 'My pointy arrow is a tiny magnet.', 'C _ M P _ S S.'],
  },
  {
    id: 'r-pillow',
    q: 'I’m soft and full of fluff. Every night you rest your sleepy head on me, and I keep your dreams comfy. What am I?',
    answers: ['pillow', 'cushion'],
    decoys: ['Blanket', 'Teddy bear', 'Hat', 'Cloud'],
    hints: ['You’ll find me on your bed.', 'Your head goes on me, not your feet.', 'P _ L L _ W.'],
  },
  {
    id: 'r-umbrella',
    q: 'I open up when it’s rainy and fold up when the sun says hello. I keep you dry from the top down. What am I?',
    answers: ['umbrella', 'brolly'],
    decoys: ['Raincoat', 'Hat', 'Tent', 'Wellies'],
    hints: ['You hold me over your head.', 'I have a handle and a pointy top.', 'U M B R _ L L _.'],
  },
  {
    id: 'r-oak',
    q: 'I’m very old and very tall. Bunnies live among my roots, and Clover cooks soup down below me. What am I?',
    answers: ['oak', 'oak tree', 'tree', 'old oak'],
    decoys: ['Clocktower', 'Mushroom', 'Hill', 'Windmill'],
    hints: ['Look on the west side of the island.', 'Acorns grow on me!', 'It’s a tree: O _ K.'],
  },
  {
    id: 'r-bell',
    q: 'I sing when I’m hit, I live high in a tower, and I tell the whole village it’s a brand-new hour. What am I?',
    answers: ['bell'],
    decoys: ['Drum', 'Whistle', 'Clock', 'Trumpet'],
    hints: ['Ding... dong!', 'I hang at the very top of the clocktower.', 'B _ L L.'],
  },
  {
    id: 'r-shell',
    q: 'I used to be a sea creature’s home. Now I rest on the beach, and if you hold me to your ear I’ll hum a song of the waves. What am I?',
    answers: ['shell', 'seashell', 'sea shell', 'conch'],
    decoys: ['Pebble', 'Starfish', 'Crab', 'Bottle'],
    hints: ['Biscuit digs lots of us up on the beach.', 'I can be spiral or shaped like a fan.', 'S H _ _ L.'],
  },
  {
    id: 'r-map',
    q: 'I’m a picture with an X that marks the very best part. Fold me up and take me on every adventure. What am I?',
    answers: ['map', 'treasure map'],
    decoys: ['Letter', 'Painting', 'Flag', 'Book'],
    hints: ['Pirates love me.', 'I show you where things are.', 'M _ P.'],
  },
  {
    id: 'r-hourglass',
    q: 'I tell the time without a tick. My sand trickles down, then I flip over and it trickles again. Pip looks after a very big one! What am I?',
    answers: ['hourglass', 'sand timer', 'egg timer'],
    decoys: ['Clock', 'Sundial', 'Calendar', 'Candle'],
    hints: ['I have two glass bulbs.', 'Sand trickles through my skinny middle.', 'HOUR + something you drink from.'],
  },
];
