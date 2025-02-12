"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const startingElevenRoutes_1 = __importDefault(require("./routes/startingElevenRoutes"));
const teamRoute_1 = __importDefault(require("./routes/teamRoute"));
const transferRoute_1 = __importDefault(require("./routes/transferRoute"));
const statsRoutes_1 = __importDefault(require("./routes/statsRoutes"));
const scoreRoute_1 = __importDefault(require("./routes/scoreRoute"));
const app = (0, express_1.default)();
const PORT = 3000;
// Add body-parser middleware
app.use(express_1.default.json());
app.use(startingElevenRoutes_1.default);
app.use(teamRoute_1.default);
app.use(transferRoute_1.default);
app.use(statsRoutes_1.default);
app.use(scoreRoute_1.default);
app.get('/', (req, res) => {
    res.send('Welcome to the Botola Fantas App!!!');
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
