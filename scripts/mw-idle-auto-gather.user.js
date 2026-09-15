// ==UserScript==
// @name         MW Idle Auto Triple Gather
// @name:en      MW Idle Auto Triple Gather
// @name:zh      MW Idle 空闲自动三采
// @name:zh-CN   MW Idle 空闲自动三采
// @name:zh-TW   MW Idle 空閒自動三採
// @namespace    mwidle-auto
// @version      2.5.0
// @description  When idle, auto-start a chosen gathering action (Milking / Foraging / Woodcutting) and target.
// @description:en  When idle, auto-start a chosen gathering action (Milking / Foraging / Woodcutting) and target.
// @description:zh  无所事事时自动执行自选三采动作（挤奶/采集/伐木）和目标。界面支持简体、繁体、English。
// @description:zh-CN 无所事事时自动执行自选三采动作（挤奶/采集/伐木）和目标。界面支持简体、繁体、English。
// @description:zh-TW 無所事事時自動執行自選三採動作（擠奶/採集/伐木）和目標。介面支援簡體、繁體、English。
// @author       based on Jireh
// @match        https://www.milkywayidle.com/*
// @match        https://test.milkywayidle.com/*
// @match        https://www.milkywayidlecn.com/*
// @match        https://test.milkywayidlecn.com/*
// @grant        none
// @run-at       document-start
// @noframes
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/Jireh012/userscripts/main/scripts/mw-idle-auto-gather.user.js
// @updateURL    https://raw.githubusercontent.com/Jireh012/userscripts/main/scripts/mw-idle-auto-gather.user.js
// ==/UserScript==

