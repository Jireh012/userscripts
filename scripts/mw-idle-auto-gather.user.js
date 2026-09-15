// ==UserScript==
// @name         MW Idle 空闲自动采集
// @namespace    mwidle-auto
// @version      2.4.0
// @description  无所事事时自动执行自选动作（挤奶/采集/伐木）和目标（如奥秘树）。监听游戏空闲状态，并尝试挂钩 MWITools / 页面通知。
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

    const STORAGE_KEY = 'mwidle-auto-gather-config-v2';
    const CLICK_DELAY_MS = 900;
    const RUN_COOLDOWN_MS = 8000;
    const POLL_INTERVAL_MS = 30 * 1000;

    const SKILLS = {
        milking: {
            id: 'milking',
            label: '挤奶',
            aliases: ['挤奶', '擠奶', 'Milking']
        },
        foraging: {
            id: 'foraging',
            label: '采集',
            aliases: ['采集', '採集', '采摘', '採摘', 'Foraging']
        },
        woodcutting: {
            id: 'woodcutting',
            label: '伐木',
            aliases: ['伐木', 'Woodcutting']
        }
    };

    const TARGETS = {
        milking: [
            { id: 'cow', hrid: '/actions/milking/cow', label: '奶牛', aliases: ['奶牛', 'Cow'] },
            { id: 'verdant_cow', hrid: '/actions/milking/verdant_cow', label: '翠绿奶牛', aliases: ['翠绿奶牛', '翠綠奶牛', 'Verdant Cow'] },
            { id: 'azure_cow', hrid: '/actions/milking/azure_cow', label: '蔚蓝奶牛', aliases: ['蔚蓝奶牛', '蔚藍奶牛', 'Azure Cow'] },
            { id: 'burble_cow', hrid: '/actions/milking/burble_cow', label: '深紫奶牛', aliases: ['深紫奶牛', 'Burble Cow'] },
            { id: 'crimson_cow', hrid: '/actions/milking/crimson_cow', label: '绛红奶牛', aliases: ['绛红奶牛', '絳紅奶牛', '深红奶牛', '深紅奶牛', 'Crimson Cow'] },
            { id: 'unicow', hrid: '/actions/milking/unicow', label: '彩虹奶牛', aliases: ['彩虹奶牛', 'Unicow'] },
            { id: 'holy_cow', hrid: '/actions/milking/holy_cow', label: '神圣奶牛', aliases: ['神圣奶牛', '神聖奶牛', '圣牛', '聖牛', 'Holy Cow'] }
        ],
        foraging: [
            { id: 'farmland', hrid: '/actions/foraging/farmland', label: '翠野农场', aliases: ['翠野农场', '翠野農場', '农场', '農場', '农田', '農田', 'Farmland'] },
            { id: 'shimmering_lake', hrid: '/actions/foraging/shimmering_lake', label: '波光湖泊', aliases: ['波光湖泊', '波光湖', 'Shimmering Lake'] },
            { id: 'misty_forest', hrid: '/actions/foraging/misty_forest', label: '迷失森林', aliases: ['迷失森林', '迷雾森林', '迷霧森林', 'Misty Forest'] },
            { id: 'burble_beach', hrid: '/actions/foraging/burble_beach', label: '深紫沙滩', aliases: ['深紫沙滩', '深紫沙灘', 'Burble Beach'] },
            { id: 'silly_cow_valley', hrid: '/actions/foraging/silly_cow_valley', label: '傻牛山谷', aliases: ['傻牛山谷', '傻牛谷', 'Silly Cow Valley'] },
            { id: 'olympus_mons', hrid: '/actions/foraging/olympus_mons', label: '奥林匹斯山', aliases: ['奥林匹斯山', '奧林匹斯山', 'Olympus Mons'] },
            { id: 'asteroid_belt', hrid: '/actions/foraging/asteroid_belt', label: '小行星带', aliases: ['小行星带', '小行星帶', 'Asteroid Belt'] }
        ],
        woodcutting: [
            { id: 'tree', hrid: '/actions/woodcutting/tree', label: '树', aliases: ['树', '樹', 'Tree'] },
            { id: 'birch_tree', hrid: '/actions/woodcutting/birch_tree', label: '桦树', aliases: ['桦树', '樺樹', '白桦', '白樺', '白桦树', '白樺樹', 'Birch Tree'] },
            { id: 'cedar_tree', hrid: '/actions/woodcutting/cedar_tree', label: '雪松树', aliases: ['雪松树', '雪松樹', 'Cedar Tree'] },
            { id: 'purpleheart_tree', hrid: '/actions/woodcutting/purpleheart_tree', label: '紫心树', aliases: ['紫心树', '紫心樹', '紫心木', '紫心木树', '紫心木樹', 'Purpleheart Tree'] },
            { id: 'ginkgo_tree', hrid: '/actions/woodcutting/ginkgo_tree', label: '银杏树', aliases: ['银杏树', '銀杏樹', 'Ginkgo Tree'] },
            { id: 'redwood_tree', hrid: '/actions/woodcutting/redwood_tree', label: '红杉树', aliases: ['红杉树', '紅杉樹', '红木树', '紅木樹', 'Redwood Tree'] },
            { id: 'arcane_tree', hrid: '/actions/woodcutting/arcane_tree', label: '奥秘树', aliases: ['奥秘树', '奧秘樹', 'Arcane Tree'] }
        ]
    };

    const IDLE_TEXT_RE = /无所事事|無所事事|正在空闲|正在空閒|\bIdle\b/i;
    const IDLE_NOTIFY_RE = /无所事事|無所事事|动作队列为空|動作隊列為空|動作佇列為空|Action queue is empty|empty action|正在空闲|正在空閒/i;

    const DEFAULT_CONFIG = {
        enabled: true,
        skill: 'milking',
        targets: {
            milking: 'cow',
            foraging: 'farmland',
            woodcutting: 'arcane_tree'
        },
        infinite: true,
        hookNotification: true,
        observeIdle: true,
        keepalive: true,
        collapsed: false
    };

    let config = loadConfig();
    let running = false;
    let lastRunAt = 0;
    let lastReason = '';
    let lastStatus = '等待游戏加载';
    let audioKeepAlive = null;
    let trackedActions = null;
    const ui = { root: null, status: null, log: null };
    let timerWorker = null;
    let sleepWaiters = {};
    let sleepSeq = 0;

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

    function fakeClickEvent(el) {
        return {
            preventDefault: function () {},
            stopPropagation: function () {},
            stopImmediatePropagation: function () {},
            persist: function () {},
            nativeEvent: {
                preventDefault: function () {},
                stopPropagation: function () {},
                stopImmediatePropagation: function () {},
                isTrusted: false,
                target: el,
                type: 'click',
                button: 0
            },
            target: el,
            currentTarget: el,
            type: 'click',
            bubbles: false,
            cancelable: true,
            button: 0,
            defaultPrevented: false,
            isDefaultPrevented: function () { return false; },
            isPropagationStopped: function () { return true; }
        };
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

    function clickOnce(el) {
        return nativeClick(el);
    }

    function safeClickElement(el) {
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
        const time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
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
        appendLog('可见技能卡 ' + cards.length + ' 张' + (cards.length ? '：' + cards.map(cardName).join('/') : ''));
        for (const card of cards) {
            if (textHitsAlias(cardName(card), aliases)) {
                appendLog('点击卡片：' + cardName(card));
                return nativeClick(card);
            }
        }
        for (let i = 0; i < aliases.length; i++) {
            const el = findExactLabel(aliases[i]);
            if (el) {
                appendLog('点击名称：' + aliases[i]);
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
            appendLog('次数已是无限');
            return;
        }
        const chips = Array.from(root.querySelectorAll('button, [role="button"], div, span')).filter(function (el) {
            if (controlText(el) !== '\u221e') return false;
            const rect = el.getBoundingClientRect();
            return isVisible(el) && rect.width <= 56 && rect.height <= 56 && rect.width >= 16;
        });
        if (chips.length) {
            if (!clickReactButton(chips[0])) nativeClick(chips[0]);
            appendLog('已点无限次数');
        }
    }

    function findStartButton(root) {
        const modal = document.querySelector('[class*="Modal_modalContainer"]');
        const detail = (root && root.querySelector && root.querySelector('[class*="SkillActionDetail"]'))
            || (modal && modal.querySelector('[class*="SkillActionDetail"]'))
            || document.querySelector('[class*="SkillActionDetail"]');
        const scope = root || detail || modal || document;
        const labels = ['立即开始', '现在开始', '現在開始', 'Start Now', '开始', '開始', 'Go'];
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
        appendLog('点击按钮：' + controlText(btn) + ' (' + Math.round(btn.getBoundingClientRect().width) + 'px)');
        if (clickReactButton(btn)) {
            appendLog('已用游戏按钮事件开始');
            return true;
        }
        appendLog('未取到按钮事件，开始可能失败');
        return false;
    }

    async function openTargetDialog(skill, target) {
        if (findStartButton() && panelShowsTarget(getDialog() || document.body, target)) {
            appendLog('开始按钮已在正确弹窗上');
            return true;
        }

        const core = getGameCore();
        appendLog(core ? '已找到游戏核心' : '未找到游戏核心');

        if (core && typeof core.handleGoToAction === 'function' && target.hrid) {
            try {
                core.handleGoToAction(target.hrid);
                appendLog('已调用打开：' + target.label + ' ' + target.hrid);
            } catch (e) {
                appendLog('游戏打开接口报错');
            }
            if (await waitFor(function () { return findStartButton(); }, 3500)) {
                appendLog('已等到开始按钮');
                return true;
            }
            appendLog('接口已调用，但没出现开始按钮');
        }

        if (isOnSkillPage(skill)) {
            appendLog('已在' + skill.label + '页');
        } else if (clickNavSkill(skill)) {
            appendLog('已点侧栏：' + skill.label);
            await waitFor(function () { return isOnSkillPage(skill); }, 3000);
            await sleep(250);
        } else {
            appendLog('未点到侧栏「' + skill.label + '」');
        }

        if (core && typeof core.handleGoToAction === 'function' && target.hrid && !findStartButton()) {
            try { core.handleGoToAction(target.hrid); } catch (e2) {}
            if (await waitFor(function () { return findStartButton(); }, 2500)) {
                appendLog('已等到开始按钮');
                return true;
            }
        }

        if (!clickTargetCard(target)) {
            throw new Error('未找到目标卡片：' + target.label);
        }

        const startBtn = await waitFor(function () { return findStartButton(); }, 4000);
        if (!startBtn) {
            throw new Error('已点' + target.label + '，但没等到开始按钮');
        }
        appendLog('已等到开始按钮');
        return true;
    }

    async function startConfiguredAction() {
        const skill = currentSkill();
        const target = currentTarget();
        appendLog('开始执行：' + skill.label + ' \u2192 ' + target.label);

        await openTargetDialog(skill, target);

        const startBtn = findStartButton();
        if (!startBtn) throw new Error('没有开始按钮');
        const dialog = startBtn.closest('[class*="MuiPaper"], [class*="Modal"], [class*="SkillActionDetail"], [class*="dialog"]') || startBtn.parentElement || document.body;

        ensureInfinite(dialog);
        await sleep(150);

        if (!clickStart(document)) {
            throw new Error('找到过开始按钮但点击失败');
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
        throw new Error('点了开始，但顶部仍是「' + getHeaderActionText() + '」，不是' + target.label);
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
        setStatus('正在执行默认动作\u2026', '触发来源：' + lastReason);
        try {
            await startConfiguredAction();
            setStatus('已开始：' + currentSkill().label + ' / ' + currentTarget().label, '执行成功');
        } catch (err) {
            setStatus('执行失败', String(err && err.message ? err.message : err));
        } finally {
            running = false;
        }
    }

    function scheduleIdleRun(reason) {
        if (!config.enabled) return;
        const delay = document.hidden ? 0 : 250;
        setTimeout(function () { runOnce(reason); }, delay);
    }

    function looksLikeIdleNotice(title, body) {
        return IDLE_NOTIFY_RE.test(String(title || '') + ' ' + String(body || ''));
    }

    function hookNotifications() {
        try {
            const OriginalNotification = window.Notification;
            if (typeof OriginalNotification === 'function') {
                const Wrapped = function (title, options) {
                    if (config.hookNotification && looksLikeIdleNotice(title, options && options.body)) {
                        scheduleIdleRun('page-notification');
                    }
                    return new OriginalNotification(title, options);
                };
                Wrapped.prototype = OriginalNotification.prototype;
                try { Wrapped.permission = OriginalNotification.permission; } catch (e) {}
                try { Wrapped.requestPermission = OriginalNotification.requestPermission.bind(OriginalNotification); } catch (e) {}
                window.Notification = Wrapped;
            }
        } catch (e) {}

        try {
            const proto = window.ServiceWorkerRegistration && window.ServiceWorkerRegistration.prototype;
            if (proto && proto.showNotification && !proto.__mwidleHooked) {
                const original = proto.showNotification;
                proto.showNotification = function (title, options) {
                    if (config.hookNotification && looksLikeIdleNotice(title, options && options.body)) {
                        scheduleIdleRun('sw-notification');
                    }
                    return original.apply(this, arguments);
                };
                proto.__mwidleHooked = true;
            }
        } catch (e) {}

        const origLog = console.log;
        console.log = function () {
            try {
                const joined = Array.prototype.slice.call(arguments).map(String).join(' ');
                if (config.hookNotification && /notificate empty action|动作队列为空|Action queue is empty/i.test(joined)) {
                    scheduleIdleRun('mwitools-log');
                }
            } catch (e) {}
            return origLog.apply(console, arguments);
        };

        window.addEventListener('mwidle-idle', function () { scheduleIdleRun('custom-event'); });
        try {
            const channel = new BroadcastChannel('mwidle-idle');
            channel.onmessage = function () { scheduleIdleRun('broadcast'); };
        } catch (e) {}
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
            '#mwidle-auto-gather { position:fixed; right:16px; bottom:88px; z-index:999999; width:268px; color:#f2f4ff;',
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

    function fillTargetSelect(select) {
        const list = TARGETS[config.skill] || [];
        select.innerHTML = '';
        list.forEach(function (item) {
            const opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = item.label;
            select.appendChild(opt);
        });
        const selected = config.targets[config.skill];
        select.value = list.some(function (item) { return item.id === selected; }) ? selected : list[0].id;
        config.targets[config.skill] = select.value;
    }

    function createPanel() {
        if (document.getElementById('mwidle-auto-gather') || !document.body) return;
        injectStyles();
        const root = document.createElement('div');
        root.id = 'mwidle-auto-gather';
        if (config.collapsed) root.classList.add('collapsed');
        root.innerHTML = [
            '<div class="mw-hd"><b>空闲自动采集 v2.4.0</b><button type="button" data-act="toggle">',
            config.collapsed ? '+' : '\u2013',
            '</button></div>',
            '<div class="mw-bd">',
            '<label><input type="checkbox" data-key="enabled"> 启用（无所事事时自动执行）</label>',
            '<div><div>动作</div><select data-key="skill">',
            '<option value="milking">挤奶</option>',
            '<option value="foraging">采集</option>',
            '<option value="woodcutting">伐木</option>',
            '</select></div>',
            '<div><div>目标</div><select data-key="target"></select></div>',
            '<label><input type="checkbox" data-key="infinite"> 无限次数 [\u221e]</label>',
            '<label><input type="checkbox" data-key="hookNotification"> 挂钩空闲通知 / MWITools</label>',
            '<label><input type="checkbox" data-key="keepalive"> 后台保活（离开页面也能自动开始）</label>',
            '<button type="button" class="mw-btn" data-act="run">立即执行一次</button>',
            '<div class="mw-status"></div><div class="mw-log"></div>',
            '<div class="mw-tip">后台标签会被浏览器节流。请勾选「后台保活」，并在游戏页点击一次。脚本会监听动作完成，不必切回页面。</div>',
            '</div>'
        ].join('');
        document.body.appendChild(root);
        ui.root = root;
        ui.status = root.querySelector('.mw-status');
        ui.log = root.querySelector('.mw-log');

        const skillSelect = root.querySelector('select[data-key="skill"]');
        const targetSelect = root.querySelector('select[data-key="target"]');
        skillSelect.value = config.skill;
        fillTargetSelect(targetSelect);
        root.querySelector('input[data-key="enabled"]').checked = config.enabled;
        root.querySelector('input[data-key="infinite"]').checked = config.infinite;
        root.querySelector('input[data-key="hookNotification"]').checked = config.hookNotification;
        root.querySelector('input[data-key="keepalive"]').checked = config.keepalive;
        setStatus(lastStatus);

        skillSelect.addEventListener('change', function () {
            config.skill = skillSelect.value;
            fillTargetSelect(targetSelect);
            saveConfig();
            setStatus('已保存：' + currentSkill().label + ' / ' + currentTarget().label);
        });
        targetSelect.addEventListener('change', function () {
            config.targets[config.skill] = targetSelect.value;
            saveConfig();
            setStatus('已保存：' + currentSkill().label + ' / ' + currentTarget().label);
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
            btn.textContent = '执行中\u2026';
            try {
                await runOnce('manual', { force: true });
            } finally {
                btn.disabled = false;
                btn.textContent = '立即执行一次';
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
    }

    function onReady(fn) {
        if (document.body) fn();
        else document.addEventListener('DOMContentLoaded', fn, { once: true });
    }

    hookWebSocket();
    hookNotifications();
    saveConfig();
    onReady(function () {
        createPanel();
        setupIdleObserver();
        setupKeepAlive();
    });
})();
