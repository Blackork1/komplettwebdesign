import dotenv from 'dotenv'; dotenv.config();
import { embedAllPages } from '../services/embeddingService.js';

embedAllPages()
  .then(() => console.log('✅ All Pages embedded'))
  .catch(err => console.error(err));
