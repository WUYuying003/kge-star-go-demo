const tileCoords = [
  [50, 91], [35, 91], [20, 91], [8, 78], [8, 63],
  [8, 48], [8, 33], [8, 18], [20, 8], [35, 8],
  [50, 8], [65, 8], [80, 8], [92, 18], [92, 33],
  [92, 48], [92, 63], [92, 78], [80, 91], [65, 91],
];

const tileTypes = [
  { type: "start", name: "起点" },
  { type: "coin", name: "金币" },
  { type: "chance", name: "热搜" },
  { type: "gift", name: "礼物雨" },
  { type: "bank", name: "金库" },
  { type: "coin", name: "金币" },
  { type: "shield", name: "守护" },
  { type: "dice", name: "骰子" },
  { type: "coin", name: "金币" },
  { type: "chance", name: "热搜" },
  { type: "gift", name: "礼物雨" },
  { type: "bank", name: "金库" },
  { type: "risk", name: "小事故" },
  { type: "support", name: "应援站" },
  { type: "coin", name: "金币" },
  { type: "shield", name: "守护" },
  { type: "chance", name: "热搜" },
  { type: "dice", name: "骰子" },
];

const levelNames = ["未签约", "练习生", "出道", "顶流"];

const mapTemplates = [
  {
    name: "海选夜市站",
    next: "商场舞台站",
    scale: 1,
    artists: [
      { name: "小鹿音", cost: 2600, income: 900, trait: "甜歌新人" },
      { name: "阿麦", cost: 4200, income: 1450, trait: "抢麦达人" },
      { name: "星野", cost: 6200, income: 2100, trait: "舞台唱将" },
      { name: "可可", cost: 8600, income: 2900, trait: "礼物收割机" },
    ],
  },
  {
    name: "商场舞台站",
    next: "城市演唱会",
    scale: 1.6,
    artists: [
      { name: "夏一鸣", cost: 7200, income: 1900, trait: "热搜体质" },
      { name: "桃桃", cost: 9800, income: 2600, trait: "合唱王" },
      { name: "北辰", cost: 12800, income: 3300, trait: "高音稳定器" },
      { name: "林闪闪", cost: 16800, income: 4300, trait: "舞台控场" },
    ],
  },
];

const state = {
  coins: 22000,
  dice: 30,
  shields: 2,
  position: 0,
  mapIndex: 0,
  artists: [0, 0, 0, 0],
  moving: false,
  lastCoinReward: 0,
  tasks: {
    progress: { roll: 0, bank: 0, support: 0, train: 0, gallery: 0, collect: 0 },
    claimed: {},
  },
  galleryClaims: {},
};

const taskDefs = [
  { key: "roll", label: "完成5次掷骰", need: 5, reward: 6 },
  { key: "bank", label: "金库抢麦1次", need: 1, reward: 8 },
  { key: "support", label: "经过应援站1次", need: 1, reward: 5 },
  { key: "train", label: "培养艺人1次", need: 1, reward: 5 },
  { key: "gallery", label: "领取1次图鉴奖励", need: 1, reward: 4 },
  { key: "collect", label: "收通告收益1次", need: 1, reward: 4 },
];

const els = {
  board: document.querySelector("#board"),
  coinCount: document.querySelector("#coinCount"),
  coinLayer: document.querySelector("#coinLayer"),
  diceCount: document.querySelector("#diceCount"),
  bottomDiceCount: document.querySelector("#bottomDiceCount"),
  shieldCount: document.querySelector("#shieldCount"),
  mapName: document.querySelector("#mapName"),
  mapGoal: document.querySelector("#mapGoal"),
  mapProgress: document.querySelector("#mapProgress"),
  mapProgressText: document.querySelector("#mapProgressText"),
  tourIncome: document.querySelector("#tourIncome"),
  feedText: document.querySelector("#feedText"),
  rollBtn: document.querySelector("#rollBtn"),
  diceFace: document.querySelector("#diceFace"),
  rollDice: document.querySelector("#rollDice"),
  adDiceBtn: document.querySelector("#adDiceBtn"),
  adCoinBtn: document.querySelector("#adCoinBtn"),
  collectOfflineBtn: document.querySelector("#collectOfflineBtn"),
  managerBtn: document.querySelector("#managerBtn"),
  dailyTaskBtn: document.querySelector("#dailyTaskBtn"),
  galleryBtn: document.querySelector("#galleryBtn"),
  modal: document.querySelector("#modal"),
  modalBackdrop: document.querySelector("#modalBackdrop"),
  modalClose: document.querySelector("#modalClose"),
  modalKicker: document.querySelector("#modalKicker"),
  modalTitle: document.querySelector("#modalTitle"),
  modalBody: document.querySelector("#modalBody"),
  modalReward: document.querySelector("#modalReward"),
  choiceGrid: document.querySelector("#choiceGrid"),
  modalActions: document.querySelector("#modalActions"),
};

