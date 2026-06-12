// Curated lexicons powering the semantic system. All lookups are exact,
// lowercase, deterministic (Principle IX: documented resolution strategies).

export const POSITIVE_WORDS = new Set([
  'good','great','love','loves','loved','happy','happiness','joy','joyful','bright','warm','hope','hopeful',
  'kind','beautiful','wonderful','excellent','amazing','fantastic','positive','light','peace','peaceful','calm',
  'gentle','lovely','sweet','pleasant','delight','delightful','bliss','radiant','vibrant','smile','smiled',
  'laugh','laughed','laughter','friend','friendly','safe','soft','glad','cheer','cheerful','brilliant','shine',
  'shining','golden','triumph','victory','win','succeed','success','thrive','bloom','blossom','heal','free',
])

export const NEGATIVE_WORDS = new Set([
  'bad','hate','hates','hated','sad','sadness','dark','darkness','cold','fear','fearful','anger','angry','pain',
  'painful','harsh','ugly','terrible','horrible','awful','negative','heavy','war','death','dead','die','died',
  'violence','violent','bitter','cruel','misery','miserable','dread','despair','grim','bleak','toxic','cry',
  'cried','tears','lonely','alone','lost','fail','failed','failure','break','broken','wound','wounded','sick',
  'storm','wreck','ruin','ruined','grief','mourn','sorrow','hurt','enemy','threat','danger','dangerous',
])

export const HIGH_ENERGY_WORDS = new Set([
  'fast','faster','rush','rushed','burst','explode','exploded','scream','screamed','shout','shouted','race',
  'raced','crash','crashed','blast','fury','furious','intense','surge','wild','fierce','storm','fire','strike',
  'struck','urgent','rapid','run','ran','running','leap','leapt','jump','jumped','sprint','charge','roar',
  'roared','thunder','lightning','attack','slam','smash','sudden','suddenly','now','quick','quickly',
])

export const LOW_ENERGY_WORDS = new Set([
  'calm','slow','slowly','quiet','quietly','still','gentle','gently','soft','softly','rest','resting','sleep',
  'sleeping','drift','drifting','float','floating','peaceful','lazy','idle','hush','silent','silence','settle',
])

// Negators flip the polarity of the next sentiment-bearing word within a 3-word window.
export const NEGATORS = new Set([
  'not','never','no','nor',"n't",'without','hardly','barely','scarcely','neither','cannot',
])

// Modal verb strength scale (constitution: Semantic System → Modal Verb Weighting)
export const MODAL_STRENGTH: Record<string, number> = {
  could: 0.15, might: 0.15,
  can: 0.35, may: 0.35,
  would: 0.55, should: 0.55,
  will: 0.75, shall: 0.75,
  must: 0.95, ought: 0.95,
}

// Function words receive neutral semantic values (Rule 5: never silent, just neutral)
export const FUNCTION_WORDS = new Set([
  'a','an','the','this','that','these','those','my','your','his','her','its','our','their',
  'i','you','he','she','it','we','they','me','him','us','them','who','whom','whose','which','what',
  'in','on','at','by','for','with','about','against','between','into','through','during','before',
  'after','above','below','to','from','up','down','of','off','over','under','again','then','once',
  'and','but','or','nor','yet','so','because','although','while','since','if','when','unless',
  'is','am','are','was','were','be','been','being','have','has','had','do','does','did',
  'as','than','too','very','just','also','only','own','same','such','both','each','few','more',
  'most','other','some','any','all','there','here','where','why','how','not','no',
])

// ~270 highest-frequency English words → frequencyTier 'common'.
// Tier strategy (documented): common = in this list or a function word;
// rare = length ≥ 10, or length ≥ 7 containing j/q/x/z; everything else uncommon.
export const COMMON_WORDS = new Set([
  'time','year','people','way','day','man','thing','woman','life','child','children','world','school',
  'state','family','student','group','country','problem','hand','part','place','case','week','company',
  'system','program','question','work','government','number','night','point','home','water','room',
  'mother','father','area','money','story','fact','month','lot','right','study','book','eye','job',
  'word','business','issue','side','kind','head','house','service','friend','power','hour','game',
  'line','end','member','law','car','city','community','name','president','team','minute','idea',
  'body','information','back','parent','face','others','level','office','door','health','person',
  'art','war','history','party','result','change','morning','reason','research','girl','boy','guy',
  'moment','air','teacher','force','education','foot','feet','love','sea','land','light','sun','moon',
  'star','tree','bird','fish','river','rain','wind','snow','fire','earth','sky','sound','voice','music',
  'go','went','gone','get','got','make','made','know','knew','known','think','thought','take','took',
  'see','saw','seen','come','came','want','look','looked','use','used','find','found','give','gave',
  'tell','told','ask','asked','seem','seemed','feel','felt','try','tried','leave','left','call','called',
  'say','said','show','showed','hear','heard','play','played','run','ran','move','moved','live','lived',
  'believe','hold','held','bring','brought','happen','happened','write','wrote','sit','sat','stand',
  'stood','lose','lost','pay','paid','meet','met','include','continue','set','learn','learned','lead',
  'led','understand','understood','watch','watched','follow','followed','stop','stopped','create','speak',
  'spoke','read','allow','add','spend','spent','grow','grew','open','opened','walk','walked','win','won',
  'offer','remember','consider','appear','buy','bought','wait','waited','serve','die','died','send','sent',
  'expect','build','built','stay','stayed','fall','fell','cut','reach','reached','kill','remain','turn',
  'turned','start','started','help','helped','talk','talked','begin','began','begun','keep','kept','put',
  'new','old','great','high','small','large','big','little','long','short','young','good','bad','best',
  'better','early','late','important','public','able','last','first','next','sure','real','black','white',
  'red','blue','green','strong','whole','free','full','easy','hard','possible','true','clear','recent',
  'certain','personal','open','difficult','available','likely','deep','warm','cold','hot','dark','bright',
])

