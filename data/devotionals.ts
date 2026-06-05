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

// ─── Devotional 7: Running the Race (5 days) ──────────────────────────────────
// The moat. Endurance, leaving the past behind, not quitting before the harvest,
// what hardship builds, and finishing faithful. Needs theological review.

const RUNNING_THE_RACE_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'Lay It Down and Run',
    passage: { book: 'Hebrews', startChapter: 12, startVerse: 1, endChapter: 12, endVerse: 2 },
    reflection:
      'The writer of Hebrews has just spent a whole chapter listing people who trusted God through impossible circumstances, and now he turns to us with a picture: a great cloud of witnesses surrounding a runner about to take the track. The Christian life, he says, is a race, and races are run, not strolled.\n\n' +
      'His first instruction is to lay aside every weight, and the sin which so easily besets us, and to run with patience the race that is set before us. Notice the two different things he names. There is sin, the obvious thing, but there is also weight, which may not be sinful at all, just extra that slows you down. A runner strips off anything that does not help, even good things, when they become dead weight. And then the key word: patience. This is not a sprint. It is run with endurance.\n\n' +
      'Then comes the secret to not quitting: looking unto Jesus, the author and finisher of our faith. A runner who stares at the competition or at their own burning legs falls apart. A runner fixed on the finish keeps going. Whatever is weighing you down right now, some of it you were never meant to carry into this race. The real questions are what you need to set down, and where your eyes are actually fixed.',
    question: 'What weight, even a good thing, do you need to lay down so you can run with endurance?',
  },
  {
    day: 2,
    title: 'Forget What Is Behind',
    passage: { book: 'Philippians', startChapter: 3, startVerse: 13, endChapter: 3, endVerse: 14 },
    reflection:
      'Paul had a past he could have either bragged about or been buried under. He had been a religious all-star and also a man who hunted down Christians. Either his achievements or his failures could have anchored him to yesterday. Instead he says he does one thing.\n\n' +
      'This one thing: forgetting those things which are behind, and reaching forth unto those things which are before, I press toward the mark for the prize of the high calling of God in Christ Jesus. Forgetting here does not mean pretending the past never happened. It means refusing to let it set the pace for your present. Both regret over old failures and pride over old wins can keep you running in place. Paul lets go of the rearview so he can lean into what is ahead.\n\n' +
      'A runner who keeps glancing backward slows down and risks falling. So much of what drains us in the race is energy spent relitigating yesterday, the mistake we cannot forgive, the season we cannot get back. Paul models a holy forward lean. The prize is ahead, not behind, and you cannot reach for it while clutching what is over. What is one thing back there you keep turning around to look at, that you could finally face forward and leave?',
    question: 'What part of your past keeps pulling your eyes backward instead of toward what is ahead?',
  },
  {
    day: 3,
    title: 'Do Not Grow Weary',
    passage: { book: 'Galatians', startChapter: 6, startVerse: 9, endChapter: 6, endVerse: 9 },
    reflection:
      'There is a particular kind of tired that comes not from doing wrong, but from doing right with no visible payoff. You keep showing up, keep serving, keep choosing the harder good thing, and nothing seems to change. Paul speaks straight to that exhaustion.\n\n' +
      'He writes, let us not be weary in well doing, for in due season we shall reap, if we faint not. Two phrases carry the whole verse. In due season, which means the harvest has a timing that is not yours to set, and it is often later than you would like. And if we faint not, which quietly admits that fainting, quitting right before the payoff, is the real danger. He is not promising instant results. He is promising that faithfulness is never finally wasted.\n\n' +
      'Most people do not fail in the race because they were not strong enough. They stop because the results did not come fast enough and they assumed nothing was happening underneath. But seeds grow in the dark long before they break the surface. The call here is simply to not quit in the stretch where you cannot yet see the fruit. The due season is coming for those who do not give up right before it.',
    question: 'Where are you tempted to quit doing good simply because you have not seen the payoff yet?',
  },
  {
    day: 4,
    title: 'What the Hard Miles Build',
    passage: { book: 'Romans', startChapter: 5, startVerse: 3, endChapter: 5, endVerse: 5 },
    reflection:
      'Nobody signs up for hardship, and the Bible never pretends suffering is fun. But Paul says something that reframes the hard miles of the race. He says we can actually glory in tribulations. Not because the pain is good, but because of what God grows through it.\n\n' +
      'He traces a chain: tribulation works patience, and patience works experience, and experience works hope, and hope does not make us ashamed, because the love of God is shed abroad in our hearts. Read it as a training progression. Endurance is built under load, not in comfort. The pressure that feels like it is breaking you is, in God’s hands, building something, a tested character and a hope that holds. The struggle is not meaningless; it is forging something in you that ease never could.\n\n' +
      'Any athlete knows the muscle grows through the resistance, not around it. The spiritual life works the same way, which means the hard stretch you are in may be doing more in you than a hundred easy days would. That does not make the pain pleasant, and you do not have to fake gratitude for it. But you can trust that none of it is wasted, that God is building endurance and hope in you through the very thing you wish would end.',
    question: 'What might God be building in you through the hard stretch you are in right now?',
  },
  {
    day: 5,
    title: 'Finish the Course',
    passage: { book: '2 Timothy', startChapter: 4, startVerse: 7, endChapter: 4, endVerse: 8 },
    reflection:
      'These are some of the last recorded words of Paul, written from prison near the end of his life. He is not writing a victory speech from a comfortable retirement. He is facing execution, and he looks back over a hard, costly life and says something remarkable.\n\n' +
      'He writes, I have fought a good fight, I have finished my course, I have kept the faith. Then he looks ahead to a crown of righteousness laid up for him, and adds that it is not for him only, but for all who love the appearing of the Lord. Notice he does not say I won every battle or I never stumbled. He says I finished and I kept the faith. The goal of the race was never a flawless run. It was crossing the line still trusting, still holding on.\n\n' +
      'That is good news for anyone who feels like their race has been messy. Finishing faithful is not the same as finishing perfect. The crown is promised to those who endure to the end, not to those who never fell. Whatever your stretch of the course looks like right now, the call is the same one Paul lived out: keep the faith, and keep moving toward the line. The One who set the race before you is also waiting at the finish.',
    question: 'What would it look like, this week, to simply keep the faith and stay in the race?',
  },
];

