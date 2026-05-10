export interface Verse {
  verse: number;
  text: string;
}

export interface Chapter {
  chapter: number;
  verses: Verse[];
}

export interface Book {
  name: string;
  shortName: string;
  testament: 'OT' | 'NT';
  chapters: Chapter[];
}

export const BIBLE_BOOKS: Book[] = [
  // ─── OLD TESTAMENT (Key Books) ───────────────────────────────────────────────
  {
    name: 'Genesis', shortName: 'Gen', testament: 'OT', chapters: [
      { chapter: 1, verses: [
        { verse: 1, text: "In the beginning, God created the heavens and the earth." },
        { verse: 2, text: "Now the earth was formless and empty. Darkness was on the surface of the deep and God's Spirit was hovering over the surface of the waters." },
        { verse: 3, text: "God said, \"Let there be light,\" and there was light." },
        { verse: 4, text: "God saw the light, and saw that it was good. God divided the light from the darkness." },
        { verse: 5, text: "God called the light \"day\", and the darkness he called \"night\". There was evening and there was morning, the first day." },
        { verse: 26, text: "God said, \"Let's make man in our image, after our likeness. Let them have dominion over the fish of the sea, and over the birds of the sky, and over the livestock, and over all the earth, and over every creeping thing that creeps on the earth.\"" },
        { verse: 27, text: "God created man in his own image. In God's image he created him; male and female he created them." },
        { verse: 28, text: "God blessed them. God said to them, \"Be fruitful, multiply, fill the earth, and subdue it.\"" },
        { verse: 31, text: "God saw everything that he had made, and, behold, it was very good. There was evening and there was morning, a sixth day." },
      ]},
      { chapter: 2, verses: [
        { verse: 1, text: "The heavens, the earth, and all their vast array were finished." },
        { verse: 2, text: "On the seventh day God finished his work which he had done; and he rested on the seventh day from all his work which he had done." },
        { verse: 3, text: "God blessed the seventh day, and made it holy, because he rested in it from all his work of creation which he had done." },
        { verse: 7, text: "Yahweh God formed man from the dust of the ground, and breathed into his nostrils the breath of life; and man became a living soul." },
      ]},
    ]
  },
  {
    name: 'Psalms', shortName: 'Ps', testament: 'OT', chapters: [
      { chapter: 1, verses: [
        { verse: 1, text: "Blessed is the man who doesn't walk in the counsel of the wicked, nor stand on the path of sinners, nor sit in the seat of scoffers;" },
        { verse: 2, text: "but his delight is in Yahweh's law. On his law he meditates day and night." },
        { verse: 3, text: "He will be like a tree planted by the streams of water, that produces its fruit in its season, whose leaf also does not wither. Whatever he does shall prosper." },
        { verse: 6, text: "For Yahweh knows the way of the righteous, but the way of the wicked shall perish." },
      ]},
      { chapter: 23, verses: [
        { verse: 1, text: "Yahweh is my shepherd; I shall lack nothing." },
        { verse: 2, text: "He makes me lie down in green pastures. He leads me beside still waters." },
        { verse: 3, text: "He restores my soul. He guides me in the paths of righteousness for his name's sake." },
        { verse: 4, text: "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me. Your rod and your staff, they comfort me." },
        { verse: 5, text: "You prepare a table before me in the presence of my enemies. You anoint my head with oil. My cup runs over." },
        { verse: 6, text: "Surely goodness and loving kindness shall follow me all the days of my life, and I will dwell in Yahweh's house forever." },
      ]},
      { chapter: 27, verses: [
        { verse: 1, text: "Yahweh is my light and my salvation. Whom shall I fear? Yahweh is the strength of my life. Of whom shall I be afraid?" },
        { verse: 4, text: "One thing I have asked of Yahweh, that I will seek after: that I may dwell in Yahweh's house all the days of my life, to see Yahweh's beauty, and to inquire in his temple." },
        { verse: 14, text: "Wait for Yahweh. Be strong, and let your heart take courage. Yes, wait for Yahweh." },
      ]},
      { chapter: 28, verses: [
        { verse: 7, text: "Yahweh is my strength and my shield. My heart has trusted in him, and I am helped. Therefore my heart greatly rejoices. With my song I will thank him." },
      ]},
      { chapter: 46, verses: [
        { verse: 1, text: "God is our refuge and strength, a very present help in trouble." },
        { verse: 2, text: "Therefore we won't be afraid, though the earth changes, though the mountains are shaken into the heart of the seas;" },
        { verse: 10, text: "\"Be still, and know that I am God. I will be exalted among the nations. I will be exalted in the earth.\"" },
      ]},
      { chapter: 51, verses: [
        { verse: 1, text: "Have mercy on me, God, according to your loving kindness. According to the multitude of your tender mercies, blot out my transgressions." },
        { verse: 2, text: "Wash me thoroughly from my iniquity. Cleanse me from my sin." },
        { verse: 10, text: "Create in me a clean heart, O God. Renew a right spirit within me." },
        { verse: 12, text: "Restore to me the joy of your salvation. Uphold me with a willing spirit." },
      ]},
      { chapter: 91, verses: [
        { verse: 1, text: "He who dwells in the secret place of the Most High will rest in the shadow of the Almighty." },
        { verse: 2, text: "I will say of Yahweh, \"He is my refuge and my fortress; my God, in whom I trust.\"" },
        { verse: 4, text: "He will cover you with his feathers. Under his wings you will take refuge. His faithfulness is your shield and rampart." },
        { verse: 11, text: "For he will put his angels in charge of you, to guard you in all your ways." },
      ]},
      { chapter: 119, verses: [
        { verse: 11, text: "I have hidden your word in my heart, that I might not sin against you." },
        { verse: 105, text: "Your word is a lamp to my feet, and a light for my path." },
        { verse: 114, text: "You are my hiding place and my shield. I hope in your word." },
      ]},
      { chapter: 139, verses: [
        { verse: 1, text: "Yahweh, you have searched me, and you know me." },
        { verse: 2, text: "You know my sitting down and my rising up. You perceive my thoughts from afar." },
        { verse: 13, text: "For you formed my inmost being. You knit me together in my mother's womb." },
        { verse: 14, text: "I will give thanks to you, for I am fearfully and wonderfully made. Your works are wonderful. My soul knows that very well." },
        { verse: 23, text: "Search me, God, and know my heart. Try me, and know my thoughts." },
        { verse: 24, text: "See if there is any wicked way in me, and lead me in the everlasting way." },
      ]},
    ]
  },
  {
    name: 'Proverbs', shortName: 'Prov', testament: 'OT', chapters: [
      { chapter: 3, verses: [
        { verse: 5, text: "Trust in Yahweh with all your heart, and don't lean on your own understanding." },
        { verse: 6, text: "In all your ways acknowledge him, and he will make your paths straight." },
        { verse: 7, text: "Don't be wise in your own eyes. Fear Yahweh, and depart from evil." },
        { verse: 8, text: "It will be health to your body, and nourishment to your bones." },
      ]},
      { chapter: 16, verses: [
        { verse: 3, text: "Commit your work to Yahweh, and your plans shall succeed." },
        { verse: 9, text: "A man's heart plans his course, but Yahweh directs his steps." },
      ]},
      { chapter: 31, verses: [
        { verse: 30, text: "Charm is deceitful, and beauty is vain; but a woman who fears Yahweh, she shall be praised." },
      ]},
    ]
  },
  {
    name: 'Isaiah', shortName: 'Isa', testament: 'OT', chapters: [
      { chapter: 40, verses: [
        { verse: 28, text: "Haven't you known? Haven't you heard? The everlasting God, Yahweh, the Creator of the ends of the earth, doesn't faint. He isn't weary. His understanding is unsearchable." },
        { verse: 29, text: "He gives power to the weak. He increases the strength of him who has no might." },
        { verse: 30, text: "Even the youths shall faint and be weary, and the young men shall utterly fall;" },
        { verse: 31, text: "but those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint." },
      ]},
      { chapter: 41, verses: [
        { verse: 10, text: "Don't you be afraid, for I am with you. Don't be dismayed, for I am your God. I will strengthen you. Yes, I will help you. Yes, I will uphold you with the right hand of my righteousness." },
      ]},
      { chapter: 43, verses: [
        { verse: 1, text: "But now thus says Yahweh who created you, Jacob, and he who formed you, Israel: \"Don't be afraid, for I have redeemed you. I have called you by your name. You are mine.\"" },
        { verse: 2, text: "When you pass through the waters, I will be with you; and through the rivers, they will not overflow you. When you walk through the fire, you will not be burned, and flame will not scorch you." },
      ]},
    ]
  },
  {
    name: 'Jeremiah', shortName: 'Jer', testament: 'OT', chapters: [
      { chapter: 1, verses: [
        { verse: 5, text: "Before I formed you in the belly, I knew you. Before you came forth out of the womb, I sanctified you. I have appointed you a prophet to the nations." },
      ]},
      { chapter: 29, verses: [
        { verse: 11, text: "For I know the thoughts that I think toward you, says Yahweh, thoughts of peace, and not of evil, to give you hope and a future." },
        { verse: 12, text: "You shall call on me, and you shall go and pray to me, and I will listen to you." },
        { verse: 13, text: "You shall seek me, and find me, when you search for me with all your heart." },
      ]},
    ]
  },
  // ─── NEW TESTAMENT ───────────────────────────────────────────────────────────
  {
    name: 'Matthew', shortName: 'Matt', testament: 'NT', chapters: [
      { chapter: 5, verses: [
        { verse: 3, text: "Blessed are the poor in spirit, for theirs is the Kingdom of Heaven." },
        { verse: 4, text: "Blessed are those who mourn, for they shall be comforted." },
        { verse: 5, text: "Blessed are the gentle, for they shall inherit the earth." },
        { verse: 6, text: "Blessed are those who hunger and thirst after righteousness, for they shall be filled." },
        { verse: 7, text: "Blessed are the merciful, for they shall obtain mercy." },
        { verse: 8, text: "Blessed are the pure in heart, for they shall see God." },
        { verse: 9, text: "Blessed are the peacemakers, for they shall be called children of God." },
        { verse: 16, text: "Even so, let your light shine before men, that they may see your good works, and glorify your Father who is in heaven." },
      ]},
      { chapter: 6, verses: [
        { verse: 9, text: "Pray like this: 'Our Father in heaven, may your name be kept holy.'" },
        { verse: 10, text: "'Let your Kingdom come. Let your will be done on earth as it is in heaven.'" },
        { verse: 11, text: "'Give us today our daily bread.'" },
        { verse: 12, text: "'Forgive us our debts, as we also forgive our debtors.'" },
        { verse: 13, text: "'Bring us not into temptation, but deliver us from the evil one. For yours is the Kingdom, the power, and the glory forever. Amen.'" },
        { verse: 25, text: "Therefore I tell you, don't be anxious for your life: what you will eat, or what you will drink; nor yet for your body, what you will wear. Isn't life more than food, and the body more than clothing?" },
        { verse: 33, text: "But seek first God's Kingdom, and his righteousness; and all these things will be given to you as well." },
        { verse: 34, text: "Therefore don't be anxious for tomorrow, for tomorrow will be anxious for itself. Each day's own evil is sufficient." },
      ]},
      { chapter: 11, verses: [
        { verse: 28, text: "\"Come to me, all you who labor and are heavily burdened, and I will give you rest.\"" },
        { verse: 29, text: "\"Take my yoke upon you, and learn from me, for I am gentle and lowly in heart; and you will find rest for your souls.\"" },
        { verse: 30, text: "\"For my yoke is easy, and my burden is light.\"" },
      ]},
      { chapter: 22, verses: [
        { verse: 37, text: "Jesus said to him, \"'You shall love the Lord your God with all your heart, with all your soul, and with all your mind.'\"" },
        { verse: 38, text: "\"This is the first and great commandment.\"" },
        { verse: 39, text: "\"A second likewise is this, 'You shall love your neighbor as yourself.'\"" },
      ]},
      { chapter: 28, verses: [
        { verse: 19, text: "Go, and make disciples of all nations, baptizing them in the name of the Father and of the Son and of the Holy Spirit," },
        { verse: 20, text: "teaching them to observe all things that I commanded you. Behold, I am with you always, even to the end of the age." },
      ]},
    ]
  },
  {
    name: 'Mark', shortName: 'Mark', testament: 'NT', chapters: [
      { chapter: 9, verses: [
        { verse: 23, text: "Jesus said to him, \"If you can believe, all things are possible to him who believes.\"" },
      ]},
      { chapter: 10, verses: [
        { verse: 27, text: "Jesus, looking at them, said, \"With men it is impossible, but not with God, for all things are possible with God.\"" },
      ]},
      { chapter: 12, verses: [
        { verse: 30, text: "you shall love the Lord your God with all your heart, and with all your soul, and with all your mind, and with all your strength.' This is the first commandment." },
        { verse: 31, text: "The second is like this, 'You shall love your neighbor as yourself.' There is no other commandment greater than these." },
      ]},
    ]
  },
  {
    name: 'Luke', shortName: 'Luke', testament: 'NT', chapters: [
      { chapter: 1, verses: [
        { verse: 37, text: "For nothing spoken by God is impossible." },
      ]},
      { chapter: 6, verses: [
        { verse: 27, text: "\"But I tell you who hear: love your enemies, do good to those who hate you,\"" },
        { verse: 28, text: "\"bless those who curse you, and pray for those who mistreat you.\"" },
        { verse: 31, text: "\"As you would like people to do to you, do the same to them.\"" },
      ]},
      { chapter: 12, verses: [
        { verse: 15, text: "He said to them, \"Beware! Keep yourselves from covetousness, for a man's life doesn't consist of the abundance of the things which he possesses.\"" },
      ]},
    ]
  },
  {
    name: 'John', shortName: 'John', testament: 'NT', chapters: [
      { chapter: 1, verses: [
        { verse: 1, text: "In the beginning was the Word, and the Word was with God, and the Word was God." },
        { verse: 2, text: "The same was in the beginning with God." },
        { verse: 3, text: "All things were made through him. Without him, nothing was made that has been made." },
        { verse: 14, text: "The Word became flesh, and lived among us. We saw his glory, such glory as of the one and only Son of the Father, full of grace and truth." },
      ]},
      { chapter: 3, verses: [
        { verse: 16, text: "For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life." },
        { verse: 17, text: "For God didn't send his Son into the world to judge the world, but that the world should be saved through him." },
      ]},
      { chapter: 8, verses: [
        { verse: 31, text: "Jesus therefore said to those Jews who had believed him, \"If you remain in my word, then you are truly my disciples.\"" },
        { verse: 32, text: "\"You will know the truth, and the truth will make you free.\"" },
      ]},
      { chapter: 10, verses: [
        { verse: 10, text: "The thief only comes to steal, kill, and destroy. I came that they may have life, and may have it abundantly." },
      ]},
      { chapter: 11, verses: [
        { verse: 25, text: "Jesus said to her, \"I am the resurrection and the life. He who believes in me will still live, even if he dies.\"" },
      ]},
      { chapter: 13, verses: [
        { verse: 34, text: "\"A new commandment I give to you, that you love one another. Just as I have loved you, you also love one another.\"" },
        { verse: 35, text: "\"By this everyone will know that you are my disciples, if you have love for one another.\"" },
      ]},
      { chapter: 14, verses: [
        { verse: 6, text: "Jesus said to him, \"I am the way, the truth, and the life. No one comes to the Father, except through me.\"" },
        { verse: 27, text: "\"Peace I leave with you. My peace I give to you; not as the world gives, I give to you. Don't let your heart be troubled, neither let it be fearful.\"" },
      ]},
      { chapter: 15, verses: [
        { verse: 5, text: "\"I am the vine. You are the branches. He who remains in me, and I in him, the same bears much fruit, for apart from me you can do nothing.\"" },
        { verse: 13, text: "\"Greater love has no one than this, that someone lay down his life for his friends.\"" },
      ]},
      { chapter: 16, verses: [
        { verse: 33, text: "\"I have told you these things, that in me you may have peace. In the world you have oppression; but cheer up! I have overcome the world.\"" },
      ]},
    ]
  },
  {
    name: 'Acts', shortName: 'Acts', testament: 'NT', chapters: [
      { chapter: 1, verses: [
        { verse: 8, text: "But you will receive power when the Holy Spirit has come upon you. You will be witnesses to me in Jerusalem, in all Judea and Samaria, and to the uttermost parts of the earth." },
      ]},
      { chapter: 2, verses: [
        { verse: 38, text: "Peter said to them, \"Repent, and be baptized, every one of you, in the name of Jesus Christ for the forgiveness of sins, and you will receive the gift of the Holy Spirit.\"" },
        { verse: 42, text: "They continued steadfastly in the apostles' teaching and fellowship, in the breaking of bread, and prayer." },
      ]},
    ]
  },
  {
    name: 'Romans', shortName: 'Rom', testament: 'NT', chapters: [
      { chapter: 1, verses: [
        { verse: 16, text: "For I am not ashamed of the gospel of Christ, for it is the power of God for salvation for everyone who believes; for the Jew first, and also for the Greek." },
      ]},
      { chapter: 3, verses: [
        { verse: 23, text: "for all have sinned, and fall short of the glory of God;" },
        { verse: 24, text: "being justified freely by his grace through the redemption that is in Christ Jesus;" },
      ]},
      { chapter: 5, verses: [
        { verse: 1, text: "Being therefore justified by faith, we have peace with God through our Lord Jesus Christ;" },
        { verse: 3, text: "Not only this, but we also rejoice in our sufferings, knowing that suffering produces perseverance;" },
        { verse: 4, text: "and perseverance, proven character; and proven character, hope:" },
        { verse: 5, text: "and hope doesn't disappoint us, because God's love has been poured out into our hearts through the Holy Spirit who was given to us." },
        { verse: 8, text: "But God commends his own love toward us, in that while we were yet sinners, Christ died for us." },
      ]},
      { chapter: 6, verses: [
        { verse: 23, text: "For the wages of sin is death, but the free gift of God is eternal life in Christ Jesus our Lord." },
      ]},
      { chapter: 8, verses: [
        { verse: 1, text: "There is therefore now no condemnation to those who are in Christ Jesus, who don't walk according to the flesh, but according to the Spirit." },
        { verse: 28, text: "We know that all things work together for good for those who love God, to those who are called according to his purpose." },
        { verse: 38, text: "For I am persuaded that neither death, nor life, nor angels, nor principalities, nor things present, nor things to come, nor powers," },
        { verse: 39, text: "nor height, nor depth, nor any other created thing, will be able to separate us from the love of God, which is in Christ Jesus our Lord." },
      ]},
      { chapter: 10, verses: [
        { verse: 9, text: "that if you will confess with your mouth that Jesus is Lord, and believe in your heart that God raised him from the dead, you will be saved." },
        { verse: 10, text: "For with the heart, one believes resulting in righteousness; and with the mouth confession is made resulting in salvation." },
      ]},
      { chapter: 12, verses: [
        { verse: 1, text: "Therefore I urge you, brothers, by the mercies of God, to present your bodies a living sacrifice, holy, acceptable to God, which is your spiritual service." },
        { verse: 2, text: "Don't be conformed to this world, but be transformed by the renewing of your mind, so that you may prove what is the good, well-pleasing, and perfect will of God." },
        { verse: 12, text: "rejoicing in hope; enduring in troubles; continuing steadfastly in prayer;" },
      ]},
    ]
  },
  {
    name: '1 Corinthians', shortName: '1 Cor', testament: 'NT', chapters: [
      { chapter: 6, verses: [
        { verse: 19, text: "Or don't you know that your body is a temple of the Holy Spirit which is in you, which you have from God? You are not your own," },
        { verse: 20, text: "for you were bought with a price. Therefore glorify God in your body and in your spirit, which are God's." },
      ]},
      { chapter: 9, verses: [
        { verse: 24, text: "Don't you know that those who run in a race all run, but one receives the prize? Run like that, that you may win." },
        { verse: 25, text: "Every man who strives in the games exercises self-control in all things. Now they do it to receive a corruptible crown, but we an incorruptible." },
        { verse: 27, text: "but I beat my body and bring it into submission, lest by any means, after I have preached to others, I myself should be disqualified." },
      ]},
      { chapter: 10, verses: [
        { verse: 13, text: "No temptation has taken you except what is common to man. God is faithful, who will not allow you to be tempted above what you are able, but will with the temptation also make the way of escape, that you may be able to endure it." },
        { verse: 31, text: "Whether therefore you eat, or drink, or whatever you do, do all to the glory of God." },
      ]},
      { chapter: 13, verses: [
        { verse: 4, text: "Love is patient and is kind; love doesn't envy. Love doesn't brag, is not proud," },
        { verse: 5, text: "doesn't behave itself inappropriately, doesn't seek its own way, is not provoked, takes no account of evil;" },
        { verse: 6, text: "doesn't rejoice in unrighteousness, but rejoices with the truth;" },
        { verse: 7, text: "bears all things, believes all things, hopes all things, endures all things." },
        { verse: 8, text: "Love never fails." },
        { verse: 13, text: "But now faith, hope, and love remain—these three. The greatest of these is love." },
      ]},
    ]
  },
  {
    name: '2 Corinthians', shortName: '2 Cor', testament: 'NT', chapters: [
      { chapter: 4, verses: [
        { verse: 16, text: "Therefore we don't faint, but though our outward man is decaying, yet our inward man is renewed day by day." },
        { verse: 17, text: "For our light and momentary troubles are achieving for us an eternal glory that far outweighs them all." },
        { verse: 18, text: "So we fix our eyes not on what is seen, but on what is unseen, since what is seen is temporary, but what is unseen is eternal." },
      ]},
      { chapter: 5, verses: [
        { verse: 7, text: "for we walk by faith, not by sight." },
        { verse: 17, text: "Therefore if anyone is in Christ, he is a new creation. The old things have passed away. Behold, all things have become new." },
      ]},
      { chapter: 12, verses: [
        { verse: 9, text: "He has said to me, \"My grace is sufficient for you, for my power is made perfect in weakness.\" Most gladly therefore I will rather glory in my weaknesses, that the power of Christ may rest on me." },
        { verse: 10, text: "Therefore I take pleasure in weaknesses, in injuries, in necessities, in persecutions, in distresses, for Christ's sake. For when I am weak, then am I strong." },
      ]},
    ]
  },
  {
    name: 'Galatians', shortName: 'Gal', testament: 'NT', chapters: [
      { chapter: 2, verses: [
        { verse: 20, text: "I have been crucified with Christ, and it is no longer I who live, but Christ lives in me. That life which I now live in the flesh, I live by faith in the Son of God, who loved me, and gave himself up for me." },
      ]},
      { chapter: 5, verses: [
        { verse: 22, text: "But the fruit of the Spirit is love, joy, peace, patience, kindness, goodness, faith," },
        { verse: 23, text: "gentleness, and self-control. Against such things there is no law." },
      ]},
      { chapter: 6, verses: [
        { verse: 7, text: "Don't be deceived. God is not mocked, for whatever a man sows, that he will also reap." },
        { verse: 9, text: "Let's not be weary in doing good, for we will reap in due season if we don't give up." },
      ]},
    ]
  },
  {
    name: 'Ephesians', shortName: 'Eph', testament: 'NT', chapters: [
      { chapter: 2, verses: [
        { verse: 8, text: "for by grace you have been saved through faith, and that not of yourselves; it is the gift of God," },
        { verse: 9, text: "not of works, that no one would boast." },
        { verse: 10, text: "For we are his workmanship, created in Christ Jesus for good works, which God prepared before that we would walk in them." },
      ]},
      { chapter: 3, verses: [
        { verse: 20, text: "Now to him who is able to do exceedingly abundantly above all that we ask or think, according to the power that works in us," },
      ]},
      { chapter: 6, verses: [
        { verse: 10, text: "Finally, be strong in the Lord, and in the strength of his might." },
        { verse: 11, text: "Put on the whole armor of God, that you may be able to stand against the wiles of the devil." },
        { verse: 13, text: "Therefore put on the whole armor of God, that you may be able to withstand in the evil day, and having done all, to stand." },
      ]},
    ]
  },
  {
    name: 'Philippians', shortName: 'Phil', testament: 'NT', chapters: [
      { chapter: 1, verses: [
        { verse: 6, text: "being confident of this very thing, that he who began a good work in you will complete it until the day of Jesus Christ." },
      ]},
      { chapter: 4, verses: [
        { verse: 4, text: "Rejoice in the Lord always! Again I will say, \"Rejoice!\"" },
        { verse: 6, text: "In nothing be anxious, but in everything, by prayer and petition with thanksgiving, let your requests be made known to God." },
        { verse: 7, text: "And the peace of God, which surpasses all understanding, will guard your hearts and your thoughts in Christ Jesus." },
        { verse: 8, text: "Finally, brothers, whatever things are true, whatever things are honorable, whatever things are just, whatever things are pure, whatever things are lovely, whatever things are of good report; if there is any virtue, and if there is any praise, think about these things." },
        { verse: 11, text: "Not that I speak because of lack, for I have learned, in whatever state I am, to be content." },
        { verse: 12, text: "I know how to be humbled, and I know also how to abound. In everything and in all things I have learned the secret of both how to be filled and how to be hungry, both how to abound and how to be in need." },
        { verse: 13, text: "I can do all things through Christ, who strengthens me." },
      ]},
    ]
  },
  {
    name: 'Colossians', shortName: 'Col', testament: 'NT', chapters: [
      { chapter: 3, verses: [
        { verse: 1, text: "If then you were raised together with Christ, seek the things that are above, where Christ is, seated on the right hand of God." },
        { verse: 2, text: "Set your mind on the things that are above, not on the things that are on the earth." },
        { verse: 15, text: "And let the peace of God rule in your hearts, to which also you were called in one body; and be thankful." },
        { verse: 16, text: "Let the word of Christ dwell in you richly; in all wisdom teaching and admonishing one another with psalms, hymns, and spiritual songs, singing with grace in your heart to God." },
        { verse: 17, text: "Whatever you do, in word or in deed, do all in the name of the Lord Jesus, giving thanks to God the Father, through him." },
        { verse: 23, text: "And whatever you do, work heartily, as for the Lord, and not for people," },
        { verse: 24, text: "knowing that from the Lord you will receive the reward of the inheritance; for you serve the Lord Christ." },
      ]},
    ]
  },
  {
    name: '1 Thessalonians', shortName: '1 Thess', testament: 'NT', chapters: [
      { chapter: 5, verses: [
        { verse: 16, text: "Rejoice always." },
        { verse: 17, text: "Pray without ceasing." },
        { verse: 18, text: "In everything give thanks, for this is the will of God in Christ Jesus toward you." },
      ]},
    ]
  },
  {
    name: '1 Timothy', shortName: '1 Tim', testament: 'NT', chapters: [
      { chapter: 4, verses: [
        { verse: 7, text: "But refuse profane and old wives' fables. Exercise yourself toward godliness." },
        { verse: 8, text: "For bodily exercise has some value, but godliness has value in all things, having the promise of the life which is now, and of that which is to come." },
      ]},
      { chapter: 6, verses: [
        { verse: 6, text: "But godliness with contentment is great gain." },
        { verse: 7, text: "For we brought nothing into the world, and we certainly can't carry anything out." },
      ]},
    ]
  },
  {
    name: '2 Timothy', shortName: '2 Tim', testament: 'NT', chapters: [
      { chapter: 1, verses: [
        { verse: 7, text: "For God didn't give us a spirit of fear, but of power, love, and self-control." },
      ]},
      { chapter: 2, verses: [
        { verse: 15, text: "Give diligence to present yourself approved by God, a workman who doesn't need to be ashamed, properly handling the Word of Truth." },
      ]},
      { chapter: 3, verses: [
        { verse: 16, text: "Every Scripture is God-breathed and profitable for teaching, for reproof, for correction, and for instruction in righteousness," },
        { verse: 17, text: "that each person who belongs to God may be complete, thoroughly equipped for every good work." },
      ]},
      { chapter: 4, verses: [
        { verse: 7, text: "I have fought the good fight. I have finished the course. I have kept the faith." },
        { verse: 8, text: "From now on, there is stored up for me the crown of righteousness, which the Lord, the righteous judge, will give to me on that day; and not to me only, but also to all those who have loved his appearing." },
      ]},
    ]
  },
  {
    name: 'Hebrews', shortName: 'Heb', testament: 'NT', chapters: [
      { chapter: 4, verses: [
        { verse: 12, text: "For the word of God is living and active, and sharper than any two-edged sword, piercing even to the dividing of soul and spirit, of both joints and marrow, and is able to discern the thoughts and intentions of the heart." },
      ]},
      { chapter: 11, verses: [
        { verse: 1, text: "Now faith is assurance of things hoped for, proof of things not seen." },
        { verse: 6, text: "Without faith it is impossible to be well pleasing to him, for he who comes to God must believe that he exists, and that he is a rewarder of those who seek him." },
      ]},
      { chapter: 12, verses: [
        { verse: 1, text: "Therefore let's also, seeing we are surrounded by so great a cloud of witnesses, lay aside every weight and the sin which so easily entangles us, and let's run with perseverance the race that is set before us," },
        { verse: 2, text: "looking to Jesus, the author and perfecter of faith, who for the joy that was set before him endured the cross, despising its shame, and has sat down at the right hand of the throne of God." },
        { verse: 11, text: "All discipline seems painful for the moment, not joyful. But afterward, it yields the peaceful fruit of righteousness to those who have been trained by it." },
      ]},
    ]
  },
  {
    name: 'James', shortName: 'Jas', testament: 'NT', chapters: [
      { chapter: 1, verses: [
        { verse: 2, text: "Count it all joy, my brothers, when you fall into various temptations," },
        { verse: 3, text: "knowing that the testing of your faith produces endurance." },
        { verse: 4, text: "Let endurance have its perfect work, that you may be perfect and complete, lacking in nothing." },
        { verse: 12, text: "Blessed is a man who endures temptation, for when he has been approved, he will receive the crown of life, which the Lord promised to those who love him." },
        { verse: 17, text: "Every good gift and every perfect gift is from above, coming down from the Father of lights, with whom can be no variation, nor turning shadow." },
        { verse: 22, text: "But be doers of the word, and not only hearers, deluding your own selves." },
      ]},
      { chapter: 4, verses: [
        { verse: 7, text: "Be subject therefore to God. But resist the devil, and he will flee from you." },
        { verse: 8, text: "Draw near to God, and he will draw near to you." },
      ]},
    ]
  },
  {
    name: '1 Peter', shortName: '1 Pet', testament: 'NT', chapters: [
      { chapter: 2, verses: [
        { verse: 9, text: "But you are a chosen race, a royal priesthood, a holy nation, a people for God's own possession, that you may proclaim the excellence of him who called you out of darkness into his marvelous light." },
      ]},
      { chapter: 5, verses: [
        { verse: 7, text: "casting all your worries on him, because he cares for you." },
        { verse: 8, text: "Be sober and self-controlled. Be watchful. Your adversary, the devil, walks around like a roaring lion, seeking whom he may devour." },
      ]},
    ]
  },
  {
    name: '1 John', shortName: '1 John', testament: 'NT', chapters: [
      { chapter: 1, verses: [
        { verse: 9, text: "If we confess our sins, he is faithful and righteous to forgive us our sins, and to cleanse us from all unrighteousness." },
      ]},
      { chapter: 4, verses: [
        { verse: 7, text: "Beloved, let's love one another, for love is of God; and everyone who loves has been born of God, and knows God." },
        { verse: 8, text: "He who doesn't love doesn't know God, for God is love." },
        { verse: 19, text: "We love him, because he first loved us." },
      ]},
      { chapter: 5, verses: [
        { verse: 14, text: "This is the boldness which we have toward him, that, if we ask anything according to his will, he listens to us." },
      ]},
    ]
  },
  {
    name: 'Exodus', shortName: 'Exod', testament: 'OT', chapters: [
      { chapter: 15, verses: [
        { verse: 2, text: "Yah is my strength and song. He has become my salvation. This is my God, and I will praise him; my father's God, and I will exalt him." },
      ]},
    ]
  },
  {
    name: 'Numbers', shortName: 'Num', testament: 'OT', chapters: [
      { chapter: 6, verses: [
        { verse: 24, text: "Yahweh bless you, and keep you." },
        { verse: 25, text: "Yahweh make his face to shine on you, and be gracious to you." },
        { verse: 26, text: "Yahweh lift up his face toward you, and give you peace." },
      ]},
    ]
  },
  {
    name: 'Deuteronomy', shortName: 'Deut', testament: 'OT', chapters: [
      { chapter: 31, verses: [
        { verse: 6, text: "Be strong and courageous. Don't be afraid or scared of them; for Yahweh your God himself is who goes with you. He will not fail you nor forsake you." },
      ]},
    ]
  },
  {
    name: 'Revelation', shortName: 'Rev', testament: 'NT', chapters: [
      { chapter: 3, verses: [
        { verse: 20, text: "Behold, I stand at the door and knock. If anyone hears my voice and opens the door, then I will come in to him, and will dine with him, and he with me." },
      ]},
      { chapter: 21, verses: [
        { verse: 3, text: "I heard a loud voice out of heaven saying, \"Behold, God's dwelling is with people, and he will dwell with them, and they will be his people, and God himself will be with them as their God.\"" },
        { verse: 4, text: "He will wipe away from them every tear from their eyes. Death will be no more; neither will there be mourning, nor crying, nor pain, any more. The first things have passed away.\"" },
        { verse: 5, text: "He who sits on the throne said, \"Behold, I am making all things new.\"" },
      ]},
    ]
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getBook(name: string): Book | undefined {
  return BIBLE_BOOKS.find(b => b.name === name || b.shortName === name);
}

export function getChapter(bookName: string, chapter: number): Chapter | undefined {
  return getBook(bookName)?.chapters.find(c => c.chapter === chapter);
}

export function getVerse(bookName: string, chapter: number, verse: number): Verse | undefined {
  return getChapter(bookName, chapter)?.verses.find(v => v.verse === verse);
}

export function parseReference(ref: string): { book: string; chapter: number; verseStart: number; verseEnd?: number } | null {
  const match = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  return {
    book: match[1],
    chapter: parseInt(match[2]),
    verseStart: parseInt(match[3]),
    verseEnd: match[4] ? parseInt(match[4]) : undefined,
  };
}