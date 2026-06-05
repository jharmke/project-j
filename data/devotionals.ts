// ─── Types ───────────────────────────────────────────────────────────────────
//
// Devotionals are DISTINCT from reading plans (data/readingPlans.ts).
// Reading plan = a pure reading schedule, no interactivity, no AI.
// Devotional  = shorter, can jump around, and each day carries our own written
//               reflection, a reflection question the user can answer in a text
//               box, and an optional inline Halo conversation that saves to the day.
//
// This file holds the STATIC devotional content (the long pole) plus the shapes.
// User progress + saved answers + saved Halo threads live in AsyncStorage under
// pj_devotionals (shape below); storage detail is refined when the screen is built.

export interface DevotionalPassage {
  book: string;
  startChapter: number;
  startVerse?: number;
  endChapter: number;
  endVerse?: number;
}

export interface DevotionalDay {
  day: number;            // 1-indexed
  title: string;          // short title for the day
  passage: DevotionalPassage;
  reflection: string;     // our own written reflection (original prose)
  question: string;       // the reflection question (answerable in a text box)
}

export interface Devotional {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: string;       // from the starter slate, e.g. 'Rest and Recovery'
  totalDays: number;
  icon: string;           // Ionicons name
  days: DevotionalDay[];
}

// ─── User progress (pj_devotionals) ──────────────────────────────────────────

export interface DevotionalHaloTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface DevotionalDayEntry {
  answer?: string;                    // the user's typed reflection answer
  answeredAt?: number;
  haloThread?: DevotionalHaloTurn[];  // saved Halo conversation for this day
  completed?: boolean;
  completedAt?: number;
}

export interface DevotionalProgress {
  startDate: string;                  // YYYY-MM-DD
  enrolledAt: number;
  entries: Record<number, DevotionalDayEntry>;  // keyed by day number
}

export type DevotionalsStorage = Record<string, DevotionalProgress>; // keyed by devotional id

// Cap on simultaneously-active devotionals, mirroring reading plans (MAX_ACTIVE_PLANS in
// data/readingPlans.ts). Keeps the faith "Bible and Plans" card bounded so it never balloons.
export const MAX_ACTIVE_DEVOTIONALS = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatDevotionalPassage(p: DevotionalPassage): string {
  if (p.startChapter === p.endChapter) {
    if (p.startVerse != null && p.endVerse != null) {
      return p.startVerse === p.endVerse
        ? `${p.book} ${p.startChapter}:${p.startVerse}`
        : `${p.book} ${p.startChapter}:${p.startVerse}-${p.endVerse}`;
    }
    return `${p.book} ${p.startChapter}`;
  }
  if (p.startVerse != null && p.endVerse != null) {
    return `${p.book} ${p.startChapter}:${p.startVerse}-${p.endChapter}:${p.endVerse}`;
  }
  return `${p.book} ${p.startChapter}-${p.endChapter}`;
}

export function getDevotionalCompletion(
  dev: Devotional,
  progress: DevotionalProgress
): { completed: number; total: number; pct: number } {
  const completed = Object.values(progress.entries).filter(e => e.completed).length;
  return { completed, total: dev.totalDays, pct: dev.totalDays > 0 ? completed / dev.totalDays : 0 };
}

// ─── Devotional 1: Rest and Recovery (3 days) ─────────────────────────────────
// Wellness-tied moat category. Connects physical rest/recovery to the rest the
// gospel offers, without spiritualizing metrics or prosperity-gospel framing.