// ─── Devotional 8: Stewarding Your Body (5 days) ──────────────────────────────
// The moat, with the honest balance built in (care for the body, do not idolize
// it). Body as worship, proportion, everyday choices, on loan, whole-person.
// Needs theological review.

const STEWARDING_BODY_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'A Living Sacrifice',
    passage: { book: 'Romans', startChapter: 12, startVerse: 1, endChapter: 12, endVerse: 1 },
    reflection:
      'We tend to split life into the spiritual parts, like prayer and worship, and the physical parts, like eating and training and sleeping, as if God only cares about the first category. Paul collapses that divide in a single sentence, and he does it using the body.\n\n' +
      'He pleads with believers to present their bodies a living sacrifice, holy, acceptable unto God, which he calls their reasonable service. Stop and notice that. He frames it as worship, and he is talking about your body. Not just your prayers or your songs, but your physical self, offered to God. The way you treat your body is not separate from your faith; it is one of the most concrete forms your worship takes.\n\n' +
      'This dignifies the ordinary. How you fuel yourself, how you move, how you rest, all of it can be an offering rather than just maintenance. A living sacrifice is one that stays on the altar daily, which means this is not a one-time decision but an everyday posture. Your body is not a distraction from the spiritual life; it is part of how you live it. What would change if you saw the care of your body as an act of worship, not a vanity project and not a chore?',
    question: 'What would it look like to treat the care of your body as worship offered to God this week?',
  },
  {
    day: 2,
    title: 'Keep It in Proportion',
    passage: { book: '1 Timothy', startChapter: 4, startVerse: 8, endChapter: 4, endVerse: 8 },
    reflection:
      'This is a surprising verse to find in a fitness-minded devotional, because it gently puts fitness in its place. Paul is writing to a young leader about what matters most, and he reaches for the language of exercise to make his point.\n\n' +
      'He says, bodily exercise profiteth little, but godliness is profitable unto all things, having promise of the life that now is, and of that which is to come. Read carefully. He does not say bodily exercise is worthless; the sense is that it profits for a little, or for a little while. Training the body has real value. It is just not the highest value, and it does not last forever. Godliness, growing in Christ, pays off in this life and the next. Paul is drawing a line of proportion, not throwing out the body.\n\n' +
      'This is an honest word for anyone who loves discipline and training, because the very thing that builds you can quietly become the thing you build your identity on. The mirror, the numbers, the streak, can drift from being good tools to being little gods. The body is worth caring for, and it is not worth worshiping. Keeping it in proportion means enjoying the gift without letting it take the throne. Where might your care for your body have quietly slipped from stewardship into something closer to an idol?',
    question: 'Where might your care for your body have slipped from good stewardship toward making it too central?',
  },
  {
    day: 3,
    title: 'The Everyday Choices',
    passage: { book: 'Daniel', startChapter: 1, startVerse: 8, endChapter: 1, endVerse: 16 },
    reflection:
      'Daniel was a young man taken captive to a foreign empire, handed a place at the king’s table and a diet of rich food and wine. It would have been easy to just go along. Instead, in a situation where most of his life was outside his control, he made a quiet choice about what he would put in his body.\n\n' +
      'He purposed in his heart that he would not defile himself, and asked to eat simple food, pulse and water, for a test of ten days. At the end, his countenance appeared fairer and healthier than all the others. The point is not a diet plan; it is a heart posture. Daniel treated even his eating as a place to honor God and keep his integrity, in a culture that offered him every excuse not to. He took seriously something many of us treat as automatic.\n\n' +
      'Most of our physical life is made of small, repeated, almost invisible choices: what we eat, when we sleep, whether we move. Daniel shows that these everyday decisions are not beneath God’s notice; they are a real arena of faithfulness. You do not have to make food or fitness a religion to let your ordinary choices honor the God who gave you a body. Stewardship often looks less like a grand gesture and more like one small faithful choice, repeated.',
    question: 'What small, everyday choice about your body could you make this week as an act of honoring God?',
  },
  {
    day: 4,
    title: 'On Loan, Bought With a Price',
    passage: { book: '1 Corinthians', startChapter: 6, startVerse: 19, endChapter: 6, endVerse: 20 },
    reflection:
      'We tend to think of our bodies as fully and only our own, ours to do with as we please, ours to neglect or punish or ignore. Paul offers a completely different frame, one that changes how you hold the whole thing.\n\n' +
      'He says your body is the temple of the Holy Ghost which is in you, that you are not your own, and that you were bought with a price; therefore glorify God in your body. Two staggering claims sit here. First, your body is a dwelling place of God himself, not a throwaway shell. Second, it is not ultimately your possession; it was purchased at the cost of the cross. That does not make your body less valuable. It makes it more. You are caring for something that belongs to God and houses his Spirit.\n\n' +
      'A steward is someone entrusted with what belongs to another, and a good steward treats it with more care, not less. This guards against both extremes: the neglect that says my body does not matter, and the obsession that says my body is everything. It matters because it is God’s, on loan, indwelt, bought. So you care for it the way you would care for something precious that someone trusted to you. How would you treat your body differently if you really believed it was on loan from God, and not simply yours?',
    question: 'How would you treat your body differently if you saw it as God’s, entrusted to you to care for?',
  },
  {
    day: 5,
    title: 'Spirit, Soul, and Body',
    passage: { book: '1 Thessalonians', startChapter: 5, startVerse: 23, endChapter: 5, endVerse: 23 },
    reflection:
      'We are not just souls temporarily stuck in inconvenient bodies, and we are not just bodies with no inner life. Paul, praying a blessing over a church he loved, names the whole person, and he refuses to leave any part of you out.\n\n' +
      'He prays, the very God of peace sanctify you wholly; and I pray God your whole spirit and soul and body be preserved blameless. Spirit, soul, and body, all three, held together, all of it part of what God is making whole. The God of peace is not interested in only your inner life while ignoring the physical, or the reverse. He cares about the integrated whole of you, and he is the one doing the sanctifying. You are not pulling this off by willpower; he preserves you.\n\n' +
      'This is the heart of whole-person wellness, and it is deeply biblical: your physical health, your inner life, and your spirit are not rivals competing for attention but parts of one person God is restoring. Caring for your body is not a distraction from your spiritual growth, and chasing your spiritual growth does not require neglecting your body. They belong together. The same God who saves your soul cares about the whole of you and is at work to preserve all of it.',
    question: 'Which part of your whole self, body, soul, or spirit, have you been neglecting, and how could you tend to it this week?',
  },
];

