你好，我在做一个"即兴演讲/表达练习"App（英文原版叫 Unprompted，是一个抽题+计时器的口语练习工具），现在要加一个**地区切换**功能，用户可以选择 English / Singapore / China 三个地区，每个地区在原版通用题库之外，还会额外抽到该地区特有的题卡。原版有 11 个分类，每个分类下是一组"关键词/主题卡片"——用户抽到一张卡后，就这个词即兴说 1-2 分钟。

请你帮我扩充两套**地区专属题库**，都是在英文原版之上的补充（不是替代，原版任何地区都能抽到）：

1. **China 地区**：中文语言的题库
2. **Singapore 地区**：英文语言（新加坡口语练习场景以英文/Singlish 为主），但要有鲜明的新加坡本地特色

## 规则

1. **保留英文原版**：下面每个分类里列出的英文词条要原样保留，不要删减或修改，两个地区都不需要重复它们。
2. **China 板块 —— 中文翻译版**：对每个英文词条，给出一个地道、口语化的中文对应词（不要逐字直译，要给出中文语境下大家真正会脱口而出的说法）。如果某个英文词在中文语境里没有自然对应（比如一些很西方的心理学效应/历史事件），就给出最贴切的中文表达或简短意译，让中文母语者也能秒懂并能就此话题说 1-2 分钟。
3. **China 板块 —— 中文原创补充**：在翻译的基础上，为每个分类**额外新增 8-15 个"中国大陆语境特有"的词条**（普通话，简体中文）：
   - General：中国人日常生活里才有的场景/物件/梗（比如：拼多多砍一刀、朋友圈三天可见、拼车、催婚、内卷、断亲、社死、丁克、烂尾楼……你来发挥，不局限于举例）
   - Deep Research：中国哲学/历史里的经典概念、效应、悖论（比如中庸之道、田忌赛马、塞翁失马、破窗效应的本土案例等），也可以是有意思的中国社会学/心理学现象
   - Personal finance：中国人特有的理财场景（比如：余额宝、房贷、六个钱包、破产式旅游、消费降级、家庭资产配置观念等）
   - Entrepreneurship / Startups / Tech-AI：中国互联网创业圈黑话和现象（比如：996、大厂、内卷、私域流量、下沉市场、卷王、35岁危机等）
   - Fitness / Nutrition：中国人健身/饮食语境（比如：养生、体检焦虑、中式减肥文化、食补等）
   - Productivity：中国职场语境（摸鱼、划水、PUA、汇报文化等）
   - History：中国历史上的标志性事件（不要跟原版英文历史事件重复，选中国/东亚视角的重要历史节点）
   - Literature：中国文学经典（四大名著、鲁迅、金庸等，不要跟英文原版重复）
4. **Singapore 板块 —— 新加坡原创补充**：为每个分类**额外新增 8-15 个"新加坡语境特有"的英文/Singlish 词条**（不需要对应英文原版逐词翻译，直接原创，语言用英文，但可以夹杂 Singlish 词汇如 kiasu、shiok、chope、atas、blur、paiseh 等）：
   - General：新加坡日常生活场景/梗（比如：kiasu、chope-ing a seat、void deck、HDB corridor、hawker centre queue、CMIO、NS reservist、PSLE stress、COE、GST vouchers……你来发挥）
   - Deep Research：适合"深挖研究"的新加坡社会/治理/心理现象（比如 meritocracy debate、kiasu-ism as behavioural economics、the sandwich class 等），或亚洲视角的有趣悖论
   - Personal finance：新加坡特有理财场景（CPF、HDB upgrading、BTO vs resale、Singapore Savings Bonds、财富自由 in a high-COE country 等）
   - Entrepreneurship / Startups / Tech-AI：新加坡创业圈黑话（比如 grab a Grab、unicorn dreams in a small market、EDG grants、tech in shape、regionalising from SG 等）
   - Fitness / Nutrition：新加坡健身/饮食语境（hawker food guilt、kopi-o kosong、ActiveSG、humidity as excuse 等）
   - Productivity：新加坡职场语境（kiasee culture、bell curve ranking、reservist disruption、PIP、hybrid work debates 等）
   - History：新加坡/东南亚历史上的标志性事件（不要跟英文原版重复，比如建国、独立、经济奇迹相关节点，你来发挥具体条目）
   - Literature：新加坡/东南亚文学或代表作家（不要跟英文原版重复）
5. **输出格式**：请严格按下面的 JSON 结构输出，方便我直接粘进代码里。每个分类一个对象：

```json
{
  "id": "general",
  "label_zh": "日常",
  "china": {
    "topics_zh_translation": ["...对应英文第1个词的中文...", "...对应第2个..."],
    "topics_zh_original": ["...新增中文词条1...", "...新增词条2..."]
  },
  "singapore": {
    "topics_sg_original": ["...新增新加坡词条1...", "...新增词条2..."]
  }
}
```

（`topics_zh_translation` 顺序、数量要跟英文 topics 一一对应；`topics_zh_original` 和 `topics_sg_original` 不需要对应英文，是纯新增。）

6. 语气要求：词条本身要简短（2-6个字，或英文 2-4 个词为主，像原版一样是"关键词卡片"而不是完整句子），能让人看到就有话可说，避免过于学术化或翻译腔。
7. China 板块全部输出用简体中文，Singapore 板块全部输出用英文/Singlish。请对全部 11 个分类都完整输出两个板块，不要省略或用"以下类似"偷懒。

## 原版英文主题库（11 个分类，请勿改动，仅供你翻译和参照）

