import pool from '../util/db.js';
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedAllFaqs() {
    const { rows } = await pool.query(
        'SELECT id, question, answer FROM faq_entries WHERE embedding IS NULL'
    );
    for (const { id, question, answer } of rows) {
        const text = question + ' ' + answer;
        const resp = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text
        });
        const vecSql = '[' + resp.data[0].embedding.join(',') + ']';
        await pool.query(
            'UPDATE faq_entries SET embedding = $1 WHERE id = $2',
            [vecSql, id]
        );
        console.log(`Embedded FAQ ${id}`);
    }
}

export async function embedAllPages() {
    const { rows } = await pool.query(
        'SELECT id, title, description FROM pages WHERE embedding IS NULL'
    );
    for (const { id, title, description } of rows) {
        const text = title + ' ' + description;
        const resp = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text
        });
        const vecSql = '[' + resp.data[0].embedding.join(',') + ']';
        await pool.query(
            'UPDATE pages SET embedding = $1 WHERE id = $2',
            [vecSql, id]
        );
        console.log(`Embedded Page ${id}`);
    }
}