// ─── Devotional 9: Grief and Comfort (5 days) ─────────────────────────────────
// Pastorally careful: does not rush past pain. God near the broken, Jesus weeps,
// mourning is blessed, comfort that flows through, and the final hope. Review.

const GRIEF_COMFORT_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'Near the Brokenhearted',
    passage: { book: 'Psalms', startChapter: 34, startVerse: 18, endChapter: 34, endVerse: 18 },
    reflection:
      'When you are in real grief, one of the cruelest lies is that God is distant, that your sorrow has somehow pushed him away, that he only shows up for the put-together version of you. This verse says the exact opposite, and it says it plainly.\n\n' +
      'The Lord is nigh unto them that are of a broken heart, and saveth such as be of a contrite spirit. Nigh means near, close. Notice who he draws near to: not the strong and the cheerful, but the broken and the crushed. In Scripture, God does not wait for you to recover before he comes close. Your broken heart does not repel him; it is precisely where he draws nearest. This is not a God who keeps his distance from your pain.\n\n' +
      'That means you do not have to clean up your grief or rush your healing to be close to God. You can come exactly as you are, shattered, numb, angry, tearful, and find him already there, near. There is no version of broken that disqualifies you from his presence. If anything, the brokenness is where he meets people most tenderly. Whatever you are grieving, you are not grieving it alone or at a distance from God.',
    question: 'Where do you most need to know that God is near to you in your brokenness, not distant from it?',
  },
  {
    day: 2,
    title: 'Jesus Wept',
    passage: { book: 'John', startChapter: 11, startVerse: 32, endChapter: 11, endVerse: 36 },
    reflection:
      'Jesus is on his way to raise his friend Lazarus from the dead. He already knows the miracle is coming, knows the grief will turn to joy in a matter of minutes. And yet, standing with the grieving sisters at the tomb, he does something that should stop us in our tracks.\n\n' +
      'When he saw Mary weeping, and the others weeping, he groaned in the spirit, and was troubled, and then comes the shortest verse in the Bible: Jesus wept. The onlookers said, behold how he loved him. Sit with the fact that the Son of God, who was about to undo this very death, still stopped to weep. He did not scold the sisters for crying. He did not rush past the sorrow to get to the happy ending. He entered it. He grieved with the grieving.\n\n' +
      'This tells you something profound about how God meets your pain. He is not impatient with your tears or waiting for you to pull it together. The God we follow is one who weeps. Your grief is not a lack of faith, and it does not need to be hurried. Even with resurrection on the way, Jesus made room for sorrow, which means you are allowed to as well. The tears you are holding back are not something he despises; they are something he shares.',
    question: 'What grief have you been rushing past or holding back that Jesus would simply sit and weep with you over?',
  },
  {
    day: 3,
    title: 'Blessed Are Those Who Mourn',
    passage: { book: 'Matthew', startChapter: 5, startVerse: 4, endChapter: 5, endVerse: 4 },
    reflection:
      'In a world that treats grief like a problem to be solved quickly and quietly, Jesus says something almost shocking. In the opening lines of his most famous sermon, listing the kinds of people God calls blessed, he includes the mourners.\n\n' +
      'Blessed are they that mourn, for they shall be comforted. He does not say blessed are those who never grieve, or those who get over it fastest. He blesses the ones who mourn, and he attaches a promise to it: they shall be comforted. Mourning, in Jesus’ eyes, is not weakness or faithlessness. It is an honest response to a broken world, and it is the very thing that opens us to receive God’s comfort. You cannot be comforted in a sorrow you refuse to feel.\n\n' +
      'This frees you from the pressure to perform okayness. You do not have to pretend you are fine to be close to God or strong in faith. Mourning is allowed, even blessed, and the promise is not only that comfort comes at the very end but that it is on its way to those willing to grieve honestly. There is no shortcut around sorrow, but there is a Comforter who meets you in it. The way to comfort runs through honest mourning, not around it.',
    question: 'Are you letting yourself actually mourn, or performing okayness, and what would honest grief look like for you?',
  },
  {
    day: 4,
    title: 'Comfort That Flows Through',
    passage: { book: '2 Corinthians', startChapter: 1, startVerse: 3, endChapter: 1, endVerse: 4 },
    reflection:
      'Grief can feel completely pointless, like wasted suffering that helps no one. Paul, who knew real affliction, offers a different angle, not to explain away the pain, but to show that even comfort received in sorrow does not stop with you.\n\n' +
      'He calls God the Father of mercies, and the God of all comfort, who comforteth us in all our tribulation, that we may be able to comfort them which are in any trouble, by the comfort wherewith we ourselves are comforted of God. Read that chain slowly. God comforts you in your trouble. And the comfort he gives is not only for you; it equips you to one day sit with someone else in theirs, with a tenderness you could only have learned in your own valley. Nothing about your grief is finally wasted in his hands.\n\n' +
      'This does not mean your loss happened so that you could help others; that would be too tidy and a little cruel. It means that even here, God can bring something redemptive, that the comfort you receive can become comfort you give. The people best able to sit with the brokenhearted are usually those who have been broken themselves and were met by God there. Your sorrow, met by his comfort, can one day become a gift to someone walking the road behind you.',
    question: 'How has God comforted you in a way you might one day offer to someone else in their grief?',
  },
  {
    day: 5,
    title: 'Every Tear',
    passage: { book: 'Revelation', startChapter: 21, startVerse: 4, endChapter: 21, endVerse: 4 },
    reflection:
      'Grief can make it feel like loss and sorrow are the permanent state of things, the final word over the world. The Bible insists they are not. At the very end of the story, John is given a vision of where all of this is heading, and it is not more sorrow.\n\n' +
      'He hears that God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain, for the former things are passed away. Notice how personal it is: God himself wipes away the tears, the way a parent gently does for a child. And notice what is promised, not a world where you have learned to live with death, but a world where death itself is gone. This is the hope that lets believers, as Paul says elsewhere, grieve, but not as those who have no hope.\n\n' +
      'This does not erase what you are feeling now or rush you past it. Grief is real, and the comfort of heaven does not cancel the ache of today. But it does mean the sorrow is not forever. There is a day coming when the God who has been near to you in the valley will personally dry the last tear, and every loss will be undone. You grieve now, but you grieve toward that, not toward nothing. The final word over your story is not the grave; it is a God who makes all things new.',
    question: 'How does the promise that God will one day wipe away every tear meet you in the grief you carry now?',
  },
];