const REST_AND_RECOVERY_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'The Invitation to Rest',
    passage: { book: 'Matthew', startChapter: 11, startVerse: 28, endChapter: 11, endVerse: 30 },
    reflection:
      'Jesus said this to people who were worn down by the religious system of their day. Hundreds of rules, a constant sense of never quite measuring up, always one failure away from condemnation. Into that exhaustion he does not say clean yourself up and then come. He says come to me, all you who are weary. Come tired. Come heavy. Come as you are.\n\n' +
      'Then he uses a strange picture. A yoke is the wooden beam laid across an ox to pull a load, and the teachers of that time called their whole system of rules a yoke. Jesus says take my yoke instead, and he calls it easy and light. That is a surprising thing to say about following him, because it is not a promise of no load at all. It is the promise of a load carried with him, paced by him, instead of the crushing weight of trying to earn your own worth.\n\n' +
      'You probably know what it is to push past empty. To tie how you feel about yourself to how you performed today. To treat rest as something you have to earn once you have finally done enough. This passage cuts straight against that. Rest is not the prize waiting at the end of your striving. It is the invitation at the very start. The same God who built recovery into your body built it into your soul, and coming to him is not quitting. It is trading a weight you were never strong enough to carry for one that actually fits.',
    question: 'What weight are you carrying right now that you have not handed to God?',
  },
  {
    day: 2,
    title: 'He Restores',
    passage: { book: 'Psalms', startChapter: 23, startVerse: 1, endChapter: 23, endVerse: 3 },
    reflection:
      'David wrote this as a shepherd who later became a king. He knew exactly what a sheep needs because he had spent long nights in the field with them. A sheep is not built to keep going forever. It needs to be led to food, to water, and to a place safe enough to lie down. David looks at his own life and says that is what God is to me.\n\n' +
      'Notice the verbs. He makes me lie down. He leads me beside still waters. He restores my soul. Every one of them is something the shepherd does, not something the sheep produces. Sheep will not lie down when they are anxious or hungry or afraid, so a shepherd who gets his flock to rest has first made them feel safe and provided for. Rest, in this psalm, is the fruit of being cared for, not another task on a list.\n\n' +
      'There is a reason the word here is restore. To restore something is to bring it back to what it was meant to be. You feel this in your body after real recovery, when the soreness fades and the strength returns. Your soul works the same way. It wears down under constant output, and it comes back when you let yourself be led to still water. Letting God restore you is not laziness. It is trusting that you are cared for enough to stop.',
    question: 'Where do you need to let God lead you to rest instead of pushing through?',
  },
  {
    day: 3,
    title: 'Come Away a While',
    passage: { book: 'Mark', startChapter: 6, startVerse: 31, endChapter: 6, endVerse: 32 },
    reflection:
      'The disciples had just come back from a stretch of hard work, healing and teaching and pouring themselves out. So many people were coming and going that they did not even have time to eat. If anyone had earned the right to keep grinding, it was them, right in the middle of doing real good for real people.\n\n' +
      'Jesus’ response is the surprising part. He does not praise them for skipping meals or tell them the work is too important to pause. He says come away by yourselves to a quiet place and rest a while. Then they actually leave, get in a boat, and go. The Son of God, with endless needs pressing in around him, builds a deliberate stop into the middle of the mission. He treats rest as part of the work, not a betrayal of it.\n\n' +
      'It is easy to believe the lie that pausing means falling behind, that the people who matter most are the ones who never stop. This passage says otherwise. Even good work, maybe especially good work, has a limit, and the rhythm of stepping away is how you keep showing up over the long haul. A pause is not the opposite of a faithful life. It is part of how a faithful life lasts.',
    question: 'What would a real pause look like in your week this week?',
  },
];

// ─── Devotional 2: Sexual Integrity (5 days) ──────────────────────────────────
// Grace-first and shame-free, never graphic, never legalistic. Moves from no
// condemnation, to the heart, to the worth of the body, to the way out, to
// healing in the light and in community. Needs Justin's theological review.