(function () {
    'use strict';

    const VERSION = '2.5.0';
    const STORAGE_KEY = 'mwidle-auto-gather-config-v2';
    const CLICK_DELAY_MS = 900;
    const RUN_COOLDOWN_MS = 8000;
    const POLL_INTERVAL_MS = 30 * 1000;

    const I18N = {
        en: {
            title: 'Idle Triple Gather',
            enable: 'Enable (run when idle)',
            skill: 'Action',
            target: 'Target',
            infinite: 'Infinite count [\u221e]',
            keepalive: 'Keep alive in background (can start while the tab is hidden)',
            run: 'Run once now',
            running: 'Running\u2026',
            language: 'Language',
            'locale.auto': 'Auto',
            'locale.en': 'English',
            'locale.zh-CN': '简体中文',
            'locale.zh-TW': '繁體中文',
            tip: 'Background tabs are throttled. Enable keep-alive and click the game once. The script watches action completion, so you do not need to switch back.',
            waitLoad: 'Waiting for the game to load',
            executing: 'Starting the default action\u2026',
            trigger: 'Triggered by: {reason}',
            started: 'Started: {skill} / {target}',
            success: 'Started successfully',
            fail: 'Failed',
            saved: 'Saved: {skill} / {target}',
            visibleCards: 'Visible skill cards: {n}{list}',
            clickCard: 'Clicked card: {name}',
            clickName: 'Clicked name: {alias}',
            alreadyInfinite: 'Count is already infinite',
            clickedInfinite: 'Clicked infinite count',
            clickBtn: 'Clicked button: {text} ({width}px)',
            usedGameClick: 'Started with the in-game button handler',
            noBtnEvent: 'Could not reach the button handler; start may fail',
            startAlreadyOpen: 'Start button is already on the correct dialog',
            foundCore: 'Found game core',
            noCore: 'Game core not found',
            openedViaApi: 'Opened {label} {hrid}',
            apiError: 'Game open API threw an error',
            gotStart: 'Start button appeared',
            apiNoStart: 'API was called, but the Start button did not appear',
            onSkillPage: 'Already on the {skill} page',
            clickedNav: 'Clicked sidebar: {skill}',
            navMiss: 'Could not click sidebar "{skill}"',
            startAction: 'Starting: {skill} \u2192 {target}',
            errNoCard: 'Target card not found: {label}',
            errNoStartAfterClick: 'Clicked {label}, but the Start button did not appear',
            errNoStart: 'Start button not found',
            errStartClickFail: 'Found the Start button but the click failed',
            errStillIdle: 'Clicked Start, but the header is still "{header}", not {label}',
            'skill.milking': 'Milking',
            'skill.foraging': 'Foraging',
            'skill.woodcutting': 'Woodcutting',
            'target.milking.cow': 'Cow',
            'target.milking.verdant_cow': 'Verdant Cow',
            'target.milking.azure_cow': 'Azure Cow',
            'target.milking.burble_cow': 'Burble Cow',
            'target.milking.crimson_cow': 'Crimson Cow',
            'target.milking.unicow': 'Unicow',
            'target.milking.holy_cow': 'Holy Cow',
            'target.foraging.farmland': 'Farmland',
            'target.foraging.shimmering_lake': 'Shimmering Lake',
            'target.foraging.misty_forest': 'Misty Forest',
            'target.foraging.burble_beach': 'Burble Beach',
            'target.foraging.silly_cow_valley': 'Silly Cow Valley',
            'target.foraging.olympus_mons': 'Olympus Mons',
            'target.foraging.asteroid_belt': 'Asteroid Belt',
            'target.woodcutting.tree': 'Tree',
            'target.woodcutting.birch_tree': 'Birch Tree',
            'target.woodcutting.cedar_tree': 'Cedar Tree',
            'target.woodcutting.purpleheart_tree': 'Purpleheart Tree',
            'target.woodcutting.ginkgo_tree': 'Ginkgo Tree',
            'target.woodcutting.redwood_tree': 'Redwood Tree',
            'target.woodcutting.arcane_tree': 'Arcane Tree',
            'reason.websocket-empty-queue': 'empty action queue',
            'reason.worker-tick': 'background timer',
            'reason.dom-idle': 'idle in the header',
            'reason.tab-visible': 'tab became visible',
            'reason.tab-hidden': 'tab went to background',
            'reason.poll': 'periodic check',
            'reason.startup': 'startup',
            'reason.manual': 'manual'
        },
        'zh-CN': {
            title: '空闲自动三采',
            enable: '启用（无所事事时自动执行）',
            skill: '动作',
            target: '目标',
            infinite: '无限次数 [\u221e]',
            keepalive: '后台保活（离开页面也能自动开始）',
            run: '立即执行一次',
            running: '执行中\u2026',
            language: '语言',
            'locale.auto': '自动',
            'locale.en': 'English',
            'locale.zh-CN': '简体中文',
            'locale.zh-TW': '繁體中文',
            tip: '后台标签会被浏览器节流。请勾选「后台保活」，并在游戏页点击一次。脚本会监听动作完成，不必切回页面。',
            waitLoad: '等待游戏加载',
            executing: '正在执行默认动作\u2026',
            trigger: '触发来源：{reason}',
            started: '已开始：{skill} / {target}',
            success: '执行成功',
            fail: '执行失败',
            saved: '已保存：{skill} / {target}',
            visibleCards: '可见技能卡 {n} 张{list}',
            clickCard: '点击卡片：{name}',
            clickName: '点击名称：{alias}',
            alreadyInfinite: '次数已是无限',
            clickedInfinite: '已点无限次数',
            clickBtn: '点击按钮：{text} ({width}px)',
            usedGameClick: '已用游戏按钮事件开始',
            noBtnEvent: '未取到按钮事件，开始可能失败',
            startAlreadyOpen: '开始按钮已在正确弹窗上',
            foundCore: '已找到游戏核心',
            noCore: '未找到游戏核心',
            openedViaApi: '已调用打开：{label} {hrid}',
            apiError: '游戏打开接口报错',
            gotStart: '已等到开始按钮',
            apiNoStart: '接口已调用，但没出现开始按钮',
            onSkillPage: '已在{skill}页',
            clickedNav: '已点侧栏：{skill}',
            navMiss: '未点到侧栏「{skill}」',
            startAction: '开始执行：{skill} \u2192 {target}',
            errNoCard: '未找到目标卡片：{label}',
            errNoStartAfterClick: '已点{label}，但没等到开始按钮',
            errNoStart: '没有开始按钮',
            errStartClickFail: '找到过开始按钮但点击失败',
            errStillIdle: '点了开始，但顶部仍是「{header}」，不是{label}',
            'skill.milking': '挤奶',
            'skill.foraging': '采集',
            'skill.woodcutting': '伐木',
            'target.milking.cow': '奶牛',
            'target.milking.verdant_cow': '翠绿奶牛',
            'target.milking.azure_cow': '蔚蓝奶牛',
            'target.milking.burble_cow': '深紫奶牛',
            'target.milking.crimson_cow': '绛红奶牛',
            'target.milking.unicow': '彩虹奶牛',
            'target.milking.holy_cow': '神圣奶牛',
            'target.foraging.farmland': '翠野农场',
            'target.foraging.shimmering_lake': '波光湖泊',
            'target.foraging.misty_forest': '迷失森林',
            'target.foraging.burble_beach': '深紫沙滩',
            'target.foraging.silly_cow_valley': '傻牛山谷',
            'target.foraging.olympus_mons': '奥林匹斯山',
            'target.foraging.asteroid_belt': '小行星带',
            'target.woodcutting.tree': '树',
            'target.woodcutting.birch_tree': '桦树',
            'target.woodcutting.cedar_tree': '雪松树',
            'target.woodcutting.purpleheart_tree': '紫心树',
            'target.woodcutting.ginkgo_tree': '银杏树',
            'target.woodcutting.redwood_tree': '红杉树',
            'target.woodcutting.arcane_tree': '奥秘树',
            'reason.websocket-empty-queue': '动作队列清空',
            'reason.worker-tick': '后台计时',
            'reason.dom-idle': '顶部显示无所事事',
            'reason.tab-visible': '切回游戏页',
            'reason.tab-hidden': '切到后台',
            'reason.poll': '定时检查',
            'reason.startup': '启动',
            'reason.manual': '手动'
        },
        'zh-TW': {
            title: '空閒自動三採',
            enable: '啟用（無所事事時自動執行）',
            skill: '動作',
            target: '目標',
            infinite: '無限次數 [\u221e]',
            keepalive: '背景保活（離開頁面也能自動開始）',
            run: '立即執行一次',
            running: '執行中\u2026',
            language: '語言',
            'locale.auto': '自動',
            'locale.en': 'English',
            'locale.zh-CN': '简体中文',
            'locale.zh-TW': '繁體中文',
            tip: '背景分頁會被瀏覽器節流。請勾選「背景保活」，並在遊戲頁點擊一次。腳本會監聽動作完成，不必切回頁面。',
            waitLoad: '等待遊戲載入',
            executing: '正在執行預設動作\u2026',
            trigger: '觸發來源：{reason}',
            started: '已開始：{skill} / {target}',
            success: '執行成功',
            fail: '執行失敗',
            saved: '已儲存：{skill} / {target}',
            visibleCards: '可見技能卡 {n} 張{list}',
            clickCard: '點擊卡片：{name}',
            clickName: '點擊名稱：{alias}',
            alreadyInfinite: '次數已是無限',
            clickedInfinite: '已點無限次數',
            clickBtn: '點擊按鈕：{text} ({width}px)',
            usedGameClick: '已用遊戲按鈕事件開始',
            noBtnEvent: '未取得按鈕事件，開始可能失敗',
            startAlreadyOpen: '開始按鈕已在正確彈窗上',
            foundCore: '已找到遊戲核心',
            noCore: '未找到遊戲核心',
            openedViaApi: '已呼叫開啟：{label} {hrid}',
            apiError: '遊戲開啟介面報錯',
            gotStart: '已等到開始按鈕',
            apiNoStart: '介面已呼叫，但沒出現開始按鈕',
            onSkillPage: '已在{skill}頁',
            clickedNav: '已點側欄：{skill}',
            navMiss: '未點到側欄「{skill}」',
            startAction: '開始執行：{skill} \u2192 {target}',
            errNoCard: '未找到目標卡片：{label}',
            errNoStartAfterClick: '已點{label}，但沒等到開始按鈕',
            errNoStart: '沒有開始按鈕',
            errStartClickFail: '找到過開始按鈕但點擊失敗',
            errStillIdle: '點了開始，但頂部仍是「{header}」，不是{label}',
            'skill.milking': '擠奶',
            'skill.foraging': '採集',
            'skill.woodcutting': '伐木',
            'target.milking.cow': '奶牛',
            'target.milking.verdant_cow': '翠綠奶牛',
            'target.milking.azure_cow': '蔚藍奶牛',
            'target.milking.burble_cow': '深紫奶牛',
            'target.milking.crimson_cow': '絳紅奶牛',
            'target.milking.unicow': '彩虹奶牛',
            'target.milking.holy_cow': '神聖奶牛',
            'target.foraging.farmland': '翠野農場',
            'target.foraging.shimmering_lake': '波光湖泊',
            'target.foraging.misty_forest': '迷失森林',
            'target.foraging.burble_beach': '深紫沙灘',
            'target.foraging.silly_cow_valley': '傻牛山谷',
            'target.foraging.olympus_mons': '奧林匹斯山',
            'target.foraging.asteroid_belt': '小行星帶',
            'target.woodcutting.tree': '樹',
            'target.woodcutting.birch_tree': '樺樹',
            'target.woodcutting.cedar_tree': '雪松樹',
            'target.woodcutting.purpleheart_tree': '紫心樹',
            'target.woodcutting.ginkgo_tree': '銀杏樹',
            'target.woodcutting.redwood_tree': '紅杉樹',
            'target.woodcutting.arcane_tree': '奧秘樹',
            'reason.websocket-empty-queue': '動作佇列清空',
            'reason.worker-tick': '背景計時',
            'reason.dom-idle': '頂部顯示無所事事',
            'reason.tab-visible': '切回遊戲頁',
            'reason.tab-hidden': '切到背景',
            'reason.poll': '定時檢查',
            'reason.startup': '啟動',
            'reason.manual': '手動'
        }
    };

    const SKILLS = {
        milking: {
            id: 'milking',
            aliases: ['挤奶', '擠奶', 'Milking']
        },
        foraging: {
            id: 'foraging',
            aliases: ['采集', '採集', '采摘', '採摘', 'Foraging']
        },
        woodcutting: {
            id: 'woodcutting',
            aliases: ['伐木', 'Woodcutting']
        }
    };

    const TARGETS = {
        milking: [
            { id: 'cow', hrid: '/actions/milking/cow', aliases: ['奶牛', 'Cow'] },
            { id: 'verdant_cow', hrid: '/actions/milking/verdant_cow', aliases: ['翠绿奶牛', '翠綠奶牛', 'Verdant Cow'] },
            { id: 'azure_cow', hrid: '/actions/milking/azure_cow', aliases: ['蔚蓝奶牛', '蔚藍奶牛', 'Azure Cow'] },
            { id: 'burble_cow', hrid: '/actions/milking/burble_cow', aliases: ['深紫奶牛', 'Burble Cow'] },
            { id: 'crimson_cow', hrid: '/actions/milking/crimson_cow', aliases: ['绛红奶牛', '絳紅奶牛', '深红奶牛', '深紅奶牛', 'Crimson Cow'] },
            { id: 'unicow', hrid: '/actions/milking/unicow', aliases: ['彩虹奶牛', 'Unicow'] },
            { id: 'holy_cow', hrid: '/actions/milking/holy_cow', aliases: ['神圣奶牛', '神聖奶牛', '圣牛', '聖牛', 'Holy Cow'] }
        ],
        foraging: [
            { id: 'farmland', hrid: '/actions/foraging/farmland', aliases: ['翠野农场', '翠野農場', '农场', '農場', '农田', '農田', 'Farmland'] },
            { id: 'shimmering_lake', hrid: '/actions/foraging/shimmering_lake', aliases: ['波光湖泊', '波光湖', 'Shimmering Lake'] },
            { id: 'misty_forest', hrid: '/actions/foraging/misty_forest', aliases: ['迷失森林', '迷雾森林', '迷霧森林', 'Misty Forest'] },
            { id: 'burble_beach', hrid: '/actions/foraging/burble_beach', aliases: ['深紫沙滩', '深紫沙灘', 'Burble Beach'] },
            { id: 'silly_cow_valley', hrid: '/actions/foraging/silly_cow_valley', aliases: ['傻牛山谷', '傻牛谷', 'Silly Cow Valley'] },
            { id: 'olympus_mons', hrid: '/actions/foraging/olympus_mons', aliases: ['奥林匹斯山', '奧林匹斯山', 'Olympus Mons'] },
            { id: 'asteroid_belt', hrid: '/actions/foraging/asteroid_belt', aliases: ['小行星带', '小行星帶', 'Asteroid Belt'] }
        ],
        woodcutting: [
            { id: 'tree', hrid: '/actions/woodcutting/tree', aliases: ['树', '樹', 'Tree'] },
            { id: 'birch_tree', hrid: '/actions/woodcutting/birch_tree', aliases: ['桦树', '樺樹', '白桦', '白樺', '白桦树', '白樺樹', 'Birch Tree'] },
            { id: 'cedar_tree', hrid: '/actions/woodcutting/cedar_tree', aliases: ['雪松树', '雪松樹', 'Cedar Tree'] },
            { id: 'purpleheart_tree', hrid: '/actions/woodcutting/purpleheart_tree', aliases: ['紫心树', '紫心樹', '紫心木', '紫心木树', '紫心木樹', 'Purpleheart Tree'] },
            { id: 'ginkgo_tree', hrid: '/actions/woodcutting/ginkgo_tree', aliases: ['银杏树', '銀杏樹', 'Ginkgo Tree'] },
            { id: 'redwood_tree', hrid: '/actions/woodcutting/redwood_tree', aliases: ['红杉树', '紅杉樹', '红木树', '紅木樹', 'Redwood Tree'] },
            { id: 'arcane_tree', hrid: '/actions/woodcutting/arcane_tree', aliases: ['奥秘树', '奧秘樹', 'Arcane Tree'] }
        ]
    };

    const IDLE_TEXT_RE = /无所事事|無所事事|正在空闲|正在空閒|\bIdle\b|\bIdling\b|Doing nothing/i;
    const LOCALES = ['en', 'zh-CN', 'zh-TW'];

    const DEFAULT_CONFIG = {
        enabled: true,
        skill: 'milking',
        targets: {
            milking: 'cow',
            foraging: 'farmland',
            woodcutting: 'arcane_tree'
        },
        infinite: true,
        observeIdle: true,
        keepalive: true,
        collapsed: false,
        locale: 'auto'
    };

    let config = loadConfig();
    let running = false;
    let lastRunAt = 0;
    let lastReason = '';
    let lastStatus = '';
    let audioKeepAlive = null;
    let trackedActions = null;
    const ui = { root: null, status: null, log: null };
    let timerWorker = null;
    let sleepWaiters = {};
    let sleepSeq = 0;
    let localeCache = null;

    function loadConfig() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
            if (!saved || typeof saved !== 'object') return { ...DEFAULT_CONFIG, targets: { ...DEFAULT_CONFIG.targets } };
            const merged = {
                ...DEFAULT_CONFIG,
                ...saved,
                targets: { ...DEFAULT_CONFIG.targets, ...(saved.targets || {}) }
            };
            if (!saved.bgKeepaliveMigrated) {
                merged.keepalive = true;
                merged.bgKeepaliveMigrated = true;
            }
            if (!merged.locale) merged.locale = 'auto';
            return merged;
        } catch (e) {
            return { ...DEFAULT_CONFIG, targets: { ...DEFAULT_CONFIG.targets } };
        }
    }

    function saveConfig() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (e) {
            // ignore quota / private mode
        }
    }

    function inferLocaleFromGame() {
        try {
            const bits = [];
            const header = qs('Header_actionName');
            if (header) bits.push(norm(header.textContent));
            qsa('NavigationBar_label').forEach(function (el) { bits.push(norm(el.textContent)); });
            const blob = bits.join(' ');
            if (!blob) return null;
            if (/無所事事|正在空閒|擠奶|採集/.test(blob)) return 'zh-TW';
            if (/无所事事|正在空闲|挤奶|采集/.test(blob)) return 'zh-CN';
            if (/\bMilking\b|\bForaging\b|\bWoodcutting\b|\bIdle\b/.test(blob)) return 'en';
        } catch (e) {}
        return null;
    }

    function resolveLocale() {
        const pref = (config && config.locale) || 'auto';
        if (LOCALES.indexOf(pref) !== -1) return pref;
        const fromGame = inferLocaleFromGame();
        if (fromGame) return fromGame;
        try {
            if (/idlecn/i.test(location.hostname)) return 'zh-CN';
        } catch (e) {}
        const lang = String(
            (document.documentElement && document.documentElement.lang) ||
            navigator.language ||
            navigator.userLanguage ||
            'en'
        ).toLowerCase();
        if (lang.indexOf('zh-tw') === 0 || lang.indexOf('zh-hk') === 0 || lang.indexOf('zh-mo') === 0 || lang.indexOf('hant') !== -1) {
            return 'zh-TW';
        }
        if (lang.indexOf('zh') === 0) return 'zh-CN';
        return 'en';
    }

    function getLocale() {
        if (!localeCache) localeCache = resolveLocale();
        return localeCache;
    }

    function invalidateLocale() {
        localeCache = null;
    }

    function t(key, vars) {
        const loc = getLocale();
        const dict = I18N[loc] || I18N.en;
        let text = dict[key] || I18N.en[key] || key;
        if (vars) {
            Object.keys(vars).forEach(function (name) {
                text = text.split('{' + name + '}').join(String(vars[name]));
            });
        }
        return text;
    }

    function skillLabel(skill) {
        const id = typeof skill === 'string' ? skill : skill.id;
        return t('skill.' + id);
    }

    function targetLabel(target) {
        const id = typeof target === 'string' ? target : target.id;
        return t('target.' + config.skill + '.' + id);
    }

    function reasonText(reason) {
        const key = 'reason.' + reason;
        const translated = t(key);
        return translated === key ? String(reason || '') : translated;
    }

    function currentSkill() {
        return SKILLS[config.skill] || SKILLS.milking;
    }

    function currentTarget() {
        const list = TARGETS[config.skill] || TARGETS.milking;
        return list.find((item) => item.id === config.targets[config.skill]) || list[0];
    }

    function sleep(ms) {
        return new Promise(function (resolve) {
            if (timerWorker) {
                const id = ++sleepSeq;
                let done = false;
                const finish = function () {
                    if (done) return;
                    done = true;
                    delete sleepWaiters[id];
                    resolve();
                };
                sleepWaiters[id] = finish;
                try { timerWorker.postMessage({ t: 'sleep', id: id, ms: ms }); } catch (e) {}
                setTimeout(finish, ms + 1500);
                return;
            }
            setTimeout(resolve, ms);
        });
    }

    function norm(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function isVisible(el) {
        if (!el || !el.getBoundingClientRect) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    }

    function qs(prefix, root) {
        return (root || document).querySelector('[class*="' + prefix + '"]');
    }

    function qsa(prefix, root) {
        return Array.from((root || document).querySelectorAll('[class*="' + prefix + '"]'));
    }

    function nameMatches(text, aliases, exact) {
        const value = norm(text);
        if (!value) return false;
        return aliases.some((alias) => {
            if (exact) return value === alias;
            return value === alias || value.startsWith(alias);
        });
    }

    function getReactProps(el) {
        if (!el) return null;
        const keys = Reflect.ownKeys(el);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            if (typeof k === 'string' && k.indexOf('__reactProps$') === 0) return el[k];
        }
        return null;
    }

    function clickReactButton(button) {
        if (!button) return false;
        const nodes = [button];
        const kids = button.querySelectorAll('span, div, p');
        for (let i = 0; i < kids.length && i < 8; i++) nodes.push(kids[i]);
        for (let i = 0; i < nodes.length; i++) {
            const props = getReactProps(nodes[i]);
            if (props && typeof props.onClick === 'function') {
                try {
                    props.onClick({
                        preventDefault: function () {},
                        stopPropagation: function () {},
                        stopImmediatePropagation: function () {},
                        persist: function () {},
                        target: nodes[i],
                        currentTarget: nodes[i],
                        nativeEvent: { isTrusted: false, target: nodes[i], preventDefault: function () {}, stopPropagation: function () {} }
                    });
                    return true;
                } catch (e) {}
            }
        }
        return false;
    }

    function nativeClick(el) {
        if (!el) return false;
        try {
            el.click();
            return true;
        } catch (e) {
            return false;
        }
    }

    function press(el) {
        if (!el || !isVisible(el)) return false;
        if (clickReactButton(el)) return true;
        return nativeClick(el);
    }

    function getGameCore() {
        if (window.MWI_GAME_CORE && typeof window.MWI_GAME_CORE.sendPing === 'function') {
            return window.MWI_GAME_CORE;
        }
        try {
            const el = document.querySelector('[class*="GamePage_gamePage"]')
                || document.querySelector('[class*="GamePage_"]')
                || document.getElementById('root');
            if (!el) return null;
            const allKeys = Reflect.ownKeys(el);
            let key = null;
            for (let i = 0; i < allKeys.length; i++) {
                const k = allKeys[i];
                if (typeof k === 'string' && k.indexOf('__reactFiber$') === 0) {
                    key = k;
                    break;
                }
            }
            if (!key) {
                for (let i = 0; i < allKeys.length; i++) {
                    const k = allKeys[i];
                    if (typeof k === 'string' && k.indexOf('__reactInternalInstance$') === 0) {
                        key = k;
                        break;
                    }
                }
            }
            if (!key) return null;
            let fiber = el[key];
            let depth = 0;
            while (fiber && depth < 80) {
                const st = fiber.stateNode;
                if (st && typeof st.sendPing === 'function') {
                    window.MWI_GAME_CORE = st;
                    return st;
                }
                fiber = fiber.return;
                depth++;
            }
        } catch (e) {}
        return null;
    }

    function evalLegacyIdleNode() {
        try {
            const res = document.evaluate(
                '//*[@id="root"]/div/div/div[1]/div/div[1]/div[2]/div[1]/div/div[1]/div[2]',
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
            );
            return res.singleNodeValue;
        } catch (e) {
            return null;
        }
    }

    function getHeaderActionText() {
        const el = qs('Header_actionName') || evalLegacyIdleNode();
        return norm(el && el.textContent);
    }

    function isIdle() {
        if (Date.now() - lastRunAt < 12000 && running === false && trackedActions && trackedActions.size > 0) return false;
        if (trackedActions && trackedActions.size === 0) return true;
        return IDLE_TEXT_RE.test(getHeaderActionText());
    }

    function isTargetRunning() {
        const header = getHeaderActionText();
        const target = currentTarget();
        return target.aliases.some(function (alias) { return header.indexOf(alias) !== -1; }) && !IDLE_TEXT_RE.test(header);
    }

    function setStatus(text, extra) {
        lastStatus = text;
        if (ui.status) ui.status.textContent = text;
        if (extra) appendLog(extra);
    }

    let logLines = [];
    function appendLog(text) {
        if (!ui.log) return;
        const loc = getLocale();
        const timeLocale = loc === 'en' ? 'en-US' : loc;
        const time = new Date().toLocaleTimeString(timeLocale, { hour12: false });
        logLines.push('[' + time + '] ' + text);
        if (logLines.length > 5) logLines = logLines.slice(-5);
        ui.log.textContent = logLines.join('\n');
    }

    function clickNavSkill(skill) {
        const links = qsa('NavigationBar_navigationLink');
        for (const link of links) {
            const label = qs('NavigationBar_label', link) || link;
            if (nameMatches(label.textContent, skill.aliases, false) && isVisible(link)) {
                return nativeClick(link);
            }
        }
        return false;
    }

    function cardName(card) {
        const nameEl = qs('SkillAction_name', card);
        return cleanTitle((nameEl || card).textContent);
    }

    function visibleSkillCards() {
        return qsa('SkillAction_skillAction').filter(function (card) {
            return isVisible(card) && !/opaque/i.test(String(card.className || ''));
        });
    }

    function textHitsAlias(text, aliases) {
        const value = cleanTitle(text);
        if (!value) return false;
        return aliases.some(function (alias) {
            return value === alias || value.indexOf(alias) !== -1;
        });
    }

    function isOnSkillPage(skill) {
        const targets = TARGETS[skill.id] || [];
        return visibleSkillCards().some(function (card) {
            const text = cardName(card);
            return targets.some(function (item) { return textHitsAlias(text, item.aliases); });
        });
    }

    function findExactLabel(alias) {
        const nodes = Array.from(document.querySelectorAll('div, span, p, button'));
        for (let i = 0; i < nodes.length; i++) {
            const el = nodes[i];
            if (!isVisible(el)) continue;
            if (el.closest('#mwidle-auto-gather')) continue;
            if (cleanTitle(el.textContent) !== alias) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width > 280 || rect.height > 280) continue;
            return el.closest('[class*="SkillAction"]') || el.parentElement || el;
        }
        return null;
    }

    function clickTargetCard(target) {
        const aliases = target.aliases.slice().sort(function (a, b) { return b.length - a.length; });
        const cards = visibleSkillCards();
        const names = cards.map(cardName).join('/');
        appendLog(t('visibleCards', { n: cards.length, list: cards.length ? '：' + names : '' }));
        for (const card of cards) {
            if (textHitsAlias(cardName(card), aliases)) {
                appendLog(t('clickCard', { name: cardName(card) }));
                return nativeClick(card);
            }
        }
        for (let i = 0; i < aliases.length; i++) {
            const el = findExactLabel(aliases[i]);
            if (el) {
                appendLog(t('clickName', { alias: aliases[i] }));
                return nativeClick(el);
            }
        }
        return false;
    }

    function visibleQuery(selector, root) {
        return Array.from((root || document).querySelectorAll(selector)).find(isVisible) || null;
    }

    function getModalRoot() {
        return visibleQuery('[class*="Modal_modalContainer"]')
            || visibleQuery('[class*="MuiModal-root"]')
            || visibleQuery('[class*="MuiDialog-root"]');
    }

    function getDialog() {
        const modal = getModalRoot();
        if (!modal) {
            return visibleQuery('[class*="SkillActionDetail_skillActionDetail"]')
                || visibleQuery('[class*="SkillActionDetail_regularComponent"]');
        }
        return visibleQuery('[class*="MuiPaper-root"]', modal)
            || visibleQuery('[class*="SkillActionDetail"]', modal)
            || visibleQuery('[class*="modalContent"]', modal)
            || modal;
    }

    function cleanTitle(text) {
        return norm(text).replace(/^Lv\.?\s*\d+\s*/i, '').replace(/\s*\[.*\]$/, '');
    }

    function panelShowsTarget(panel, target) {
        if (!panel) return false;
        const nodes = panel.querySelectorAll('h1, h2, h3, h4, div, span, p');
        for (let i = 0; i < nodes.length; i++) {
            const title = cleanTitle(nodes[i].textContent);
            if (!title || title.length > 16) continue;
            if (target.aliases.indexOf(title) !== -1) return true;
        }
        return false;
    }

    function controlText(el) {
        const direct = Array.from(el.childNodes)
            .filter(function (node) { return node.nodeType === 3; })
            .map(function (node) { return node.textContent; })
            .join('');
        return norm(direct) || norm(el.textContent);
    }

    async function waitFor(checker, timeoutMs) {
        const timeout = timeoutMs || 4000;
        const start = Date.now();
        let value = checker();
        while (!value && Date.now() - start < timeout) {
            await sleep(120);
            value = checker();
        }
        return value;
    }

    function ensureInfinite(root) {
        if (!config.infinite || !root) return;
        const input = root.querySelector('[class*="maxActionCountInput"] input, input[type="number"], input[type="text"]');
        if (input && (String(input.value).indexOf('\u221e') !== -1 || String(input.placeholder).indexOf('\u221e') !== -1)) {
            appendLog(t('alreadyInfinite'));
            return;
        }
        const chips = Array.from(root.querySelectorAll('button, [role="button"], div, span')).filter(function (el) {
            if (controlText(el) !== '\u221e') return false;
            const rect = el.getBoundingClientRect();
            return isVisible(el) && rect.width <= 56 && rect.height <= 56 && rect.width >= 16;
        });
        if (chips.length) {
            if (!clickReactButton(chips[0])) nativeClick(chips[0]);
            appendLog(t('clickedInfinite'));
        }
    }

    function findStartButton(root) {
        const modal = document.querySelector('[class*="Modal_modalContainer"]');
        const detail = (root && root.querySelector && root.querySelector('[class*="SkillActionDetail"]'))
            || (modal && modal.querySelector('[class*="SkillActionDetail"]'))
            || document.querySelector('[class*="SkillActionDetail"]');
        const scope = root || detail || modal || document;
        const labels = ['立即开始', '立即開始', '现在开始', '現在開始', 'Start Now', '开始', '開始', 'Start', 'Go'];
        const nodes = Array.from(scope.querySelectorAll('button, [role="button"]'));
        let best = null;
        let bestRank = -1;
        for (let i = 0; i < nodes.length; i++) {
            const el = nodes[i];
            if (el.closest('#mwidle-auto-gather')) continue;
            if (!isVisible(el) || el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
            const text = controlText(el);
            const labelRank = labels.indexOf(text);
            if (labelRank === -1) continue;
            const rect = el.getBoundingClientRect();
            if (rect.height > 80 || rect.width < 48) continue;
            const cls = String(el.className || '');
            let rank = 100 - labelRank;
            if (/Button_success/i.test(cls)) rank += 50;
            if (/Button_fullWidth|Button_large/i.test(cls)) rank += 10;
            if (el.closest('[class*="SkillActionDetail"]')) rank += 20;
            if (rank > bestRank) {
                best = el;
                bestRank = rank;
            }
        }
        return best;
    }

    function clickStart(root) {
        const btn = findStartButton(root);
        if (!btn) return false;
        appendLog(t('clickBtn', { text: controlText(btn), width: Math.round(btn.getBoundingClientRect().width) }));
        if (clickReactButton(btn)) {
            appendLog(t('usedGameClick'));
            return true;
        }
        appendLog(t('noBtnEvent'));
        return false;
    }

    async function openTargetDialog(skill, target) {
        if (findStartButton() && panelShowsTarget(getDialog() || document.body, target)) {
            appendLog(t('startAlreadyOpen'));
            return true;
        }

        const core = getGameCore();
        appendLog(core ? t('foundCore') : t('noCore'));

        if (core && typeof core.handleGoToAction === 'function' && target.hrid) {
            try {
                core.handleGoToAction(target.hrid);
                appendLog(t('openedViaApi', { label: targetLabel(target), hrid: target.hrid }));
            } catch (e) {
                appendLog(t('apiError'));
            }
            if (await waitFor(function () { return findStartButton(); }, 3500)) {
                appendLog(t('gotStart'));
                return true;
            }
            appendLog(t('apiNoStart'));
        }

        if (isOnSkillPage(skill)) {
            appendLog(t('onSkillPage', { skill: skillLabel(skill) }));
        } else if (clickNavSkill(skill)) {
            appendLog(t('clickedNav', { skill: skillLabel(skill) }));
            await waitFor(function () { return isOnSkillPage(skill); }, 3000);
            await sleep(250);
        } else {
            appendLog(t('navMiss', { skill: skillLabel(skill) }));
        }

        if (core && typeof core.handleGoToAction === 'function' && target.hrid && !findStartButton()) {
            try { core.handleGoToAction(target.hrid); } catch (e2) {}
            if (await waitFor(function () { return findStartButton(); }, 2500)) {
                appendLog(t('gotStart'));
                return true;
            }
        }

        if (!clickTargetCard(target)) {
            throw new Error(t('errNoCard', { label: targetLabel(target) }));
        }

        const startBtn = await waitFor(function () { return findStartButton(); }, 4000);
        if (!startBtn) {
            throw new Error(t('errNoStartAfterClick', { label: targetLabel(target) }));
        }
        appendLog(t('gotStart'));
        return true;
    }

    async function startConfiguredAction() {
        const skill = currentSkill();
        const target = currentTarget();
        appendLog(t('startAction', { skill: skillLabel(skill), target: targetLabel(target) }));

        await openTargetDialog(skill, target);

        const startBtn = findStartButton();
        if (!startBtn) throw new Error(t('errNoStart'));
        const dialog = startBtn.closest('[class*="MuiPaper"], [class*="Modal"], [class*="SkillActionDetail"], [class*="dialog"]') || startBtn.parentElement || document.body;

        ensureInfinite(dialog);
        await sleep(150);

        if (!clickStart(document)) {
            throw new Error(t('errStartClickFail'));
        }

        await sleep(CLICK_DELAY_MS);
        const prevCount = trackedActions ? trackedActions.size : null;
        for (let i = 0; i < 15; i++) {
            if (isTargetRunning()) return true;
            if (trackedActions && trackedActions.size > 0 && (prevCount == null || trackedActions.size >= prevCount)) {
                if (prevCount == null || trackedActions.size > prevCount || !IDLE_TEXT_RE.test(getHeaderActionText())) return true;
            }
            await sleep(400);
        }
        throw new Error(t('errStillIdle', { header: getHeaderActionText(), label: targetLabel(target) }));
    }

    async function runOnce(reason, options) {
        const force = !!(options && options.force);
        if (!config.enabled && !force) return;
        if (running) return;
        if (!force && Date.now() - lastRunAt < RUN_COOLDOWN_MS) return;

        if (!force) {
            if (!isIdle()) {
                await sleep(450);
                if (!isIdle()) return;
            }
        }

        running = true;
        lastReason = reason || 'manual';
        lastRunAt = Date.now();
        setStatus(t('executing'), t('trigger', { reason: reasonText(lastReason) }));
        try {
            await startConfiguredAction();
            setStatus(t('started', { skill: skillLabel(currentSkill()), target: targetLabel(currentTarget()) }), t('success'));
        } catch (err) {
            setStatus(t('fail'), String(err && err.message ? err.message : err));
        } finally {
            running = false;
        }
    }

    function scheduleIdleRun(reason) {
        if (!config.enabled) return;
        const delay = document.hidden ? 0 : 250;
        setTimeout(function () { runOnce(reason); }, delay);
    }

    function rememberActionIds(list) {
        trackedActions = new Set();
        (list || []).forEach(function (item) {
            if (item && item.id != null && !item.isDone) trackedActions.add(String(item.id));
        });
    }

    function updateTrackedFromList(list) {
        if (!Array.isArray(list)) return;
        if (!trackedActions) trackedActions = new Set();
        list.forEach(function (item) {
            if (!item || item.id == null) return;
            const id = String(item.id);
            if (item.isDone) trackedActions.delete(id);
            else trackedActions.add(id);
        });
    }

    function parseWsPayload(raw) {
        if (raw == null) return null;
        if (typeof raw !== 'string') {
            if (typeof raw === 'object') return raw;
            return null;
        }
        try {
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function handleWsMessage(msg) {
        if (!msg || !msg.type) return;
        if (msg.type === 'init_character_data') {
            rememberActionIds(msg.characterActions);
            return;
        }
        updateTrackedFromList(msg.endCharacterActions);
        updateTrackedFromList(msg.characterActions);
        if (msg.type === 'action_completed') {
            const item = msg.endCharacterAction;
            if (item && item.id != null) {
                if (!trackedActions) trackedActions = new Set();
                if (item.isDone !== false) trackedActions.delete(String(item.id));
            }
        }
        if (trackedActions && trackedActions.size === 0) {
            scheduleIdleRun('websocket-empty-queue');
        }
    }

    function hookWebSocket() {
        try {
            if (!window.WebSocket || WebSocket.prototype.__mwidleSendHooked) return;
            const origSend = WebSocket.prototype.send;
            const origAdd = WebSocket.prototype.addEventListener;
            function attach(ws) {
                if (!ws || ws.__mwidleHooked) return;
                ws.__mwidleHooked = true;
                origAdd.call(ws, 'message', function (ev) {
                    const msg = parseWsPayload(ev.data);
                    if (msg) handleWsMessage(msg);
                });
            }
            WebSocket.prototype.send = function () {
                attach(this);
                return origSend.apply(this, arguments);
            };
            WebSocket.prototype.addEventListener = function (type) {
                const ret = origAdd.apply(this, arguments);
                if (type === 'message') attach(this);
                return ret;
            };
            WebSocket.prototype.__mwidleSendHooked = true;
        } catch (e) {}
    }

    function setupTimerWorker() {
        if (timerWorker) return;
        try {
            const src = 'onmessage=function(e){var d=e.data||{};if(d.t==="sleep"){setTimeout(function(){postMessage({t:"sleep",id:d.id});},d.ms||0);}if(d.t==="ping"){setInterval(function(){postMessage({t:"tick"});},d.ms||4000);}};';
            timerWorker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
            timerWorker.onmessage = function (e) {
                const d = e.data || {};
                if (d.t === 'sleep' && sleepWaiters[d.id]) sleepWaiters[d.id]();
                if (d.t === 'tick' && config.enabled && !running && (isIdle() || (trackedActions && trackedActions.size === 0))) {
                    runOnce('worker-tick');
                }
            };
            timerWorker.postMessage({ t: 'ping', ms: 4000 });
        } catch (e) {}
    }

    function setupIdleObserver() {
        if (!config.observeIdle) return;
        let scheduled = false;
        const observer = new MutationObserver(function () {
            if (scheduled || running) return;
            scheduled = true;
            setTimeout(function () {
                scheduled = false;
                if (isIdle()) runOnce('dom-idle');
            }, 250);
        });
        const target = qs('Header_actionName') || document.documentElement;
        observer.observe(target, { childList: true, subtree: true, characterData: true });
        document.addEventListener('visibilitychange', function () {
            resumeKeepAlive();
            if (document.visibilityState === 'visible') setTimeout(function () { runOnce('tab-visible'); }, 400);
            else if (isIdle()) runOnce('tab-hidden');
        });
        setInterval(function () {
            if (isIdle()) runOnce('poll');
        }, POLL_INTERVAL_MS);
        setTimeout(function () { runOnce('startup'); }, 4000);
        setupTimerWorker();
    }

    function resumeKeepAlive() {
        if (!audioKeepAlive || !audioKeepAlive.ctx) return;
        if (audioKeepAlive.ctx.state !== 'running') {
            audioKeepAlive.ctx.resume().catch(function () {});
        }
    }

    function setupKeepAlive() {
        const want = config.enabled && config.keepalive;
        if (!want) {
            if (audioKeepAlive && audioKeepAlive.ctx) {
                try { audioKeepAlive.ctx.close(); } catch (e) {}
                audioKeepAlive = null;
            }
            return;
        }
        if (audioKeepAlive) {
            resumeKeepAlive();
            return;
        }
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            gain.gain.value = 0.00001;
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            audioKeepAlive = { ctx: ctx };
            resumeKeepAlive();
            document.addEventListener('pointerdown', resumeKeepAlive, true);
            document.addEventListener('keydown', resumeKeepAlive, true);
            setInterval(resumeKeepAlive, 10000);
        } catch (e) {}
    }

    function injectStyles() {
        if (document.getElementById('mwidle-auto-gather-style')) return;
        const style = document.createElement('style');
        style.id = 'mwidle-auto-gather-style';
        style.textContent = [
            '#mwidle-auto-gather { position:fixed; right:16px; bottom:88px; z-index:999999; width:300px; color:#f2f4ff;',
            'font:13px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background:rgba(22,24,48,.96);',
            'border:1px solid #5b63a8; border-radius:10px; box-shadow:0 10px 28px rgba(0,0,0,.35); user-select:none; }',
            '#mwidle-auto-gather * { box-sizing:border-box; }',
            '#mwidle-auto-gather .mw-hd { display:flex; align-items:center; justify-content:space-between; padding:8px 10px;',
            'cursor:move; background:#2c2e5a; border-radius:10px 10px 0 0; }',
            '#mwidle-auto-gather .mw-hd b { font-size:13px; }',
            '#mwidle-auto-gather .mw-hd button { border:0; background:transparent; color:#d8dcff; cursor:pointer; font-size:16px; }',
            '#mwidle-auto-gather .mw-bd { padding:10px; display:grid; gap:8px; }',
            '#mwidle-auto-gather.collapsed .mw-bd { display:none; }',
            '#mwidle-auto-gather label { display:flex; align-items:center; gap:6px; }',
            '#mwidle-auto-gather select, #mwidle-auto-gather button.mw-btn { width:100%; padding:6px 8px; border-radius:6px;',
            'border:1px solid #6c74b7; background:#1c1e3d; color:#fff; }',
            '#mwidle-auto-gather button.mw-btn { cursor:pointer; background:#3c7a46; border-color:#5aa365; }',
            '#mwidle-auto-gather button.mw-btn:disabled { opacity:.6; cursor:wait; }',
            '#mwidle-auto-gather .mw-status, #mwidle-auto-gather .mw-log { font-size:12px; color:#c9ceff; word-break:break-all; white-space:pre-wrap; max-height:92px; overflow:auto; }',
            '#mwidle-auto-gather .mw-tip { font-size:11px; color:#9aa3d8; }'
        ].join('');
        (document.head || document.documentElement).appendChild(style);
    }

    function fillSelect(select, items, selected) {
        select.innerHTML = '';
        items.forEach(function (item) {
            const opt = document.createElement('option');
            opt.value = item.value;
            opt.textContent = item.label;
            select.appendChild(opt);
        });
        const ok = items.some(function (item) { return item.value === selected; });
        select.value = ok ? selected : (items[0] && items[0].value) || '';
        return select.value;
    }

    function fillSkillSelect(select) {
        fillSelect(select, [
            { value: 'milking', label: t('skill.milking') },
            { value: 'foraging', label: t('skill.foraging') },
            { value: 'woodcutting', label: t('skill.woodcutting') }
        ], config.skill);
    }

    function fillTargetSelect(select) {
        const list = TARGETS[config.skill] || [];
        const selected = fillSelect(select, list.map(function (item) {
            return { value: item.id, label: t('target.' + config.skill + '.' + item.id) };
        }), config.targets[config.skill]);
        config.targets[config.skill] = selected;
    }

    function fillLocaleSelect(select) {
        fillSelect(select, [
            { value: 'auto', label: t('locale.auto') },
            { value: 'en', label: t('locale.en') },
            { value: 'zh-CN', label: t('locale.zh-CN') },
            { value: 'zh-TW', label: t('locale.zh-TW') }
        ], config.locale || 'auto');
    }

    function applyI18n() {
        if (!ui.root) return;
        const titleEl = ui.root.querySelector('.mw-hd b');
        if (titleEl) titleEl.textContent = t('title') + ' v' + VERSION;
        ui.root.querySelectorAll('[data-i18n]').forEach(function (el) {
            el.textContent = t(el.getAttribute('data-i18n'));
        });
        fillSkillSelect(ui.root.querySelector('select[data-key="skill"]'));
        fillTargetSelect(ui.root.querySelector('select[data-key="target"]'));
        fillLocaleSelect(ui.root.querySelector('select[data-key="locale"]'));
        const runBtn = ui.root.querySelector('[data-act="run"]');
        if (runBtn && !runBtn.disabled) runBtn.textContent = t('run');
        if (ui.status && lastStatus) ui.status.textContent = lastStatus;
    }

    function createPanel() {
        if (document.getElementById('mwidle-auto-gather') || !document.body) return;
        injectStyles();
        const root = document.createElement('div');
        root.id = 'mwidle-auto-gather';
        if (config.collapsed) root.classList.add('collapsed');
        root.innerHTML = [
            '<div class="mw-hd"><b></b><button type="button" data-act="toggle">',
            config.collapsed ? '+' : '\u2013',
            '</button></div>',
            '<div class="mw-bd">',
            '<label><input type="checkbox" data-key="enabled"> <span data-i18n="enable"></span></label>',
            '<div><div data-i18n="language"></div><select data-key="locale"></select></div>',
            '<div><div data-i18n="skill"></div><select data-key="skill"></select></div>',
            '<div><div data-i18n="target"></div><select data-key="target"></select></div>',
            '<label><input type="checkbox" data-key="infinite"> <span data-i18n="infinite"></span></label>',
            '<label><input type="checkbox" data-key="keepalive"> <span data-i18n="keepalive"></span></label>',
            '<button type="button" class="mw-btn" data-act="run"></button>',
            '<div class="mw-status"></div><div class="mw-log"></div>',
            '<div class="mw-tip" data-i18n="tip"></div>',
            '</div>'
        ].join('');
        document.body.appendChild(root);
        ui.root = root;
        ui.status = root.querySelector('.mw-status');
        ui.log = root.querySelector('.mw-log');

        const skillSelect = root.querySelector('select[data-key="skill"]');
        const targetSelect = root.querySelector('select[data-key="target"]');
        const localeSelect = root.querySelector('select[data-key="locale"]');
        applyI18n();
        root.querySelector('input[data-key="enabled"]').checked = config.enabled;
        root.querySelector('input[data-key="infinite"]').checked = config.infinite;
        root.querySelector('input[data-key="keepalive"]').checked = config.keepalive;
        lastStatus = lastStatus || t('waitLoad');
        setStatus(lastStatus);

        localeSelect.addEventListener('change', function () {
            config.locale = localeSelect.value;
            invalidateLocale();
            saveConfig();
            applyI18n();
            setStatus(t('saved', { skill: skillLabel(currentSkill()), target: targetLabel(currentTarget()) }));
        });
        skillSelect.addEventListener('change', function () {
            config.skill = skillSelect.value;
            fillTargetSelect(targetSelect);
            saveConfig();
            setStatus(t('saved', { skill: skillLabel(currentSkill()), target: targetLabel(currentTarget()) }));
        });
        targetSelect.addEventListener('change', function () {
            config.targets[config.skill] = targetSelect.value;
            saveConfig();
            setStatus(t('saved', { skill: skillLabel(currentSkill()), target: targetLabel(currentTarget()) }));
        });
        Array.prototype.forEach.call(root.querySelectorAll('input[type="checkbox"]'), function (input) {
            input.addEventListener('change', function () {
                config[input.getAttribute('data-key')] = input.checked;
                saveConfig();
                if (input.getAttribute('data-key') === 'keepalive' || input.getAttribute('data-key') === 'enabled') setupKeepAlive();
            });
        });
        root.querySelector('[data-act="toggle"]').addEventListener('click', function (ev) {
            ev.stopPropagation();
            config.collapsed = !config.collapsed;
            root.classList.toggle('collapsed', config.collapsed);
            ev.currentTarget.textContent = config.collapsed ? '+' : '\u2013';
            saveConfig();
        });
        root.querySelector('[data-act="run"]').addEventListener('click', async function (ev) {
            const btn = ev.currentTarget;
            btn.disabled = true;
            btn.textContent = t('running');
            try {
                await runOnce('manual', { force: true });
            } finally {
                btn.disabled = false;
                btn.textContent = t('run');
            }
        });

        const hd = root.querySelector('.mw-hd');
        let drag = null;
        hd.addEventListener('mousedown', function (ev) {
            if (ev.target.closest('button')) return;
            const rect = root.getBoundingClientRect();
            drag = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
            ev.preventDefault();
        });
        document.addEventListener('mousemove', function (ev) {
            if (!drag) return;
            root.style.left = Math.max(0, ev.clientX - drag.x) + 'px';
            root.style.top = Math.max(0, ev.clientY - drag.y) + 'px';
            root.style.right = 'auto';
            root.style.bottom = 'auto';
        });
        document.addEventListener('mouseup', function () { drag = null; });

        setTimeout(function () {
            if ((config.locale || 'auto') !== 'auto') return;
            const inferred = inferLocaleFromGame();
            if (!inferred || inferred === getLocale()) return;
            invalidateLocale();
            applyI18n();
        }, 2500);
    }

    function onReady(fn) {
        if (document.body) fn();
        else document.addEventListener('DOMContentLoaded', fn, { once: true });
    }

    lastStatus = t('waitLoad');
    hookWebSocket();
    saveConfig();
    onReady(function () {
        createPanel();
        setupIdleObserver();
        setupKeepAlive();
    });
})();