// ─── Devotional 10: Trusting God in Uncertainty (5 days) ──────────────────────
// Trust when you cannot see. Surrender control, his higher ways, faithfulness in
// the dark, trust without the outcome, his good intentions. Jeremiah 29:11 is
// handled in its real exile context, not as a slogan. Needs theological review.

const TRUSTING_UNCERTAINTY_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'Lean Not on Your Own Understanding',
    passage: { book: 'Proverbs', startChapter: 3, startVerse: 5, endChapter: 3, endVerse: 6 },
    reflection:
      'When the future is unclear, our instinct is to think harder, to try to reason our way to certainty, to map out every possible outcome until we feel in control. This famous proverb gently tells us that is not where peace is actually found.\n\n' +
      'Trust in the Lord with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths. Notice it does not say stop thinking. It says stop leaning your whole weight on your own understanding, as if your ability to figure it out is what holds you up. Trust is the alternative, trusting a God who sees the whole road when you can only see the next step. And the promise is not that you will understand everything, but that he will direct your paths.\n\n' +
      'There is real relief in this. You were never meant to carry the full weight of the unknown on the strength of your own analysis. Some things you will not figure out in advance, and that is okay, because the One you trust already has. Acknowledging him in all your ways means bringing him into the decisions and the waiting rather than white-knuckling them alone. Where have you been trying to think your way to a certainty that only trust can actually give?',
    question: 'Where are you leaning on your own understanding when God is asking you to trust him with the unknown?',
  },
  {
    day: 2,
    title: 'Higher Than Your Ways',
    passage: { book: 'Isaiah', startChapter: 55, startVerse: 8, endChapter: 55, endVerse: 9 },
    reflection:
      'One reason uncertainty is so hard is that we assume if we cannot understand what God is doing, then maybe he is not doing anything, or not doing it well. Isaiah confronts that assumption head on, with a word straight from God about the gap between his perspective and ours.\n\n' +
      'For my thoughts are not your thoughts, neither are your ways my ways, saith the Lord. For as the heavens are higher than the earth, so are my ways higher than your ways, and my thoughts than your thoughts. This is not God being cold or aloof. It is God being honest about the difference in vantage point. You are standing in the middle of the maze; he is above it, seeing the whole thing. The fact that his plan does not match what you would have drawn up is not evidence that he is absent. It may be evidence that he sees what you cannot.\n\n' +
      'This reframes the not-knowing. The point is not that God is unknowable, but that he is bigger than your ability to predict, and that is actually good news when life is uncertain. A God you could fully figure out would be no bigger than you, and no help in what you cannot solve. Trusting his higher ways does not mean you stop asking questions; it means you hold your own conclusions loosely, knowing the One above the maze is working with more than you can see.',
    question: 'What are you judging as wrong simply because it does not match the plan you would have written?',
  },
  {
    day: 3,
    title: 'New Every Morning',
    passage: { book: 'Lamentations', startChapter: 3, startVerse: 22, endChapter: 3, endVerse: 23 },
    reflection:
      'These famous words about God’s faithfulness were not written from a mountaintop. They sit in the middle of Lamentations, a book of raw grief over a city in ruins. The writer has just poured out page after page of anguish, and then, almost defiantly, he reaches for something solid.\n\n' +
      'It is of the Lord’s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness. Catch the setting. This is not denial of the hardship; the writer has named the pain in full. It is a choice to anchor to God’s faithfulness in spite of it. The mercies are new every morning, which means however dark today was, tomorrow comes with a fresh supply. You do not have to store up enough strength for the whole uncertain road. You only need today’s mercy, and it is renewed daily.\n\n' +
      'When the future is unknown, this is a quietly powerful way to live: not trying to secure the whole road at once, but trusting that the God who met you with mercy this morning will be there with new mercy tomorrow. His faithfulness is not based on your circumstances stabilizing. It held in the ruins for the writer of Lamentations, and it holds in your uncertainty too. You can face an unknown future one renewed-mercy day at a time.',
    question: 'What would it look like to trust God for today’s mercy alone, instead of demanding certainty about tomorrow?',
  },
  {
    day: 4,
    title: 'Yet I Will Rejoice',
    passage: { book: 'Habakkuk', startChapter: 3, startVerse: 17, endChapter: 3, endVerse: 19 },
    reflection:
      'The prophet Habakkuk had been wrestling with God over hard, confusing things, things that did not make sense and were not getting better. At the end of all his questions, he lands on one of the boldest statements of trust in the Bible, and he makes it before anything has improved.\n\n' +
      'He says, although the fig tree shall not blossom, neither shall fruit be in the vines, though the flock be cut off from the fold, and there be no herd in the stalls, yet I will rejoice in the Lord, I will joy in the God of my salvation. That little word yet carries enormous weight. He lists every reason for despair, every crop failing, every safety net gone, and then pivots: yet. His joy is not anchored to the harvest coming in. It is anchored to God himself, who he says is his strength.\n\n' +
      'This is a trust that does not depend on the outcome going your way, which is the only kind sturdy enough for real uncertainty. Most of our peace is conditional, riding on things working out as we hope. Habakkuk models a peace that holds even if they do not, because it rests on who God is rather than on what God does next. That does not mean faking joy or pretending the loss does not hurt. It means having an anchor that outlasts your circumstances.',
    question: 'Could you honestly say "yet I will trust him" about the uncertain outcome you fear most?',
  },
  {
    day: 5,
    title: 'Thoughts of Peace',
    passage: { book: 'Jeremiah', startChapter: 29, startVerse: 11, endChapter: 29, endVerse: 11 },
    reflection:
      'This is one of the most quoted verses in the Bible, and it is worth knowing where it actually comes from, because the setting makes it far more powerful, not less. God speaks it to a people in exile, far from home, told they will be there for seventy long years. It is a promise spoken into a long, hard, uncertain wait.\n\n' +
      'For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil, to give you an expected end. Read in its setting, this is not a promise that nothing hard will happen or that the wait will be short. The exile was real and long. It is a promise about God’s heart toward his people in the middle of the unknown: that his intentions are good, that he is thinking thoughts of peace toward you even when the season is hard, and that there is a hopeful end he is moving you toward, even if you cannot see it yet.\n\n' +
      'That makes it a fitting word for anyone in an uncertain stretch. You may not know how long this season lasts or how it resolves, but you can know the disposition of the God overseeing it: he is for you, his thoughts toward you are peace, and he is bringing you toward a future and a hope. Trust is not certainty about the details; it is confidence in the heart of the One who holds them. When you cannot see the plan, you can still rest in the goodness of the Planner.',
    question: 'What changes when you believe that God’s thoughts toward you, even in this uncertain season, are thoughts of peace?',
  },
];

