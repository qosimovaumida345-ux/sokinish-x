// Bu yerda o'zbek, rus va ingliz tilining eng qattiq, yashirin, va ommabop 1000 dan ortiq so'kinishlari jamlanadi.

const exactMatchWords = [
    // O'ZBEK (Aynan shu so'z bo'lsa)
    "am", "om", "sik", "kot", "xuy", "hui", "huy", "lox", "chmo", "ami", "omi",
    // RUS
    "eblan", "chmo", "slish", "tvar"
];

// O'zak so'zlar: Agar bu o'zak so'z matn ichida (boshida, oxirida yopishib kelsa ham) mavjud bo'lsa bloklaydi
const rootWords = [
    // ==== O'ZBEK ====
    "jalab", "jalla", "qanjiq", "xaromi", "haromi", "qotoq", "qo'toq", "qotog", "qotaq", "qutog", "qutoq", "qutaq",
    "sikaman", "sikgiy", "sikam", "sikib", "sikay", "skey", "skiy", "itaraman", "itarib", "itarov",
    "enangni", "onangni", "oneni", "ajdodini", "avlodini", "amingni", "omingni", "kotingni", "kotingizni",
    "yban", "yeban", "ebban", "dalbayob", "dalbayop", "dalba", "chumo", "chumich", "ko'tting", "kotini", "kotiga",
    "gandon", "gondon", "xezalak", "hezalak", "pidaroz", "pidarozlar", "pidar", "iflos", "yaramas", "qanji",
    "foxisha", "fohisha", "faya", "shalaqi", "zanghar", "qotur", "xoram", "haram", "ko'tini", "aminga", "ominga",
    "siktir", "siktirey", "enag", "enengni", "sikir", "ko'tsan", "kotsan", "amilov", "amkash", "qotoyim",
    
    // ==== RUS ====
    "naxuy", "naxxuy", "naxuj", "dinax", "dinaxuy", "blyat", "blyad", "blya", "suka", "sooka", "sucka",
    "pidr", "pidoras", "piderez", "ebal", "yob", "yobnut", "yoban", "pizda", "pizdat", "pizdec", "pizdyuk",
    "shlyuxa", "shlyux", "zayebal", "zaebal", "zaebali", "zalu", "zalupa", "xuesos", "xyesos", "mudak", "pezda",

    // ==== INGLIZ/BOSHQA (Katta ro'yxat qismi) ====
    "fuck", "fucker", "fucking", "motherfuck", "shit", "bitch", "cunt", "dick", "pussy", "whore", "slut", 
    "asshole", "faggot", "nigga", "nigger", "bastard", "twat", "wank", "wanker", "bollocks", "prick",
    "dumbass", "bullshit", "horseshit", "cock", "cocksucker", "blowjob", "tit", "tits", "boob", "boobs"
];

// O'zbek grafikasiga xos xarif o'yinlarni qo'shib regex tayyorlovchi funksiya
function generateMegaRegex() {
    // Exact matches: so'z ohirida yoki boshida bo'lsa
    const exactRegexStr = "\\b(" + exactMatchWords.join("|") + ")\\b";
    
    // Root matches: so'zning kamida boshi rootga to'g'ri kelsa (masalan: naxuy -> naxuylar, jalab -> jalablar)
    const rootsRegexStr = "\\b(" + rootWords.join("|") + ")";
    
    return {
        exact: new RegExp(exactRegexStr, "i"),
        roots: new RegExp(rootsRegexStr, "i")
    };
}

module.exports = {
    generateMegaRegex
};