const SEXUAL_INTEGRITY_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'No Condemnation',
    passage: { book: 'Romans', startChapter: 8, startVerse: 1, endChapter: 8, endVerse: 2 },
    reflection:
      'Few areas of life carry as much hidden shame as this one. People hide it, white-knuckle it, swear it off on Monday and break by Thursday, and carry a quiet sense that God is mostly disappointed in them. Paul opens this chapter by cutting straight through all of that: there is now no condemnation for those who are in Christ Jesus.\n\n' +
      'Notice he does not say there is no struggle, or no failure, or no growth left to do. He says no condemnation. The verdict over your life was already settled, and it was settled at the cross, not by your last clean streak. The very next line tells you why: the law of the Spirit of life in Christ Jesus has set you free from the law of sin and death. Freedom here is not a reward you earn by performing well. It is the ground you are meant to fight from.\n\n' +
      'This matters because shame is a terrible motivator. It tells you that you are the problem, that you are dirty, that you may as well stay down since you are already condemned, and then it drives you right back to the thing you are trying to leave. Grace says the opposite. You are not condemned, so you can get up. You are already loved, so you have nothing to prove and nothing to hide. Before we talk about fighting anything, sit in this first: the war is not for God’s acceptance. That is already yours.',
    question: 'What shame have you been carrying alone that God already meets with grace?',
  },
  {
    day: 2,
    title: 'It Starts in the Heart',
    passage: { book: 'Matthew', startChapter: 5, startVerse: 27, endChapter: 5, endVerse: 28 },
    reflection:
      'When Jesus taught about purity, he did something that sounds harder, not easier. The old command was simple: do not commit adultery. Jesus said that whoever looks on someone to lust after them has already committed it in his heart. At first that feels like he just took an impossible standard and made it worse.\n\n' +
      'But look at what he is actually doing. He is moving the whole issue from behavior to the heart. He is not impressed by people who merely avoid the act while their inner life runs on the same hunger. He cares about who you are becoming, not only what you manage to not do in public. That is not him raising the bar to crush you. It is him refusing to settle for the surface when he wants to heal you all the way down.\n\n' +
      'This is why purity built on willpower alone tends to collapse. You can manage your actions for a while, but if nothing changes underneath, the pressure just builds until it breaks through somewhere. Jesus goes to the root because the root is where real change lives. So the honest question is not only what you do, but what you feed, what you rehearse, where your mind runs when no one is watching. He asks because he wants the whole person free, not just the visible part kept in line.',
    question: 'Where do you notice the pull starting, before it ever becomes an action?',
  },
  {
    day: 3,
    title: 'Your Body Has Worth',
    passage: { book: '1 Corinthians', startChapter: 6, startVerse: 18, endChapter: 6, endVerse: 20 },
    reflection:
      'Paul gives the Corinthians a blunt instruction: flee fornication. Not negotiate with it, not see how close you can get, flee. In a city famous for sexual excess, he is not being prudish. He is being protective.\n\n' +
      'His reason is striking. He tells them their body is the temple of the Holy Spirit, that they are not their own, that they were bought with a price. This is not shaming the body as something dirty. It is the exact opposite. He is saying your body has enormous worth, it is a dwelling place of God, and what you do with it matters because you matter. Fleeing, then, is not fear and it is not self-hatred. It is treating something valuable like it is valuable.\n\n' +
      'Practically, fleeing almost always means deciding before the moment, not in it. Very few people win this fight at the point of temptation. They win it earlier, in the quiet choices about what they watch, where they go, and what they keep on their phone at midnight. To flee is to take the exit ramp seriously while you still can think clearly. It is wisdom, not weakness, and it flows from believing your body is worth protecting.',
    question: 'What does fleeing actually look like for you this week, in a specific decision you can make ahead of time?',
  },
  {
    day: 4,
    title: 'There Is a Way Out',
    passage: { book: '1 Corinthians', startChapter: 10, startVerse: 13, endChapter: 10, endVerse: 13 },
    reflection:
      'Two lies keep people stuck here. The first is that your struggle is uniquely shameful, worse than everyone else’s. The second is that you are simply powerless, wired this way, with no real hope of change. Paul answers both in a single verse.\n\n' +
      'He writes that no temptation has taken you except what is common to man, and that God is faithful, and that he will with the temptation also make a way of escape. Common to man. You are not the exception, not uniquely broken. This is a shared human battle, which means you can stop carrying it like a freakish secret. And there is always a way out, provided by a faithful God, even when you cannot see it in the heat of the moment. Jesus adds the larger promise in John 8: if the Son makes you free, you shall be free indeed. Not merely managed. Free.\n\n' +
      'Freedom rarely arrives all at once. More often it looks like noticing the escape route God already built into the moment: the pause before the click, the option to walk out of the room, the friend you could text right now. The way out is usually less dramatic than we expect and more available than we admit. Today, start believing both halves of the promise at once: this is genuinely winnable, and you are not the only one fighting it.',
    question: 'What is one way of escape God has already put in front of you that you keep walking past?',
  },
  {
    day: 5,
    title: 'Into the Light',
    passage: { book: 'James', startChapter: 5, startVerse: 16, endChapter: 5, endVerse: 16 },
    reflection:
      'Almost everything about this struggle thrives in the dark. Secrecy is not a side effect of it; secrecy is the soil it grows in. Which is exactly why James gives such a strange-sounding prescription: confess your faults to one another, and pray for one another, that you may be healed.\n\n' +
      'Notice he ties confession to healing, not only to forgiveness. First John already promises that if we confess our sins to God, he is faithful and just to forgive us. That vertical part is settled. But James adds a horizontal piece, confession to a trusted person, because what stays hidden stays powerful, and what is dragged into the light begins to lose its grip. This is not about public humiliation. It is about one or two safe people who know the real you and choose to stand with you anyway.\n\n' +
      'If you have been fighting this entirely alone, that is probably the single biggest thing standing between you and freedom. Healing here is almost never a solo project. It comes through honesty, through prayer, and through people: a friend, a pastor, a small group, someone who can hear the truth without flinching and keep walking beside you. The bravest and most freeing step is usually the one that feels most exposing, which is simply telling one safe person the truth.',
    question: 'Who is one safe person you could bring into the light with, and what would it take to actually tell them?',
  },
];

// ─── Devotional 3: Forgiveness (5 days) ───────────────────────────────────────
// Received first, then extended. Includes the boundaries / justice-to-God day so
// it is never naive about ongoing harm. Needs Justin's theological review.

