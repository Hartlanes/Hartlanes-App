// dum data for testing. Names marked dum are invented; the real venues, promoters and artists carry real facts, but handles, follower counts and links are placeholders.
//
// THE CONVENTION (one template per element, so every page of a kind looks and works the same):
//  Event      title, date or range, start time, short venue name + city + country code, attending, organiser, line-up, tickets, travel, chat.
//  User       name, @handle, bio, badges, stats, followers, following, socials, events. Friends and non-friends differ only in what stats show.
//  Artist     name, bio, founded, website, socials, followers, following, badges, stats, events.
//  Venue      name, address with a Google Maps link, one interesting fact, capacity, website, socials, followers, following, badges, stats, events.
//  Organiser  name, bio, website, socials, followers, following, badges, stats, events.
//  All pages of artists, venues and organisers are public, so there is no friends row: the website sits in that spot.
export type Kind = 'user' | 'venue' | 'organiser' | 'artist';

export type Artist = { name: string; role: string; time?: string; artistId?: string };

export type EventItem = {
  id: string;
  title: string;
  dateLabel: string;
  sortKey: number;
  place: string;
  attendance: number;
  status: 'upcoming' | 'past';
  elements: string[];
  venueId: string;
  organiserId: string;
  artists: Artist[];
  note?: string;
  tour?: string;
  tag?: string;
  cat?: 'music' | 'boat' | 'snow' | 'opera';
  recurring?: boolean;
  sub?: string;
  range?: string;
  time?: string;
  cc?: string;
  also?: string;
};

export type Profile = {
  id: string;
  kind: Kind;
  name: string;
  bio: string;
  facts: string[];
  eventIds?: string[];
  friend?: boolean;
  fof?: boolean;
  chronicler?: boolean;
  username?: string;
  short?: string;
  addr?: string;
  fullAddr?: string;
  vname?: string;
  pub?: boolean;
  founded?: number;
  website?: string;
  socials?: [string, string][];
  followers?: number;
  following?: number;
  fact?: string;
  capacity?: string;
};

const UPCOMING = ['Artists', 'Venue', 'Organiser', "Who's going", 'Friends', 'Tickets', 'Travel', 'Group chat'];
export const PAST = ['Artists', 'Venue', 'Organiser', 'Who went', 'Friends that went', 'Memorabilia', 'Reviews', 'Chat archive'];

