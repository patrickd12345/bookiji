// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { MockKbProvider } from './provider.mock';
import { createPgVectorProvider } from './provider.pgvector';

// Easy provider switching - just change this line!
// export const Kb = MockKbProvider;           // ← Mock provider (current)
export const Kb = createPgVectorProvider();    // ← pgvector provider (future)

// Or use environment variable for dynamic switching:
// export const Kb = process.env.KB_PROVIDER === 'pgvector' 
//   ? createPgVectorProvider() 
//   : MockKbProvider;