// ─── Devotional 11: New Beginnings (5 days) ───────────────────────────────────
// God does a new thing, a new heart, out of the pit, he finishes what he starts,
// and the ultimate renewal of all things. Needs theological review.

const NEW_BEGINNINGS_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'Behold, I Do a New Thing',
    passage: { book: 'Isaiah', startChapter: 43, startVerse: 18, endChapter: 43, endVerse: 19 },
    reflection:
      'Sometimes the hardest part of a fresh start is that the past keeps a grip on us, replaying old failures and old wounds until we are convinced the future is just going to be more of the same. God speaks to exactly that kind of stuck heart in Isaiah, and he speaks with startling energy.\n\n' +
      'Remember ye not the former things, neither consider the things of old. Behold, I will do a new thing; now it shall spring forth; shall ye not know it? I will even make a way in the wilderness, and rivers in the desert. Notice the urgency. Now it shall spring forth. God is not only able to do new things; he specializes in them, and in the least likely places, a road through wilderness, water in a desert. The call to not dwell on the former things is not denial; it is an invitation to stop assuming the past defines what God can do next.\n\n' +
      'A new beginning often starts the moment you stop letting your history set the limits on your hope. The same God who made a way through the wilderness for his people is not out of new ways. Whatever desert you are in, he is the kind of God who brings rivers to it. The question is whether you will keep staring at the former things or start looking for the new thing he says is already springing up.',
    question: 'Where have you assumed the future is just more of the past, when God might be doing a new thing?',
  },
  {
    day: 2,
    title: 'A New Heart',
    passage: { book: 'Ezekiel', startChapter: 36, startVerse: 26, endChapter: 36, endVerse: 26 },
    reflection:
      'Most of our attempts at a fresh start focus on changing our circumstances: a new job, a new city, a new routine. Those can help, but they often leave the deepest thing untouched, because the problem we most need fixed is usually not around us but within us. God promises to start there.\n\n' +
      'A new heart also will I give you, and a new spirit will I put within you: and I will take away the stony heart out of your flesh, and I will give you an heart of flesh. Notice who does the work. I will give, I will put, I will take away. This is not a self-improvement project where you grit your teeth into a better person. It is God offering to replace the hard, unresponsive heart with one that is soft and alive. The truest new beginning is an inside job, and it is one only he can do.\n\n' +
      'This is freeing, because the change you have been trying hardest to manufacture, and failing at, is the very thing God offers to do in you. You do not have to manufacture a new heart through sheer willpower; you can ask the One who promises to give it. A genuine fresh start is not mainly about rearranging your circumstances. It is about a heart God is making new from the inside out.',
    question: 'What hardened place in your heart have you been trying to fix yourself, that you could ask God to make new?',
  },
  {
    day: 3,
    title: 'Out of the Pit',
    passage: { book: 'Psalms', startChapter: 40, startVerse: 1, endChapter: 40, endVerse: 3 },
    reflection:
      'New beginnings rarely start in a comfortable place. More often they start at the bottom, in a season that felt like sinking. David describes this exactly, and he describes it as someone looking back on having been genuinely stuck.\n\n' +
      'He says, he brought me up also out of an horrible pit, out of the miry clay, and set my feet upon a rock, and established my goings. And he hath put a new song in my mouth. Trace the movement. From a pit, from clay that grips and holds you down, to a rock, to steady footing, to a new song. David did not climb out by his own strength; he says God brought him up. And the result was not just rescue but a fresh voice, a new song he could not have sung from the bottom.\n\n' +
      'If you feel like you are in the clay right now, this is your hope: God is in the business of lifting people out and setting them on solid ground. And what he brings you into is not just survival but a new song, a testimony, a fresh start you could not have written for yourself. The pit is real, but it is not the end of the story when God is the one reaching in. The very place you feel stuck may be where your new song begins.',
    question: 'What pit do you need God to lift you out of, and what new song might be waiting on the other side?',
  },
  {
    day: 4,
    title: 'He Will Finish It',
    passage: { book: 'Philippians', startChapter: 1, startVerse: 6, endChapter: 1, endVerse: 6 },
    reflection:
      'One fear quietly sabotages a lot of fresh starts: the fear that you will not be able to keep it up, that you will start strong and fizzle out like every other time. If the whole new beginning rests on your willpower, that fear is reasonable. Paul points to a better foundation.\n\n' +
      'Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ. Notice the source of the confidence. It is not in the believers’ staying power; it is in God’s. He began the work, and he is the one who will carry it to completion. The good work in you is not a project you launched and now have to sustain alone. It is something God started, and what God starts, he finishes.\n\n' +
      'This takes enormous pressure off a new beginning. You are not the one holding it all together, and your fresh start does not live or die on your perfect follow-through. The God who began something good in you is committed to seeing it through, even across your stumbles and slow stretches. That does not make you passive; it makes you hopeful, because the outcome rests on his faithfulness, not only your willpower.',
    question: 'Where do you need to trust that God will finish the good work he started in you, rather than fearing you will fizzle out?',
  },
  {
    day: 5,
    title: 'All Things New',
    passage: { book: 'Revelation', startChapter: 21, startVerse: 5, endChapter: 21, endVerse: 5 },
    reflection:
      'Every fresh start we experience in this life is a small echo of something much bigger. Behind each new beginning, each second chance, each clean slate, is a God whose very nature is to make things new, and the Bible ends with him doing it on the grandest possible scale.\n\n' +
      'And he that sat upon the throne said, Behold, I make all things new. Notice it is not he made some things new once, long ago, but he makes all things new, an ongoing, comprehensive renewal that reaches its climax at the end of the story. The same God who renews hearts and lifts people out of pits is the God who will one day make the entire creation new. Your personal new beginnings are not random; they flow from the character of a God who is always renewing.\n\n' +
      'This gives every fresh start a deeper hope. The new beginning you are reaching for is not just you trying to turn over a leaf; it is you stepping into the current of what God is always doing and will one day finish completely. However many times you have started over, you are dealing with a God who never tires of making things new, and who is moving all of history toward the day when everything broken is made new for good.',
    question: 'What fresh start are you longing for, and how does it help to know God’s very nature is to make all things new?',
  },
];