const formatter = new Intl.NumberFormat("zh-CN");

function currentMap() {
  return mapTemplates[state.mapIndex] || mapTemplates[0];
}

function money(value) {
  return formatter.format(Math.max(0, Math.floor(value)));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function artistIncome(index) {
  const level = state.artists[index];
  if (level <= 0) return 0;
  const artist = currentMap().artists[index];
  return Math.round(artist.income * level * currentMap().scale);
}

function totalTourIncome() {
  return state.artists.reduce((sum, level, index) => {
    if (level <= 0) return sum;
    return sum + artistIncome(index);
  }, 0);
}

function startIncome() {
  return Math.round(1200 * currentMap().scale + totalTourIncome());
}

function upgradeCost(index) {
  const level = state.artists[index];
  const base = currentMap().artists[index].cost;
  if (level <= 0) return base;
  if (level === 1) return Math.round(base * 1.55);
  if (level === 2) return Math.round(base * 2.55);
  return 0;
}

function allArtistsMaxed() {
  return state.artists.every((level) => level >= 3);
}

function completedCount() {
  return state.artists.filter((level) => level >= 3).length;
}

function setFeed(text) {
  els.feedText.textContent = text;
}

function bumpTask(key, amount = 1) {
  state.tasks.progress[key] = (state.tasks.progress[key] || 0) + amount;
}

function renderBoard() {
  document.querySelectorAll(".tile").forEach((node) => node.remove());
  tileTypes.forEach((tile, index) => {
    const node = document.createElement("button");
    node.className = `tile ${tile.type}`;
    node.style.left = `${tileCoords[index][0]}%`;
    node.style.top = `${tileCoords[index][1]}%`;
    node.type = "button";
    node.dataset.index = String(index);

    const icon = document.createElement("span");
    icon.className = "tile-icon";
    const name = document.createElement("span");
    name.className = "tile-name";
    name.textContent = tile.name;
    node.append(icon, name);

    node.addEventListener("click", () => explainTile(index));
    els.board.appendChild(node);
  });
}

function render() {
  els.coinCount.textContent = money(state.coins);
  els.diceCount.textContent = money(state.dice);
  els.bottomDiceCount.textContent = money(state.dice);
  els.shieldCount.textContent = money(state.shields);
  els.mapName.textContent = currentMap().name;
  els.mapGoal.textContent = allArtistsMaxed()
    ? `全员顶流，可解锁${currentMap().next}`
    : "去经纪公司签约并培养艺人";
  const count = completedCount();
  els.mapProgress.style.width = `${(count / 4) * 100}%`;
  els.mapProgressText.textContent = `${count}/4 顶流`;
  els.tourIncome.textContent = money(startIncome());
  els.rollBtn.disabled = state.moving;
  els.adCoinBtn.disabled = state.lastCoinReward <= 0;
  document.querySelectorAll(".tile").forEach((node) => {
    node.classList.toggle("active", Number(node.dataset.index) === state.position);
  });
}

function setModalActions(actions = []) {
  els.modalActions.innerHTML = "";
  actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action.className || "primary-action";
    button.textContent = action.label;
    button.addEventListener("click", action.onClick);
    els.modalActions.appendChild(button);
  });
}

function showModal({
  kicker,
  title,
  body,
  reward = "",
  choices = [],
  actions = [],
  customHtml = "",
  wide = false,
}) {
  els.modal.className = wide ? "modal wide" : "modal";
  els.modalKicker.textContent = kicker;
  els.modalTitle.textContent = title;
  if (customHtml) {
    els.modalBody.innerHTML = customHtml;
  } else {
    els.modalBody.textContent = body || "";
  }
  els.modalReward.textContent = reward;
  els.modalReward.hidden = !reward;
  els.choiceGrid.innerHTML = "";
  els.choiceGrid.hidden = choices.length === 0;
  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.innerHTML = `${choice.label}<b>${choice.value}</b>`;
    button.addEventListener("click", choice.onClick);
    els.choiceGrid.appendChild(button);
  });
  setModalActions(actions);
  els.modalBackdrop.hidden = false;
}

function closeModal() {
  els.modalBackdrop.hidden = true;
  els.modal.className = "modal";
  render();
}

function addCoins(amount, reason) {
  gainCoins(amount, "center");
  state.lastCoinReward = amount;
  setFeed(`${reason}，金币 +${money(amount)}。当前金币 ${money(state.coins)}。`);
}