const EVENTS_UNSORTED: EventItem[] = [
  {
    id: 'snowfest', cat: 'snow', sub: 'Winter sport', range: '22-24 Jan 2027', time: '10:00', title: 'Snowfest', dateLabel: 'Jan 2027', sortKey: 20270123, place: 'Manchester', cc: 'UK',
    attendance: 9000, status: 'upcoming', elements: UPCOMING, venueId: 'snow-centre', organiserId: 'peak-events',
    artists: [
      { name: 'Slalom open', role: 'Race', time: 'Sat 10:00' },
      { name: 'Big air night', role: 'Show', time: 'Fri 20:00' },
      { name: 'Apres sessions', role: 'Music', time: 'Sat 21:00' },
    ],
    note: 'Three days of racing, big air jumps and apres sessions on the indoor slope. Gates open at 10:00 each day. Bring warm layers (dum event).',
  },
  {
    id: 'yacht-week', cat: 'boat', sub: 'Summer sport', range: '10-17 Jul 2027', time: '09:00', title: 'Yacht Week', dateLabel: 'Jul 2027', sortKey: 20270710, place: 'Solent', cc: 'UK',
    attendance: 3500, status: 'upcoming', elements: UPCOMING, venueId: 'solent', organiserId: 'solent-fleet',
    artists: [
      { name: 'Skipper briefing', role: 'Check-in', time: 'Sat 09:00' },
      { name: 'Sunset regatta', role: 'Race', time: 'Wed 17:00' },
      { name: 'Marina party', role: 'Music', time: 'Fri 21:00' },
    ],
    note: 'A week sailing the Solent in a flotilla, with a regatta on Wednesday and a marina party on Friday (dum event).',
  },
  {
    id: 'u2-spurs-2027', tag: 'Tottenham', title: 'U2', sub: 'Concert', dateLabel: '18 Jun 2027', time: '19:00', sortKey: 20270618, place: 'London', cc: 'UK',
    attendance: 40000, status: 'upcoming', elements: UPCOMING, venueId: 'tottenham-stadium', organiserId: 'live-nation',
    artists: [
      { name: 'Wolf Alice', role: 'Special guests', time: 'Support slot', artistId: 'wolf-alice' },
      { name: 'U2', role: 'Headliner', time: 'Evening show', artistId: 'u2' },
    ],
    also: '19, 22 Jun 2027', note: 'Three nights: 18, 19 and 22 June 2027. Listings differ on start time, so check your ticket.', tour: 'Tottenham 2027',
  },
  {
    id: 'werchter-2027', title: 'Rock Werchter', sub: 'Festival', range: '1-4 Jul 2027', time: '12:00', recurring: true, dateLabel: 'Jul 2027', sortKey: 20270701, place: 'Werchter', cc: 'BE',
    attendance: 88000, status: 'upcoming', elements: [...UPCOMING, 'Camping'], venueId: 'werchter-site', organiserId: 'live-nation-be',
    artists: [
      { name: 'Main stage headliners dum', role: 'Line-up', time: 'Daily from 12:00', artistId: 'werchter-lineup' },
      { name: 'Barn stage dum', role: 'Line-up', time: 'Daily from 12:00' },
    ],
    note: 'Four days of rock, indie and pop in a Belgian festival park, with camping on site (dum line-up).',
  },
  {
    id: 'carmen-roh', cat: 'opera', sub: 'Opera', tag: 'Covent Garden', title: 'Carmen', dateLabel: '20 Mar 2027', time: '19:30', sortKey: 20270320, place: 'London', cc: 'UK',
    attendance: 2256, status: 'upcoming', elements: UPCOMING, venueId: 'roh', organiserId: 'roh-foundation',
    artists: [
      { name: 'Elena Marsh dum', role: 'Carmen' },
      { name: 'Daniel Okoye dum', role: 'Don Jose' },
      { name: 'Orchestra of the Royal Opera House', role: 'Orchestra' },
    ],
    note: 'Bizet\'s Carmen, sung in French with English surtitles. About 3 hours with two intervals (dum cast). Opera and theatre use a darker, velvet red.',
  },
  {
    id: 'cinderella-palladium', cat: 'opera', sub: 'Theatre', tag: 'Palladium', title: 'Cinderella', dateLabel: '20 Dec 2026', time: '14:30', sortKey: 20261220, place: 'London', cc: 'UK',
    attendance: 2286, status: 'upcoming', elements: UPCOMING, venueId: 'palladium', organiserId: 'lw-theatres',
    artists: [
      { name: 'Maya Collins dum', role: 'Cinderella' },
      { name: 'Tom Reeve dum', role: 'Buttons' },
      { name: 'Palladium company dum', role: 'Company' },
    ],
    note: 'Family pantomime matinee, about 2 hours 30 with an interval (dum cast).',
  },
  {
    id: 'glastonbury-2019', recurring: true, sub: 'Festival', range: '26-30 Jun 2019', time: '12:00', title: 'Glastonbury', dateLabel: 'Jun 2019', sortKey: 20190626, place: 'Pilton', cc: 'UK',
    attendance: 210000, status: 'past', elements: [...PAST, 'Store'], venueId: 'worthy-farm', organiserId: 'glastonbury-festivals',
    artists: [
      { name: 'Stormzy', role: 'Friday, Pyramid Stage' },
      { name: 'The Killers', role: 'Saturday, Pyramid Stage' },
      { name: 'The Cure', role: 'Sunday, Pyramid Stage' },
    ],
    note: 'The biggest size tier on the Timelane.',
  },
];

export const EVENTS: EventItem[] = [...EVENTS_UNSORTED].sort((a, b) => b.sortKey - a.sortKey);