const FORGIVENESS_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'Forgiven First',
    passage: { book: 'Psalms', startChapter: 103, startVerse: 8, endChapter: 103, endVerse: 12 },
    reflection:
      'Most of us try to forgive others while running on empty, white-knuckling our way to letting someone off the hook. David starts somewhere completely different. Before he says a single word about forgiving anyone else, he stares at how God has forgiven him.\n\n' +
      'He writes that the Lord is merciful and gracious, slow to anger, and plenteous in mercy, that he has not dealt with us according to our sins, and that as far as the east is from the west, so far has he removed our transgressions from us. East and west never meet. There is no point on the map where they reconnect. That is the picture of how completely God has dealt with what you have done. Not filed away for later. Not held over your head. Removed.\n\n' +
      'This is the well you forgive others from. It is nearly impossible to give grace you have not first received, and it is surprisingly possible to extend grace once you grasp how much you have been handed. So before you think about anyone who owes you, start here, with the staggering mercy already poured over your own life. Let it sink in before you try to pass any of it on.',
    question: 'What do you most need to receive God’s forgiveness for today, before you think about anyone else?',
  },
  {
    day: 2,
    title: 'The Debt You Were Released From',
    passage: { book: 'Matthew', startChapter: 18, startVerse: 21, endChapter: 18, endVerse: 35 },
    reflection:
      'Peter asks Jesus how many times he has to forgive, and offers what he probably thought was generous: seven times. Jesus blows past the math and tells a story instead, about a servant forgiven an unpayable debt who then grabs a fellow servant by the throat over a tiny one.\n\n' +
      'The whole point lives in the size of the two debts. The first servant owed an amount he could not have repaid in a hundred lifetimes, and the king simply forgave it. The second debt, the one the forgiven servant refused to release, was real but small by comparison. Jesus is not saying the wrongs done to you are nothing. He is saying they are real but smaller than the debt you have already been forgiven. Unforgiveness takes root when we forget the first debt and fix our eyes on the second.\n\n' +
      'There is a sober warning in the story too: bitterness held tightly becomes its own kind of prison. The servant ends up tormented, locked up by the very grudge he would not let go of. That is what carrying an offense does to us over time. It jails the one holding it far more than the one who caused it. So the question is honest and a little uncomfortable: what are you still holding, and what is it costing you to keep holding it?',
    question: 'Who are you holding a debt against, and what is that grudge actually costing you?',
  },
  {
    day: 3,
    title: 'A Choice, Not a Feeling',
    passage: { book: 'Ephesians', startChapter: 4, startVerse: 31, endChapter: 4, endVerse: 32 },
    reflection:
      'People often wait to forgive until they feel like it. Paul writes as though forgiveness is a decision you make first, with the feelings following somewhere behind. He tells the Ephesians to put away bitterness, wrath, and anger, and to be kind, tenderhearted, and forgiving toward one another.\n\n' +
      'Put away is the language of choice. You set bitterness down the way you set down a weight you have carried too long. And the standard he gives is not how you feel about the person, but how God has treated you: forgiving one another, even as God for Christ’s sake has forgiven you. Colossians says it the same way, forbearing and forgiving as Christ forgave you. The measure is never how much the other person deserves it. It is how freely you yourself received it.\n\n' +
      'This is good news if you have been waiting to feel forgiving before you act, because that feeling may never arrive on its own. Forgiveness is something you choose, often before the emotions catch up, and sometimes again and again for the same wound. It is less a single feeling and more a daily releasing. Start with one specific thing rather than trying to forgive a whole history all at once.',
    question: 'What is one specific grievance you could choose to release this week, even before you feel ready?',
  },
  {
    day: 4,
    title: 'Forgiveness Is Not Pretending',
    passage: { book: 'Romans', startChapter: 12, startVerse: 17, endChapter: 12, endVerse: 21 },
    reflection:
      'One reason people resist forgiveness is that they think it means pretending the wrong never happened, or staying in a place that keeps hurting them. Paul makes clear that is not what this is. He tells believers not to repay evil for evil, and to leave room for God, because vengeance belongs to him.\n\n' +
      'That phrase, leave room, is the key. Forgiveness does not mean you decide the offense was fine, and it does not mean you have to stay close to someone who keeps causing harm. It means you step out of the role of judge and executioner and hand that weight to God, who sees everything and will set every account right. You can forgive someone and still keep wise boundaries. You can release vengeance and still walk away from danger. Letting go of getting even is not the same as pretending nothing happened.\n\n' +
      'This is freeing, because the drive to make someone pay is exhausting, and it keeps you chained to the very person who hurt you. Paul ends with overcome evil with good, the picture of a person no longer controlled by the wound. Handing justice to God is not weakness and it is not denial. It is trusting that the One who sees it all will handle it better than your bitterness ever could.',
    question: 'Where do you need to release the desire to get even and trust God with the justice instead?',
  },
  {
    day: 5,
    title: 'The Father Runs',
    passage: { book: 'Luke', startChapter: 15, startVerse: 20, endChapter: 15, endVerse: 24 },
    reflection:
      'Jesus told a story about a son who took his inheritance, wasted it, hit rock bottom, and trudged home rehearsing an apology. He never gets to finish it. While he was still a great way off, his father saw him, ran to him, fell on his neck, and kissed him.\n\n' +
      'The father is the picture of how God forgives, and it is worth noticing how undignified his welcome is. He runs, which respectable fathers of that culture simply did not do. He cuts off the prepared apology, calls for the best robe, and throws a feast. There is no probation period, no lecture, no making the son earn his way back. This is the heart you are invited both to receive from and to imitate, a love that runs toward the one coming home rather than waiting with arms crossed.\n\n' +
      'Here is the quiet gift in all of it: forgiveness sets the forgiver free too. The bitterness you have been carrying is heavy, and laying it down lightens you more than it changes the other person. When you forgive, you stop renting space in your present to a past wound. You step into the same freedom the father in the story already lives in, free to celebrate instead of keeping score. Whatever you have been gripping, picture actually setting it down, and how much lighter the walk would feel.',
    question: 'How would your heart feel lighter if you finally let this one go?',
  },
];

// ─── Devotional 4: Identity and Worth (5 days) ────────────────────────────────
// The moat. Worth that is given, not earned, and cannot be lost. Speaks straight
// to the performance treadmill the app sits next to. Needs theological review.