// Curated semantic category lexicons. A word maps to at most one category;
// resolution order is the array order below (first match wins).
export const CATEGORY_LEXICONS: ReadonlyArray<readonly [string, ReadonlySet<string>]> = [
  ['animal', new Set([
    'dog','dogs','cat','cats','bird','birds','fish','horse','horses','cow','cows','sheep','wolf','wolves',
    'bear','bears','lion','lions','tiger','fox','foxes','deer','rabbit','rabbits','mouse','mice','whale',
    'whales','dolphin','eagle','owl','crow','snake','frog','bee','bees','butterfly','spider','ant','ants',
    'goat','pig','pigs','duck','ducks','hen','rooster','salmon','shark','seal','otter','beaver','moth',
  ])],
  ['nature', new Set([
    'tree','trees','forest','river','rivers','mountain','mountains','ocean','sea','seas','lake','lakes',
    'rain','wind','winds','snow','storm','storms','cloud','clouds','sky','skies','sun','moon','star','stars',
    'earth','stone','stones','rock','rocks','flower','flowers','grass','leaf','leaves','wave','waves','tide',
    'valley','hill','hills','island','desert','meadow','garden','root','roots','branch','branches','seed',
  ])],
  ['body', new Set([
    'hand','hands','eye','eyes','heart','hearts','head','heads','face','faces','arm','arms','leg','legs',
    'foot','feet','finger','fingers','hair','blood','bone','bones','skin','mouth','lips','tongue','ear',
    'ears','shoulder','shoulders','chest','breath','lungs','knee','knees','spine','voice','throat','brain',
  ])],
  ['emotion', new Set([
    'love','hate','fear','joy','anger','hope','grief','sorrow','delight','dread','despair','bliss','rage',
    'envy','pride','shame','guilt','wonder','awe','longing','desire','calm','panic','worry','relief',
    'happiness','sadness','loneliness','courage','terror','tenderness','passion','pity','trust','doubt',
  ])],
  ['motion', new Set([
    'run','ran','running','walk','walked','walking','jump','jumped','leap','leapt','fly','flew','flying',
    'swim','swam','swimming','climb','climbed','fall','fell','falling','rise','rose','rising','dance',
    'danced','dancing','spin','spun','drift','drifted','float','floated','race','raced','crawl','slide',
    'roll','rolled','turn','turned','march','marched','wander','wandered','travel','journey','sail','sailed',
  ])],
  ['time', new Set([
    'time','day','days','night','nights','morning','evening','noon','midnight','hour','hours','minute',
    'minutes','second','seconds','week','weeks','month','months','year','years','season','seasons','spring',
    'summer','autumn','winter','today','tomorrow','yesterday','dawn','dusk','past','future','present','age',
  ])],
  ['color', new Set([
    'red','blue','green','yellow','orange','purple','violet','black','white','grey','gray','brown','pink',
    'gold','golden','silver','crimson','scarlet','azure','indigo','emerald','amber','ivory','jade','copper',
  ])],
] as const

// Approximate syllable count: groups of vowels, minus silent final 'e' (but not '-le'), min 1.
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-zà-öø-ÿ]/g, '')
  if (!w) return 1
  const groups = w.match(/[aeiouyà-öø-ÿ]+/g)
  let n = groups ? groups.length : 1
  if (w.length > 2 && w.endsWith('e') && !w.endsWith('le') && !/[aeiouy]e$/.test(w)) n--
  return Math.max(1, n)
}

export type FrequencyTierName = 'common' | 'uncommon' | 'rare'

export function frequencyTierOf(word: string): FrequencyTierName {
  const w = word.toLowerCase()
  if (COMMON_WORDS.has(w) || FUNCTION_WORDS.has(w)) return 'common'
  if (w.length >= 10) return 'rare'
  if (w.length >= 7 && /[jqxz]/.test(w)) return 'rare'
  return 'uncommon'
}

export function categoryOf(word: string): string | undefined {
  const w = word.toLowerCase()
  for (const [cat, set] of CATEGORY_LEXICONS) {
    if (set.has(w)) return cat
  }
  return undefined
}
