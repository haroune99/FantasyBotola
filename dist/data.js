"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defenseGkDataPromise = exports.midfieldDataPromise = exports.forwardDataPromise = void 0;
const urls_1 = require("./urls");
const urls_2 = require("./urls");
const urls_3 = require("./urls");
function fetchPlayerStats(url) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            const data = yield response.json();
            return data.results;
        }
        catch (error) {
            console.error('Error fetching data:', error);
            return [];
        }
    });
}
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function mergePlayerStats(urls) {
    return __awaiter(this, void 0, void 0, function* () {
        const allStats = [];
        for (const url of urls) {
            const stats = yield fetchPlayerStats(url);
            allStats.push(...stats);
            yield delay(1000); // Delay of 1 second between requests
        }
        const playerStatsMap = new Map();
        allStats.forEach(stat => {
            if (playerStatsMap.has(stat.player.name)) {
                const existingStat = playerStatsMap.get(stat.player.name);
                playerStatsMap.set(stat.player.name, Object.assign(Object.assign({}, existingStat), stat));
            }
            else {
                playerStatsMap.set(stat.player.name, Object.assign({}, stat));
            }
        });
        return Array.from(playerStatsMap.values());
    });
}
let fwd_data = [];
let midfield_data = [];
let defense_gk_data = [];
const forwardDataPromise = (() => __awaiter(void 0, void 0, void 0, function* () {
    fwd_data = yield mergePlayerStats(urls_1.forward_urls);
    return fwd_data;
}))();
exports.forwardDataPromise = forwardDataPromise;
const midfieldDataPromise = (() => __awaiter(void 0, void 0, void 0, function* () {
    midfield_data = yield mergePlayerStats(urls_2.midfield_urls);
    return midfield_data;
}))();
exports.midfieldDataPromise = midfieldDataPromise;
const defenseGkDataPromise = (() => __awaiter(void 0, void 0, void 0, function* () {
    defense_gk_data = yield mergePlayerStats(urls_3.defense_gk_urls);
    return defense_gk_data;
}))();
exports.defenseGkDataPromise = defenseGkDataPromise;