const IDENTITY_WORTH_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'Made in His Image',
    passage: { book: 'Genesis', startChapter: 1, startVerse: 27, endChapter: 1, endVerse: 27 },
    reflection:
      'We live in a world that constantly attaches a price tag to people based on what they produce, how they look, and what they have achieved this week. It is exhausting, because the number resets every morning and you have to win it back all over again. The Bible starts the human story somewhere else entirely.\n\n' +
      'In the very first chapter, God creates mankind in his own image, male and female. Before anyone had accomplished anything, before there was a resume or a record, worth was simply assigned by the Maker. To bear the image of God means your value is not earned and cannot be deducted. It is woven into what you are. A counterfeit is worth only what it can fake. An original is worth whatever the artist is worth, and you are an original.\n\n' +
      'This cuts against the quiet treadmill so many of us run, trying to prove we are enough through performance, even good things like discipline, work, or service. None of that is wrong, but none of it is the source of your worth. You were valuable on your worst day and your laziest day and your most invisible day, because the image-bearing came first. Wherever you have been earning what was already given, you have permission to stop and breathe.',
    question: 'Where have you been trying to earn a worth that God already built into you?',
  },
  {
    day: 2,
    title: 'Fearfully and Wonderfully Made',
    passage: { book: 'Psalms', startChapter: 139, startVerse: 13, endChapter: 139, endVerse: 16 },
    reflection:
      'Most of us carry a running list of things we wish were different about ourselves: our bodies, our wiring, our limits. David, who knew real failure and real struggle, looked at how he was made and landed somewhere surprising. He landed on praise.\n\n' +
      'He writes that God formed his inward parts and covered him in his mother’s womb, and then says, I will praise thee, for I am fearfully and wonderfully made. Fearfully here means with awe, with weight. He even says God saw his unformed substance and wrote his days in a book before one of them came to be. The point is intention. You were not mass produced or thrown together. You were knit, on purpose, by Someone who knew exactly what he was doing and called the result wonderful.\n\n' +
      'That does not mean every part of your story or your body feels wonderful to you right now. It means the verdict of your Maker outranks your own harshest opinion of yourself. There is a kind of self-rejection that is really an argument with God about his craftsmanship. Today is an invitation to let his assessment be louder than yours, even in the area you are most tempted to despise.',
    question: 'What part of how you are made do you struggle to call wonderful, and what would it mean to let God’s verdict outrank yours?',
  },
  {
    day: 3,
    title: 'A New Creation',
    passage: { book: '2 Corinthians', startChapter: 5, startVerse: 17, endChapter: 5, endVerse: 17 },
    reflection:
      'A lot of people are held back not by what they are doing now but by who they are convinced they have always been. The old label, the addict, the failure, the screwup, the one who never finishes, gets worn so long that it starts to feel permanent. Paul says something that should break that spell.\n\n' +
      'If anyone is in Christ, he is a new creation. Old things are passed away, and behold, all things are become new. New creation is strong language. It is not a renovation or a touch up on the old self. It is a genuinely new starting point. Your past is real, but in Christ it no longer gets to define you or set the ceiling on who you can become. The defining fact about you is no longer your worst chapter. It is your union with him.\n\n' +
      'This is not pretending the old never existed. It is refusing to let it have the final word. You may still carry memories, and even consequences, but the identity underneath them is new. So when the old label whispers that this is just who you are, you get to answer with a truer fact: that was the old creation, and I am not that anymore. Naming the specific lie is often the first step to walking free of it.',
    question: 'What old label are you still wearing that Christ has already replaced?',
  },
  {
    day: 4,
    title: 'Chosen, Not Auditioning',
    passage: { book: 'Ephesians', startChapter: 1, startVerse: 4, endChapter: 1, endVerse: 6 },
    reflection:
      'There is a particular ache in feeling unchosen: the last pick, the afterthought, the one who has to earn a place at every table. Scripture speaks directly into that ache with a word many of us struggle to actually believe about ourselves. The word is chosen.\n\n' +
      'Paul writes that God chose us in Christ before the foundation of the world, and predestined us unto adoption as sons, accepted in the beloved. Peter calls believers a chosen generation, a royal priesthood, a people belonging to God. Adoption is the key image. An adopted child is not chosen because they earned it or interviewed well. They are chosen on purpose, brought into a family, and given a name and a place that cannot be performed away. That is the language God uses for you.\n\n' +
      'Imagine how a day would actually feel if you moved through it already chosen, already belonging, with nothing left to audition for. So much of our striving and low-grade anxiety is really an attempt to secure a place we have already been given. You do not have to earn your way into the family. You are in it. Try living one ordinary day as if that were simply true, because it is.',
    question: 'How would today change if you lived as someone already chosen instead of someone still auditioning?',
  },
  {
    day: 5,
    title: 'Loved Before You Performed',
    passage: { book: 'Romans', startChapter: 5, startVerse: 8, endChapter: 5, endVerse: 8 },
    reflection:
      'If you trace most of our anxiety back far enough, you often find a single fear underneath: that love is conditional, that it has to be kept up, that one bad stretch could lose it. The gospel attacks that fear right at the root.\n\n' +
      'Paul writes that God commended his love toward us in that, while we were yet sinners, Christ died for us. While we were yet sinners. Not after we cleaned ourselves up, not once we proved we were worth it, but at our worst and least deserving. And in Galatians he says the life he now lives, he lives by faith in the Son of God, who loved me and gave himself for me. The love came first, before any performance, and it was deeply personal, for me.\n\n' +
      'This reorders everything. Your worth does not ride on today’s output, your discipline, your productivity, or your wins. Those things can be good, but they are not the foundation. They are built on a love that was already settled at the cross. You can pour yourself into your work and your training and your relationships from a place of being loved rather than in order to become loved. That is a completely different, and far freer, way to live a single day.',
    question: 'What would it look like to let your worth rest in his love today, instead of in your output?',
  },
];