export const PROFILES: Profile[] = [
  // People: 5 dum users. Friends: Jane, Sam, Mia (chronicler). Not friends: Ravi (chronicler), Kofi. Find them by exact handle.
  {
    id: 'you', kind: 'user', username: 'ade.lanes', name: 'You (Ade)', bio: 'Collects nights out. This is your own Timelane.',
    facts: ['Joined the Timelane on Day one', '3 friends'], eventIds: [], followers: 450, following: 110,
  },
  {
    id: 'sam', kind: 'user', username: 'sam_festival', name: 'Sam dum', bio: 'Festival regular, always first in the queue.', friend: true,
    facts: ['Friend'], eventIds: ['werchter-2027', 'u2-spurs-2027', 'glastonbury-2019', 'yacht-week'],
    socials: [['IG', 'sam_festival'], ['X', 'sam_festival']], followers: 212, following: 187,
  },
  {
    id: 'jane', kind: 'user', username: 'ja06ne75', name: 'Jane dum', bio: 'Always the first to book. Gets the tickets for everyone.', friend: true,
    facts: ['Friend'], eventIds: ['cinderella-palladium', 'u2-spurs-2027', 'carmen-roh'],
    socials: [['IG', 'ja06ne75']], followers: 164, following: 203,
  },
  {
    id: 'mia', kind: 'user', username: 'mia_nights', chronicler: true, name: 'Mia dum', bio: 'Keeps a long archive of every night out.', friend: true,
    facts: ['Friend', 'Chronicler'], eventIds: ['u2-spurs-2027', 'carmen-roh', 'snowfest', 'glastonbury-2019', 'werchter-2027', 'yacht-week', 'cinderella-palladium'],
    socials: [['IG', 'mia_nights'], ['TT', 'mia_nights'], ['X', 'mia_nights']], followers: 2140, following: 96,
  },
  {
    id: 'ravi', kind: 'user', name: 'Ravi dum', username: 'ravi.archive', chronicler: true, bio: 'Posts a full review of every night he goes to.',
    facts: ['Chronicler', 'Not a friend yet'], eventIds: ['werchter-2027', 'carmen-roh', 'glastonbury-2019', 'u2-spurs-2027', 'snowfest'],
    socials: [['IG', 'ravi.archive'], ['YT', 'raviarchive']], followers: 3820, following: 140,
  },
  {
    id: 'kofi', kind: 'user', username: 'kofi.waves', pub: true, name: 'Kofi dum', bio: 'Water festivals and late sets.', facts: ['Not a friend yet', 'Public: shows he is going'],
    eventIds: ['yacht-week', 'snowfest', 'u2-spurs-2027', 'werchter-2027'], socials: [['IG', 'kofi.waves']], followers: 318, following: 275,
  },
  // Artists: public pages, website instead of friends.
  {
    id: 'u2', kind: 'artist', founded: 1976, name: 'U2', bio: 'Irish rock band, formed in Dublin. Plays Tottenham Hotspur Stadium in June 2027.',
    facts: ['Tottenham: 18, 19 and 22 June 2027', 'Support in London: Wolf Alice'],
    website: 'u2.com', socials: [['IG', 'u2'], ['X', 'U2'], ['YT', 'u2']], followers: 41200, following: 12,
  },
  {
    id: 'wolf-alice', kind: 'artist', founded: 2010, name: 'Wolf Alice', bio: 'London rock band. Special guests for U2 at Tottenham Hotspur Stadium in June 2027.',
    facts: ['Support act'], website: 'wolfalice.co.uk', socials: [['IG', 'wolfalice'], ['X', 'wolfalice']], followers: 18600, following: 41,
  },
  {
    id: 'werchter-lineup', kind: 'artist', name: 'Rock Werchter line-up dum', bio: 'Every act that has played the festival. dum page.', facts: ['dum artist'],
    website: 'rockwerchter.be', socials: [['IG', 'rockwerchter']], followers: 9400, following: 5,
  },
  { id: 'user-venue', kind: 'venue', name: 'Venue added by you', bio: 'Events you added yourself.', facts: ['Added by you'] },
  { id: 'user-org', kind: 'organiser', name: 'Added by you', bio: 'Events you added yourself.', facts: ['Added by you'] },
  // Venues. vname is the short name used in the event header; the full name and address live on the venue profile and the ticket.
  {
    id: 'tottenham-stadium', kind: 'venue', vname: 'Tottenham Stadium', addr: 'High Road, London, UK', fullAddr: 'Tottenham Hotspur Stadium, 782 High Road, Tottenham, London N17 0BX, UK', name: 'Tottenham Hotspur Stadium',
    bio: 'North London stadium that opened in 2019 and replaced the old White Hart Lane ground.', capacity: '62,850',
    fact: 'The grass pitch slides away to reveal an artificial surface underneath, built for concerts and American football.',
    facts: ['Capacity 62,850', 'Nearest station: White Hart Lane', 'First U2 headline shows here: June 2027'],
    website: 'tottenhamhotspur.com', socials: [['IG', 'spursofficial'], ['X', 'SpursOfficial']], followers: 52300, following: 88,
  },
  {
    id: 'werchter-site', kind: 'venue', vname: 'Werchter Festival Site', addr: 'Haachtsesteenweg, Werchter, BE', fullAddr: 'Festivalpark Werchter, Haachtsesteenweg, 3118 Werchter, Belgium', name: 'Werchter Festival Park',
    bio: 'Festival grounds between Leuven and Mechelen in Belgium.', capacity: '88,000 a day',
    fact: 'The festival has been held here since 1975 and the site is turned into a city with its own campsite every July.',
    facts: ['Capacity 88,000 a day', 'Camping on site'], website: 'rockwerchter.be', socials: [['IG', 'rockwerchter'], ['X', 'rockwerchter']], followers: 31500, following: 40,
  },
  {
    id: 'roh', kind: 'venue', vname: 'Royal Opera House', addr: 'Bow Street, London, UK', fullAddr: 'Royal Opera House, Bow Street, Covent Garden, London WC2E 9DD, UK', name: 'Royal Opera House',
    bio: 'Opera and ballet house in Covent Garden, home of The Royal Opera and The Royal Ballet.', capacity: '2,256 seats',
    fact: 'There has been a theatre on this spot since 1732. The current building dates from 1858.',
    facts: ['Capacity 2,256 seats', 'Nearest station: Covent Garden'], website: 'roh.org.uk', socials: [['IG', 'royaloperahouse'], ['X', 'RoyalOperaHouse']], followers: 27800, following: 120,
  },
  {
    id: 'palladium', kind: 'venue', vname: 'London Palladium', addr: 'Argyll Street, London, UK', fullAddr: 'London Palladium, 8 Argyll Street, London W1F 7TF, UK', name: 'London Palladium',
    bio: 'West End theatre near Oxford Circus, famous for variety shows and pantomime.', capacity: '2,286 seats',
    fact: 'It gave its name to the TV show Sunday Night at the London Palladium and hosts the Royal Variety Performance.',
    facts: ['Capacity 2,286 seats', 'Nearest station: Oxford Circus'], website: 'lwtheatres.co.uk', socials: [['IG', 'lwtheatres'], ['X', 'LWTheatres']], followers: 19300, following: 64,
  },
  {
    id: 'solent', kind: 'venue', vname: 'The Solent', addr: 'Port Solent, Portsmouth, UK', fullAddr: 'Port Solent Marina, Portsmouth, UK', name: 'The Solent dum',
    bio: 'Sailing waters between the south coast and the Isle of Wight. The fleet starts from the marina (dum page).', capacity: '300 boats dum',
    fact: 'Home of Cowes Week, one of the oldest sailing regattas in the world.',
    facts: ['Capacity 300 boats dum'], website: 'solentfleet.example', socials: [['IG', 'solentfleet']], followers: 4100, following: 22,
  },
  {
    id: 'snow-centre', kind: 'venue', vname: 'Snow Dome', addr: 'Trafford Park, Manchester, UK', fullAddr: 'Snow Dome, Trafford Way, Manchester, UK', name: 'Snow Dome dum',
    bio: 'Indoor snow centre with a long real-snow slope (dum page).', capacity: '1,200 on the slope dum',
    fact: 'The slope is kept below freezing all year, so it is winter inside whatever the weather outside.',
    facts: ['Capacity 1,200 dum'], website: 'snowdome.example', socials: [['IG', 'snowdome'], ['X', 'snowdome']], followers: 6900, following: 31,
  },
  {
    id: 'worthy-farm', kind: 'venue', vname: 'Worthy Farm', addr: 'Pilton, Somerset, UK', fullAddr: 'Worthy Farm, Pilton, Shepton Mallet, Somerset BA4 4BY, UK', name: 'Worthy Farm',
    bio: 'Working dairy farm in Somerset and the site of Glastonbury Festival.', capacity: '210,000 ticket holders',
    fact: 'It is a working dairy farm that becomes a temporary city every summer.',
    facts: ['Capacity about 210,000'], website: 'glastonburyfestivals.co.uk', socials: [['IG', 'glastofest'], ['X', 'glastonbury']], followers: 88200, following: 35,
  },
  // Organisers. A page of an organiser lists every event they run.
  {
    id: 'live-nation', kind: 'organiser', name: 'Live Nation', bio: 'Live entertainment company. Promoter of the 2027 U2 dates at Tottenham Hotspur Stadium.',
    facts: ['Promoter'], website: 'livenation.co.uk', socials: [['IG', 'livenationuk'], ['X', 'LiveNationUK']], followers: 74200, following: 310,
  },
  {
    id: 'live-nation-be', kind: 'organiser', name: 'Live Nation Belgium', bio: 'Runs Rock Werchter every summer.',
    facts: ['Festival organiser'], website: 'livenation.be', socials: [['IG', 'livenation.be']], followers: 22900, following: 85,
  },
  {
    id: 'roh-foundation', kind: 'organiser', name: 'Royal Opera House', bio: 'Produces opera and ballet at Covent Garden. Every production starts here.',
    facts: ['Producer'], website: 'roh.org.uk', socials: [['IG', 'royaloperahouse'], ['X', 'RoyalOperaHouse']], followers: 27800, following: 120,
  },
  {
    id: 'lw-theatres', kind: 'organiser', name: 'LW Theatres', bio: 'Owns and runs a group of West End theatres, including the London Palladium.',
    facts: ['Theatre group'], website: 'lwtheatres.co.uk', socials: [['IG', 'lwtheatres'], ['X', 'LWTheatres']], followers: 31100, following: 72,
  },
  {
    id: 'glastonbury-festivals', kind: 'organiser', name: 'Glastonbury Festivals', bio: 'The charity-supporting company that runs Glastonbury Festival.',
    facts: ['Festival organiser'], website: 'glastonburyfestivals.co.uk', socials: [['IG', 'glastofest'], ['X', 'glastonbury']], followers: 91500, following: 28,
  },
  {
    id: 'peak-events', kind: 'organiser', name: 'Peak Events UK dum', bio: 'Organises winter sport weekends and races (dum page).',
    facts: ['dum organiser'], website: 'peakevents.example', socials: [['IG', 'peakeventsuk']], followers: 3800, following: 54,
  },
  {
    id: 'solent-fleet', kind: 'organiser', name: 'Solent Fleet Events dum', bio: 'Runs sailing weeks and regattas on the south coast (dum page).',
    facts: ['dum organiser'], website: 'solentfleet.example', socials: [['IG', 'solentfleet']], followers: 4100, following: 22,
  },
];