function gainCoins(amount, origin = "stage") {
  const value = Math.round(amount);
  if (value <= 0) return;
  state.coins += value;
  animateCoinGain(value, origin);
}

function relativePoint(element, fallbackX = 50, fallbackY = 50) {
  const frame = document.querySelector(".phone-frame");
  if (!frame || !element) return { x: fallbackX, y: fallbackY };
  const frameRect = frame.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left - frameRect.left + rect.width / 2,
    y: rect.top - frameRect.top + rect.height / 2,
  };
}

function animationOrigin(kind) {
  if (kind === "top") return relativePoint(els.coinCount, 214, 70);
  if (kind === "button") return relativePoint(els.rollBtn, 214, 785);
  if (kind === "modal") return { x: 215, y: 420 };
  if (kind === "center") return { x: 215, y: 430 };
  return relativePoint(document.querySelector(".stage"), 215, 430);
}

function animateCoinGain(amount, origin = "stage") {
  if (!els.coinLayer) return;
  const start = animationOrigin(origin);
  const target = relativePoint(els.coinCount, 300, 65);
  const count = Math.min(12, Math.max(6, Math.round(Math.log10(amount + 10) * 3)));
  const badge = document.createElement("div");
  badge.className = "coin-gain-badge";
  badge.textContent = `+${money(amount)}`;
  badge.style.setProperty("--sx", `${start.x}px`);
  badge.style.setProperty("--sy", `${start.y}px`);
  els.coinLayer.appendChild(badge);
  window.setTimeout(() => badge.remove(), 1100);

  for (let i = 0; i < count; i += 1) {
    const coin = document.createElement("span");
    coin.className = `coin-fly delay-${i % 8}`;
    const angle = (Math.PI * 2 * i) / count;
    const radius = 22 + (i % 4) * 9;
    const burstX = Math.cos(angle) * radius;
    const burstY = Math.sin(angle) * radius - 10;
    coin.style.setProperty("--sx", `${start.x}px`);
    coin.style.setProperty("--sy", `${start.y}px`);
    coin.style.setProperty("--tx", `${target.x}px`);
    coin.style.setProperty("--ty", `${target.y}px`);
    coin.style.setProperty("--burst-x", `${burstX}px`);
    coin.style.setProperty("--burst-y", `${burstY}px`);
    els.coinLayer.appendChild(coin);
    window.setTimeout(() => coin.remove(), 1200);
  }
}

function spendCoins(amount, reason) {
  const paid = Math.min(state.coins, amount);
  state.coins -= paid;
  setFeed(`${reason}，金币 -${money(paid)}。`);
  return paid;
}

function explainTile(index) {
  const tile = tileTypes[index];
  const explainMap = {
    start: "每次经过起点都会获得造星补贴。",
    coin: "稳定金币格，直接拿通告小钱。",
    chance: "热搜机会卡，可能上热门、捡补贴、也可能遇到小事故。",
    gift: "礼物雨，粉丝打赏到账。",
    bank: "进入金库抢麦，翻卡凑齐3个相同图标，属于大额收入事件。",
    shield: "获得粉丝守护，可抵挡一次小事故。",
    dice: "获得额外骰子，马上多走几步。",
    support: "后援会加码应援，获得金币和骰子。",
    risk: "小事故格，付钱概率较低，也可以看广告免除。",
  };
  showModal({
    kicker: "格子说明",
    title: tile.name,
    body: explainMap[tile.type],
    actions: [{ label: "知道了", onClick: closeModal }],
  });
}

function openManagerModal() {
  const cards = currentMap().artists.map((artist, index) => {
    const level = state.artists[index];
    const status = level <= 0
      ? `待签约 · ${money(upgradeCost(index))} 金币`
      : level >= 3
        ? `顶流 · 每圈 +${money(artistIncome(index))}`
        : `${levelNames[level]} · 培养需 ${money(upgradeCost(index))}`;
    return `
      <button class="manager-card ${level >= 3 ? "max" : ""}" data-index="${index}">
        <span class="manager-portrait">${level > 0 ? artist.name.slice(0, 1) : "?"}</span>
        <b>${artist.name}</b>
        <small>${artist.trait}</small>
        <em>${status}</em>
      </button>
    `;
  }).join("");

  showModal({
    kicker: "经纪公司",
    title: "签约艺人，提升每圈分成",
    body: "",
    reward: `当前经过起点 +${money(startIncome())} 金币`,
    wide: true,
    customHtml: `
      <p class="manager-copy">签约和培养都只在这里进行。艺人等级越高，每次经过地图起点获得的通告分成越多。</p>
      <div class="manager-grid">${cards}</div>
    `,
    actions: [{ label: "返回巡演地图", onClick: closeModal }],
  });

  document.querySelectorAll(".manager-card").forEach((button) => {
    button.addEventListener("click", () => openArtistModal(Number(button.dataset.index)));
  });
}

