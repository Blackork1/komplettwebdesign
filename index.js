import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import env from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';


env.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public'), { maxAge: '30d' }));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get('/', (req, res) => res.send('Willkommen bei komplettwebdesign!'));


app.listen(3000);