// ─── Devotional 5: Strength and Discipline (5 days) ───────────────────────────
// The moat. Connects the discipline of training the body to the strength God
// grows in the spirit, and reframes effort as worship. Needs theological review.

const STRENGTH_DISCIPLINE_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'Discipline Is Training, Not Punishment',
    passage: { book: 'Hebrews', startChapter: 12, startVerse: 11, endChapter: 12, endVerse: 11 },
    reflection:
      'The word discipline carries baggage. For a lot of people it sounds like punishment, like something harsh done to you because you are bad. But anyone who has trained a body knows discipline is something else entirely. It is the structure that makes growth possible.\n\n' +
      'Hebrews says that no discipline seems pleasant at the time, but painful, yet afterward it yields the peaceable fruit of righteousness to those who are trained by it. Notice the word trained. The writer is using the picture of an athlete. The soreness, the resistance, the hard reps are not God being angry at you. They are the process by which something good grows in you. Discipline that feels like punishment in the moment is doing something redemptive underneath, the same way a hard workout breaks the body down so it can come back stronger.\n\n' +
      'This reframes the grind. The early mornings, the saying no, the showing up when you do not feel like it, none of it is God squeezing payment out of you. It is training, and training has a harvest. If you have been treating your spiritual or physical discipline as a punishment to endure, you have been reading it wrong. It is an investment, and the fruit comes later, for those who let themselves be trained by it.',
    question: 'Where are you treating discipline as punishment instead of training, and how would it change things to see the fruit it is growing?',
  },
  {
    day: 2,
    title: 'Run to Win',
    passage: { book: '1 Corinthians', startChapter: 9, startVerse: 24, endChapter: 9, endVerse: 27 },
    reflection:
      'Paul, writing to a city that loved its athletic games, reaches for the language of competition to describe the spiritual life. He talks about runners in a race and a fighter who does not just beat the air, and he is clearly someone who respects training.\n\n' +
      'He says run, that you may obtain, and that every athlete is temperate in all things, disciplined, for the sake of a prize. Then he says he keeps his own body under and brings it into subjection. This is not him hating his body. It is him directing it, the way an athlete pays a real cost to compete well. The striking part is the contrast he draws. Athletes do all of this for a prize that fades, while believers train for one that lasts. He takes the discipline of the games and aims it at something eternal.\n\n' +
      'It is worth asking what you are actually training for. A lot of effort can be poured into goals that, honestly, will not matter much in the end, while the things that last get our leftovers. Paul is not against physical discipline. He uses it as the model. He just wants that same intentionality, the same willingness to pay a cost, pointed at things that outlast the mirror. The discipline you already have is a gift. The question is where you are aiming it.',
    question: 'What are you really training for, and is your effort aimed at what lasts?',
  },
  {
    day: 3,
    title: 'Strength in Weakness',
    passage: { book: '2 Corinthians', startChapter: 12, startVerse: 9, endChapter: 12, endVerse: 10 },
    reflection:
      'Our culture treats strength as self-sufficiency: needing no one, showing no cracks. Paul, one of the toughest figures in the New Testament, learned a strength that runs in the opposite direction. He begged God three times to remove a painful weakness, and God said no, but gave him something better.\n\n' +
      'God told him, my grace is sufficient for thee, for my strength is made perfect in weakness. So Paul says he will gladly glory in his weaknesses, that the power of Christ may rest upon him, and he lands on a line that sounds backward: when I am weak, then am I strong. The point is not that weakness is good in itself. It is that your limits are the exact place where God’s power has room to show up. As long as you run on pure self-reliance, you never get to find out what his strength actually feels like.\n\n' +
      'This is freeing for anyone tired of pretending to have it all together. Your weak spot, the thing you wish you could hide, is not disqualifying. It may be the very doorway through which God’s strength enters. Real strength is not having no limits. It is knowing where to bring them. The place you feel least sufficient might be the place he most wants to prove himself strong.',
    question: 'Where is the weakness you keep hiding actually an invitation to lean on his strength?',
  },
  {
    day: 4,
    title: 'Renewed Strength',
    passage: { book: 'Isaiah', startChapter: 40, startVerse: 28, endChapter: 40, endVerse: 31 },
    reflection:
      'There is a kind of tired that sleep does not fix, the deep fatigue of running on empty for too long. Isaiah speaks straight into it, to people who felt forgotten and worn out, and he points them past their own dwindling reserves to a God who never runs dry.\n\n' +
      'He says the everlasting God does not faint or grow weary, and that he gives power to the faint. Then comes the famous promise: they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles; they shall run and not be weary, and walk and not faint. The hinge word is wait. The renewal is not something you manufacture by grinding harder. It comes through dependence, through turning back to the source instead of squeezing the last drops out of yourself.\n\n' +
      'Even the best training programs build in rest, because strength is actually built in recovery, not only in effort. The spiritual life works the same way. If you are exhausted, the answer is usually not more willpower. It is waiting on the One who has strength to spare. There is no shame in coming to the end of yourself. That is often exactly where renewal begins, for those willing to stop and wait on him.',
    question: 'Where are you running on empty and need to wait on him instead of grinding harder?',
  },
  {
    day: 5,
    title: 'Effort as Worship',
    passage: { book: 'Colossians', startChapter: 3, startVerse: 23, endChapter: 3, endVerse: 23 },
    reflection:
      'It is easy for discipline to drift into vanity: training for the mirror, working for applause, measuring yourself against everyone around you. Scripture offers a way to take that same effort and aim it somewhere that will not leave you empty.\n\n' +
      'Paul writes, whatsoever ye do, do it heartily, as to the Lord, and not unto men. Elsewhere he says, whether therefore ye eat, or drink, or whatsoever ye do, do all to the glory of God. That little phrase, as to the Lord, changes the whole meaning of the work. The same workout, the same job, the same quiet faithfulness, done as an offering rather than a performance, becomes worship. Nothing about the effort itself changes. The audience does.\n\n' +
      'This rescues the daily grind from being about you. When your training is for the glory of God, it stops being a verdict on your worth and becomes a way of honoring the body and the life he gave you. The pressure to prove something lifts, and discipline turns into gratitude in motion. Imagine treating this week’s effort, the reps, the work, the small faithful things, as worship offered to him rather than evidence gathered for yourself.',
    question: 'How could your training and your effort become an act of worship this week?',
  },
];