// ─── Devotional 12 to 15: Need a Word Right Now (single-day each) ──────────────
// The one-off bucket from the starter slate: short, jump-to-what-you-need
// devotionals for an acute moment. Each is a 1-day plan. Needs theological review.

const WORD_FAILED_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'Rise Again',
    passage: { book: 'Proverbs', startChapter: 24, startVerse: 16, endChapter: 24, endVerse: 16 },
    reflection:
      'Right now you may be sitting in the weight of a failure, replaying it, sure that this is the proof of who you really are. Before that voice gets the last word, hear what Scripture says about the difference between the righteous and the fallen, because it is not what you might expect.\n\n' +
      'For a just man falleth seven times, and riseth up again. Read it slowly. The righteous person is not the one who never falls. The righteous person is the one who keeps getting back up. Seven times is a number of fullness, meaning again and again. Falling was never the thing that defined them. Rising was. The Bible assumes the faithful will stumble, sometimes repeatedly, and it measures them not by the fall but by the return.\n\n' +
      'So the failure you are carrying does not get to define you, and it is not the end of your story unless you decide to stay down. Getting up is not pretending it did not happen; it is refusing to let it be the final word. God is not standing over you with his arms crossed. He is the One who helps the fallen rise. The most faithful thing you can do right now is not to wallow in the fall, but to get back up, again.',
    question: 'What would getting back up look like for you today, instead of staying down in the failure?',
  },
];

