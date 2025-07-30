import dotenv from 'dotenv'; dotenv.config();
import { embedAllFaqs } from '../services/embeddingService.js';

embedAllFaqs()
  .then(() => console.log('✅ All FAQs embedded'))
  .catch(err => console.error(err));
