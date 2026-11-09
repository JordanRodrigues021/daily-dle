/*
  THE GAME LIST
  ─────────────
  Every game the crew plays. You can also change any of this from inside the site
  (Rules tab). Changes made there sync to everyone and take priority over this file.

  kind   → how a result is scored (see KINDS in app.js):
           guesses  · limited guesses, e.g. Wordle 4/6          params: max
           open     · unlimited guesses, fewer is better         params: par, cap
           count    · fewer of something (mistakes, hints)       params: max, noun, fail
           time     · fastest time                               params: gold, cap (seconds)
           score    · points out of a known max                  params: max, noun
           relative · points with no known max, scored vs crew   params: noun, dir (high|low)
           boards   · multi-board (Quordle)                      params: n, max
  check  → true when we couldn't verify the link. It points at a web search
           until someone sets the real URL in Rules.
  alias  → extra words that identify the game in pasted share text.
*/
(function () {
  const search = (q) => 'https://www.google.com/search?q=' + encodeURIComponent(q + ' daily game');

  window.DLE_GAMES = [
    { id: 'wordle',        name: 'Wordle',          cat: 'word',   kind: 'guesses',  params: { max: 6 },  url: 'https://www.nytimes.com/games/wordle/index.html' },
    { id: 'poople',        name: 'Poople',          cat: 'wild',   kind: 'guesses',  params: { max: 6 },  url: 'https://poople.app', off: true, note: 'poople.app is up for sale. Switched off until it has a home.' },
    { id: 'connections',   name: 'Connections',     cat: 'word',   kind: 'count',    params: { max: 4, noun: 'mistakes', fail: 1 }, url: 'https://www.nytimes.com/games/connections' },
    { id: 'krillion',      name: 'Krillion',        cat: 'trivia', kind: 'score',    params: { max: 7000, noun: 'm' }, url: 'https://krillion.io', alias: ['daily dive'] },
    { id: 'globle',        name: 'Globle',          cat: 'geo',    kind: 'open',     params: { par: 4, cap: 30 }, url: 'https://globle-game.com' },
    { id: 'flagle',        name: 'Flagle',          cat: 'geo',    kind: 'guesses',  params: { max: 6 },  url: 'https://www.flagle.io' },
    { id: 'terradle',      name: 'Terradle',        cat: 'fandom', kind: 'open',     params: { par: 3, cap: 20 }, url: 'https://terradle.com' },
    { id: 'strands',       name: 'Strands',         cat: 'word',   kind: 'count',    params: { max: 5, noun: 'hints', fail: 0 }, url: 'https://www.nytimes.com/games/strands' },
    { id: 'spotle',        name: 'Spotle',          cat: 'trivia', kind: 'guesses',  params: { max: 10 }, url: 'https://spotle.io' },
    { id: 'crossword',     name: 'Crossword',       cat: 'word',   kind: 'time',     params: { gold: 600, cap: 3600 }, url: 'https://www.nytimes.com/crosswords/game/daily', alias: ['daily crossword'] },
    { id: 'minutecryptic', name: 'Minute Cryptic',  cat: 'word',   kind: 'count',    params: { max: 6, noun: 'hints', fail: 0 }, url: 'https://www.minutecryptic.com' },
    { id: 'brandle',       name: 'Brandle',         cat: 'trivia', kind: 'guesses',  params: { max: 6 },  url: search('Brandle'), check: true },
    { id: 'pricepoint',    name: 'PricePoint',      cat: 'trivia', kind: 'relative', params: { noun: 'pts', dir: 'high' }, url: 'https://pricepoint.gg', alias: ['price point'] },
    { id: 'contextle',     name: 'Contextle',       cat: 'word',   kind: 'open',     params: { par: 20, cap: 300 }, url: search('Contextle'), check: true },
    { id: 'metazooa',      name: 'Metazooa',        cat: 'trivia', kind: 'open',     params: { par: 5, cap: 20 }, url: 'https://metazooa.com' },
    { id: 'travle',        name: 'Travle',          cat: 'geo',    kind: 'count',    params: { max: 6, noun: 'extra guesses', fail: 1 }, url: 'https://travle.earth' },
    { id: 'unwordle',      name: 'Unwordle',        cat: 'word',   kind: 'time',     params: { gold: 60, cap: 900 }, url: search('Unwordle'), check: true },
    { id: 'ethnoguessr',   name: 'Ethnoguessr',     cat: 'geo',    kind: 'relative', params: { noun: 'pts', dir: 'high' }, url: 'https://hbd.gg' },
    { id: 'magnitudle',    name: 'Magnitudle',      cat: 'trivia', kind: 'guesses',  params: { max: 6 },  url: search('Magnitudle'), check: true },
    { id: 'categories',    name: 'Categories',      cat: 'word',   kind: 'count',    params: { max: 4, noun: 'mistakes', fail: 1 }, url: 'https://www.arkadium.com/games/categories', check: true },
    { id: 'mini',          name: 'Mini Crossword',  cat: 'word',   kind: 'time',     params: { gold: 30, cap: 300 }, url: 'https://www.nytimes.com/crosswords/game/mini', alias: ['the mini'] },
    { id: 'feetle',        name: 'Feetle',          cat: 'wild',   kind: 'guesses',  params: { max: 6 },  url: search('Feetle'), check: true },
    { id: 'loldle',        name: 'Loldle',          cat: 'fandom', kind: 'open',     params: { par: 3, cap: 20 }, url: 'https://loldle.net' },
    { id: 'goldblumle',    name: 'JeffGoldblumle',  cat: 'wild',   kind: 'guesses',  params: { max: 6 },  url: search('JeffGoldblumle'), check: true, alias: ['goldblum'] },
    { id: 'murdle',        name: 'Murdle',          cat: 'logic',  kind: 'time',     params: { gold: 120, cap: 1200 }, url: 'https://murdle.com' },
    { id: 'noillirk',      name: 'Noillirk',        cat: 'trivia', kind: 'relative', params: { noun: 'pts', dir: 'high' }, url: search('Noillirk'), check: true },
    { id: 'maptap',        name: 'Maptap',          cat: 'geo',    kind: 'score',    params: { max: 1000, noun: 'pts' }, url: 'https://maptap.gg', alias: ['map tap'] },
    { id: 'fibble',        name: 'Fibble',          cat: 'word',   kind: 'guesses',  params: { max: 8 },  url: 'https://fibble.xyz' },
    { id: 'rngdle',        name: 'Rngdle',          cat: 'wild',   kind: 'relative', params: { noun: 'EP', dir: 'high' }, url: 'https://www.rngdle.com' },
    { id: 'dsmdle',        name: 'Dsmdle',          cat: 'trivia', kind: 'guesses',  params: { max: 6 },  url: search('DSMdle'), check: true },
    { id: 'chess',         name: 'Chess',           cat: 'logic',  kind: 'count',    params: { max: 3, noun: 'wrong moves', fail: 1 }, url: 'https://www.chess.com/daily-chess-puzzle', alias: ['chess.com', 'daily puzzle'] },
    { id: 'quordle',       name: 'Quordle',         cat: 'word',   kind: 'boards',   params: { n: 4, max: 9 }, url: 'https://www.merriam-webster.com/games/quordle/' },
    { id: 'duotrigordle',  name: 'Duotrigordle',    cat: 'word',   kind: 'open',     params: { par: 32, cap: 37 }, url: 'https://duotrigordle.com' },
    { id: 'chainle',       name: 'Chainle',         cat: 'word',   kind: 'score',    params: { max: 5000, noun: 'pts' }, url: 'https://chainle.io' },
    { id: 'farflung',      name: 'Farflung',        cat: 'geo',    kind: 'guesses',  params: { max: 6 },  url: search('Farflung'), check: true, alias: ['far flung'] },
    { id: 'pokedoku',      name: 'Pokedoku',        cat: 'fandom', kind: 'score',    params: { max: 9, noun: 'correct' }, url: 'https://pokedoku.com', alias: ['pokédoku'] },
    { id: 'horsle',        name: 'Horsle',          cat: 'wild',   kind: 'guesses',  params: { max: 6 },  url: search('Horsle'), check: true },
    { id: 'verityle',      name: 'Verityle',        cat: 'logic',  kind: 'guesses',  params: { max: 6 },  url: search('Verityle'), check: true },
    { id: 'costcodle',     name: 'Costcodle',       cat: 'trivia', kind: 'guesses',  params: { max: 6 },  url: 'https://costcodle.com' },
    { id: 'minecraftdle',  name: 'Minecraftdle',    cat: 'fandom', kind: 'open',     params: { par: 3, cap: 20 }, url: 'https://www.mcdle.net', check: true, alias: ['mcdle'] },
    { id: 'enclosehorse',  name: 'Enclose Horse',   cat: 'logic',  kind: 'score',    params: { max: 100, noun: '%' }, url: 'https://enclose.horse', alias: ['enclose.horse'] },
    { id: 'fineprint',     name: 'Play Fine Print', cat: 'logic',  kind: 'relative', params: { noun: 'pts', dir: 'high' }, url: search('Fine Print'), check: true, alias: ['fine print'] },
    { id: 'genshidle',     name: 'Genshidle',       cat: 'fandom', kind: 'guesses',  params: { max: 5 },  url: 'https://genshindle.com', alias: ['genshindle'] },
    { id: 'squirtle',      name: 'Squirtle',        cat: 'fandom', kind: 'guesses',  params: { max: 8 },  url: 'https://squirdle.fireblend.com', alias: ['squirdle'] },
    { id: 'pissle',        name: 'Pissle',          cat: 'wild',   kind: 'guesses',  params: { max: 6 },  url: search('Pissle'), check: true },
    { id: 'larple',        name: 'Larple',          cat: 'fandom', kind: 'guesses',  params: { max: 6 },  url: search('Larple'), check: true },
  ];

  window.DLE_BONUS = { name: 'Bored Button', url: 'https://www.boredbutton.com' };
})();
