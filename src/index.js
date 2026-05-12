/**
 * GetBucks VAS Server
 * Entry point for the Value Added Services API
 */

import app from './app.js';
import { PORT } from './config/env.js';

app.listen(PORT, () => {
  console.log('Getbucks Vas Server Working');
  console.log(`Server running on http://localhost:${PORT}`);
});