function openArtistModal(index) {
  const artist = currentMap().artists[index];
  const level = state.artists[index];
  const isSigned = level > 0;
  const isMax = level >= 3;
  const cost = upgradeCost(index);
  const title = isSigned ? `${artist.name} · ${levelNames[level]}` : `签约${artist.name}`;
  const body = isSigned
    ? `${artist.trait}。当前每次经过地图起点可获得 ${money(artistIncome(index))} 金币通告分成。培养后分成更高。`
    : `${artist.trait}。签约后会加入经纪公司，并在每次经过地图起点时自动结算通告分成。`;
  const actions = [];

  if (!isMax) {
    actions.push({
      label: `${isSigned ? "培养" : "签约"}：${money(cost)}金币`,
      onClick: () => buyOrUpgradeArtist(index),
    });
    actions.push({
      label: "看广告免费培养",
      className: "ad-action",
      onClick: () => {
        state.artists[index] += 1;
        bumpTask("train");
        setFeed(`模拟广告完成，${artist.name} 升到「${levelNames[state.artists[index]]}」。`);
        closeModal();
        maybeUnlockMap();
      },
    });
  } else if (allArtistsMaxed()) {
    actions.push({ label: "解锁下一张地图", onClick: unlockNextMap });
  } else {
    actions.push({ label: "满级了", onClick: closeModal });
  }

  showModal({
    kicker: isSigned ? "艺人培养" : "待签约艺人",
    title,
    body,
    reward: isMax ? "已成顶流" : `需要 ${money(cost)} 金币`,
    actions,
  });
}

function buyOrUpgradeArtist(index) {
  const artist = currentMap().artists[index];
  const level = state.artists[index];
  if (level >= 3) return;
  const cost = upgradeCost(index);
  if (state.coins < cost) {
    showModal({
      kicker: "金币不足",
      title: "老板，预算不够",
      body: `${artist.name} 的签约/培养需要 ${money(cost)} 金币。可以继续掷骰，或者模拟看广告拉一笔赞助。`,
      reward: `当前 ${money(state.coins)} 金币`,
      actions: [
        {
          label: "看广告 +5000金币",
          className: "ad-action",
          onClick: () => {
            addCoins(5000, "赞助商补贴到账");
            closeModal();
          },
        },
        { label: "继续巡演", onClick: closeModal },
      ],
    });
    return;
  }
  state.coins -= cost;
  state.artists[index] += 1;
  bumpTask("train");
  const verb = level <= 0 ? "签约" : "培养";
  setFeed(`${verb}${artist.name}成功，当前「${levelNames[state.artists[index]]}」，通告分成提升到 ${money(artistIncome(index))}。`);
  closeModal();
  maybeUnlockMap();
}

function maybeUnlockMap() {
  if (!allArtistsMaxed()) return;
  showModal({
    kicker: "地图完成",
    title: `${currentMap().name} 全员顶流`,
    body: `4位艺人都培养到顶流，可以解锁下一批艺人与地图：${currentMap().next}。`,
    reward: "+10000 金币 +10骰子",
    actions: [
      { label: "解锁下一张地图", onClick: unlockNextMap },
      { label: "先留在本地图", className: "plain-action", onClick: closeModal },
    ],
  });
}

function unlockNextMap() {
  gainCoins(10000, "center");
  state.dice += 10;
  state.mapIndex = (state.mapIndex + 1) % mapTemplates.length;
  state.position = 0;
  state.artists = [0, 0, 0, 0];
  state.lastCoinReward = 10000;
  renderBoard();
  setFeed(`新地图已开启：${currentMap().name}。上一站通关奖 +10000金币、+10骰子。`);
  closeModal();
}

