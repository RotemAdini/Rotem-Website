import type { DateSeriesItem } from "./types";

export function getDateSeriesItem(id: string): DateSeriesItem | undefined {
  return dateSeriesAB.find((item) => item.id === id);
}

/** Up to `count` other series items that have a real photo, excluding the
 * current one — used for the "related" strip on detail pages. */
export function getRelatedDateItems(excludeId: string | undefined, count: number): DateSeriesItem[] {
  return dateSeriesAB.filter((item) => item.image && item.id !== excludeId).slice(0, count);
}

// place/budget are taken from each item's real "plan" data below (cost ->
// budget tier, activity -> place) wherever Rotem supplied it. Items 10
// (tennis) and 13 (lego) have no real account from her — she asked for
// plausible content "written like the rest" for those two specifically, so
// their plan/place/budget are Claude's best-effort fill-in from the original
// migration, flagged as such rather than a real account of what happened.
export const dateSeriesAB: DateSeriesItem[] = [
  {
    id: "01",
    title: "דייט אוכל איטלקי",
    image: "/images/date-series-a-b/01-italian-food/01-italian-food-1-web.JPEG",
    images: [
      "/images/date-series-a-b/01-italian-food/01-italian-food-1-web.JPEG",
      "/images/date-series-a-b/01-italian-food/01-italian-food-2-web.JPEG",
    ],
    place: "outside",
    budget: "high",
    plan: {
      cost: "כ־700 ₪",
      duration: "כ־3.5 שעות",
      effort: 3,
      needed: ["להזמין מראש סדנת בישול איטלקי זוגית", "להגיע למקום הסדנה"],
      prepAhead: ["כמעט כלום — הסדנה עצמה מאורגנת ומספקת את המצרכים והציוד"],
      whatYouDo: "מגיעים לסדנת בישול זוגית, לומדים להכין יחד מנות איטלקיות ואז אוכלים את מה שהכנתם.",
      note: "סדנה סופר כיפית, לומדים דברים שבאמת אפשר אחר כך להכין בבית. מומלץ מאוד 🥰",
    },
  },
  {
    id: "02",
    title: "דייט ביר פונג",
    image: "/images/date-series-a-b/02-beer-pong/02-beer-pong-1-web.PNG",
    images: [
      "/images/date-series-a-b/02-beer-pong/02-beer-pong-1-web.PNG",
      "/images/date-series-a-b/02-beer-pong/02-beer-pong-2-web.JPEG",
    ],
    place: "home",
    budget: "low",
    plan: {
      cost: "פחות מ־50 ₪",
      duration: "שעה+",
      effort: 5,
      needed: ["כוסות חד־פעמיות", "כדורי פינג פונג", "בירה / משקה אחר", "שולחן"],
      prepAhead: ["לסדר כוסות בשני צדי השולחן", "למלא אותן במשקה", "אפשר להכין מראש שאלות או משימות"],
      whatYouDo: "משחקים Beer Pong אחד נגד השני. בכל פעם שפוגעים בכוס אפשר לשלב שתייה, שאלה או משימה.",
      note: "צריך לחשוב ביחד על שאלות/משימות מצחיקות. דייט קליל ומצחיק מאוד כשרוצים דייט בבית 🍻",
    },
  },
  {
    id: "03",
    title: "ערב טעימות גבינות",
    image: "/images/date-series-a-b/03-cheese-1/IMG_2645-web.PNG",
    place: "home",
    budget: "low",
    plan: {
      cost: "כ־60 ₪",
      duration: "כשעה",
      effort: 5,
      needed: ["מצרכים להכנת גבינה ביתית", "סיר", "מדחום למטבח", "ציוד לסינון/הכנת הגבינה בהתאם למתכון"],
      prepAhead: ["לקנות את כל חומרי הגלם", "לבחור מתכון לגבינה ולהכין את הציוד"],
      whatYouDo: 'מכינים יחד בפעם הראשונה גבינה מאפס. חלק א׳ של דייט דו-יומי — חלק ב׳ הוא "ערב גבינות ויין", יום אחרי.',
      note: "החלק הקשה הוא שצריך לחכות 24 שעות לתוצאה 😭",
    },
  },
  {
    id: "04",
    title: "ערב גבינות ויין",
    image: "/images/date-series-a-b/04-cheese-2/04-cheese-2-1-web.PNG",
    images: [
      "/images/date-series-a-b/04-cheese-2/04-cheese-2-1-web.PNG",
      "/images/date-series-a-b/04-cheese-2/04-cheese-2-2-web.JPEG",
    ],
    place: "home",
    budget: "low",
    plan: {
      cost: "כ־60 ₪ (כ־120 ₪ בסך הכול לשני החלקים)",
      duration: "כ־3 שעות",
      effort: 5,
      needed: ["הגבינה שהכנתם יום קודם", "שמיכה/מחצלת", "סל או מגש פיקניק", "לחם/קרקרים", "פירות", "ירקות", "ממרחים ותוספות", "שתייה"],
      prepAhead: ["מרכיבים סלסלת פיקניק סביב הגבינה שהכנתם, מוסיפים עוד כמה דברים טעימים ויוצאים למקום נחמד"],
      whatYouDo: '24 שעות אחרי הכנת הגבינה אורזים אותה עם עוד דברים טעימים ויוצאים לפיקניק 🧺. חלק ב׳ של הדייט הדו-יומי שמתחיל ב"ערב טעימות גבינות".',
    },
  },
  {
    id: "05",
    title: "דייט דגים",
    image: "/images/date-series-a-b/05-fish/05-fish-1-web.JPEG",
    images: [
      "/images/date-series-a-b/05-fish/05-fish-1-web.JPEG",
      "/images/date-series-a-b/05-fish/05-fish-2-web.JPEG",
      "/images/date-series-a-b/05-fish/05-fish-3-web.JPEG",
      "/images/date-series-a-b/05-fish/05-fish-4-web.JPEG",
      "/images/date-series-a-b/05-fish/05-fish-5-web.JPEG",
    ],
    place: "home",
    budget: "high",
    plan: {
      cost: "כ־250 ₪",
      duration: "כ־3.5 שעות",
      effort: 8,
      needed: ["דגים", "חומרי גלם למנות שתבחרו", "יין/שתייה", "עריכת שולחן יפה", "נרות/אווירה"],
      prepAhead: ["לבחור תפריט שכולו סביב דגים", "לקנות את חומרי הגלם", "לסדר שולחן מושקע", "אפשר להחליט שכל אחד אחראי על מנה אחרת"],
      whatYouDo: "ערב מסעדה ביתית: מכינים יחד כמה מנות דגים, עורכים שולחן ויושבים לארוחה זוגית מושקעת.",
      note: "העלות והזמן כאן ממש תלויים בכמה שתבחרו להכין 🌊. הפעם הראשונה שהשקעתם ככה עם דגים — יצאה ארוחה מושקעת בטירוף 😍",
    },
  },
  {
    id: "06",
    title: "דייט המבורגר",
    image: "/images/date-series-a-b/06-burger/06-burger-1-web.PNG",
    images: [
      "/images/date-series-a-b/06-burger/06-burger-1-web.PNG",
      "/images/date-series-a-b/06-burger/06-burger-2-web.JPEG",
      "/images/date-series-a-b/06-burger/06-burger-3-web.JPEG",
    ],
    place: "home",
    budget: "low",
    plan: {
      cost: "כ־80 ₪",
      duration: "כ־2.5 שעות",
      effort: 8,
      needed: ["לחמניות", "המבורגרים", "גבינות/תוספות לפי הטעם", "ירקות", "רטבים", "תוספות כמו צ׳יפס/תפוחי אדמה", "שתייה"],
      prepAhead: ["להכין את האוכל", "להכין תפריט", "לסדר שולחן", "אפשר להכין אריזות/ניירות הגשה בסגנון דיינר"],
      whatYouDo: "כאן הקטע הוא לא רק להכין המבורגר — אלא להפוך את הבית למסעדת המבורגרים: מכינים את כל האוכל יחד, מסדרים בבית אווירת מסעדת המבורגרים ואז יושבים לאכול.",
      note: "דייט מושקע וכיפי במיוחד לזוגות שאוהבים לבשל ביחד 👨‍🍳👩‍🍳",
    },
  },
  {
    id: "07",
    title: "ערב משחקי וידאו",
    image: "/images/date-series-a-b/07-video-games/07-video-games-1-web.JPEG",
    images: [
      "/images/date-series-a-b/07-video-games/07-video-games-1-web.JPEG",
      "/images/date-series-a-b/07-video-games/07-video-games-2-web.PNG",
    ],
    place: "home",
    budget: "low",
    plan: {
      cost: "0 ₪",
      duration: "שעה וחצי",
      effort: 2,
      needed: ["קונסולה שכבר יש בבית", "שני שלטים", "משחקים שמתאימים לשני שחקנים"],
      prepAhead: ["כמעט כלום. אפשר להוסיף נשנושים, שתייה, שמיכות/כריות", "לבחור מראש 2–3 משחקים"],
      whatYouDo: "מתכרבלים בסלון ומשחקים יחד או אחד נגד השני.",
      note: "דייט קליל וכיפי — הכי מעט התעסקות מכל הרשימה.",
    },
  },
  {
    id: "08",
    title: "דייט זריחה",
    image: "/images/date-series-a-b/08-sunrise/08-sunrise-1-web.JPEG",
    images: [
      "/images/date-series-a-b/08-sunrise/08-sunrise-1-web.JPEG",
      "/images/date-series-a-b/08-sunrise/08-sunrise-2-web.JPEG",
    ],
    place: "outside",
    budget: "medium",
    plan: {
      cost: "כ־150 ₪ כולל אוכל ודלק",
      duration: "כ־8 שעות",
      effort: 8,
      needed: ["רכב", "יעד עם נקודת זריחה יפה", "כיסאות שטח/מחצלת", "אוכל", "שתייה", "קפה", "ציוד בהתאם למזג האוויר"],
      prepAhead: ["לבחור לוקיישן", "לבדוק שעת זריחה", "להכין אוכל ושתייה", "לארוז הכול ערב קודם", "לתכנן זמן יציאה כדי להגיע לפני הזריחה"],
      whatYouDo: "יוצאים מהבית בערך ב־2 בלילה, נוסעים למדבר, מתמקמים ואוכלים/שותים מול הזריחה. זה כבר יותר מיני־טיול זוגי מדייט קצר.",
    },
  },
  {
    id: "09",
    title: "סדנת חימר זוגית",
    image: "/images/date-series-a-b/09-clay/09-clay-1-web.JPEG",
    images: [
      "/images/date-series-a-b/09-clay/09-clay-1-web.JPEG",
      "/images/date-series-a-b/09-clay/09-clay-2-web.JPEG",
    ],
    place: "home",
    budget: "low",
    plan: {
      cost: "כ־40 ₪",
      duration: "כשעתיים",
      effort: 5,
      needed: ["קנבסים/דפים", "צבעים ומכחולים", "חומרי יצירה", "דבק/מספריים וכו׳ — תלוי בפעילות שבוחרים"],
      prepAhead: ["לבחור מה יוצרים", "לקנות את חומרי היצירה", "להכין שולחן עבודה"],
      whatYouDo: "דייט יצירה זוגי בבית. אפשר שכל אחד יוצר משהו לשני, ליצור יחד פריט לבית או לעשות פעילות יצירה משותפת.",
      note: "דייט מרגיע וכיפי וקצת מחזיר להיות ילדים 💕🥹",
    },
  },
  {
    id: "10",
    title: "דייט טניס",
    image: "/images/date-series-a-b/10-tennis/10-tennis-1-web.JPEG",
    images: [
      "/images/date-series-a-b/10-tennis/10-tennis-1-web.JPEG",
      "/images/date-series-a-b/10-tennis/10-tennis-2-web.JPEG",
    ],
    place: "outside",
    budget: "low",
    plan: {
      cost: "כ־80 ₪ (הזמנת מגרש)",
      duration: "כשעה וחצי",
      effort: 4,
      needed: ["מגרש טניס (הזמנה מראש)", "מחבטים", "כדורי טניס", "בגדי ספורט נוחים", "מים / שתייה קרה"],
      prepAhead: ["להזמין מגרש מראש", "לוודא ששני המחבטים זמינים או להשכיר במקום", "למלא בקבוקי מים"],
      whatYouDo: "משחקים טניס זוגי חופשי, בלי לחץ על התוצאה — רק תנועה וכיף ביחד, ואז יושבים לשתות משהו קר אחרי.",
    },
  },
  {
    id: "11",
    title: "ערב יצירה ויין",
    image: "/images/date-series-a-b/11-crafts-and-wine/IMG_2658-web.JPEG",
    place: "home",
    budget: "low",
    plan: {
      cost: "כ־60 ₪",
      duration: "כשעתיים",
      effort: 5,
      needed: ["בד/קנבס להדפסה", "האות הראשונה של השם בעיצוב מגניב להדפסה", "צבעים", "מכחולים", "סלוטייפ וכדומה", "יין או משקה לבחירתכם"],
      prepAhead: ["להדפיס מראש את האות הראשונה של השם בעיצוב מגניב", "לקנות צבעים, מכחולים, סלוטייפ וכדומה"],
      whatYouDo: "מציירים ביחד עם כוס יין, כל אחד מעצב את האות הראשונה של השם שלו (או של השני) — דייט יצירה זוגי ורגוע.",
    },
  },
  {
    id: "12",
    title: "דייט צפייה בכוכבים",
    image: "/images/date-series-a-b/12-stargazing/12-stargazing-1-web.JPEG",
    images: [
      "/images/date-series-a-b/12-stargazing/12-stargazing-1-web.JPEG",
      "/images/date-series-a-b/12-stargazing/12-stargazing-2-web.JPEG",
      "/images/date-series-a-b/12-stargazing/12-stargazing-3-web.JPEG",
    ],
    place: "outside",
    budget: "medium",
    plan: {
      cost: "כ־150 ₪ (ציוד, אוכל ודלק)",
      duration: "כ־5 שעות",
      effort: 7,
      needed: ["רכב", "אוהל/מאהל קטן", "כיסאות שטח או שטיח", "שמיכות", "פנס", "אוכל ושתייה חמה"],
      prepAhead: ["לבחור מיקום פתוח במדבר בלי זיהום אור", "לבדוק שעת שקיעה", "לארוז ציוד קמפינג", "להכין אוכל ושתייה חמה מראש"],
      whatYouDo: "נוסעים למדבר לפני השקיעה, מקימים מאהל קטן, ומבלים את הערב מתחת לכוכבים — עם אוכל, שמיכות ושיחות עד שעות הלילה.",
    },
  },
  {
    id: "13",
    title: "דייט לגו זוגי",
    image: "/images/date-series-a-b/13-lego/13-lego-1-web.JPEG",
    images: [
      "/images/date-series-a-b/13-lego/13-lego-1-web.JPEG",
      "/images/date-series-a-b/13-lego/13-lego-2-web.JPEG",
    ],
    place: "home",
    budget: "low",
    plan: {
      cost: "תלוי בסט שבוחרים (בד״כ 50–150 ₪)",
      duration: "כשעתיים",
      effort: 3,
      needed: ["סט לגו לבחירתכם", "שולחן פנוי וגדול", "תאורה טובה"],
      prepAhead: ["לבחור ולהזמין מראש סט לגו ששניכם אוהבים", "לפנות שולחן גדול"],
      whatYouDo: "יושבים ביחד ובונים את הסט לאט לאט, בלי למהר — דייט בית רגוע וזוגי שגם קצת מחזיר לילדות.",
    },
  },
];
