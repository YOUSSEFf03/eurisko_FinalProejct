/**
 * Stock Seed Script
 * Run with: docker exec -it <mongodb-container> mongosh \
 *   "mongodb://root:root@localhost:27017/trading?authSource=admin" \
 *   /seed-stocks.js
 *
 * OR from host:
 *   mongosh "mongodb://root:root@localhost:27017/trading?authSource=admin" seed-stocks.js
 */

const stocks = [
  // ── Technology ──────────────────────────────────────────────────────────
  {
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    sector: 'Technology',
    currentPrice: 182.63,
    description:
      'Designs and manufactures consumer electronics, software, and services including iPhone, Mac, and App Store.',
  },
  {
    ticker: 'MSFT',
    companyName: 'Microsoft Corporation',
    sector: 'Technology',
    currentPrice: 378.85,
    description:
      'Develops and licenses software, cloud services, and devices including Windows, Azure, and Xbox.',
  },
  {
    ticker: 'GOOGL',
    companyName: 'Alphabet Inc.',
    sector: 'Technology',
    currentPrice: 140.93,
    description:
      "Parent company of Google, operating the world's largest search engine, YouTube, and Google Cloud.",
  },
  {
    ticker: 'META',
    companyName: 'Meta Platforms Inc.',
    sector: 'Technology',
    currentPrice: 474.99,
    description:
      'Operates Facebook, Instagram, WhatsApp, and invests in augmented and virtual reality.',
  },
  {
    ticker: 'NVDA',
    companyName: 'NVIDIA Corporation',
    sector: 'Technology',
    currentPrice: 875.35,
    description:
      'Designs GPUs for gaming, data centers, and AI workloads. Dominant in AI training infrastructure.',
  },
  {
    ticker: 'TSLA',
    companyName: 'Tesla Inc.',
    sector: 'Technology',
    currentPrice: 177.48,
    description:
      'Designs and manufactures electric vehicles, energy storage, and solar products.',
  },
  {
    ticker: 'AMZN',
    companyName: 'Amazon.com Inc.',
    sector: 'Technology',
    currentPrice: 178.25,
    description:
      'E-commerce, cloud computing (AWS), digital streaming, and artificial intelligence.',
  },
  {
    ticker: 'CRM',
    companyName: 'Salesforce Inc.',
    sector: 'Technology',
    currentPrice: 274.0,
    description:
      'Cloud-based CRM software and enterprise applications for sales, service, and marketing.',
  },
  {
    ticker: 'ORCL',
    companyName: 'Oracle Corporation',
    sector: 'Technology',
    currentPrice: 122.47,
    description:
      'Enterprise software and cloud services including databases, ERP, and cloud applications.',
  },
  {
    ticker: 'ADBE',
    companyName: 'Adobe Inc.',
    sector: 'Technology',
    currentPrice: 494.12,
    description:
      'Software products for content creation, digital marketing, and document management.',
  },
  {
    ticker: 'INTC',
    companyName: 'Intel Corporation',
    sector: 'Technology',
    currentPrice: 30.54,
    description:
      'Designs and manufactures semiconductors, processors, and chip technologies.',
  },
  {
    ticker: 'AMD',
    companyName: 'Advanced Micro Devices Inc.',
    sector: 'Technology',
    currentPrice: 164.33,
    description:
      'Designs CPUs, GPUs, and accelerators for gaming, data centers, and embedded systems.',
  },
  {
    ticker: 'QCOM',
    companyName: 'Qualcomm Inc.',
    sector: 'Technology',
    currentPrice: 148.25,
    description:
      'Designs semiconductor products and wireless technology for mobile devices and IoT.',
  },
  {
    ticker: 'NOW',
    companyName: 'ServiceNow Inc.',
    sector: 'Technology',
    currentPrice: 750.6,
    description:
      'Cloud platform for enterprise digital workflow automation and IT service management.',
  },
  {
    ticker: 'SNOW',
    companyName: 'Snowflake Inc.',
    sector: 'Technology',
    currentPrice: 147.8,
    description:
      'Cloud data platform enabling data storage, processing, and analytics at scale.',
  },

  // ── Finance ─────────────────────────────────────────────────────────────
  {
    ticker: 'JPM',
    companyName: 'JPMorgan Chase & Co.',
    sector: 'Finance',
    currentPrice: 196.5,
    description:
      'Global leader in financial services including investment banking, commercial banking, and asset management.',
  },
  {
    ticker: 'BAC',
    companyName: 'Bank of America Corporation',
    sector: 'Finance',
    currentPrice: 37.22,
    description:
      'Multinational investment bank and financial services corporation serving consumers and businesses worldwide.',
  },
  {
    ticker: 'GS',
    companyName: 'Goldman Sachs Group Inc.',
    sector: 'Finance',
    currentPrice: 421.75,
    description:
      'Global investment banking, securities, and investment management firm.',
  },
  {
    ticker: 'V',
    companyName: 'Visa Inc.',
    sector: 'Finance',
    currentPrice: 275.3,
    description:
      'Global payments technology company facilitating digital currency transfers worldwide.',
  },
  {
    ticker: 'MA',
    companyName: 'Mastercard Incorporated',
    sector: 'Finance',
    currentPrice: 463.9,
    description:
      'Technology company in the global payments industry connecting consumers, businesses, and governments.',
  },
  {
    ticker: 'AXP',
    companyName: 'American Express Company',
    sector: 'Finance',
    currentPrice: 229.4,
    description:
      'Global services company providing payment solutions, travel services, and financial products.',
  },
  {
    ticker: 'BLK',
    companyName: 'BlackRock Inc.',
    sector: 'Finance',
    currentPrice: 786.2,
    description:
      "World's largest asset manager providing investment management, risk advisory, and financial planning.",
  },
  {
    ticker: 'MS',
    companyName: 'Morgan Stanley',
    sector: 'Finance',
    currentPrice: 91.6,
    description:
      'Global financial services firm providing investment banking, securities, and wealth management.',
  },
  {
    ticker: 'PYPL',
    companyName: 'PayPal Holdings Inc.',
    sector: 'Finance',
    currentPrice: 62.4,
    description:
      'Digital payments platform enabling online money transfers and payments worldwide.',
  },
  {
    ticker: 'SQ',
    companyName: 'Block Inc.',
    sector: 'Finance',
    currentPrice: 68.75,
    description:
      'Technology company building tools for sellers, buyers, and the broader financial ecosystem.',
  },

  // ── Healthcare ───────────────────────────────────────────────────────────
  {
    ticker: 'JNJ',
    companyName: 'Johnson & Johnson',
    sector: 'Healthcare',
    currentPrice: 152.3,
    description:
      'Multinational corporation developing medical devices, pharmaceuticals, and consumer packaged goods.',
  },
  {
    ticker: 'UNH',
    companyName: 'UnitedHealth Group Inc.',
    sector: 'Healthcare',
    currentPrice: 521.8,
    description:
      'Diversified health care company offering benefits and services and health care products.',
  },
  {
    ticker: 'PFE',
    companyName: 'Pfizer Inc.',
    sector: 'Healthcare',
    currentPrice: 27.45,
    description:
      'Global biopharmaceutical company focused on discovering and developing medicines and vaccines.',
  },
  {
    ticker: 'ABBV',
    companyName: 'AbbVie Inc.',
    sector: 'Healthcare',
    currentPrice: 162.9,
    description:
      'Research-based pharmaceutical company developing therapies for immunology, oncology, and neuroscience.',
  },
  {
    ticker: 'MRK',
    companyName: 'Merck & Co. Inc.',
    sector: 'Healthcare',
    currentPrice: 128.75,
    description:
      'Global pharmaceutical company offering prescription medicines, vaccines, and animal health products.',
  },
  {
    ticker: 'LLY',
    companyName: 'Eli Lilly and Company',
    sector: 'Healthcare',
    currentPrice: 743.2,
    description:
      'Pharmaceutical company known for insulin, diabetes treatments, and breakthrough weight-loss drugs.',
  },
  {
    ticker: 'TMO',
    companyName: 'Thermo Fisher Scientific',
    sector: 'Healthcare',
    currentPrice: 548.9,
    description:
      'World leader in serving science providing analytical instruments, equipment, and life science research.',
  },
  {
    ticker: 'DHR',
    companyName: 'Danaher Corporation',
    sector: 'Healthcare',
    currentPrice: 247.5,
    description:
      'Designs, manufactures, and markets professional, medical, industrial, and commercial products.',
  },
  {
    ticker: 'ISRG',
    companyName: 'Intuitive Surgical Inc.',
    sector: 'Healthcare',
    currentPrice: 388.6,
    description:
      'Develops, manufactures, and markets robotic surgical systems used in minimally invasive surgery.',
  },
  {
    ticker: 'MRNA',
    companyName: 'Moderna Inc.',
    sector: 'Healthcare',
    currentPrice: 97.3,
    description:
      'Biotechnology company developing mRNA medicines and vaccines including COVID-19 vaccine.',
  },

  // ── Energy ───────────────────────────────────────────────────────────────
  {
    ticker: 'XOM',
    companyName: 'Exxon Mobil Corporation',
    sector: 'Energy',
    currentPrice: 108.45,
    description:
      "World's largest publicly traded international oil and gas company.",
  },
  {
    ticker: 'CVX',
    companyName: 'Chevron Corporation',
    sector: 'Energy',
    currentPrice: 152.8,
    description:
      'Integrated energy company involved in oil and gas exploration, production, and refining.',
  },
  {
    ticker: 'COP',
    companyName: 'ConocoPhillips',
    sector: 'Energy',
    currentPrice: 107.3,
    description:
      'Explores, produces, transports, and markets crude oil, natural gas, and liquefied natural gas.',
  },
  {
    ticker: 'SLB',
    companyName: 'SLB (Schlumberger)',
    sector: 'Energy',
    currentPrice: 44.2,
    description:
      "World's leading provider of technology and services to the oil and gas industry.",
  },
  {
    ticker: 'NEE',
    companyName: 'NextEra Energy Inc.',
    sector: 'Energy',
    currentPrice: 73.5,
    description:
      'Largest electric utility in the US and a world leader in renewable energy generation.',
  },
  {
    ticker: 'ENPH',
    companyName: 'Enphase Energy Inc.',
    sector: 'Energy',
    currentPrice: 118.4,
    description:
      'Energy technology company providing microinverter-based solar and battery storage systems.',
  },
  {
    ticker: 'FSLR',
    companyName: 'First Solar Inc.',
    sector: 'Energy',
    currentPrice: 198.6,
    description:
      'American photovoltaic solar energy company manufacturing and selling solar panels and systems.',
  },

  // ── Consumer ─────────────────────────────────────────────────────────────
  {
    ticker: 'AMZN2',
    companyName: 'Amazon Retail Holdings',
    sector: 'Consumer',
    currentPrice: 154.2,
    description:
      'Retail and marketplace operations including Prime membership and logistics network.',
  },
  {
    ticker: 'WMT',
    companyName: 'Walmart Inc.',
    sector: 'Consumer',
    currentPrice: 60.15,
    description:
      'Multinational retail corporation operating hypermarkets, grocery stores, and e-commerce.',
  },
  {
    ticker: 'HD',
    companyName: 'The Home Depot Inc.',
    sector: 'Consumer',
    currentPrice: 351.4,
    description:
      'Largest home improvement retailer in the US selling tools, construction products, and services.',
  },
  {
    ticker: 'NKE',
    companyName: 'Nike Inc.',
    sector: 'Consumer',
    currentPrice: 97.85,
    description:
      "World's largest supplier of athletic shoes and apparel designing and selling sports equipment.",
  },
  {
    ticker: 'MCD',
    companyName: "McDonald's Corporation",
    sector: 'Consumer',
    currentPrice: 282.5,
    description:
      "World's largest fast-food restaurant chain with over 40,000 locations in 100+ countries.",
  },
  {
    ticker: 'SBUX',
    companyName: 'Starbucks Corporation',
    sector: 'Consumer',
    currentPrice: 91.25,
    description:
      'American multinational chain of coffeehouses and roastery reserves.',
  },
  {
    ticker: 'COST',
    companyName: 'Costco Wholesale Corporation',
    sector: 'Consumer',
    currentPrice: 730.8,
    description:
      'Membership-based warehouse club selling groceries, electronics, and merchandise in bulk.',
  },
  {
    ticker: 'TGT',
    companyName: 'Target Corporation',
    sector: 'Consumer',
    currentPrice: 144.6,
    description:
      'American retail corporation operating discount department stores and hypermarkets.',
  },
  {
    ticker: 'ABNB',
    companyName: 'Airbnb Inc.',
    sector: 'Consumer',
    currentPrice: 132.4,
    description:
      'Online marketplace for lodging, primarily homestays and tourist experiences.',
  },
  {
    ticker: 'UBER',
    companyName: 'Uber Technologies Inc.',
    sector: 'Consumer',
    currentPrice: 74.3,
    description:
      'Technology platform for ride-sharing, food delivery, and freight transportation.',
  },

  // ── Telecommunications ───────────────────────────────────────────────────
  {
    ticker: 'T',
    companyName: 'AT&T Inc.',
    sector: 'Telecommunications',
    currentPrice: 17.85,
    description:
      'Multinational conglomerate providing telecommunications, media, and technology services.',
  },
  {
    ticker: 'VZ',
    companyName: 'Verizon Communications Inc.',
    sector: 'Telecommunications',
    currentPrice: 40.2,
    description:
      'American multinational telecommunications conglomerate and one of the largest wireless carriers.',
  },
  {
    ticker: 'TMUS',
    companyName: 'T-Mobile US Inc.',
    sector: 'Telecommunications',
    currentPrice: 162.3,
    description:
      'Wireless network operator and subsidiary of Deutsche Telekom offering 5G services.',
  },
  {
    ticker: 'NFLX',
    companyName: 'Netflix Inc.',
    sector: 'Telecommunications',
    currentPrice: 605.8,
    description:
      'Subscription streaming service and production company with over 260 million subscribers.',
  },
  {
    ticker: 'DIS',
    companyName: 'The Walt Disney Company',
    sector: 'Telecommunications',
    currentPrice: 111.4,
    description:
      'Diversified multinational entertainment and media conglomerate operating theme parks and streaming.',
  },

  // ── Real Estate ──────────────────────────────────────────────────────────
  {
    ticker: 'AMT',
    companyName: 'American Tower Corporation',
    sector: 'Real Estate',
    currentPrice: 188.3,
    description:
      'Real estate investment trust and infrastructure company owning wireless and broadcast towers.',
  },
  {
    ticker: 'PLD',
    companyName: 'Prologis Inc.',
    sector: 'Real Estate',
    currentPrice: 122.5,
    description:
      'Global logistics real estate company owning and operating industrial properties.',
  },
  {
    ticker: 'EQIX',
    companyName: 'Equinix Inc.',
    sector: 'Real Estate',
    currentPrice: 756.4,
    description:
      'Digital infrastructure company operating data centers and interconnection services worldwide.',
  },
  {
    ticker: 'SPG',
    companyName: 'Simon Property Group Inc.',
    sector: 'Real Estate',
    currentPrice: 149.2,
    description:
      'Real estate investment trust owning, developing, and managing premier shopping malls.',
  },

  // ── Industrial ───────────────────────────────────────────────────────────
  {
    ticker: 'CAT',
    companyName: 'Caterpillar Inc.',
    sector: 'Industrial',
    currentPrice: 340.75,
    description:
      "World's leading manufacturer of construction and mining equipment, diesel engines, and turbines.",
  },
  {
    ticker: 'BA',
    companyName: 'The Boeing Company',
    sector: 'Industrial',
    currentPrice: 189.4,
    description:
      'Designs, manufactures, and services commercial jetliners, military aircraft, and spacecraft.',
  },
  {
    ticker: 'HON',
    companyName: 'Honeywell International Inc.',
    sector: 'Industrial',
    currentPrice: 194.3,
    description:
      'Diversified technology and manufacturing company in aerospace, building technologies, and safety.',
  },
  {
    ticker: 'GE',
    companyName: 'GE Aerospace',
    sector: 'Industrial',
    currentPrice: 158.2,
    description:
      'Leading global aerospace company manufacturing jet engines, avionics, and related services.',
  },
  {
    ticker: 'UPS',
    companyName: 'United Parcel Service Inc.',
    sector: 'Industrial',
    currentPrice: 145.8,
    description:
      "World's largest package delivery company and provider of supply chain management solutions.",
  },
  {
    ticker: 'DE',
    companyName: 'Deere & Company',
    sector: 'Industrial',
    currentPrice: 378.5,
    description:
      'Manufactures agricultural, construction, and forestry machinery under the John Deere brand.',
  },
];

// ── Insert into MongoDB ───────────────────────────────────────────────────────

const db = db.getSiblingDB('trading');
const collection = db.getCollection('stocks');

let inserted = 0;
let skipped = 0;

const now = new Date();

for (const stock of stocks) {
  const exists = collection.findOne({ ticker: stock.ticker });
  if (exists) {
    print(`SKIP: ${stock.ticker} already exists`);
    skipped++;
    continue;
  }

  const priceDecimal = NumberDecimal(stock.currentPrice.toString());

  collection.insertOne({
    ticker: stock.ticker,
    companyName: stock.companyName,
    sector: stock.sector,
    currentPrice: priceDecimal,
    description: stock.description,
    isListed: true,
    priceHistory: [{ price: priceDecimal, recordedAt: now }],
    createdAt: now,
    updatedAt: now,
    __v: 0,
  });

  print(`OK:   ${stock.ticker} — ${stock.companyName}`);
  inserted++;
}

print(
  `\nDone: ${inserted} inserted, ${skipped} skipped, ${stocks.length} total`,
);