async function rollDice() {
  if (state.moving) return;
  if (state.dice <= 0) {
    showModal({
      kicker: "骰子不足",
      title: "巡演门票用完了",
      body: "可以去每日任务、艺人图鉴领骰子，也可以模拟看广告补骰。",
      actions: [
        { label: "看广告 +5骰子", className: "ad-action", onClick: grantAdDice },
        { label: "打开每日任务", onClick: openDailyTaskModal },
        { label: "打开艺人图鉴", className: "plain-action", onClick: openGalleryModal },
      ],
    });
    return;
  }

  state.moving = true;
  state.dice -= 1;
  bumpTask("roll");
  const roll = randomInt(1, 6);
  els.rollBtn.classList.remove("show-result");
  els.rollBtn.classList.add("rolling");
  els.diceFace.textContent = "";
  setFeed(`掷出 ${roll} 点，造星巡演开始。`);
  render();

  let passIncome = 0;
  for (let step = 0; step < roll; step += 1) {
    await wait(220);
    state.position = (state.position + 1) % tileTypes.length;
    if (state.position === 0) {
      const startBonus = startIncome();
      state.coins += startBonus;
      passIncome += startBonus;
    }
    render();
  }

  state.moving = false;
  els.rollBtn.classList.remove("rolling");
  els.diceFace.textContent = String(roll);
  els.rollBtn.classList.add("show-result");
  window.setTimeout(() => els.rollBtn.classList.remove("show-result"), 760);
  if (passIncome > 0) {
    state.lastCoinReward = passIncome;
    animateCoinGain(passIncome, "button");
    setFeed(`经过巡演起点，经纪公司通告分成到账 ${money(passIncome)} 金币。`);
  }
  handleTile(state.position);
  render();
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function handleTile(index) {
  const tile = tileTypes[index];
  switch (tile.type) {
    case "start":
      showSimpleReward("造星起点", "平台发放本轮巡演启动补贴。", Math.round(1200 * currentMap().scale));
      break;
    case "coin":
      showSimpleReward("通告小钱", "接了一个顺路商演。", randomInt(900, 1800) * currentMap().scale);
      break;
    case "gift":
      showSimpleReward("礼物雨", "粉丝：老板别拦我，我要送！", randomInt(2200, 5200) * currentMap().scale);
      break;
    case "shield":
      state.shields += 1;
      showModal({
        kicker: "粉丝守护",
        title: "获得1个护盾",
      body: "粉丝后援会已就位，可以抵挡一次小事故。",
        reward: `当前护盾 ${state.shields}`,
        actions: [{ label: "收下", onClick: closeModal }],
      });
      setFeed("粉丝守护团上线，护盾 +1。");
      break;
    case "risk":
      handleRisk();
      break;
    case "chance":
      handleChance();
      break;
    case "bank":
      openBankHeist();
      break;
    case "dice":
      showDiceReward("骰子补给", "路演车刚好路过，补给了几颗骰子。", randomInt(2, 4));
      break;
    case "support":
      handleSupport();
      break;
    default:
      break;
  }
}

function showDiceReward(title, body, amount) {
  state.dice += amount;
  setFeed(`${title}：骰子 +${amount}。`);
  showModal({
    kicker: "骰子到账",
    title,
    body,
    reward: `+${amount} 骰子`,
    actions: [{ label: "继续巡演", onClick: closeModal }],
  });
}

function handleSupport() {
  const dice = randomInt(1, 3);
  const coins = Math.round(randomInt(1200, 2600) * currentMap().scale);
  state.dice += dice;
  gainCoins(coins, "modal");
  state.lastCoinReward = coins;
  bumpTask("support");
  setFeed(`后援会应援到账：金币 +${money(coins)}，骰子 +${dice}。`);
  showModal({
    kicker: "后援会加码",
    title: "应援站全员到位",
    body: "粉丝把应援车开到了现场，通告补贴和骰子一起到账。",
    reward: `+${money(coins)} 金币 +${dice} 骰子`,
    actions: [
      { label: "收下应援", onClick: closeModal },
      { label: "看广告加倍应援", className: "ad-action", onClick: () => multiplyLastReward(1) },
    ],
  });
}

function showSimpleReward(title, body, rawAmount) {
  const amount = Math.round(rawAmount);
  gainCoins(amount, "modal");
  state.lastCoinReward = amount;
  setFeed(`${title}：${body} 金币 +${money(amount)}。`);
  showModal({
    kicker: "金币到账",
    title,
    body,
    reward: `+${money(amount)} 金币`,
    actions: [
      { label: "开心收下", onClick: closeModal },
      { label: "看广告翻3倍", className: "ad-action", onClick: () => multiplyLastReward(2) },
    ],
  });
}

function handleRisk() {
  const noPay = Math.random() < 0.68;
  if (noPay) {
    showSimpleReward("小事故反转", "麦克风差点没电，结果赞助商直接送来新设备。", randomInt(1000, 2600) * currentMap().scale);
    return;
  }

  const amount = Math.round(randomInt(450, 900) * currentMap().scale);
  const actions = [];
  if (state.shields > 0) {
    actions.push({
      label: "使用护盾抵挡",
      onClick: () => {
        state.shields -= 1;
        setFeed(`粉丝守护抵挡了 ${money(amount)} 金币维修费。`);
        closeModal();
      },
    });
  }
  actions.push({
    label: `支付 ${money(amount)} 金币`,
    onClick: () => {
      spendCoins(amount, "支付临时维修费");
      closeModal();
    },
  });
  actions.push({
    label: "看广告免费维修",
    className: "ad-action",
    onClick: () => {
      setFeed("模拟广告完成，本次维修费已免除。");
      closeModal();
    },
  });
  showModal({
    kicker: "小事故",
    title: "耳返突然失灵",
      body: "小概率付费事件。金额很低，也可以用护盾或广告免除。",
    reward: `-${money(amount)} 金币`,
    actions,
  });
}

function handleChance() {
  const events = [
    {
      title: "跑调也上热门",
      body: "评论区全在哈哈哈，播放量反而爆了。",
      reward: () => ({ coins: randomInt(2800, 6200), dice: 0, shields: 0 }),
    },
    {
      title: "老板把歌设成闹钟",
      body: "全公司被迫循环播放，活动补贴到账。",
      reward: () => ({ coins: randomInt(1800, 3600), dice: randomInt(2, 4), shields: 0 }),
    },
    {
      title: "粉丝自发控评",
      body: "后援会火速赶到，黑评区变成夸夸楼。",
      reward: () => ({ coins: randomInt(800, 1800), dice: 0, shields: 1 }),
    },
    {
      title: "合唱突然神同步",
      body: "路人以为你们排练了三个月。",
      reward: () => ({ coins: randomInt(2400, 5200), dice: randomInt(1, 3), shields: 0 }),
    },
    {
      title: "热搜词条写错名",
      body: "名字错了，钱没错，平台补偿到账。",
      reward: () => ({ coins: randomInt(2000, 4800), dice: 0, shields: 0 }),
    },
    {
      title: "麦克风被顺走",
      body: "工作人员：刚才那个不是道具吗？",
      penalty: true,
      reward: () => ({ coins: -randomInt(400, 900), dice: 0, shields: 0 }),
    },
  ];
  const event = events[randomInt(0, events.length - 1)];
  const reward = event.reward();
  const amount = Math.round(reward.coins * currentMap().scale);

  const apply = () => {
    if (amount > 0) {
      gainCoins(amount, "modal");
    } else {
      state.coins += amount;
    }
    state.dice += reward.dice;
    state.shields += reward.shields;
    state.lastCoinReward = amount > 0 ? amount : 0;
    const parts = [];
    if (amount !== 0) parts.push(`${amount > 0 ? "+" : "-"}${money(Math.abs(amount))}金币`);
    if (reward.dice) parts.push(`+${reward.dice}骰子`);
    if (reward.shields) parts.push(`+${reward.shields}护盾`);
    setFeed(`${event.title}：${parts.join("，") || "无额外变化"}。`);
    closeModal();
  };

  const actions = event.penalty
    ? [
        { label: "认了", onClick: apply },
        {
          label: "看广告找回麦克风",
          className: "ad-action",
          onClick: () => {
            setFeed("模拟广告完成，麦克风找回来了。");
            closeModal();
          },
        },
      ]
    : [
        { label: "开心收下", onClick: apply },
        {
          label: "看广告奖励翻3倍",
          className: "ad-action",
          onClick: () => {
            reward.coins *= 3;
            apply();
          },
        },
      ];

  showModal({
    kicker: "热搜机会卡",
    title: event.title,
    body: event.body,
    reward: amount === 0
      ? `${reward.dice ? `+${reward.dice}骰子` : ""}${reward.shields ? `+${reward.shields}护盾` : ""}`
      : `${amount > 0 ? "+" : "-"}${money(Math.abs(amount))} 金币`,
    actions,
  });
}

function openBankHeist() {
  const symbolInfo = {
    gold: { label: "金麦", reward: "big", icon: "🎤" },
    cash: { label: "金币", reward: "cash", icon: "币" },
    dice: { label: "骰子", reward: "dice", icon: "骰" },
    fan: { label: "粉丝", reward: "fan", icon: "粉" },
  };
  const prizePreview = {
    gold: `最高 ${money(Math.round(26888 * currentMap().scale))} 金币`,
    cash: `最高 ${money(Math.round(16888 * currentMap().scale))} 金币`,
    fan: `最高 ${money(Math.round(12888 * currentMap().scale))} 金币`,
    dice: "最高 16 骰子",
  };
  const symbols = shuffle(["gold", "gold", "gold", "cash", "cash", "cash", "dice", "dice", "dice", "fan", "fan", "fan"]);
  const counts = {};
  let finished = false;

  showModal({
    kicker: "金库抢麦",
    title: "翻牌凑齐3个相同图标",
    body: "",
    reward: "大额收入事件",
    wide: true,
    customHtml: `
      <div class="heist-copy">翻开保险柜，最先凑齐3个相同图标就结算奖励。</div>
      <div class="heist-prize-grid" aria-label="集齐三张后的最高奖励">
        ${["gold", "cash", "fan", "dice"].map((symbol) => `
          <div class="heist-prize ${symbol}">
            <span>${symbolInfo[symbol].icon}</span>
            <div><b>3个${symbolInfo[symbol].label}</b><small>${prizePreview[symbol]}</small></div>
          </div>
        `).join("")}
      </div>
      <div class="heist-board">
        ${symbols.map((symbol, index) => `<button class="heist-card" data-index="${index}" data-symbol="${symbol}">?</button>`).join("")}
      </div>
      <div class="heist-status" id="heistStatus">金麦大奖最高，先凑齐任意一组就能领奖。</div>
    `,
    actions: [{ label: "先不抢了", className: "plain-action", onClick: closeModal }],
  });

  document.querySelectorAll(".heist-card").forEach((card) => {
    card.addEventListener("click", () => {
      if (finished || card.classList.contains("revealed")) return;
      const symbol = card.dataset.symbol;
      card.classList.add("revealed", symbol);
      card.textContent = symbolInfo[symbol].icon;
      counts[symbol] = (counts[symbol] || 0) + 1;
      document.querySelector("#heistStatus").textContent = `${symbolInfo[symbol].label} 已翻到 ${counts[symbol]}/3`;
      if (counts[symbol] >= 3) {
        finished = true;
        finishHeist(symbol, symbolInfo[symbol]);
      }
    });
  });
}

function finishHeist(symbol, info) {
  let coinReward = 0;
  let diceReward = 0;
  if (symbol === "gold") coinReward = Math.round(randomInt(16888, 26888) * currentMap().scale);
  if (symbol === "cash") coinReward = Math.round(randomInt(9888, 16888) * currentMap().scale);
  if (symbol === "fan") coinReward = Math.round(randomInt(6888, 12888) * currentMap().scale);
  if (symbol === "dice") diceReward = randomInt(8, 16);

  gainCoins(coinReward, "modal");
  state.dice += diceReward;
  state.lastCoinReward = coinReward;
  bumpTask("bank");
  const rewardText = coinReward > 0 ? `+${money(coinReward)} 金币` : `+${diceReward} 骰子`;
  els.modalKicker.textContent = "抢麦成功";
  els.modalTitle.textContent = `凑齐3个${info.label}`;
  els.modalReward.hidden = false;
  els.modalReward.textContent = rewardText;
  document.querySelector("#heistStatus").textContent = `奖励已到账：${rewardText}`;
  setModalActions([
    { label: "收下奖励", onClick: closeModal },
    {
      label: "看广告奖励翻倍",
      className: "ad-action",
      onClick: () => {
        if (coinReward > 0) {
          gainCoins(coinReward, "modal");
          setFeed(`金库广告翻倍，再得 ${money(coinReward)} 金币。`);
        } else {
          state.dice += diceReward;
          setFeed(`金库广告翻倍，再得 ${diceReward} 骰子。`);
        }
        closeModal();
      },
    },
  ]);
  setFeed(`金库抢麦成功，${rewardText}。`);
  render();
}

function openDailyTaskModal() {
  const rows = taskDefs.map((task) => {
    const progress = Math.min(state.tasks.progress[task.key] || 0, task.need);
    const claimed = state.tasks.claimed[task.key];
    const ready = progress >= task.need && !claimed;
    return `
      <div class="task-row">
        <div>
          <b>${task.label}</b>
          <span>${progress}/${task.need} · 奖励 ${task.reward} 骰子</span>
        </div>
        <button class="task-claim" data-key="${task.key}" ${ready ? "" : "disabled"}>${claimed ? "已领" : ready ? "领取" : "未完成"}</button>
      </div>
    `;
  }).join("");
  showModal({
    kicker: "每日任务",
    title: "多拿骰子继续跑",
    body: "",
    reward: "完成任务领骰子",
    wide: true,
    customHtml: `<div class="task-list">${rows}</div>`,
    actions: [{ label: "关闭", onClick: closeModal }],
  });
  document.querySelectorAll(".task-claim").forEach((button) => {
    button.addEventListener("click", () => claimTask(button.dataset.key));
  });
}

function claimTask(key) {
  const task = taskDefs.find((item) => item.key === key);
  if (!task || state.tasks.claimed[key]) return;
  if ((state.tasks.progress[key] || 0) < task.need) return;
  state.tasks.claimed[key] = true;
  state.dice += task.reward;
  setFeed(`每日任务「${task.label}」完成，骰子 +${task.reward}。`);
  render();
  openDailyTaskModal();
}

function galleryKey(index, type) {
  return `${state.mapIndex}-${index}-${type}`;
}

function openGalleryModal() {
  const cards = currentMap().artists.map((artist, index) => {
    const level = state.artists[index];
    const signedKey = galleryKey(index, "signed");
    const maxKey = galleryKey(index, "max");
    const canClaimSigned = level > 0 && !state.galleryClaims[signedKey];
    const canClaimMax = level >= 3 && !state.galleryClaims[maxKey];
    const signedText = level <= 0 ? "签约后解锁" : state.galleryClaims[signedKey] ? "签约奖已领" : "签约奖 +2骰";
    const maxText = level < 3 ? "顶流后解锁" : state.galleryClaims[maxKey] ? "顶流奖已领" : "顶流奖 +8骰";
    return `
      <div class="gallery-card ${level > 0 ? "unlocked" : "locked"}">
        <div class="gallery-portrait">${level > 0 ? artist.name.slice(0, 1) : "?"}</div>
        <b>${artist.name}</b>
        <span>${levelNames[level]}</span>
        <button class="gallery-claim" data-index="${index}" data-type="signed" ${canClaimSigned ? "" : "disabled"}>${signedText}</button>
        <button class="gallery-claim" data-index="${index}" data-type="max" ${canClaimMax ? "" : "disabled"}>${maxText}</button>
      </div>
    `;
  }).join("");
  showModal({
    kicker: "艺人图鉴",
    title: "签约和满级都能领骰子",
    body: "",
    reward: "收集驱动投骰",
    wide: true,
    customHtml: `<div class="gallery-wall">${cards}</div>`,
    actions: [{ label: "关闭", onClick: closeModal }],
  });
  document.querySelectorAll(".gallery-claim").forEach((button) => {
    button.addEventListener("click", () => claimGallery(Number(button.dataset.index), button.dataset.type));
  });
}

function claimGallery(index, type) {
  const level = state.artists[index];
  const key = galleryKey(index, type);
  if (state.galleryClaims[key]) return;
  if (type === "signed" && level <= 0) return;
  if (type === "max" && level < 3) return;
  const reward = type === "signed" ? 2 : 8;
  state.galleryClaims[key] = true;
  state.dice += reward;
  bumpTask("gallery");
  setFeed(`艺人图鉴奖励已领取，骰子 +${reward}。`);
  render();
  openGalleryModal();
}

function multiplyLastReward(multiplier) {
  if (state.lastCoinReward <= 0) {
    closeModal();
    return;
  }
  const bonus = state.lastCoinReward * multiplier;
  gainCoins(bonus, "modal");
  setFeed(`模拟广告完成，追加翻倍奖励 +${money(bonus)} 金币。`);
  state.lastCoinReward = 0;
  closeModal();
}

function grantAdDice() {
  state.dice += 5;
  setFeed("模拟广告完成，骰子 +5。");
  closeModal();
  render();
}

function grantAdCoins() {
  if (state.lastCoinReward > 0) {
    multiplyLastReward(1);
    return;
  }
  const amount = 1800;
  gainCoins(amount, "button");
  setFeed(`模拟广告补贴到账，金币 +${money(amount)}。`);
  render();
}

function collectOfflineIncome() {
  const signed = state.artists.filter((level) => level > 0).length;
  const amount = Math.max(1800, totalTourIncome() * 2 + signed * 1200);
  gainCoins(amount, "stage");
  state.lastCoinReward = amount;
  bumpTask("collect");
  showModal({
    kicker: "通告收益",
    title: "艺人分成到账",
    body: "根据当前签约艺人等级结算一笔挂机收益。",
    reward: `+${money(amount)} 金币`,
    actions: [
      { label: "领取", onClick: closeModal },
      { label: "看广告领双倍", className: "ad-action", onClick: () => multiplyLastReward(1) },
    ],
  });
  setFeed(`通告收益到账，金币 +${money(amount)}。`);
  render();
}

els.rollBtn.addEventListener("click", rollDice);
els.adDiceBtn.addEventListener("click", grantAdDice);
els.adCoinBtn.addEventListener("click", grantAdCoins);
els.collectOfflineBtn.addEventListener("click", collectOfflineIncome);
els.managerBtn.addEventListener("click", openManagerModal);
els.dailyTaskBtn.addEventListener("click", openDailyTaskModal);
els.galleryBtn.addEventListener("click", openGalleryModal);
els.modalClose.addEventListener("click", closeModal);
els.modalBackdrop.addEventListener("click", (event) => {
  if (event.target === els.modalBackdrop) closeModal();
});

renderBoard();
render();
setFeed("先去经纪公司签约艺人。投骰子走格子，经过起点可结算通告分成。");