// One short phrase per result in search, so every result fits on one row.
export const SHORT: Record<string, string> = {
  'u2': 'Irish rock band', 'wolf-alice': 'London rock band', 'werchter-lineup': 'Festival line-up', 'live-nation': 'Concert promoter',
  'live-nation-be': 'Festival organiser', 'roh-foundation': 'Opera and ballet', 'lw-theatres': 'West End theatres', 'glastonbury-festivals': 'Festival organiser',
  'peak-events': 'Winter sport events', 'solent-fleet': 'Sailing events',
};
// Venues show their main road and city with a country code; the label already says what a result is, so there is no generic fallback.
export const shortOf = (p: Profile) => (p.kind === 'venue' ? p.addr || SHORT[p.id] || '' : SHORT[p.id] || '');
export function goingOf(id: string) { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973; return 120 + (h % 400); }

// The marker shown before a name in chat: friends get a filled dot, friends of friends an empty dot,
// chroniclers a square (white for friends, sepia for everyone else).
export const SEPIA = '#a67b4b';
export function markerOf(who: string): { ch: string; color: string } | null {
  const first = who.split(' ')[0];
  const p = PROFILES.find((u) => u.kind === 'user' && u.id !== 'you' && u.name.split(' ')[0] === first);
  if (!p) return null;
  if (p.chronicler) return p.friend ? { ch: '▫', color: '#ffffff' } : { ch: '▪', color: SEPIA };
  if (p.friend) return { ch: '●', color: '#ee6e65' };
  if (p.fof) return { ch: '○', color: '#ee6e65' };
  return null;
}