const WORD_ALONE_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'Never Forsaken',
    passage: { book: 'Hebrews', startChapter: 13, startVerse: 5, endChapter: 13, endVerse: 5 },
    reflection:
      'Loneliness can lie to you. In the quiet, it whispers that no one sees you, no one is with you, that you are carrying all of this by yourself. If that is where you are right now, hear a promise God makes that nothing in your circumstances can cancel.\n\n' +
      'For he hath said, I will never leave thee, nor forsake thee. Look at how absolute it is. Not I will rarely leave you, or I will be there if you perform well, but never leave, never forsake. This is God’s own word about his presence, and it does not depend on how you feel, whether anyone else shows up, or how alone your circumstances look. His presence is a fact rooted in his promise, not in your emotions.\n\n' +
      'You may genuinely be physically alone right now, and that ache is real and worth naming. But you are not abandoned, and you are not unseen. The God who promised never to leave is with you in this exact moment, in the silence, closer than the loneliness feels. Feeling alone and actually being alone are not the same thing. Let his promise be truer than the feeling: he is here, and he is not going anywhere.',
    question: 'What would change in this moment if you believed God’s promise that he is with you and has not left?',
  },
];

const WORD_AFRAID_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'Not a Spirit of Fear',
    passage: { book: '2 Timothy', startChapter: 1, startVerse: 7, endChapter: 1, endVerse: 7 },
    reflection:
      'Fear has a way of taking over the whole room of your mind, convincing you it is just who you are, that you are simply a fearful, anxious person and always will be. Paul, writing to a young leader who was clearly scared, hands him a sentence to push back with.\n\n' +
      'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind. Notice he names what the fear is not: it is not from God. And he names what God has actually given instead, three things, power, love, and a sound mind, a clear, steady mind rather than a spinning, panicked one. This does not shame you for feeling afraid; everyone does. It reminds you that fear does not get to be the loudest or final voice, because God has put something stronger in you.\n\n' +
      'When fear is gripping you, this verse is something to hold onto and even say back to it: this spirit of fear is not from God, and he has given me power, love, and a sound mind instead. You do not have to manufacture courage out of nowhere; you ask God to stir up what he has already placed in you. The fear may not vanish instantly, but it does not get the throne. There is a steadier spirit available to you right now than the fearful one.',
    question: 'What fear do you need to hand to God right now, trusting he has given you something steadier instead?',
  },
];