// ─── Devotional 6: Anxiety and Peace (5 days) ─────────────────────────────────
// His presence over the absence of trouble. Casting cares, prayer, today-sized
// trust, a different kind of peace, and I am with you. Needs theological review.

const ANXIETY_PEACE_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'Cast Your Cares',
    passage: { book: '1 Peter', startChapter: 5, startVerse: 6, endChapter: 5, endVerse: 7 },
    reflection:
      'Anxiety has a way of convincing us that if we just keep turning the problem over in our minds, we will eventually solve it. So we carry it everywhere, into our sleep, into our conversations, into the quiet moments. Peter offers a different instruction, one that is almost startling in how simple it is.\n\n' +
      'He says to humble yourselves under the mighty hand of God, casting all your care upon him, for he careth for you. Two things stand out. First, the word cast, which means to throw, to actually hand it off, not to nervously hold it while asking God for help. Second, the reason given: because he cares for you. The invitation to let go is grounded in the truth that Someone bigger is paying attention and is genuinely concerned about your life.\n\n' +
      'There is even a hint here that anxiety can be a quiet form of pride, the belief that holding it all together is finally up to me alone. Humbling yourself, in this verse, partly means admitting you were never meant to carry it by yourself in the first place. Today, the practice is almost physical: name the worry out loud, and deliberately hand it over, trusting that the One you are handing it to actually cares about you.',
    question: 'What anxiety have you been holding onto that you have not actually handed to God?',
  },
  {
    day: 2,
    title: 'Anxious for Nothing',
    passage: { book: 'Philippians', startChapter: 4, startVerse: 6, endChapter: 4, endVerse: 7 },
    reflection:
      'Paul writes some of the most quoted words on anxiety from, of all places, a prison cell. That context matters, because he is not offering a tip from a comfortable life. He is describing a peace he found in a genuinely hard place.\n\n' +
      'He says be anxious for nothing, but in everything, by prayer and supplication with thanksgiving, let your requests be made known unto God. And then the promise: the peace of God, which passes all understanding, shall keep your hearts and minds through Christ Jesus. Notice the exchange. He does not say stop feeling anxious by sheer force of will. He says take the anxious thing and turn it into a prayer, with thanksgiving mixed in, and let God trade you a peace that does not even make logical sense given your circumstances.\n\n' +
      'That phrase, passes all understanding, is the key. This is not the peace of having everything figured out. It is a peace that shows up even when nothing is resolved, guarding your heart like a soldier at a gate. The path to it is not pretending you are fine. It is honestly handing God the specifics, with gratitude for what is already true, and letting him give what you cannot manufacture on your own.',
    question: 'What would you bring to God in prayer if you truly believed he would meet it with peace?',
  },
  {
    day: 3,
    title: 'Consider the Birds',
    passage: { book: 'Matthew', startChapter: 6, startVerse: 25, endChapter: 6, endVerse: 34 },
    reflection:
      'Jesus spends a long stretch of the Sermon on the Mount on worry, which tells you he took it seriously as a human struggle, not a character flaw to scold. He points his listeners outward, to the birds and the flowers, and simply asks them to look.\n\n' +
      'He says behold the fowls of the air, they do not sow or reap, yet your heavenly Father feeds them, and then asks, are you not much better than they? He notes that worry cannot add a single hour to your life, and tells them to seek first the kingdom of God, with the promise that the rest will be added. Then the famous landing: take no thought for the morrow, for the morrow shall take thought for the things of itself; sufficient unto the day is the evil thereof. He is not banning planning. He is confronting the way our minds borrow tomorrow’s troubles and pile them onto today.\n\n' +
      'Most anxiety lives in the future, in the what ifs that have not happened and mostly never will. Jesus pulls us back to the size of a single day, where God’s provision actually meets us, one day at a time. The God who feeds the birds and clothes the fields is not going to forget you. So much of the weight you feel right now is tomorrow’s, carried early. There is a today-sized portion you can trust him with, and a tomorrow you are allowed to set back down.',
    question: 'What tomorrow worry is stealing your today, and could you hand it back to God for now?',
  },
  {
    day: 4,
    title: 'A Different Kind of Peace',
    passage: { book: 'John', startChapter: 14, startVerse: 27, endChapter: 14, endVerse: 27 },
    reflection:
      'On the night before he was crucified, with his closest friends about to fall apart, Jesus gave them a parting gift. Not advice, not a plan, but peace. And he was careful to say it was a different kind than the one they were used to.\n\n' +
      'He said, peace I leave with you, my peace I give unto you; not as the world giveth, give I unto you. Let not your heart be troubled, neither let it be afraid. The world’s peace depends on circumstances cooperating, the bank account and the diagnosis and the relationship all going right, which means it evaporates the moment life gets hard. The peace Jesus gives is rooted in his presence rather than your situation, which is exactly why he could offer it on the worst night of his own life.\n\n' +
      'It is worth asking honestly where you have been shopping for peace. We tend to look for it in things that cannot actually hold it, the next achievement, the next purchase, the next bit of control, and they always run out. Jesus offers a peace that comes attached to him, not to your conditions. That is the only kind sturdy enough to survive a hard week. The question is whether you will keep chasing the fragile kind or receive the lasting one he is holding out.',
    question: 'Where have you been looking for peace in things that cannot actually hold it?',
  },
  {
    day: 5,
    title: 'I Am With You',
    passage: { book: 'Isaiah', startChapter: 41, startVerse: 10, endChapter: 41, endVerse: 10 },
    reflection:
      'When God comforts anxious people in Scripture, he rarely promises that nothing hard will happen. Instead he promises something better and more durable: his own presence in the middle of it. Isaiah 41:10 is one of the clearest examples in the whole Bible.\n\n' +
      'God says, fear thou not, for I am with thee; be not dismayed, for I am thy God; I will strengthen thee, yea, I will help thee, yea, I will uphold thee with the right hand of my righteousness. Read the verbs slowly: I am with you, I will strengthen, I will help, I will uphold. The antidote to fear here is not a guarantee of smooth circumstances. It is the nearness of God himself. The reason not to be afraid is simply that you are not facing it alone.\n\n' +
      'That changes what we most need from God. Often we are praying for him to remove the hard thing, when what he most promises is to be with us in it, holding us up by the hand. A child walking through a frightening place is steadied less by the absence of danger than by a parent’s grip. The deepest comfort is not that the trouble disappears, but that he is in it with you, and that he will not let go.',
    question: 'What changes when you know God is with you in the middle of it, not just watching from over it?',
  },
];

