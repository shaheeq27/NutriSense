type FoodImageConfig = {
  imageUrl: string
  source: string
}

const u = (id: string, w = 800, h = 600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format`

// ── Verified live Unsplash IDs (all HTTP 200 confirmed) ──────────────────────
// Fallback IDs used when specific photo is 404:
//   curry/indian:    1603894584373-5ac82b2ae398  (butter chicken curry)
//   rice:            1603133872878-684f208fb84b  (fried rice / noodles)
//   salad/veg:       1546069901-ba9599a7e63c     (salad bowl)
//   pancakes/sweet:  1567620905732-2d1ec7ab7445  (pancakes)
//   snack/fried:     1601050690597-df0568f70950  (samosa / street snack)
//   burger:          1568901346375-23c9450c58cd  (burger)
//   chicken:         1598515214211-89d3c73ae83b  (grilled chicken)
//   yogurt/dairy:    1488477181946-6428a0291777  (yogurt bowl)
//   egg:             1482049016688-2d3e1b311543  (fried eggs)
//   fruit:           1580052614034-c55d20bfee3b  (orange/citrus)
//   drink:           1561336313-0bd5e0b27ec8    (tea/coffee)
//   pizza:           1574071318508-1cdbab80d002  (margherita)
//   taco/wrap:       1565299585323-38d6b0865b47  (tacos)
//   cake/dessert:    1578985545062-69928b1d9587  (chocolate cake)
//   donut:           1551024601-bec78aea704b     (donut)
//   popcorn:         1505686994434-e3cc5abf1330  (popcorn)
//   grapes:          1537640538966-79f369143f8f  (grapes)
//   pineapple:       1550258987-190a2d41a8ba     (pineapple)
//   oatmeal:         1495214783159-3503fd1b572d  (oatmeal)
//   avocado-toast:   1525351484163-7529414344d8  (avocado toast)
//   almonds:         1616684000067-36952fde56ec  (almonds)

/**
 * FOOD_IMAGES_BY_SLUG — canonical food image catalog.
 * Keys MUST exactly match the `slug` column in the `foods` DB table.
 * ALL URLs verified HTTP 200 via curl.
 */
export const FOOD_IMAGES_BY_SLUG: Record<string, FoodImageConfig> = {
  // ── Indian mains ──────────────────────────────────────────────────────────
  "chicken-biryani": {
    imageUrl:
      "https://authenticroyal.com/wp-content/uploads/2024/10/royal-rice-may-220461.jpg",
    source: "authenticroyal",
  },
  "hyderabadi-chicken-biryani": {
    imageUrl:
      "https://authenticroyal.com/wp-content/uploads/2024/10/royal-rice-may-220461.jpg",
    source: "authenticroyal",
  },
  "mutton-biryani": {
    imageUrl:
      "https://www.foodiaq.com/wp-content/uploads/2025/05/Mutton-biryani.jpg",
    source: "foodiaq",
  },
  "veg-biryani": {
    imageUrl: u("1630409346824-4f0e7b080087"),
    source: "unsplash-200",
  },
  "chicken-tikka": {
    imageUrl: u("1599487488170-d11ec9c172f0"),
    source: "nutrisense-existing",
  },
  "butter-chicken": {
    imageUrl: u("1603894584373-5ac82b2ae398"),
    source: "unsplash-200",
  },
  "chicken-curry": {
    imageUrl:
      "https://www.tamingtwins.com/wp-content/uploads/2026/07/EasyChickenCurry3.jpg",
    source: "tamingtwins",
  },
  "chicken-rice-bowl": {
    imageUrl:
      "https://scontent-bom5-2.xx.fbcdn.net/v/t39.99422-6/823034431_1397814112553344_3284921353362447729_n.png?stp=dst-jpg_tt6&cstp=mx720x1080&ctp=p600x600&_nc_cat=104&ccb=1-7&_nc_sid=6376bf&_nc_ohc=p7aaaHA7TL0Q7kNvwHUorsl&_nc_oc=Adp3ekQhkUv9KiNx17eL4uQEjduNyJzZ7TV0JzydZmc5bkN6P5phRoslX834hD9Vng4&_nc_zt=14&_nc_ht=scontent-bom5-2.xx&_nc_gid=WQaA0p1raLQYbS9AqYva0Q&_nc_ss=7b20f&oh=00_AQNTssxGuXmY7iIDhJdjCp3_GuKhePSO4lh-Kqhz2fYi6g&oe=6ACAB120",
    source: "facebook-tropical-chicken",
  },
  "chicken-curry-rice": {
    imageUrl:
      "https://scontent-bom5-2.xx.fbcdn.net/v/t39.99422-6/823034431_1397814112553344_3284921353362447729_n.png?stp=dst-jpg_tt6&cstp=mx720x1080&ctp=p600x600&_nc_cat=104&ccb=1-7&_nc_sid=6376bf&_nc_ohc=p7aaaHA7TL0Q7kNvwHUorsl&_nc_oc=Adp3ekQhkUv9KiNx17eL4uQEjduNyJzZ7TV0JzydZmc5bkN6P5phRoslX834hD9Vng4&_nc_zt=14&_nc_ht=scontent-bom5-2.xx&_nc_gid=WQaA0p1raLQYbS9AqYva0Q&_nc_ss=7b20f&oh=00_AQNTssxGuXmY7iIDhJdjCp3_GuKhePSO4lh-Kqhz2fYi6g&oe=6ACAB120",
    source: "facebook-tropical-chicken",
  },
  "chicken-curry-and-rice": {
    imageUrl:
      "https://scontent-bom5-2.xx.fbcdn.net/v/t39.99422-6/823034431_1397814112553344_3284921353362447729_n.png?stp=dst-jpg_tt6&cstp=mx720x1080&ctp=p600x600&_nc_cat=104&ccb=1-7&_nc_sid=6376bf&_nc_ohc=p7aaaHA7TL0Q7kNvwHUorsl&_nc_oc=Adp3ekQhkUv9KiNx17eL4uQEjduNyJzZ7TV0JzydZmc5bkN6P5phRoslX834hD9Vng4&_nc_zt=14&_nc_ht=scontent-bom5-2.xx&_nc_gid=WQaA0p1raLQYbS9AqYva0Q&_nc_ss=7b20f&oh=00_AQNTssxGuXmY7iIDhJdjCp3_GuKhePSO4lh-Kqhz2fYi6g&oe=6ACAB120",
    source: "facebook-tropical-chicken",
  },
  "paneer-butter-masala": {
    imageUrl: u("1631452180519-c014fe946bc7"),
    source: "nutrisense-existing",
  },
  "palak-paneer": {
    imageUrl: u("1631452180519-c014fe946bc7"),
    source: "unsplash-200",
  },
  "chilli-paneer": {
    imageUrl: u("1631452180519-c014fe946bc7"),
    source: "unsplash-200",
  },
  "dal-tadka": {
    imageUrl:
      "https://rainbowplantlife.com/wp-content/uploads/2024/05/Dal-Palak-cover-photo-1-of-1.jpg",
    source: "rainbowplantlife",
  },
  dal: {
    imageUrl:
      "https://rainbowplantlife.com/wp-content/uploads/2024/05/Dal-Palak-cover-photo-1-of-1.jpg",
    source: "rainbowplantlife",
  },
  "dal-palak": {
    imageUrl:
      "https://rainbowplantlife.com/wp-content/uploads/2024/05/Dal-Palak-cover-photo-1-of-1.jpg",
    source: "rainbowplantlife",
  },
  "yellow-dal": {
    imageUrl:
      "https://rainbowplantlife.com/wp-content/uploads/2024/05/Dal-Palak-cover-photo-1-of-1.jpg",
    source: "rainbowplantlife",
  },
  "toor-dal": {
    imageUrl:
      "https://rainbowplantlife.com/wp-content/uploads/2024/05/Dal-Palak-cover-photo-1-of-1.jpg",
    source: "rainbowplantlife",
  },
  "moong-dal": {
    imageUrl:
      "https://rainbowplantlife.com/wp-content/uploads/2024/05/Dal-Palak-cover-photo-1-of-1.jpg",
    source: "rainbowplantlife",
  },
  "dal-fry": {
    imageUrl:
      "https://rainbowplantlife.com/wp-content/uploads/2024/05/Dal-Palak-cover-photo-1-of-1.jpg",
    source: "rainbowplantlife",
  },
  "dal-rice-vegetables": {
    imageUrl:
      "https://rainbowplantlife.com/wp-content/uploads/2024/05/Dal-Palak-cover-photo-1-of-1.jpg",
    source: "rainbowplantlife",
  },
  "rajma-chawal": {
    imageUrl:
      "https://indishious.com/_astro/55ad7308-9f71-4041-98a3-3e1f3d5dcdce_rajma-chawal_NyYYs.jpeg",
    source: "indishious",
  },
  rajma: {
    imageUrl:
      "https://indishious.com/_astro/55ad7308-9f71-4041-98a3-3e1f3d5dcdce_rajma-chawal_NyYYs.jpeg",
    source: "indishious",
  },
  "rajma-curry": {
    imageUrl:
      "https://indishious.com/_astro/55ad7308-9f71-4041-98a3-3e1f3d5dcdce_rajma-chawal_NyYYs.jpeg",
    source: "indishious",
  },
  "chole-bhature": {
    imageUrl: u("1603894584373-5ac82b2ae398"),
    source: "unsplash-200",
  },
  "masala-dosa": {
    imageUrl:
      "https://vismaifood.com/storage/app/uploads/public/8b4/19e/427/thumb__1200_0_0_0_auto.jpg",
    source: "vismaifood",
  },
  "mysore-masala-dosa": {
    imageUrl:
      "https://vismaifood.com/storage/app/uploads/public/8b4/19e/427/thumb__1200_0_0_0_auto.jpg",
    source: "vismaifood",
  },
  dosa: {
    imageUrl:
      "https://vismaifood.com/storage/app/uploads/public/8b4/19e/427/thumb__1200_0_0_0_auto.jpg",
    source: "vismaifood",
  },
  "idli-sambar": {
    imageUrl:
      "https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto/InstamartAssets/Receipes/sambhar_idli.webp",
    source: "instamart",
  },
  "sambar-idli": {
    imageUrl:
      "https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto/InstamartAssets/Receipes/sambhar_idli.webp",
    source: "instamart",
  },
  "aloo-paratha": {
    imageUrl:
      "https://scontent-bom5-1.cdninstagram.com/v/t51.75761-15/500531496_18057623354211166_6364767047416642948_n.jpg?stp=cmp1_dst-jpg_e35_s640x640_tt6&_nc_cat=109&ccb=7-5&_nc_sid=18de74&efg=eyJlZmdfdGFnIjoiQ0xJUFMuYmVzdF9pbWFnZV91cmxnZW4uQzMifQ%3D%3D&_nc_ohc=oEnF_2wNhQsQ7kNvwGCop9A&_nc_oc=AdpOA1qWgYl9BRVMxeSTyqJ4tvLv2kkEMLyICrQ6SIMVPTDdLka4Xejwp-ebV0fLmC4&_nc_zt=23&_nc_ht=scontent-bom5-1.cdninstagram.com&_nc_gid=12PyBO5AA1W-XUF3IHg2Ig&_nc_ss=7ba02&oh=00_AQO5MAZH4Pqq0EeKxOhSE7ccu4cLXvYGC3OTHiZ7QBMehQ&oe=6AC86A87",
    source: "instagram",
  },
  "pav-bhaji": {
    imageUrl:
      "https://www.cubesnjuliennes.com/wp-content/uploads/2020/07/Instant-Pot-Mumbai-Pav-Bhaji.jpg",
    source: "cubesnjuliennes",
  },
  pavbhaji: {
    imageUrl:
      "https://www.cubesnjuliennes.com/wp-content/uploads/2020/07/Instant-Pot-Mumbai-Pav-Bhaji.jpg",
    source: "cubesnjuliennes",
  },
  samosa: { imageUrl: u("1601050690597-df0568f70950"), source: "unsplash-200" },
  "vada-pav": {
    imageUrl:
      "https://www.cookwithmanali.com/wp-content/uploads/2018/04/Vada-Pav-500x500.jpg",
    source: "cookwithmanali",
  },
  vadapav: {
    imageUrl:
      "https://www.cookwithmanali.com/wp-content/uploads/2018/04/Vada-Pav-500x500.jpg",
    source: "cookwithmanali",
  },
  khichdi: {
    imageUrl:
      "https://pickyeaterblog.com/wp-content/uploads/2021/03/Indian-Fried-Rice-Khichdi-Final-2.jpg",
    source: "pickyeaterblog",
  },
  "moong-dal-khichdi": {
    imageUrl:
      "https://pickyeaterblog.com/wp-content/uploads/2021/03/Indian-Fried-Rice-Khichdi-Final-2.jpg",
    source: "pickyeaterblog",
  },
  "dal-khichdi": {
    imageUrl:
      "https://pickyeaterblog.com/wp-content/uploads/2021/03/Indian-Fried-Rice-Khichdi-Final-2.jpg",
    source: "pickyeaterblog",
  },
  "khichdi-curd": {
    imageUrl:
      "https://pickyeaterblog.com/wp-content/uploads/2021/03/Indian-Fried-Rice-Khichdi-Final-2.jpg",
    source: "pickyeaterblog",
  },
  upma: {
    imageUrl:
      "https://rakskitchen.net/wp-content/uploads/2013/02/8423565854_3a8c072331_z.jpg",
    source: "rakskitchen",
  },
  "rava-upma": {
    imageUrl:
      "https://rakskitchen.net/wp-content/uploads/2013/02/8423565854_3a8c072331_z.jpg",
    source: "rakskitchen",
  },
  "sooji-upma": {
    imageUrl:
      "https://rakskitchen.net/wp-content/uploads/2013/02/8423565854_3a8c072331_z.jpg",
    source: "rakskitchen",
  },
  poha: {
    imageUrl:
      "https://www.jcookingodyssey.com/wp-content/uploads/2024/11/gujarati-bateta-poha.jpg",
    source: "jcookingodyssey",
  },
  "batata-poha": {
    imageUrl:
      "https://www.jcookingodyssey.com/wp-content/uploads/2024/11/gujarati-bateta-poha.jpg",
    source: "jcookingodyssey",
  },
  "kanda-poha": {
    imageUrl:
      "https://www.jcookingodyssey.com/wp-content/uploads/2024/11/gujarati-bateta-poha.jpg",
    source: "jcookingodyssey",
  },
  "aloo-poha": {
    imageUrl:
      "https://www.jcookingodyssey.com/wp-content/uploads/2024/11/gujarati-bateta-poha.jpg",
    source: "jcookingodyssey",
  },
  "poha-peanuts": {
    imageUrl:
      "https://www.jcookingodyssey.com/wp-content/uploads/2024/11/gujarati-bateta-poha.jpg",
    source: "jcookingodyssey",
  },
  "gulab-jamun": {
    imageUrl: u("1578985545062-69928b1d9587"),
    source: "unsplash-200",
  },
  "pani-puri": {
    imageUrl:
      "https://cdn1.foodviva.com/static-content/food-images/snacks-recipes/pani-puri/pani-puri.jpg",
    source: "foodviva",
  },

  // ── Breads & staples ──────────────────────────────────────────────────────
  roti: {
    imageUrl:
      "https://tandoormorni.com/wp-content/uploads/2026/08/tandoori-roti-hero-plated.jpg",
    source: "tandoormorni",
  },
  chappati: {
    imageUrl:
      "https://tandoormorni.com/wp-content/uploads/2026/08/tandoori-roti-hero-plated.jpg",
    source: "tandoormorni",
  },
  chapati: {
    imageUrl:
      "https://tandoormorni.com/wp-content/uploads/2026/08/tandoori-roti-hero-plated.jpg",
    source: "tandoormorni",
  },
  "tandoori-roti": {
    imageUrl:
      "https://tandoormorni.com/wp-content/uploads/2026/08/tandoori-roti-hero-plated.jpg",
    source: "tandoormorni",
  },
  phulka: {
    imageUrl:
      "https://tandoormorni.com/wp-content/uploads/2026/08/tandoori-roti-hero-plated.jpg",
    source: "tandoormorni",
  },
  chapathi: {
    imageUrl:
      "https://tandoormorni.com/wp-content/uploads/2026/08/tandoori-roti-hero-plated.jpg",
    source: "tandoormorni",
  },
  rotis: {
    imageUrl:
      "https://tandoormorni.com/wp-content/uploads/2026/08/tandoori-roti-hero-plated.jpg",
    source: "tandoormorni",
  },
  naan: {
    imageUrl:
      "https://www.allrecipes.com/thmb/RCYfM95dJnmSmQMsvJxC_J_UFAQ=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/270860-garlic-naan-VAT-Beauty-2x1-4595c25d402c40969b3833ba43c99950.jpg",
    source: "allrecipes",
  },
  "butter-naan": {
    imageUrl:
      "https://www.allrecipes.com/thmb/RCYfM95dJnmSmQMsvJxC_J_UFAQ=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/270860-garlic-naan-VAT-Beauty-2x1-4595c25d402c40969b3833ba43c99950.jpg",
    source: "allrecipes",
  },
  "garlic-naan": {
    imageUrl:
      "https://www.allrecipes.com/thmb/RCYfM95dJnmSmQMsvJxC_J_UFAQ=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/270860-garlic-naan-VAT-Beauty-2x1-4595c25d402c40969b3833ba43c99950.jpg",
    source: "allrecipes",
  },
  "tandoori-naan": {
    imageUrl:
      "https://www.allrecipes.com/thmb/RCYfM95dJnmSmQMsvJxC_J_UFAQ=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/270860-garlic-naan-VAT-Beauty-2x1-4595c25d402c40969b3833ba43c99950.jpg",
    source: "allrecipes",
  },
  "cheese-naan": {
    imageUrl:
      "https://www.allrecipes.com/thmb/RCYfM95dJnmSmQMsvJxC_J_UFAQ=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/270860-garlic-naan-VAT-Beauty-2x1-4595c25d402c40969b3833ba43c99950.jpg",
    source: "allrecipes",
  },
  "plain-rice": {
    imageUrl:
      "https://bitesofindiaevan.com/wp-content/uploads/2024/11/Plain-Rice.png",
    source: "bitesofindia",
  },
  chawal: {
    imageUrl:
      "https://bitesofindiaevan.com/wp-content/uploads/2024/11/Plain-Rice.png",
    source: "bitesofindia",
  },
  "white-rice": {
    imageUrl:
      "https://bitesofindiaevan.com/wp-content/uploads/2024/11/Plain-Rice.png",
    source: "bitesofindia",
  },
  "steamed-rice": {
    imageUrl:
      "https://bitesofindiaevan.com/wp-content/uploads/2024/11/Plain-Rice.png",
    source: "bitesofindia",
  },
  "boiled-rice": {
    imageUrl:
      "https://bitesofindiaevan.com/wp-content/uploads/2024/11/Plain-Rice.png",
    source: "bitesofindia",
  },
  "brown-rice": {
    imageUrl:
      "https://img.etimg.com/thumb/msid-120284885,width-650,height-488,imgsize-242102,resizemode-75/brown-rice.jpg",
    source: "economictimes",
  },
  "fried-rice": {
    imageUrl: u("1603133872878-684f208fb84b"),
    source: "unsplash-200",
  },
  rice: {
    imageUrl:
      "https://bitesofindiaevan.com/wp-content/uploads/2024/11/Plain-Rice.png",
    source: "bitesofindia",
  },

  // ── Eggs & breakfast ──────────────────────────────────────────────────────
  "2-eggs-2-rotis": {
    imageUrl: u("1482049016688-2d3e1b311543"),
    source: "db-existing",
  },
  omelette: {
    imageUrl:
      "https://shivanilovesfood.com/wp-content/uploads/2025/02/Masala-Omelette-4.jpg",
    source: "shivanilovesfood",
  },
  omelet: {
    imageUrl:
      "https://shivanilovesfood.com/wp-content/uploads/2025/02/Masala-Omelette-4.jpg",
    source: "shivanilovesfood",
  },
  "masala-omelette": {
    imageUrl:
      "https://shivanilovesfood.com/wp-content/uploads/2025/02/Masala-Omelette-4.jpg",
    source: "shivanilovesfood",
  },
  "egg-omelette": {
    imageUrl:
      "https://shivanilovesfood.com/wp-content/uploads/2025/02/Masala-Omelette-4.jpg",
    source: "shivanilovesfood",
  },
  "cheese-omelette": {
    imageUrl:
      "https://shivanilovesfood.com/wp-content/uploads/2025/02/Masala-Omelette-4.jpg",
    source: "shivanilovesfood",
  },
  "boiled-egg": {
    imageUrl: u("1482049016688-2d3e1b311543"),
    source: "unsplash-200",
  },
  egg: { imageUrl: u("1482049016688-2d3e1b311543"), source: "unsplash-200" },
  eggs: { imageUrl: u("1482049016688-2d3e1b311543"), source: "unsplash-200" },
  pancakes: {
    imageUrl: u("1567620905732-2d1ec7ab7445"),
    source: "unsplash-200",
  },
  waffles: {
    imageUrl: u("1567620905732-2d1ec7ab7445"),
    source: "unsplash-200",
  },
  "avocado-toast": {
    imageUrl: u("1525351484163-7529414344d8"),
    source: "unsplash-200",
  },
  oatmeal: {
    imageUrl: u("1495214783159-3503fd1b572d"),
    source: "unsplash-200",
  },
  "cornflakes-with-milk": {
    imageUrl: u("1495214783159-3503fd1b572d"),
    source: "unsplash-200",
  },
  "granola-with-yogurt": {
    imageUrl: u("1495214783159-3503fd1b572d"),
    source: "unsplash-200",
  },
  "bread-butter": {
    imageUrl: u("1525351484163-7529414344d8"),
    source: "unsplash-200",
  },
  croissant: {
    imageUrl: u("1567620905732-2d1ec7ab7445"),
    source: "unsplash-200",
  },
  "bagel-with-cream-cheese": {
    imageUrl: u("1525351484163-7529414344d8"),
    source: "unsplash-200",
  },

  // ── Fruits & veg ──────────────────────────────────────────────────────────
  banana: {
    imageUrl: u("1571771894821-ce9b6c11b08e"),
    source: "nutrisense-existing",
  },
  apple: { imageUrl: u("1560806887-1e4cd0b6cbd6"), source: "unsplash-200" },
  orange: { imageUrl: u("1580052614034-c55d20bfee3b"), source: "unsplash-200" },
  mango: { imageUrl: u("1601493700631-2b16ec4b4716"), source: "unsplash-200" },
  grapes: { imageUrl: u("1537640538966-79f369143f8f"), source: "unsplash-200" },
  watermelon: {
    imageUrl: u("1589533610925-1cffc309ebaa"),
    source: "unsplash-200",
  },
  strawberries: {
    imageUrl: u("1587393855524-087f83d95bc9"),
    source: "unsplash-200",
  },
  cucumber: {
    imageUrl: u("1449300079323-02e209d9d3a6"),
    source: "unsplash-200",
  },
  "cucumber-raw": {
    imageUrl: u("1449300079323-02e209d9d3a6"),
    source: "unsplash-200",
  },
  "cucumber-with-peel-raw": {
    imageUrl: u("1449300079323-02e209d9d3a6"),
    source: "unsplash-200",
  },
  "usda-168409": {
    imageUrl: u("1449300079323-02e209d9d3a6"),
    source: "unsplash-200",
  },
  papaya: { imageUrl: u("1601493700631-2b16ec4b4716"), source: "unsplash-200" },
  pineapple: { imageUrl: u("1550258987-190a2d41a8ba"), source: "unsplash-200" },
  avocado: {
    imageUrl: u("1525351484163-7529414344d8"),
    source: "unsplash-200",
  },
  broccoli: {
    imageUrl: u("1459411621453-7b03977f4bfc"),
    source: "unsplash-200",
  },
  "sweet-potato": {
    imageUrl: u("1603894584373-5ac82b2ae398"),
    source: "unsplash-200",
  },
  "boiled-potato": {
    imageUrl: u("1603894584373-5ac82b2ae398"),
    source: "unsplash-200",
  },

  // ── Proteins & dairy ──────────────────────────────────────────────────────
  "grilled-chicken-breast": {
    imageUrl: u("1598515214211-89d3c73ae83b"),
    source: "unsplash-200",
  },
  chicken: {
    imageUrl: u("1598515214211-89d3c73ae83b"),
    source: "unsplash-200",
  },
  paneer: { imageUrl: u("1631452180519-c014fe946bc7"), source: "unsplash-200" },
  "greek-yogurt": {
    imageUrl: u("1488477181946-6428a0291777"),
    source: "unsplash-200",
  },
  "greek-yogurt-fruit": {
    imageUrl: u("1488477181946-6428a0291777"),
    source: "nutrisense-existing",
  },
  milk: { imageUrl: u("1488477181946-6428a0291777"), source: "unsplash-200" },
  "protein-shake": {
    imageUrl: u("1488477181946-6428a0291777"),
    source: "unsplash-200",
  },
  "peanut-butter": {
    imageUrl: u("1525351484163-7529414344d8"),
    source: "unsplash-200",
  },
  almonds: {
    imageUrl: u("1616684000067-36952fde56ec"),
    source: "unsplash-200",
  },
  tofu: { imageUrl: u("1546069901-ba9599a7e63c"), source: "unsplash-200" },
  "curd-dahi": {
    imageUrl: u("1488477181946-6428a0291777"),
    source: "unsplash-200",
  },

  // ── Fast food & pizza ─────────────────────────────────────────────────────
  "margherita-pizza": {
    imageUrl: u("1574071318508-1cdbab80d002"),
    source: "unsplash-200",
  },
  "pepperoni-pizza": {
    imageUrl: u("1565299624946-b28f40a0ae38"),
    source: "unsplash-200",
  },
  "veggie-pizza": {
    imageUrl: u("1574071318508-1cdbab80d002"),
    source: "unsplash-200",
  },
  pizza: { imageUrl: u("1574071318508-1cdbab80d002"), source: "unsplash-200" },
  "chicken-burger": {
    imageUrl: u("1568901346375-23c9450c58cd"),
    source: "unsplash-200",
  },
  cheeseburger: {
    imageUrl: u("1568901346375-23c9450c58cd"),
    source: "unsplash-200",
  },
  "veg-burger": {
    imageUrl: u("1568901346375-23c9450c58cd"),
    source: "unsplash-200",
  },
  "french-fries": {
    imageUrl: u("1601050690597-df0568f70950"),
    source: "unsplash-200",
  },
  "hot-dog": {
    imageUrl: u("1568901346375-23c9450c58cd"),
    source: "unsplash-200",
  },
  "fried-chicken": {
    imageUrl: u("1598515214211-89d3c73ae83b"),
    source: "unsplash-200",
  },
  "chicken-wrap": {
    imageUrl: u("1626700051175-6818013e1d4f"),
    source: "nutrisense-existing",
  },
  "club-sandwich": {
    imageUrl: u("1565299585323-38d6b0865b47"),
    source: "unsplash-200",
  },
  "grilled-cheese-sandwich": {
    imageUrl: u("1525351484163-7529414344d8"),
    source: "unsplash-200",
  },

  // ── Pasta & noodles ───────────────────────────────────────────────────────
  "spaghetti-bolognese": {
    imageUrl: u("1603133872878-684f208fb84b"),
    source: "unsplash-200",
  },
  "pasta-alfredo": {
    imageUrl:
      "https://girlwiththeironcast.com/wp-content/uploads/2022/04/blackened-chicken-alfredo-9.jpg",
    source: "girlwiththeironcast",
  },
  "chicken-alfredo-pasta": {
    imageUrl:
      "https://girlwiththeironcast.com/wp-content/uploads/2022/04/blackened-chicken-alfredo-9.jpg",
    source: "girlwiththeironcast",
  },
  "alfredo-chicken-pasta": {
    imageUrl:
      "https://girlwiththeironcast.com/wp-content/uploads/2022/04/blackened-chicken-alfredo-9.jpg",
    source: "girlwiththeironcast",
  },
  "chicken-alfredo": {
    imageUrl:
      "https://girlwiththeironcast.com/wp-content/uploads/2022/04/blackened-chicken-alfredo-9.jpg",
    source: "girlwiththeironcast",
  },
  "mac-and-cheese": {
    imageUrl: u("1603133872878-684f208fb84b"),
    source: "unsplash-200",
  },
  lasagna: {
    imageUrl: u("1603133872878-684f208fb84b"),
    source: "unsplash-200",
  },
  noodles: {
    imageUrl:
      "https://www.seriouseats.com/thmb/hmLAHsyg1riGn2Iy6u0slpXppxM=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20260707-SEA-SpicySourNoodles-CaleyEllenburg-HERO-f780cb9174fd4a278a9441030ed82480.jpg",
    source: "seriouseats",
  },
  noodle: {
    imageUrl:
      "https://www.seriouseats.com/thmb/hmLAHsyg1riGn2Iy6u0slpXppxM=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20260707-SEA-SpicySourNoodles-CaleyEllenburg-HERO-f780cb9174fd4a278a9441030ed82480.jpg",
    source: "seriouseats",
  },
  "veg-hakka-noodles": {
    imageUrl:
      "https://www.seriouseats.com/thmb/hmLAHsyg1riGn2Iy6u0slpXppxM=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20260707-SEA-SpicySourNoodles-CaleyEllenburg-HERO-f780cb9174fd4a278a9441030ed82480.jpg",
    source: "seriouseats",
  },
  "hakka-noodles": {
    imageUrl:
      "https://www.seriouseats.com/thmb/hmLAHsyg1riGn2Iy6u0slpXppxM=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20260707-SEA-SpicySourNoodles-CaleyEllenburg-HERO-f780cb9174fd4a278a9441030ed82480.jpg",
    source: "seriouseats",
  },
  "chicken-noodle-soup": {
    imageUrl:
      "https://www.seriouseats.com/thmb/hmLAHsyg1riGn2Iy6u0slpXppxM=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20260707-SEA-SpicySourNoodles-CaleyEllenburg-HERO-f780cb9174fd4a278a9441030ed82480.jpg",
    source: "seriouseats",
  },
  "spicy-sour-noodles": {
    imageUrl:
      "https://www.seriouseats.com/thmb/hmLAHsyg1riGn2Iy6u0slpXppxM=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20260707-SEA-SpicySourNoodles-CaleyEllenburg-HERO-f780cb9174fd4a278a9441030ed82480.jpg",
    source: "seriouseats",
  },
  "schezwan-noodles": {
    imageUrl:
      "https://www.seriouseats.com/thmb/hmLAHsyg1riGn2Iy6u0slpXppxM=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20260707-SEA-SpicySourNoodles-CaleyEllenburg-HERO-f780cb9174fd4a278a9441030ed82480.jpg",
    source: "seriouseats",
  },
  chowmein: {
    imageUrl:
      "https://www.seriouseats.com/thmb/hmLAHsyg1riGn2Iy6u0slpXppxM=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20260707-SEA-SpicySourNoodles-CaleyEllenburg-HERO-f780cb9174fd4a278a9441030ed82480.jpg",
    source: "seriouseats",
  },
  ramen: {
    imageUrl:
      "https://peasandcrayons.com/wp-content/uploads/2020/04/spicy-vegetarian-ramen-recipe-3.jpg",
    source: "peasandcrayons",
  },
  "veg-ramen": {
    imageUrl:
      "https://peasandcrayons.com/wp-content/uploads/2020/04/spicy-vegetarian-ramen-recipe-3.jpg",
    source: "peasandcrayons",
  },
  "vegetarian-ramen": {
    imageUrl:
      "https://peasandcrayons.com/wp-content/uploads/2020/04/spicy-vegetarian-ramen-recipe-3.jpg",
    source: "peasandcrayons",
  },
  "spicy-ramen": {
    imageUrl:
      "https://peasandcrayons.com/wp-content/uploads/2020/04/spicy-vegetarian-ramen-recipe-3.jpg",
    source: "peasandcrayons",
  },

  // ── Salads ────────────────────────────────────────────────────────────────
  "caesar-salad": {
    imageUrl: u("1546069901-ba9599a7e63c"),
    source: "unsplash-200",
  },
  "greek-salad": {
    imageUrl: u("1546069901-ba9599a7e63c"),
    source: "unsplash-200",
  },
  "grilled-chicken-salad": {
    imageUrl: u("1546069901-ba9599a7e63c"),
    source: "unsplash-200",
  },

  // ── World / fusion ────────────────────────────────────────────────────────
  steak: { imageUrl: u("1598515214211-89d3c73ae83b"), source: "unsplash-200" },
  "grilled-salmon": {
    imageUrl: u("1598515214211-89d3c73ae83b"),
    source: "unsplash-200",
  },
  "fish-and-chips": {
    imageUrl: u("1598515214211-89d3c73ae83b"),
    source: "unsplash-200",
  },
  "sushi-roll": {
    imageUrl: u("1546069901-ba9599a7e63c"),
    source: "unsplash-200",
  },
  tacos: { imageUrl: u("1565299585323-38d6b0865b47"), source: "unsplash-200" },
  burrito: {
    imageUrl: u("1565299585323-38d6b0865b47"),
    source: "unsplash-200",
  },
  "nachos-with-cheese": {
    imageUrl: u("1565299585323-38d6b0865b47"),
    source: "unsplash-200",
  },
  "spring-rolls": {
    imageUrl: u("1601050690597-df0568f70950"),
    source: "unsplash-200",
  },
  "chicken-momos": {
    imageUrl: "https://www.pillsbury.in/wp-content/uploads/2023/11/Recipe.jpg",
    source: "pillsbury",
  },
  "veg-momos": {
    imageUrl: "https://www.pillsbury.in/wp-content/uploads/2023/11/Recipe.jpg",
    source: "pillsbury",
  },
  momos: {
    imageUrl: "https://www.pillsbury.in/wp-content/uploads/2023/11/Recipe.jpg",
    source: "pillsbury",
  },
  momo: {
    imageUrl: "https://www.pillsbury.in/wp-content/uploads/2023/11/Recipe.jpg",
    source: "pillsbury",
  },
  "steamed-momos": {
    imageUrl: "https://www.pillsbury.in/wp-content/uploads/2023/11/Recipe.jpg",
    source: "pillsbury",
  },
  "fried-momos": {
    imageUrl: "https://www.pillsbury.in/wp-content/uploads/2023/11/Recipe.jpg",
    source: "pillsbury",
  },
  "paneer-momos": {
    imageUrl: "https://www.pillsbury.in/wp-content/uploads/2023/11/Recipe.jpg",
    source: "pillsbury",
  },
  manchurian: {
    imageUrl: u("1603133872878-684f208fb84b"),
    source: "unsplash-200",
  },

  // ── Snacks & sweets ───────────────────────────────────────────────────────
  "potato-chips": {
    imageUrl: u("1505686994434-e3cc5abf1330"),
    source: "unsplash-200",
  },
  popcorn: {
    imageUrl: u("1505686994434-e3cc5abf1330"),
    source: "unsplash-200",
  },
  "chocolate-bar": {
    imageUrl: u("1578985545062-69928b1d9587"),
    source: "unsplash-200",
  },
  "chocolate-chip-cookie": {
    imageUrl: u("1551024601-bec78aea704b"),
    source: "unsplash-200",
  },
  "ice-cream": {
    imageUrl: u("1497034825429-c343d7c6a68f"),
    source: "unsplash-200",
  },
  "chocolate-cake": {
    imageUrl: u("1578985545062-69928b1d9587"),
    source: "unsplash-200",
  },
  donut: { imageUrl: u("1551024601-bec78aea704b"), source: "unsplash-200" },

  // ── Drinks ────────────────────────────────────────────────────────────────
  "masala-chai": {
    imageUrl: u("1561336313-0bd5e0b27ec8"),
    source: "unsplash-200",
  },
  "coffee-with-milk": {
    imageUrl: u("1497515114629-f71d768fd07c"),
    source: "unsplash-200",
  },
  cappuccino: {
    imageUrl: u("1497515114629-f71d768fd07c"),
    source: "unsplash-200",
  },
  cola: { imageUrl: u("1561336313-0bd5e0b27ec8"), source: "unsplash-200" },
  "orange-juice": {
    imageUrl: u("1580052614034-c55d20bfee3b"),
    source: "unsplash-200",
  },
  "mango-lassi": {
    imageUrl: u("1488477181946-6428a0291777"),
    source: "unsplash-200",
  },
  "banana-smoothie": {
    imageUrl: u("1488477181946-6428a0291777"),
    source: "unsplash-200",
  },
}

export const toSlug = (s: string) =>
  s.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

export function resolveFoodImage(food: {
  food_id?: number | null
  slug?: string | null
  name?: string | null
  image_url?: string | null
}): string | undefined {
  // 1. Direct slug match in verified catalog
  if (food.slug && FOOD_IMAGES_BY_SLUG[food.slug]) {
    return FOOD_IMAGES_BY_SLUG[food.slug].imageUrl
  }
  // 2. Slug derived from food name
  if (food.name) {
    const s = toSlug(food.name)
    if (FOOD_IMAGES_BY_SLUG[s]) {
      return FOOD_IMAGES_BY_SLUG[s].imageUrl
    }
    // Check primary word before comma (e.g., "Cucumber, Raw" -> "cucumber")
    const primary = toSlug(food.name.split(",")[0].trim())
    if (primary && FOOD_IMAGES_BY_SLUG[primary]) {
      return FOOD_IMAGES_BY_SLUG[primary].imageUrl
    }
  }
  // 3. FDC ID match if applicable
  if (food.food_id) {
    const fdcKey = `usda-${food.food_id}`
    if (FOOD_IMAGES_BY_SLUG[fdcKey]) {
      return FOOD_IMAGES_BY_SLUG[fdcKey].imageUrl
    }
  }

  // 4. Category / keyword matching for canonical food types
  const query = `${food.slug || ""} ${food.name || ""}`.toLowerCase()
  if (/\bmomo(s)?\b/i.test(query)) return FOOD_IMAGES_BY_SLUG["momos"]?.imageUrl
  if (/\bbrown[\s-]?rice\b/i.test(query))
    return FOOD_IMAGES_BY_SLUG["brown-rice"]?.imageUrl
  if (/\bchicken[\s-]?rice[\s-]?bowl\b/i.test(query))
    return FOOD_IMAGES_BY_SLUG["chicken-rice-bowl"]?.imageUrl
  if (/\bchicken[\s-]?curry(\s*\+\s*|\s+and\s+|\s+)rice\b/i.test(query))
    return FOOD_IMAGES_BY_SLUG["chicken-curry-rice"]?.imageUrl
  if (/\b(chawal|(plain|steamed|white|boiled)?[\s-]?rice)\b/i.test(query))
    return FOOD_IMAGES_BY_SLUG["plain-rice"]?.imageUrl
  if (/\bchicken[\s-]?curry\b/i.test(query))
    return FOOD_IMAGES_BY_SLUG["chicken-curry"]?.imageUrl
  if (/\bvada[\s-]?pav\b/i.test(query))
    return FOOD_IMAGES_BY_SLUG["vada-pav"]?.imageUrl
  if (/\b(roti|chappati|chapati|phulka)s?\b/i.test(query))
    return FOOD_IMAGES_BY_SLUG["roti"]?.imageUrl
  if (/\b(naan|kulcha)\b/i.test(query))
    return FOOD_IMAGES_BY_SLUG["naan"]?.imageUrl
  if (/\bramen\b/i.test(query)) return FOOD_IMAGES_BY_SLUG["ramen"]?.imageUrl
  if (/\bupma\b/i.test(query)) return FOOD_IMAGES_BY_SLUG["upma"]?.imageUrl
  if (/\bpoha\b/i.test(query)) return FOOD_IMAGES_BY_SLUG["poha"]?.imageUrl
  if (/\b(khichdi|khichri)\b/i.test(query))
    return FOOD_IMAGES_BY_SLUG["khichdi"]?.imageUrl
  if (/\b(dal|daal|dhal)\b/i.test(query))
    return FOOD_IMAGES_BY_SLUG["dal"]?.imageUrl
  if (/\bpav[\s-]?bhaji\b/i.test(query))
    return FOOD_IMAGES_BY_SLUG["pav-bhaji"]?.imageUrl
  if (/\brajma\b/i.test(query)) return FOOD_IMAGES_BY_SLUG["rajma"]?.imageUrl
  if (/\b(omelette|omelet)\b/i.test(query))
    return FOOD_IMAGES_BY_SLUG["omelette"]?.imageUrl
  if (/\b(noodle|noodles|chowmein|chow[\s-]?mein)\b/i.test(query))
    return FOOD_IMAGES_BY_SLUG["noodles"]?.imageUrl

  if (food.image_url && food.image_url.startsWith("http")) {
    return food.image_url
  }

  return undefined
}

export function getFoodImageForMeal(meal: {
  slug?: string | null
  name?: string | null
  food_id?: number | null
}) {
  return (
    resolveFoodImage({
      slug: meal.slug,
      name: meal.name,
      food_id: meal.food_id,
    }) || ""
  )
}

export const CANONICAL_FOOD_EMOJIS: Record<string, string> = {
  apple: "🍎",
  banana: "🍌",
  cucumber: "🥒",
  "cucumber-raw": "🥒",
  "cucumber-with-peel-raw": "🥒",
  "usda-168409": "🥒",
  "margherita-pizza": "🍕",
  "pepperoni-pizza": "🍕",
  "veggie-pizza": "🍕",
  pizza: "🍕",
  chicken: "🍗",
  "chicken-biryani": "🍗",
  "hyderabadi-chicken-biryani": "🍗",
  "chicken-tikka": "🍗",
  "butter-chicken": "🍗",
  "chicken-curry": "🍗",
  "grilled-chicken-breast": "🍗",
  "fried-chicken": "🍗",
  "chicken-wrap": "🌯",
  "chicken-burger": "🍔",
  "mutton-biryani": "🍛",
  "veg-biryani": "🍛",
  paneer: "🧀",
  "paneer-butter-masala": "🧀",
  "palak-paneer": "🧀",
  "chilli-paneer": "🧀",
  "paneer-roti": "🧀",
  "paneer-rice-bowl": "🧀",
  "boiled-egg": "🥚",
  egg: "🥚",
  eggs: "🥚",
  omelette: "🍳",
  "2-eggs-2-rotis": "🍳",
  "plain-rice": "🍚",
  "brown-rice": "🍚",
  "fried-rice": "🍚",
  rice: "🍚",
  orange: "🍊",
  mango: "🥭",
  grapes: "🍇",
  watermelon: "🍉",
  strawberries: "🍓",
  strawberry: "🍓",
  papaya: "🍈",
  pineapple: "🍍",
  avocado: "🥑",
  broccoli: "🥦",
  "sweet-potato": "🥔",
  "boiled-potato": "🥔",
  potato: "🥔",
  tomato: "🍅",
  carrot: "🥕",
  onion: "🧅",
  corn: "🌽",
  spinach: "🥬",
  brinjal: "🍆",
  eggplant: "🍆",
  "usda-169228": "🍆",
  "dal-tadka": "🍲",
  "rajma-chawal": "🍛",
  "chole-bhature": "🍛",
  "masala-dosa": "🥞",
  dosa: "🥞",
  "idli-sambar": "🍚",
  "sambar-idli": "🍚",
  "aloo-paratha": "🫓",
  roti: "🫓",
  naan: "🫓",
  "pav-bhaji": "🍛",
  samosa: "🥟",
  "vada-pav": "🍔",
  khichdi: "🍲",
  upma: "🥣",
  poha: "🍚",
  pancakes: "🥞",
  waffles: "🧇",
  "avocado-toast": "🥑",
  oatmeal: "🥣",
  "cornflakes-with-milk": "🥣",
  "granola-with-yogurt": "🥣",
  "greek-yogurt": "🥛",
  "greek-yogurt-fruit": "🥛",
  milk: "🥛",
  "curd-dahi": "🥛",
  "protein-shake": "🥤",
  "peanut-butter": "🥜",
  almonds: "🌰",
  tofu: "🧈",
  cheeseburger: "🍔",
  "veg-burger": "🍔",
  "french-fries": "🍟",
  "caesar-salad": "🥗",
  "greek-salad": "🥗",
  "grilled-chicken-salad": "🥗",
  salad: "🥗",
  "coffee-with-milk": "☕",
  cappuccino: "☕",
  "masala-chai": "☕",
  "orange-juice": "🧃",
}

/**
 * Deterministic canonical emoji resolver based on food identity (slug/name).
 * Never returns an arbitrary slot icon or unrelated food emoji.
 */
export function getFoodEmoji(item: {
  slug?: string | null
  name?: string | null
  slot?: string | null
}): string {
  const slugKey = item.slug ? toSlug(item.slug) : ""
  if (slugKey && CANONICAL_FOOD_EMOJIS[slugKey]) {
    return CANONICAL_FOOD_EMOJIS[slugKey]
  }

  const name = (item.name || "").trim().toLowerCase()
  if (!name) return "🍽️"

  const nameSlug = toSlug(name)
  if (CANONICAL_FOOD_EMOJIS[nameSlug]) {
    return CANONICAL_FOOD_EMOJIS[nameSlug]
  }

  const primarySlug = toSlug(name.split(",")[0].trim())
  if (primarySlug && CANONICAL_FOOD_EMOJIS[primarySlug]) {
    return CANONICAL_FOOD_EMOJIS[primarySlug]
  }

  // Deterministic keyword matching on word boundaries
  if (/\bcucumber\b/i.test(name)) return "🥒"
  if (/\bapple\b/i.test(name)) return "🍎"
  if (/\bbanana\b/i.test(name)) return "🍌"
  if (/\bpizza\b/i.test(name)) return "🍕"
  if (/\bchicken\b/i.test(name)) return "🍗"
  if (/\bpaneer\b/i.test(name)) return "🧀"
  if (/\b(egg|eggs|omelette)\b/i.test(name)) return "🥚"
  if (/\brice\b/i.test(name)) return "🍚"
  if (/\bbiryani\b/i.test(name)) return "🍛"
  if (/\b(strawberry|strawberries)\b/i.test(name)) return "🍓"
  if (/\bwatermelon\b/i.test(name)) return "🍉"
  if (/\borange\b/i.test(name)) return "🍊"
  if (/\bmango\b/i.test(name)) return "🥭"
  if (/\bgrape(s)?\b/i.test(name)) return "🍇"
  if (/\b(brinjal|eggplant|aubergine)\b/i.test(name)) return "🍆"
  if (/\btomato\b/i.test(name)) return "🍅"
  if (/\bcarrot\b/i.test(name)) return "🥕"
  if (/\b(spinach|palak)\b/i.test(name)) return "🥬"
  if (/\bbroccoli\b/i.test(name)) return "🥦"
  if (/\b(potato|potatoes)\b/i.test(name)) return "🥔"
  if (/\bsalad\b/i.test(name)) return "🥗"
  if (/\bburger\b/i.test(name)) return "🍔"
  if (/\bsandwich\b/i.test(name)) return "🥪"
  if (/\b(pasta|spaghetti|macaroni|lasagna)\b/i.test(name)) return "🍝"
  if (/\b(noodle|noodles|ramen)\b/i.test(name)) return "🍜"
  if (/\b(soup)\b/i.test(name)) return "🍲"
  if (/\b(roti|naan|paratha|chapati)\b/i.test(name)) return "🫓"
  if (/\b(yogurt|curd|dahi|milk)\b/i.test(name)) return "🥛"
  if (/\b(oat|oats|oatmeal|cereal)\b/i.test(name)) return "🥣"
  if (/\b(tea|chai|coffee)\b/i.test(name)) return "☕"
  if (/\b(juice|shake|smoothie)\b/i.test(name)) return "🥤"
  if (/\b(fish|salmon)\b/i.test(name)) return "🐟"

  return "🍽️"
}