const WORD_WAITING_DAYS: DevotionalDay[] = [
  {
    day: 1,
    title: 'Wait With Courage',
    passage: { book: 'Psalms', startChapter: 27, startVerse: 14, endChapter: 27, endVerse: 14 },
    reflection:
      'Waiting can be its own kind of agony. Sometimes the hard thing is not a crisis but the in-between: the unanswered prayer, the delay, the season where nothing seems to be moving and you do not know how long it will last. David, who waited on God through real danger, gives a short, sturdy word for exactly that.\n\n' +
      'Wait on the Lord: be of good courage, and he shall strengthen thine heart: wait, I say, on the Lord. Notice he says wait twice, bookending the verse, as if he knows how badly we need to hear it again. And notice waiting here is not passive collapse; it takes courage, be of good courage. There is a promise tucked in the middle: he shall strengthen thine heart. The waiting itself becomes a place where God does something in you, strengthening the very heart that feels worn thin by the delay.\n\n' +
      'If you are in a waiting season, this is permission to stop measuring your faith by how fast the answer comes. Waiting on the Lord is not wasted time; it is active trust, and God meets you in it by strengthening your heart for the wait. You are not just killing time until something happens; you are being held and strengthened by the One you are waiting on. Take heart, and wait, not as someone forgotten, but as someone whose heart God is steadying.',
    question: 'What are you waiting on God for, and what would it look like to wait with courage rather than despair?',
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
  {
    id: 'running_the_race_5',
    name: 'Running the Race',
    shortName: 'Running the Race',
    description:
      'Five days on endurance for the long haul: lay aside the weight, leave the past behind, do not quit before the harvest, what hardship builds, and finishing faithful.',
    category: 'Running the Race',
    totalDays: RUNNING_THE_RACE_DAYS.length,
    icon: 'flag-outline',
    days: RUNNING_THE_RACE_DAYS,
  },
  {
    id: 'stewarding_body_5',
    name: 'Stewarding Your Body',
    shortName: 'Stewarding Your Body',
    description:
      'Five days on caring for your body as a gift without idolizing it: your body as worship, keeping it in proportion, everyday choices, on loan from God, and whole-person health.',
    category: 'Stewarding Your Body',
    totalDays: STEWARDING_BODY_DAYS.length,
    icon: 'body-outline',
    days: STEWARDING_BODY_DAYS,
  },
  {
    id: 'grief_comfort_5',
    name: 'Grief and Comfort',
    shortName: 'Grief and Comfort',
    description:
      'Five days that do not rush past the pain: God near the brokenhearted, Jesus weeping with us, the blessing of honest mourning, comfort that flows through, and the hope of every tear wiped away.',
    category: 'Grief and Comfort',
    totalDays: GRIEF_COMFORT_DAYS.length,
    icon: 'rainy-outline',
    days: GRIEF_COMFORT_DAYS,
  },
  {
    id: 'trusting_uncertainty_5',
    name: 'Trusting God in Uncertainty',
    shortName: 'Trusting in Uncertainty',
    description:
      'Five days on trusting when you cannot see the road: lean not on your own understanding, his higher ways, faithfulness in the dark, trust without the outcome, and his thoughts of peace toward you.',
    category: 'Trusting God in Uncertainty',
    totalDays: TRUSTING_UNCERTAINTY_DAYS.length,
    icon: 'navigate-outline',
    days: TRUSTING_UNCERTAINTY_DAYS,
  },
  {
    id: 'new_beginnings_5',
    name: 'New Beginnings',
    shortName: 'New Beginnings',
    description:
      'Five days for a fresh start: God doing a new thing, a new heart from the inside out, being lifted out of the pit, the God who finishes what he starts, and the One who makes all things new.',
    category: 'New Beginnings',
    totalDays: NEW_BEGINNINGS_DAYS.length,
    icon: 'sparkles-outline',
    days: NEW_BEGINNINGS_DAYS,
  },
  {
    id: 'word_failed_1',
    name: 'When You Have Failed',
    shortName: 'When You Have Failed',
    description:
      'A word for right now, when a failure is weighing on you: the righteous are not those who never fall, but those who keep getting back up.',
    category: 'Need a Word Right Now',
    totalDays: WORD_FAILED_DAYS.length,
    icon: 'refresh-outline',
    days: WORD_FAILED_DAYS,
  },
  {
    id: 'word_alone_1',
    name: 'When You Feel Alone',
    shortName: 'When You Feel Alone',
    description:
      'A word for right now, when loneliness is loud: God’s promise that he will never leave you nor forsake you, truer than the feeling.',
    category: 'Need a Word Right Now',
    totalDays: WORD_ALONE_DAYS.length,
    icon: 'person-outline',
    days: WORD_ALONE_DAYS,
  },
  {
    id: 'word_afraid_1',
    name: 'When You Are Afraid',
    shortName: 'When You Are Afraid',
    description:
      'A word for right now, when fear has taken over: God has not given you a spirit of fear, but of power, love, and a sound mind.',
    category: 'Need a Word Right Now',
    totalDays: WORD_AFRAID_DAYS.length,
    icon: 'shield-outline',
    days: WORD_AFRAID_DAYS,
  },
  {
    id: 'word_waiting_1',
    name: 'When You Are Waiting',
    shortName: 'When You Are Waiting',
    description:
      'A word for right now, in the hard in-between: wait on the Lord with courage, and he will strengthen your heart.',
    category: 'Need a Word Right Now',
    totalDays: WORD_WAITING_DAYS.length,
    icon: 'hourglass-outline',
    days: WORD_WAITING_DAYS,
  },
];