// ─── Exported Devotionals ─────────────────────────────────────────────────────

export const DEVOTIONALS: Devotional[] = [
  {
    id: 'rest_recovery_3',
    name: 'Rest and Recovery',
    shortName: 'Rest and Recovery',
    description:
      'Three days on the rest your body and your soul were built to need: striving, restoration, and the rhythm of work and rest.',
    category: 'Rest and Recovery',
    totalDays: REST_AND_RECOVERY_DAYS.length,
    icon: 'moon-outline',
    days: REST_AND_RECOVERY_DAYS,
  },
  {
    id: 'sexual_integrity_5',
    name: 'Sexual Integrity',
    shortName: 'Sexual Integrity',
    description:
      'Five days on freedom and grace in your sexual life: no condemnation, the heart behind the habit, the worth of your body, the way out, and healing in the light.',
    category: 'Sexual Integrity',
    totalDays: SEXUAL_INTEGRITY_DAYS.length,
    icon: 'shield-checkmark-outline',
    days: SEXUAL_INTEGRITY_DAYS,
  },
  {
    id: 'forgiveness_5',
    name: 'Forgiveness',
    shortName: 'Forgiveness',
    description:
      'Five days on forgiveness received and forgiveness given: God’s complete mercy, releasing what you hold, keeping wise boundaries, and the freedom on the other side.',
    category: 'Forgiveness',
    totalDays: FORGIVENESS_DAYS.length,
    icon: 'heart-circle-outline',
    days: FORGIVENESS_DAYS,
  },
  {
    id: 'identity_worth_5',
    name: 'Identity and Worth',
    shortName: 'Identity and Worth',
    description:
      'Five days on who you are before you do anything: made in His image, fearfully made, a new creation, chosen, and loved before you ever performed.',
    category: 'Identity and Worth',
    totalDays: IDENTITY_WORTH_DAYS.length,
    icon: 'diamond-outline',
    days: IDENTITY_WORTH_DAYS,
  },
  {
    id: 'strength_discipline_5',
    name: 'Strength and Discipline',
    shortName: 'Strength and Discipline',
    description:
      'Five days connecting the discipline you train your body with to the strength God grows in your spirit: training not punishment, running to win, strength in weakness, and effort as worship.',
    category: 'Strength and Discipline',
    totalDays: STRENGTH_DISCIPLINE_DAYS.length,
    icon: 'barbell-outline',
    days: STRENGTH_DISCIPLINE_DAYS,
  },
  {
    id: 'anxiety_peace_5',
    name: 'Anxiety and Peace',
    shortName: 'Anxiety and Peace',
    description:
      'Five days on handing your anxiety to God and finding a peace that does not depend on everything going right: cast your cares, pray, trust today, and know He is with you.',
    category: 'Anxiety and Peace',
    totalDays: ANXIETY_PEACE_DAYS.length,
    icon: 'partly-sunny-outline',
    days: ANXIETY_PEACE_DAYS,
  },
];