export const getEvent = (id: string) => EVENTS.find((e) => e.id === id) as EventItem;
export const getProfile = (kind: Kind, id: string) => PROFILES.find((p) => p.kind === kind && p.id === id) as Profile;
export const profilesOf = (kind: Kind) => PROFILES.filter((p) => p.kind === kind);

export function eventsOfProfile(p: Profile, extra: string[] = []): EventItem[] {
  if (p.kind === 'user') return EVENTS.filter((e) => (p.eventIds || []).includes(e.id) || (p.id === 'you' && extra.includes(e.id)));
  if (p.kind === 'artist') return EVENTS.filter((e) => e.artists.some((a) => a.artistId === p.id));
  if (p.kind === 'venue') return EVENTS.filter((e) => e.venueId === p.id);
  return EVENTS.filter((e) => e.organiserId === p.id);
}

export const usersAt = (eventId: string) => PROFILES.filter((p) => p.kind === 'user' && (p.eventIds || []).includes(eventId));

export type DigestItem = { id: string; about: { kind: Kind; id: string }; text: string; eventId?: string; stay?: boolean };

// dum items for the digest. Each one belongs to something you can follow, or to an event on your Timelane.
export const DIGEST: DigestItem[] = [
  { id: 'd1', about: { kind: 'user', id: 'jane' }, text: 'Jane got tickets for you both to go and see Cinderella next month at the London Palladium.', eventId: 'cinderella-palladium', stay: true },
  { id: 'd2', about: { kind: 'artist', id: 'u2' }, text: 'U2 added a third night at Tottenham Hotspur Stadium: Tuesday 22 June 2027.', eventId: 'u2-spurs-2027' },
  { id: 'd3', about: { kind: 'venue', id: 'tottenham-stadium' }, text: 'Transport and entry tips for the stadium will appear here (dum).', eventId: 'u2-spurs-2027' },
  { id: 'd4', about: { kind: 'organiser', id: 'live-nation' }, text: 'News about presales for artists you follow (dum).' },
  { id: 'd5', about: { kind: 'user', id: 'sam' }, text: 'Sam is going to Rock Werchter in July 2027 (dum).', eventId: 'werchter-2027' },
  { id: 'd7', about: { kind: 'user', id: 'ravi' }, text: 'Ravi posted a full review of Glastonbury 2019 (dum).', eventId: 'glastonbury-2019' },
  { id: 'd8', about: { kind: 'user', id: 'mia' }, text: 'Mia added 6 photos to her Glastonbury 2019 archive (dum).', eventId: 'glastonbury-2019' },
];

