import { Router, RequestHandler, Request } from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI as string;
const client = new MongoClient(uri);
const DB_NAME = 'FantasyBotola';
const CURRENT_GAMEWEEK = parseInt(process.env.GAMEWEEK as string, 10);
const USER_SQUAD_COLLECTION = `UserSquad${CURRENT_GAMEWEEK}`;


