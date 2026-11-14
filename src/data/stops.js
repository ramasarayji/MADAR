// Short, human-sounding narration lines (one per stop) + labels for the HUD.
// To use real recorded voice instead, drop MP3s in public/audio/voice/ named
// after the stop id (lrv.mp3, surveyor3.mp3 ...) - they override the browser voice.
export const STAGES = {
  1: 'Stage 1 — The Moon',
  2: 'Stage 2 — Deep Space',
  3: 'Stage 3 — Mars'
};

export const STOP_META = {
  lrv: {
    short: 'Apollo LRV', stage: 1,
    narration: "Stop one. The Lunar Roving Vehicle. On Apollo fifteen, sixteen and seventeen, this little electric car let astronauts drive miles away from their lander. Before it, they could only walk."
  },
  surveyor3: {
    short: 'Surveyor 3', stage: 1,
    narration: "Stop two. Surveyor three. Two years before the first footsteps, this robot landed on the Moon and dug into the soil. One question: would the ground hold a spacecraft? It would."
  },
  alsep: {
    short: 'ALSEP', stage: 1,
    narration: "Stop three. When the astronauts left, these science stations stayed behind. Powered by plutonium, they kept listening to moonquakes and the solar wind until nineteen seventy-seven."
  },
  dawn: {
    short: 'Dawn', stage: 2,
    narration: "Stop four. Dawn. Gentle ion engines carried it to the asteroid belt, where it orbited two worlds in one mission. First Vesta, then Ceres."
  },
  pioneer10: {
    short: 'Pioneer 10', stage: 2,
    narration: "Stop five. Pioneer ten. The first spacecraft to cross the asteroid belt, and the first to fly past Jupiter. It carries a plaque, a hello from Earth, in case anyone ever finds it."
  },
  sojourner: {
    short: 'Sojourner', stage: 3,
    narration: "Stop six. Mars. Sojourner was about the size of a microwave oven, and in nineteen ninety-seven it became the first rover to drive on another planet."
  },
  opportunity: {
    short: 'Opportunity', stage: 3,
    narration: "Stop seven. Opportunity. It was built to last ninety days. It kept driving for almost fifteen years."
  },
  ingenuity: {
    short: 'Ingenuity', stage: 3,
    narration: "Last stop. Ingenuity. A tiny helicopter that proved you can fly on Mars. It was meant to fly five times. It flew seventy-two."
  }
};

export const INTRO_LINE = "Flight deck online. Let's go and see what we've sent into space.";
export const COMET_LINE = "Heads up. Comet off the right side. Hold on.";