```json
[
  {"id":"general","label":"General","emoji":"✦","topics":["Nostalgia","Comfort Zone","Muscle Memory","Commute","Spam Call","Voicemail","Doorbell","Hand-Me-Down","Bookshelf","Junk Drawer","Brainrot","Corporate greed","Mirrors","Waiting Room","Autocorrect","Group Chat","Leftovers","Traffic Light"]},

  {"id":"deep-research","label":"Deep Research","emoji":"🔎","topics":["The Ben Franklin effect","The illusion of transparency","Affective forecasting (impact bias)","The focusing illusion","The end-of-history illusion","Ironic process theory","Affect labeling","Schelling points","Tit-for-tat (and why nice strategies win)","The war of attrition","Costly signaling","The volunteer's dilemma","The stag hunt","The ostrich effect","The house money effect","The compromise effect","The denomination effect","The prosecutor's fallacy","Simpson's paradox","Berkson's paradox","The law of small numbers","The false positive paradox","The Lindy effect"]},

  {"id":"personal-finance","label":"Personal finance","emoji":"💰","topics":["Emergency fund","Compound interest","Lifestyle creep","Sunk cost","Opportunity cost","Net worth","Cash flow","High-interest debt","Rainy day","Diversification","Dollar-cost averaging","Liquidity","Burn rate","Safety net","Credit score","Time value of money","Risk tolerance","Idle cash","Subscription trap","Financial runway","Delayed gratification"]},

  {"id":"entrepreneurship","label":"Entrepreneurship","emoji":"🚀","topics":["Skin in the game","First customer","Cash is oxygen","Founder mode","Saying no","Distribution","Unit economics","Moat","Bootstrapping","Product-market fit","Reputation capital","Sweat equity","Hustle vs leverage","Solo founder","Building in public","Fail fast","Customer obsession","Pivoting","Trust as currency","Overnight success myth","Side hustle ceiling","Ship imperfect"]},

  {"id":"startups","label":"Startups","emoji":"🌱","topics":["Minimum viable product","Runway","Seed round","Growth hacking","Churn","Network effects","Burn rate","Traction","Pivot","Founder-market fit","Beachhead market","Viral loop","Demo day","Product debt","Early adopters","Scaling prematurely","Acqui-hire","Moonshot","Zero to one"]},

  {"id":"tech-ai","label":"Tech / AI","emoji":"🤖","topics":["Black box","Training data","Prompt engineering","Hallucination","Model drift","Latency","API call","Open source","Fine-tuning","Context window","Automation bias","Data moat","Edge case","Tech debt","Single point of failure","Cloud vs local","Inference cost","Synthetic data","Feedback loop","Zero-shot","Attention mechanism","Agentic workflow"]},

  {"id":"fitness","label":"Fitness","emoji":"💪","topics":["Progressive overload","Rest day","Muscle memory","Form over ego","Plateau","Warm-up","Consistency beats intensity","Deload week","Range of motion","Recovery debt","Personal record","Body composition","Cardio base","Mobility","Soreness as signal","Showing up","Breathing under load","Mind-muscle connection","Volume vs intensity","Habit stacking","Gym intimidation","Maintenance phase","Functional strength","Sleep as training","Accountability partner","Beginner gains","Long-term athlete"]},

  {"id":"nutrition","label":"Nutrition","emoji":"🥗","topics":["Empty calories","Protein","Hydration","Meal prep","Craving vs hunger","Micronutrients","Fiber","Blood sugar spike","Mindful eating","Whole foods","Gut health","Cheat meals","Emotional eating","Sustainable deficit","Breakfast ritual","Late-night snack","Ultra-processed","Eating enough","Color on the plate","Social eating","Meal timing","Supplements","Home cooking","Energy availability"]},

  {"id":"productivity","label":"Productivity","emoji":"⚡","topics":["Deep work","Context switching","Inbox zero","Time boxing","Parkinson's law","Two-minute rule","Batching","Energy management","Done is better","Open loops","Focus mode","Meeting tax","Single-tasking","Morning pages","Shutdown ritual","Second brain","Procrastination","Friction removal","Attention residue","Protected hours","Output over hours","Distraction diet"]},

  {"id":"history","label":"History","emoji":"📜","topics":["Fall of the Berlin Wall","Moon landing","Invention of the printing press","Signing of the Magna Carta","Storming of the Bastille","First Olympic Games","Discovery of penicillin","Wright brothers' first flight","Fall of Constantinople","Boston Tea Party","March on Washington","Opening of the Silk Road","Chernobyl disaster","Completion of the Great Wall","Treaty of Versailles","First photograph","Suez Canal opening","Abolition of slavery in Britain","Launch of Sputnik","Renaissance in Florence","Stock market crash of 1929","Nelson Mandela's release","Building of the pyramids","First women's suffrage victory","Atomic bomb on Hiroshima","Voyages of Zheng He","Fall of the Roman Empire","Invention of the internet"]},

  {"id":"literature","label":"Literature","emoji":"📚","topics":["1984","Moby-Dick","Pride and Prejudice","One Hundred Years of Solitude","The Great Gatsby","Crime and Punishment","To Kill a Mockingbird","Brave New World","The Odyssey","Frankenstein","Don Quixote","Beloved","The Catcher in the Rye","War and Peace","Slaughterhouse-Five","Ernest Hemingway","Franz Kafka","Fyodor Dostoevsky","Edgar Allan Poe","James Joyce","Emily Dickinson","Mark Twain"]}
]
```

请开始输出完整的 JSON 结果（11 个分类，每个分类都要包含 `china`（含 `topics_zh_translation` 和 `topics_zh_original`）和 `singapore`（含 `topics_sg_original`）两个板块）。