export const STAY_IDEAS = [
  'Hotel close to the venue dum: best for a late finish.',
  'Apartment for the group dum: split the cost with friends.',
  'Budget stay a short train ride away dum: cheapest, a bit more travel.',
];

// Who an event's main bubble leads to: the headline artist, or for festivals and mixed bills the organiser.
export function mainTarget(ev: EventItem): { kind: Kind; id: string; name: string } {
  const head = ev.artists.find((a) => a.role === 'Headliner' && a.artistId);
  if (head && head.artistId) return { kind: 'artist', id: head.artistId, name: head.name };
  const org = getProfile('organiser', ev.organiserId);
  return { kind: 'organiser', id: org.id, name: org.name };
}

// Sample community figures: how many times other (made-up) users have been. Used for the "top fan" style badges.
const COMMUNITY: Record<string, number[]> = {
  'artist:u2': [1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 4, 5, 7, 12],
  'artist:coldplay': [1, 1, 1, 1, 2, 2, 2],
  'organiser:live-nation-be': [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 4, 4, 5, 6, 8, 9],
};
export type Badge = { id: string; text: string; icon: string };
const stepUp = (p: number) => [1, 5, 10, 25, 50].find((s) => p <= s) || 100;

export function badgesFor(evs: EventItem[]): Badge[] {
  const past = evs.filter((e) => e.status === 'past');
  const counts: Record<string, number> = {};
  const bump = (k: string) => { counts[k] = (counts[k] || 0) + 1; };
  past.forEach((e) => {
    const seen = new Set<string>();
    e.artists.forEach((a) => { if (a.artistId && a.artistId !== 'werchter-lineup' && !seen.has(a.artistId)) { seen.add(a.artistId); bump('artist:' + a.artistId); } });
    bump('organiser:' + e.organiserId);
  });
  const out: Badge[] = [];
  const keyName = (k: string) => { const [kind, id] = k.split(':'); return getProfile(kind as Kind, id).name; };
  const ranked = Object.keys(counts).filter((k) => COMMUNITY[k]).sort((a, b) => counts[b] - counts[a]);
  const most = Object.keys(counts).filter((k) => !k.startsWith('organiser:live') && !k.includes('park-sessions') && !k.includes('night-shift') && !k.includes('paris')).sort((a, b) => counts[b] - counts[a])[0];
  if (most && counts[most] > 1) out.push({ id: 'most', icon: '❤️', text: `Been to ${keyName(most)} the most: ${counts[most]} times` });
  ranked.forEach((k) => {
    const m = counts[k];
    const others = COMMUNITY[k];
    const higher = others.filter((c) => c > m).length;
    const name = keyName(k);
    if (higher === 0 && m > 1) out.push({ id: 'fan' + k, icon: '🏆', text: `Top fan of ${name}: ${m} times` });
    else {
      const pct = ((higher + 1) / (others.length + 1)) * 100;
      if (pct <= 25) out.push({ id: 'top' + k, icon: '⭐', text: `Top ${stepUp(pct)}% ${k.startsWith('organiser') ? 'visitor of' : 'fan of'} ${name}` });
    }
  });
  const first = [...past].sort((a, b) => a.sortKey - b.sortKey)[0];
  if (first) out.push({ id: 'first', icon: '🕰️', text: `On the Timelane since ${Math.floor(first.sortKey / 10000)}` });
  return out;
}

