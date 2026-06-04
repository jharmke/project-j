// data/verses.ts
//
// The verse-of-the-day list and the daily rotation picker, shared by the Home tab and the
// Faith tab so both always show the SAME verse and the no-repeat rotation never double
// advances. The rotation (pj_verse_rotation) advances at most once per day, guarded by
// lastDate, so whichever tab loads first on a new day advances it and the other just reads.
// No double dashes anywhere (project rule).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageSet } from '../utils/storage';

export type DailyVerse = { text: string; reference: string };

export const VERSES: DailyVerse[] = [
  // Strength & Perseverance
  { text: "I can do all things through Christ which strengtheneth me.", reference: "Philippians 4:13" },
  { text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.", reference: "Isaiah 40:31" },
  { text: "Now no chastening for the present seemeth to be joyous, but grievous: nevertheless afterward it yieldeth the peaceable fruit of righteousness unto them which are exercised thereby.", reference: "Hebrews 12:11" },
  { text: "And let us not be weary in well doing: for in due season we shall reap, if we faint not.", reference: "Galatians 6:9" },
  { text: "Let us run with patience the race that is set before us, looking unto Jesus the author and finisher of our faith.", reference: "Hebrews 12:1-2" },
  { text: "Be strong and of a good courage, fear not, nor be afraid of them: for the LORD thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.", reference: "Deuteronomy 31:6" },
  { text: "Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.", reference: "Joshua 1:9" },
  { text: "I have fought a good fight, I have finished my course, I have kept the faith.", reference: "2 Timothy 4:7" },
  { text: "And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness.", reference: "2 Corinthians 12:9" },
  { text: "The LORD is my strength and my shield; my heart trusted in him, and I am helped.", reference: "Psalm 28:7" },
  { text: "God is our refuge and strength, a very present help in trouble.", reference: "Psalm 46:1" },
  { text: "He giveth power to the faint; and to them that have no might he increaseth strength.", reference: "Isaiah 40:29" },
  { text: "The LORD is my strength and song, and he is become my salvation: he is my God, and I will prepare him an habitation; my father's God, and I will exalt him.", reference: "Exodus 15:2" },

  // Faith & Trust
  { text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.", reference: "Proverbs 3:5-6" },
  { text: "Commit thy works unto the LORD, and thy thoughts shall be established.", reference: "Proverbs 16:3" },
  { text: "For we walk by faith, not by sight.", reference: "2 Corinthians 5:7" },
  { text: "Now faith is the substance of things hoped for, the evidence of things not seen.", reference: "Hebrews 11:1" },
  { text: "Jesus said unto him, If thou canst believe, all things are possible to him that believeth.", reference: "Mark 9:23" },
  { text: "But without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him.", reference: "Hebrews 11:6" },
  { text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.", reference: "John 3:16" },
  { text: "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.", reference: "John 14:6" },
  { text: "Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.", reference: "Philippians 4:6" },

  // Body & Discipline
  { text: "What? know ye not that your body is the temple of the Holy Ghost which is in you, which ye have of God, and ye are not your own?", reference: "1 Corinthians 6:19" },
  { text: "Whether therefore ye eat, or drink, or whatsoever ye do, do all to the glory of God.", reference: "1 Corinthians 10:31" },
  { text: "For bodily exercise profiteth little: but godliness is profitable unto all things, having promise of the life that now is, and of that which is to come.", reference: "1 Timothy 4:8" },
  { text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.", reference: "2 Timothy 1:7" },
  { text: "But I keep under my body, and bring it into subjection: lest that by any means, when I have preached to others, I myself should be a castaway.", reference: "1 Corinthians 9:27" },
  { text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men.", reference: "Colossians 3:23" },
  { text: "I beseech you therefore, brethren, by the mercies of God, that ye present your bodies a living sacrifice, holy, acceptable unto God, which is your reasonable service.", reference: "Romans 12:1" },

  // Purpose & Identity
  { text: "For we are his workmanship, created in Christ Jesus unto good works, which God hath before ordained that we should walk in them.", reference: "Ephesians 2:10" },
  { text: "Before I formed thee in the belly I knew thee; and before thou camest forth out of the womb I sanctified thee, and I ordained thee a prophet unto the nations.", reference: "Jeremiah 1:5" },
  { text: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.", reference: "Jeremiah 29:11" },
  { text: "For thou hast possessed my reins: thou hast covered me in my mother's womb. I will praise thee; for I am fearfully and wonderfully made.", reference: "Psalm 139:13-14" },
  { text: "Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.", reference: "Matthew 5:16" },
  { text: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.", reference: "Matthew 6:33" },

  // Peace & Renewal
  { text: "Create in me a clean heart, O God; and renew a right spirit within me.", reference: "Psalm 51:10" },
  { text: "Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid.", reference: "John 14:27" },
  { text: "And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.", reference: "Philippians 4:7" },
  { text: "Come unto me, all ye that labour and are heavy laden, and I will give you rest.", reference: "Matthew 11:28" },
  { text: "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.", reference: "Romans 12:2" },
  { text: "He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake.", reference: "Psalm 23:3" },
  { text: "The LORD bless thee, and keep thee: The LORD make his face shine upon thee, and be gracious unto thee.", reference: "Numbers 6:24-25" },

  // Love & Grace
  { text: "We love him, because he first loved us.", reference: "1 John 4:19" },
  { text: "But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.", reference: "Romans 5:8" },
  { text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God.", reference: "Ephesians 2:8" },
  { text: "If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.", reference: "1 John 1:9" },
  { text: "There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit.", reference: "Romans 8:1" },
  { text: "For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.", reference: "Romans 8:38-39" },
];

type Rotation = { order: number[]; index: number; lastDate: string };

function shuffle(arr: number[]): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Returns today's verse, advancing the no-repeat rotation at most once per day. Persists the
 * rotation through storageSet so it rides the cloud backup. The lastDate guard makes the
 * advance idempotent for the day, so Home and Faith stay in sync no matter which loads first.
 * Throws on corrupt data so the caller can fall back (Home nukes the key and shows a random
 * verse). `todayStr` must be the local YYYY-MM-DD key both tabs already use.
 */
export async function resolveDailyVerse(todayStr: string): Promise<DailyVerse> {
  const rotationRaw = await AsyncStorage.getItem('pj_verse_rotation');
  let rotation: Rotation = rotationRaw ? JSON.parse(rotationRaw) : { order: [], index: 0, lastDate: '' };

  // If rotation is empty or exhausted, reshuffle.
  if (!rotation.order.length || rotation.index >= rotation.order.length) {
    rotation = { order: shuffle(VERSES.map((_, i) => i)), index: 0, lastDate: todayStr };
    await storageSet('pj_verse_rotation', JSON.stringify(rotation));
  }

  // New day: advance the index (reshuffle if we just exhausted the list).
  if (rotation.lastDate !== todayStr) {
    rotation.index = rotation.lastDate === '' ? 0 : rotation.index + 1;
    if (rotation.index >= rotation.order.length) {
      rotation = { order: shuffle(VERSES.map((_, i) => i)), index: 0, lastDate: todayStr };
    } else {
      rotation.lastDate = todayStr;
    }
    await storageSet('pj_verse_rotation', JSON.stringify(rotation));
  }

  const resolved = VERSES[rotation.order[rotation.index]];
  if (!resolved) throw new Error('bad verse index');
  return resolved;
}