// A chronicler is someone with a long, well kept archive.
export function badgeIcons(evs: EventItem[]): Badge[] {
  const out = badgesFor(evs);
  const past = evs.filter((e) => e.status === 'past').length;
  if (past >= 8) out.unshift({ id: 'chronicler', icon: '📜', text: `Chronicler: ${past} past events on the Timelane` });
  return out;
}

// Everything the stats popup shows.
export function statsFor(evs: EventItem[], masked = false): { label: string; value: string }[] {
  const past = evs.filter((e) => e.status === 'past');
  const up = evs.filter((e) => e.status === 'upcoming');
  const tally = (keys: string[]) => {
    const c: Record<string, number> = {};
    keys.forEach((k) => { c[k] = (c[k] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  };
  const artistKeys: string[] = [];
  past.forEach((e) => { const seen = new Set<string>(); e.artists.forEach((a) => { if (a.artistId && a.artistId !== 'werchter-lineup' && !seen.has(a.artistId)) { seen.add(a.artistId); artistKeys.push(a.artistId); } }); });
  const topA = tally(artistKeys);
  const topV = tally(past.map((e) => e.venueId));
  const topO = tally(past.map((e) => e.organiserId));
  const years = past.map((e) => Math.floor(e.sortKey / 10000));
  const byYear = tally(years.map(String));
  const places = new Set(past.map((e) => e.place)).size;
  const out: { label: string; value: string }[] = [
    { label: 'Events been to', value: String(past.length) },
    { label: 'Coming up', value: String(up.length) },
    { label: 'Different artists', value: String(new Set(artistKeys).size) },
    { label: 'Different venues', value: String(new Set(past.map((e) => e.venueId)).size) },
    { label: 'Places', value: String(places) },
  ];
  if (topA) out.push({ label: 'Most seen artist', value: masked ? 'Friends only' : `${getProfile('artist', topA[0]).name}: ${topA[1]}x` });
  if (topV) out.push({ label: 'Most visited venue', value: masked ? 'Friends only' : `${getProfile('venue', topV[0]).name}: ${topV[1]}x` });
  if (topO) out.push({ label: 'Most visited organiser', value: masked ? 'Friends only' : `${getProfile('organiser', topO[0]).name}: ${topO[1]}x` });
  if (byYear) out.push({ label: 'Busiest year', value: `${byYear[0]}: ${byYear[1]} events` });
  if (years.length) out.push({ label: 'First event', value: String(Math.min(...years)) });
  return out;
}

// Other dates of the same run (same title and tour, upcoming). A yearly festival never lists its dates this way:
// people pick their own year from the event timeline.
export function siblingsOf(ev: EventItem): EventItem[] {
  if (ev.recurring || ev.status !== 'upcoming') return [];
  return EVENTS.filter((e) => e.id !== ev.id && e.status === 'upcoming' && !e.recurring && e.title === ev.title && e.tour === ev.tour && /^\d/.test(e.dateLabel)).sort((a, b) => a.sortKey - b.sortKey);
}
// "17, 19, 21 May 2027" from several full dates (months and years are only repeated when they change).
export function alsoOnLine(sibs: EventItem[]): string {
  const parts = sibs.map((e) => e.dateLabel.split(' '));
  const out: string[] = [];
  parts.forEach((p, i) => {
    const next = parts[i + 1];
    out.push(next && next[1] === p[1] && next[2] === p[2] ? p[0] : p.join(' '));
  });
  return out.join(', ');
}

// Genres and event types, for the top 5 lists in the stats. Sample mapping until the events database carries real genres.
const GENRE_BY: Record<string, string> = {
  u2: 'Rock', 'werchter-lineup': 'Rock', coldplay: 'Alternative', 'stone-roses': 'Indie', 'wolf-alice': 'Alternative', 'iggy-pop': 'Punk',
  'local-bands': 'Pop', 'jazz-trio': 'Jazz', 'resident-djs': 'Electronic', 'carmen-roh': 'Classical',
};
export function genreOf(ev: EventItem): string | undefined {
  if (ev.cat === 'opera') return ev.sub === 'Theatre' ? undefined : 'Classical';
  if (ev.cat === 'boat' || ev.cat === 'snow') return undefined;
  const a = ev.artists.find((x) => x.artistId && GENRE_BY[x.artistId]);
  return a && a.artistId ? GENRE_BY[a.artistId] : undefined;
}
export function typeOf(ev: EventItem): string {
  if (ev.cat === 'opera') return ev.sub === 'Theatre' ? 'Theatre' : 'Opera';
  if (ev.cat === 'boat') return 'Summer sport';
  if (ev.cat === 'snow') return 'Winter sport';
  if (ev.recurring) return 'Festival';
  return 'Concert';
}
// Top 5 with percentages, for events already attended. When masked, only the headings are shown (friends only).
export function topLists(evs: EventItem[]): { title: string; rows: { name: string; pct: number }[] }[] {
  const past = evs.filter((e) => e.status === 'past');
  const top = (keys: string[]) => {
    const c: Record<string, number> = {};
    keys.forEach((k) => { c[k] = (c[k] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, n]) => ({ name, pct: Math.round((n / Math.max(1, keys.length)) * 100) }));
  };
  const g = past.map(genreOf).filter(Boolean) as string[];
  return [
    { title: 'Top 5 music genres', rows: top(g) },
    { title: 'Top 5 event types', rows: top(past.map(typeOf)) },
  ];
}
// "Tottenham Hotspur Stadium - High Road, London UK" style line used in headers and chat lists.
export const placeLine = (ev: EventItem) => { const v = getProfile('venue', ev.venueId); return v && v.addr ? v.addr : ev.place; };
// Short venue name plus the town, for headers and rows. We are not Google Maps: the street address stays on the venue card, the venue profile and the ticket.
export const venueShort = (ev: EventItem) => { const v = getProfile('venue', ev.venueId); return `${(v && (v.vname || v.name)) || ''}, ${ev.place}${ev.cc ? ', ' + ev.cc : ''}`; };

// "Werchter, BE": the place always travels with its country code, everywhere it is shown.
export const placeCC = (ev: EventItem) => `${ev.place}${ev.cc ? ', ' + ev.cc : ''}`;
export const mapsUrl = (p: Profile) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.fullAddr || p.addr || p.name);
export const fmtN = (n?: number) => (n === undefined ? '0' : n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n));
export const socialUrl = (net: string, h: string) =>
  net === 'IG' ? `https://instagram.com/${h}` : net === 'X' ? `https://x.com/${h}` : net === 'TT' ? `https://tiktok.com/@${h}` : net === 'YT' ? `https://youtube.com/@${h}` : `https://${h}`;
export const siteUrl = (w: string) => `https://${w}`;

// The badge area of any profile. People earn theirs from their archive; artists, venues and organisers show what they are.
export function profileBadges(p: Profile, evs: EventItem[]): Badge[] {
  if (p.kind === 'user') {
    const out = badgeIcons(evs).filter((b) => b.id !== 'chronicler');
    if (p.chronicler) out.unshift({ id: 'chronicler', icon: '📜', text: 'Chronicler: keeps a full archive of every night out' });
    return out;
  }
  const out: Badge[] = [{ id: 'verified', icon: '✔️', text: 'Verified page dum' }];
  if (p.kind === 'venue' && p.capacity) out.push({ id: 'cap', icon: '🏟️', text: `Capacity ${p.capacity}` });
  if (p.kind === 'organiser') out.push({ id: 'ev', icon: '🗓️', text: `${evs.length} event${evs.length === 1 ? '' : 's'} on Hartlanes` });
  if (p.kind === 'artist') out.push({ id: 'ev', icon: '🎤', text: `${evs.length} date${evs.length === 1 ? '' : 's'} on Hartlanes` });
  if (p.followers && p.followers >= 20000) out.push({ id: 'pop', icon: '⭐', text: `${fmtN(p.followers)} followers` });
  return out;
}

// Stats for a profile. People use statsFor (friends only parts are masked). The others show a summary of what they run or play.
export function profileStats(p: Profile, evs: EventItem[]): { label: string; value: string }[] {
  const up = evs.filter((e) => e.status === 'upcoming').length;
  const out = [
    { label: 'Followers', value: String(p.followers || 0) },
    { label: 'Following', value: String(p.following || 0) },
    { label: 'Events on Hartlanes', value: String(evs.length) },
    { label: 'Coming up', value: String(up) },
    { label: 'Past', value: String(evs.length - up) },
  ];
  if (evs.length) {
    const big = [...evs].sort((a, b) => b.attendance - a.attendance)[0];
    out.push({ label: 'Biggest event', value: `${big.title}: ${big.attendance.toLocaleString('en-GB')}` });
    if (p.kind !== 'venue') out.push({ label: 'Different venues', value: String(new Set(evs.map((e) => e.venueId)).size) });
    if (p.kind !== 'organiser') out.push({ label: 'Different organisers', value: String(new Set(evs.map((e) => e.organiserId)).size) });
  }
  if (p.kind === 'venue' && p.capacity) out.push({ label: 'Capacity', value: p.capacity });
  return out;
}
